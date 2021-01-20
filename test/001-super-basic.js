'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'refute.Report', () => {
    it ( 'passes by default', done => {
        const ok = new refute.Report();
        expect( ok.isPassing() ).to.equal(true);
        expect( ok.getGhost() ).to.equal('<>');
        done();
    });

    it ( 'can pass', done => {
        const ok = new refute.Report();
        ok.equals( 'animal', 'animal' );
        expect( ok.isPassing() ).to.equal(true);
        expect( ok.getGhost() ).to.equal('<1>');
        done();
    });

    it ( 'can fail', done => {
        const ok = new refute.Report();
        ok.equals( 'freedom', 'slavery' );
        expect( ok.isPassing() ).to.equal(false);
        expect( ok.getGhost() ).to.equal('<N>');
        done();
    });

    it ( 'can nest', done => {
        const ok = refute.report( ok => {
            ok.equals( 1, 1 );
            ok.nested( 'foo bared', ok2 => {
                ok2.equals( 'war', 'peace' );
            });
            ok.equals( 1, 1 );
        });

        expect( ok.isPassing() ).to.equal(false);
        expect( ok.getGhost() ).to.equal('<1<N>1>');

        done();
    });
});

