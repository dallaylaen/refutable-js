'use strict';
const { expect } = require( 'chai' );
const { Report } = require( '../lib/index.js' );

describe ( 'Report.match', () => {
    it( 'matches', done => {
        const r = new Report().run( r => {
            r.match( 'foo', /oo/, 'pass' );
            r.match( 'bar', /oo/, 'fail' );
            r.match( {}.none, /undef/, 'undefined = fail' );
            r.match( null, /null/, 'null = fail' );
        });

        expect( r.getGhost() ).to.equal( 'r(1,N,N,N)' );
        done();
    });
});
