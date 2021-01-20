'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'refute.Contract', () => {
    it ( 'passes by default', done => {
        const ok = new refute.Contract();
        expect( ok.isPassing() ).to.equal(true);
        expect( ok.getGhost() ).to.equal('td');
        done();
    });

    it ( 'can pass', done => {
        const ok = new refute.Contract();
        ok.equals( 'animal', 'animal' );
        expect( ok.isPassing() ).to.equal(true);
        expect( ok.getGhost() ).to.equal('t1d');
        done();
    });

    it ( 'can fail', done => {
        const ok = new refute.Contract();
        ok.equals( 'freedom', 'slavery' );
        expect( ok.isPassing() ).to.equal(false);
        expect( ok.getGhost() ).to.equal('tNd');
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

        done();
    });
});

