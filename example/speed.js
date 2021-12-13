'use strict';
const refute = require('../lib/refute.js')
    .config({ onFail: skip=>true });

// TODO use some kind of getopt
const args = pargs(process.argv.slice(2));

const runs   = args.runs   || 1000;
const checks = args.checks || 1000;
const fail   = args.fail   || 0;
const print  = args.print  ?? 1;

const t0 = new Date();
for (let i = 0; i < runs; i++) {
    refute( ok => {
        let s = 0;
        for (let j = 0; j < checks; j++) {
            ok.cmpNum( s, '==', j*j + fail, 'square' );
            s += 2*j+1;
        };
        if(print)
            ok.toString();
    });
};

const milli = new Date() - t0;
console.log( 'Done '+runs+' runs of '+checks+' checks each in '+milli+'ms' );
console.log( (runs*checks/milli).toFixed(2) + ' checks/ms' );

function pargs (list) {
    const out = {};
    list.forEach(s=>{
        const [ _, name, value ] = s.match(/(\w+)=(.*)/);
        const maybe = Number.parseInt(value);
        out[name] = Number.isNaN(maybe) ? value : maybe;
    });
    return out;
}
