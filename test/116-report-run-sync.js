'use strict';

const { expect } = require( 'chai' );
const { Report } = require( '../lib/refute/report.js' );

describe( 'Report.runSync', () => {
    it( 'runs checks, returns self', done => {
        const report = new Report();
        expect( report.runSync( x => x.pass() ) ).to.equal(report);
        expect( report.runSync( x => x.fail() ) ).to.equal(report);
        expect( report.getDone() ).to.equal(false);
        expect( report.getGhost() ).to.equal('r(1,N)');
        done();
    });
});
