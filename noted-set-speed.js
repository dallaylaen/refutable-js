'use strict';

const { NotedSet } = require( './lib/refute/util/noted-set.js' );

const ns = new NotedSet();

const max = 1e+6;

NotedSet.PAIRS_DEPTH_LINEAR = 6;
NotedSet.PAIRS_DEPTH_CONST  = 9;
NotedSet.NODES_DEPTH_LINEAR = 1;
NotedSet.NODES_DEPTH_CONST  = 0;

for( let n = 0; n < max; n++) {
    const obj = { n };
    ns.add( obj, n );
};


