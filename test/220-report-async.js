'use strict';
const { expect } = require( 'chai' );

const { Report } = require ( '../lib/refute.js' );

describe( 'Report(async)', () => {
    it( 'can handle Promise as evidence', done => {
        const report = new Report().run(ok => {
            ok.check( Promise.resolve(0), 'pass' );
            ok.check( Promise.resolve(1), 'fail' );
            ok.done();
        });
        setTimeout( () => {
            expect( report.getGhost() ).to.equal( 'r(1,N)' );
            done();
        }, 0);

    });
});

