'use strict';

const { expect } = require( 'chai' );
const { Report } = require( '../lib/report' );

describe( 'Report.done', () => {
    it( 'can handle a callback', done => {
        const r = new Report();
        r.equal(42, 137, 'life is fine');
        r.done( arg => {
            expect( arg ).to.be.instanceof( Report );
            expect( arg.getGhost() ).to.equal('r(N)');
            done();
        });
    });
})
