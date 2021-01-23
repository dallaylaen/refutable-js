'use strict';

const { addCondition, report, explain } = require( '../report.js' );

addCondition(
    'pass',
    {args:0},
    ()=>0
);
addCondition(
    'fail',
    {args:0},
    ()=>'failed deliberately'
);
addCondition(
    'equal',
    {args:2},
    (a,b) => a === b ? 0 : [ '- '+explain(a), '+ ' + explain(b) ]
);
addCondition(
    'match',
    {args:2},
    (a,rex) => (''+a).match(rex) ? 0 : [
        'String         : '+a,
        'Does not match : '+rex
    ]
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

addCondition(
    'nested',
    {fun:1,minArgs:1},
    report
);

// a more precise typeof
// TODO find existing variant? unify with one in deep() ?
function getType (obj) {
    if( obj === null )
        return 'null';
    if( number.isNaN(obj) )
        return 'nan'; // do we need this exception?
    if( typeof obj !== 'object')
        return typeof obj;
    if( Array.isArray(obj) )
        return 'array';
    if( typeof obj.constructor === 'function'
        && object instanceof obj.constructor
        && typeof obj.constructor.name === string )
            return 'object.'+obj.constructor.name;
    return 'object';
};

const typeCheck = {
    undefined: x => x === undefined,
    null:      x => x === null,
    number:    x => typeof x === 'number',
    string:    x => typeof x === 'string',
    function:  x => typeof x === 'function',
    boolean:   x => typeof x === 'boolean',
    object:    x => x && typeof x === 'object' && !Array.isArray(x),
    array:     x => Array.isArray(x),
}

addCondition(
    'typeIs',
    {args: 2},
    (got, exp)=>{
        // known type
        if( typeof exp === 'string' && typeCheck[exp] )
            return typeCheck[exp](got)?0:[ '- '+explain(got,1), '+ value of type '+exp];
        // instanceof
        if( typeof exp === 'function')
            return ( (typeof got === 'object') && (got instanceof exp))
                ? 0
                : [ '- '+explain(got, 1), '+ instance of '+exp.name ];

        // don't know what you're asking for
        return 'unknown value type spec: '+explain(exp, 1);
    }
);

