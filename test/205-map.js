'use strict';
const chai = require('chai');
const expect = chai.expect;

const refute = require( '../lib/index.js' );

describe( 'Report.forEach', () => {
    it ( 'runs subtest', done => {
        const outer = new refute.Report();
        outer.forEach('some array', [ 'foo42', 'bar137', 'foobar' ], (ok, item) => {
            ok.match( item, /(.)\1/ );
            ok.match( item, /[a-z]+[0-9]+/ );
        });
        outer.done();

        expect( outer.getGhost() ).to.equal('r(r(r(2),r(N,1),r(1,N)))');

        done();
    });
});
