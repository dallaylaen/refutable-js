'use strict';
const chai = require('chai');
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'Report.map', () => {
    it ( 'runs subtest', done => {
        const outer = new refute.Report();
        outer.map('some array', [ 'foo42', 'bar137', 'foobar' ], (ok, item) => {
            ok.matches( item, /(.)\1/ );
            ok.matches( item, /[a-z]+[0-9]+/ );
        });
        outer.stop();

        console.log( outer.getTap() );
        expect( outer.getGhost() ).to.equal('r(r(r(2),r(N,1),r(1,N)))');

        done();
    });
});
