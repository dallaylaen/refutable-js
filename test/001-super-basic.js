'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'refute.Report', () => {
    it ( 'passes by default', done => {
        const ok = new refute.Report();
        expect( ok.isPassing() ).to.equal(true);
        expect( ok.getGhost() ).to.equal('r()');
        done();
    });

    it ( 'can pass', done => {
        const ok = new refute.Report();
        ok.equals( 'animal', 'animal' );
        ok.equals( 'animal', 'animal' );
        expect( ok.isPassing() ).to.equal(true);
        expect( ok.getGhost() ).to.equal('r(2)');
        done();
    });

    it ( 'can fail', done => {
        const ok = new refute.Report();
        ok.equals( 'freedom', 'slavery' );
        ok.equals( 'war', 'peace' );
        expect( ok.isPassing() ).to.equal(false);
        expect( ok.getGhost() ).to.equal('r(N,N)');
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
        expect( ok.getGhost() ).to.equal('r(1,r(N),1)');

        done();
    });

    it ('can nest real hard', done => {
        const ok = refute.report( ok => {
            ok.pass();
            ok.pass();
            ok.nested( 'nest', ok => {
                ok.nested( 'nest', ok => {
                    ok.pass();
                    ok.fail();
                });
                ok.nested( 'nest', ok => {
                    ok.pass();
                    ok.fail();
                });
            });
            ok.nested( 'nest', ok => {
                ok.pass();
                ok.pass();
                ok.pass();
            });
            ok.fail();
            ok.pass();
        });

        expect( ok.getGhost() ).to.equal('r(2,r(r(1,N),r(1,N)),r(3),N,1)');

        done();
    });
});

