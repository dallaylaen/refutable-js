'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'refute.Report', () => {
    it ( 'passes by default', done => {
        const ok = new refute.Report();
        expect( ok.getPass() ).to.equal(true);
        expect( ok.getGhost() ).to.equal('r()');
        done();
    });

    it ( 'can pass', done => {
        const ok = new refute.Report();
        ok.equal( 'animal', 'animal' );
        ok.equal( 'animal', 'animal' );
        expect( ok.getPass() ).to.equal(true);
        expect( ok.getGhost() ).to.equal('r(2)');
        done();
    });

    it ( 'can fail', done => {
        const ok = new refute.Report();
        ok.equal( 'freedom', 'slavery' );
        ok.equal( 'war', 'peace' );
        expect( ok.getPass() ).to.equal(false);
        expect( ok.getGhost() ).to.equal('r(N,N)');
        done();
    });

    it ( 'can nest', done => {
        const ok = refute.report( ok => {
            ok.equal( 1, 1 );
            ok.nested( 'foo bared', ok2 => {
                ok2.equal( 'war', 'peace' );
            });
            ok.equal( 1, 1 );
        });

        expect( ok.getPass() ).to.equal(false);
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

