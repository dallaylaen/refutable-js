'use strict';
const refute = require('./lib/refute.js');

// TODO use some kind of getopt
const runs   = Number.parseInt(process.argv[2]) || 1000;
const checks = Number.parseInt(process.argv[3]) || 1000;

const t0 = new Date();
for (let i = 0; i < runs; i++) {
    refute( ok => {
        for (let j = 0; j < checks; j++) {
            ok.match( j, /\d+/, 'j is a number' );
        };
        ok.toString();
    });
};

const milli = new Date() - t0;
console.log( 'Done '+runs+' runs of '+checks+' checks each in '+milli+'ms' );
console.log( (runs*checks/milli).toFixed(2) + ' checks/ms' );
