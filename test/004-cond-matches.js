'use strict';
const { expect } = require('chai');

const refute = require( '../lib/refute.js' );

describe( 'Report.match', () => {
    const report = refute.report( ok => {
        ok.match( 'foo', /(.)\1/ );
        ok.match( 'bar', /(.)\1/ );
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

    console.log( report.getTap() );

    it( 'can fail', done => {
        const data = report.getDetails(2);
        expect( data.pass ).to.equal(false);
        expect( data.evidence[0] ).to.match( /^[# ]*\- .* "bar"/ );
        expect( data.evidence[1] ).to.match( /^[# ]*\+ .* \/\(\.\)\\1\// );
        done();
    });
});
