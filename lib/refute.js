'use strict';

const { Report } = require ('./Report.js');

function report (...args) {
    const block = args.pop();
    const contract = new Report();
    block(contract, ...args);
    contract.stop();
    return contract;
}

function addCondition (name, options, impl) {
    if (Report.prototype[name])
        throw new Error('name taken: '+name);
    if (typeof options !== 'object')
        throw new Error('bad options');
    if (typeof impl !== 'function')
        throw new Error('bad implementation');


    const minArgs    = options.minArgs || options.args;
    if (typeof minArgs !== 'number')
        throw new Error('args must be a number');
    const maxArgs    = options.maxArgs || options.args || Infinity;
    const descrFirst = options.descrFirst || options.fun || maxArgs > 10;

    // TODO alert unknown options

    let code;

    code = function(...args) {
        const descr = descrFirst
            ? args.shift()
            : (args.length > maxArgs ? args.pop() : undefined);
        if (args.length > maxArgs || args.length < minArgs)
            throw new Error('Bad argument count in condition '+name); // TODO

        const reason = impl( ...args );
        return this.setResult( reason, descr );
    };

    Report.prototype[name] = code;
}

addCondition(
    'equals',
    {args:2},
    (a,b) => a === b ? 0 : [ 'Got      : '+a, 'Expected : ' + b ]
);
addCondition(
    'matches',
    {args:2},
    (a,rex) => (''+a).match(rex) ? 0 : [
        'String         : '+a,
        'Does not match : '+rex
    ]
);
addCondition(
    'pass',
    {args:0},
    ()=>0
);
addCondition(
    'fail',
    {args:0},
    ()=>'deliberately failed'
);

addCondition(
    'nested',
    {fun:1,minArgs:1},
    report
);

addCondition(
    'map',
    {fun:1,args:2},
    (list, contract) => report( ok => {
        list.forEach( (item, index) => ok.nested( "item "+index, item, contract ) );
    })
);

// TODO this is called "compliant chain" but better just say here
// "oh we're checking element order"
addCondition(
    'ordered', // TODO better name?
    {fun:1,args:2},
    (list, contract) => report( ok => {
        for (let n = 0; n < list.length-1; n++) {
            ok.nested( "items "+n+", "+(n+1), list[n], list[n+1], contract);
        }
    })
);

const numCmp = {
    '<' : (x,y)=>(x  < y),
    '>' : (x,y)=>(x  > y),
    '<=': (x,y)=>(x <= y),
    '>=': (x,y)=>(x >= y),
    '==': (x,y)=>(x === y),
    '!=': (x,y)=>(x !== y),
};

// use != and not !== deliberately to filter out null & undefined
const strCmp = {
    '<' : (x,y)=>x != undefined && y != undefined && (''+x  < ''+y),
    '>' : (x,y)=>x != undefined && y != undefined && (''+x  > ''+y),
    '<=': (x,y)=>x != undefined && y != undefined && (''+x <= ''+y),
    '>=': (x,y)=>x != undefined && y != undefined && (''+x >= ''+y),

    '==': (x,y)=>x != undefined && y != undefined && (''+x === ''+y),
    '!=': (x,y)=>((x == undefined)^(y == undefined)) || (''+x !== ''+y),
};

addCondition(
    'numCmp',
    {args:3},
    (x,op,y) => numCmp[op](x,y)?0:[x,"is not "+op,y]
);
addCondition(
    'strCmp',
    {args:3},
    (x,op,y) => strCmp[op](x,y)?0:[x,"is not "+op,y]
);

// Allow creating multiple parallel configurations of refute
// e.g. one strict (throwing errors) and other lax (just debugging to console)
function setup( oldConf={}, newConf={} ) {
    const options = { ...oldConf, ...newConf };
    const onFail = options.onFail || (rep => { throw new Error(rep.getTap()) });
    const refute = (...args) => {
        const ok = report(...args);
        if (!ok.isPassing())
            onFail(ok, args);
    };
    refute.Report = Report;
    refute.report = report; // TODO ouch, rename?
    refute.addCondition = addCondition;

    // refute.conf({...}) will gnerate a _new_ refute
    refute.config = update => setup( options, update );
    return refute;
}

module.exports = setup();

