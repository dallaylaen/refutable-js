"use strict";

const { Report } = require( './report.js' );

function parse(...text) {
    const lines = _flat(text.map( x => x.split('\n') ))
        .map( x => x.replace(/^\s+/, '').replace(/\s+$/,'') );

    const stack = [];
    let i = 0;
    const die = msg => {
        throw new Error('bad format at line '+(i+1)+': '+msg+': '+lines[i]);
    };
    const update = () => {
        const [rep, n, data] = stack[0];
        if( n )
            rep.setResult(
                data.nested || (data.fail ? data.diff : 0), 
                data.name,
                data.cond,
                data.where
            );
        data.info.forEach( s => rep.info(s) );
        stack[0][2] = { diff: [], info: [] };
    };

    for (; i < lines.length; i++) {
        const s = lines[i];
        if (s === '')
            continue;
        if (s === 'r(') {
            if (stack[0]) {
                const [rep, n, data] = stack[0];
                if (!n)
                    die('unexpected nested contract');
                if (data.diff.length)
                    die('nested contract after evidence');
            }
            stack.unshift([new Report(), 0, {diff: [], info: []}]);
            continue;
        }
        if (s === ')') {
            update();
            const [rep] = stack.shift();
            rep.done();
            if (!stack.length)
                return rep; // TODO check for trailing lines
            stack[0][2].nested = rep;
            continue;
        }
        if (!stack.length)
            die('unexpected input');

        const match = s.match(/^(?:(\!?)(\d+)\.|([-+;^|]))(?: +(.*))?$/);
        if (!match)
            die('unexpected start of line');
        const [unused, fail, number, prefix, content] = match;

        if (prefix === ';') {
            stack[0][2].info.push(content);
            continue;
        }

        if (number) {
            if (number != stack[0][1]+1)
                die( 'unexpected number' );
            update();
            stack[0][2].fail = !!fail;
            stack[0][2].name = content;
            stack[0][1]++;
            continue;  
        }

        if (!stack[0][1] || !stack[0][2].fail)
            die('unexpected evidence');

        if (prefix === '^') {
            const loc = content.match(/`([a-zA-Z][a-zA-Z_0-9]*)`.*? at (.*:\d+)/);
            if( loc ) {
                const [skip, check, where] = loc;
                stack[0][2].cond  = check;
                stack[0][2].where = where;
                continue;
            } else {
                die('unsupported location format');
            };
        }

        stack[0][2].diff.push(prefix + ' ' + content);
    };
}

function _flat(list) {
    if (!list.length)
        return [];
    const [head, ...tail] = list;
    return (Array.isArray(head) ? head : [ head ]).concat( _flat(tail));
}

module.exports = { parse };


