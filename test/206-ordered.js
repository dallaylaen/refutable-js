'use strict';
const chai = require('chai');
const expect = chai.expect;

const refute = require( '../lib/index.js' );

describe( 'Report.ordered', () => {
    // only allow lists of identical items
    const contract = (inner, x, y) => inner.equal(x, y);

    it( 'passes for empty list', done => {
        const ok = new refute.Report();
        ok.ordered( 'empty', [], contract );
        expect( ok.getGhost() ).to.equal( 'r(1)' );
        expect( ok.getPass() ).to.equal(true);

        done();
    });

    it( 'passes for 1 element list', done => {
        const ok = new refute.Report();
        ok.ordered( 'lonely', [42], contract );
        expect( ok.getGhost() ).to.equal( 'r(1)' );
        expect( ok.getPass() ).to.equal(true);

        done();
    });

    it( 'can pass', done => {
        const ok = new refute.Report();
        ok.ordered( 'constant', [42, 42, 42], contract );
        expect( ok.getGhost() ).to.equal( 'r(r(r(1),r(1)))' );
        expect( ok.getPass() ).to.equal(true);

        done();
    });

    it ('can fail', done => {
        const ok = new refute.Report();
        ok.ordered( 'different', [42, 42, 137, 42], contract );
        // console.log(ok.toString());

        expect( ok.getGhost() ).to.equal( 'r(r(r(1),r(N),r(N)))' );
        expect( ok.getPass() ).to.equal(false);

        done();
    });
});
