'use strict';
const { expect } = require( 'chai' );

const { Report } = require( '../lib/refute/report.js' );

describe( 'Report.run', () => {
    it ('returns a promise', done => {
        const prom = new Report().run( ok => ok.pass() );
        expect( prom ).to.be.instanceof( Promise );
        prom.then( ok => {
            expect( ok ).to.be.instanceof(Report);
            expect( ok.getPass() ).to.equal( true );
            expect( ok.getDone() ).to.equal( false );
            expect( ok.getCount() ).to.equal(1);
            done();
        });
    });

/* TODO
    it ('return a self-fulfilling promise when possible', done => {
        const ok = new Report();
        ok.run( ok => ok.pass() ).then( arg => arg.stop() );
        expect( ok.getDone() ).to.equal( true );
        done();
    });
*/
});
