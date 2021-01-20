'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'Report.matches', () => {
    const report = refute.report( ok => {
        ok.matches( 'foo', /(.)\1/ );
        ok.matches( 'bar', /(.)\1/ );
    });
    it( 'good signature', done => {
        expect( report.getGhost() ).to.equal('r(1,N)');
        done();
    });

    it( 'can pass', done => {
        const data = report.getDetails(1);
        expect( data.pass ).to.equal(true);
        done();
    });

    it( 'can fail', done => {
        const data = report.getDetails(2);
        expect( data.pass ).to.equal(false);
        expect( data.reason[0] ).to.match( /bar/ );
        expect( data.reason[1] ).to.match( /does not match.*\\1/i );
        done();
    });
});
