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

