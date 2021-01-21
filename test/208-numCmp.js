'use strict';
const chai = require('chai');
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'Report.numCmp', () => {
    it( '<', done => {
        const ok = refute.report( ok => {
            ok.numCmp( 'foo', '<', undefined );
            ok.numCmp( undefined, '<', 'foo' );

            ok.numCmp( 'bar', '<', 'foo' );
            ok.numCmp( 'foo', '<', 'bar' );
            ok.numCmp( 'foo', '<', 'foo' );

            ok.numCmp( 42,  '<', 137 );
            ok.numCmp( 137, '<', 42 );
            ok.numCmp( 42,  '<', '137' );
            ok.numCmp( 137, '<', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,1,N,N,1,N,1,N)');
        done();
    });
    it( '<=', done => {
        const ok = refute.report( ok => {
            ok.numCmp( 'foo', '<=', undefined );
            ok.numCmp( undefined, '<=', 'foo' );

            ok.numCmp( 'bar', '<=', 'foo' );
            ok.numCmp( 'foo', '<=', 'bar' );
            ok.numCmp( 'foo', '<=', 'foo' );

            ok.numCmp( 42,  '<=', 137 );
            ok.numCmp( 137, '<=', 42 );
            ok.numCmp( 42,  '<=', '137' );
            ok.numCmp( 137, '<=', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,1,N,2,N,1,N)');
        done();
    });

    it( '>', done => {
        const ok = refute.report( ok => {
            ok.numCmp( 'foo', '>', undefined );
            ok.numCmp( undefined, '>', 'foo' );

            ok.numCmp( 'bar', '>', 'foo' );
            ok.numCmp( 'foo', '>', 'bar' );
            ok.numCmp( 'foo', '>', 'foo' );

            ok.numCmp( 42,  '>', 137 );
            ok.numCmp( 137, '>', 42 );
            ok.numCmp( 42,  '>', '137' );
            ok.numCmp( 137, '>', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,N,1,N,N,1,N,1)');
        done();
    });
    it( '>=', done => {
        const ok = refute.report( ok => {
            ok.numCmp( 'foo', '>=', undefined );
            ok.numCmp( undefined, '>=', 'foo' );

            ok.numCmp( 'bar', '>=', 'foo' );
            ok.numCmp( 'foo', '>=', 'bar' );
            ok.numCmp( 'foo', '>=', 'foo' );

            ok.numCmp( 42,  '>=', 137 );
            ok.numCmp( 137, '>=', 42 );
            ok.numCmp( 42,  '>=', '137' );
            ok.numCmp( 137, '>=', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,N,2,N,1,N,1)');
        done();
    });
    it( '==', done => {
        const ok = refute.report( ok => {
            ok.numCmp( 'undefined', '==', undefined );
            ok.numCmp( undefined, '==', 'undefined' );

            ok.numCmp( 'bar', '==', 'foo' );
            ok.numCmp( 'foo', '==', 'bar' );
            ok.numCmp( 'foo', '==', 'foo' );

            ok.numCmp( 42,  '==', 137 );
            ok.numCmp( 137, '==', 42 );
            ok.numCmp( 42,  '==', '137' );
            ok.numCmp( 137, '==', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,N,N,1,N,N,N,N)');
        done();
    });
    it( '!=', done => {
        const ok = refute.report( ok => {
            ok.numCmp( 'undefined', '!=', undefined );
            ok.numCmp( undefined, '!=', 'undefined' );

            ok.numCmp( 'bar', '!=', 'foo' );
            ok.numCmp( 'foo', '!=', 'bar' );
            ok.numCmp( 'foo', '!=', 'foo' );

            ok.numCmp( 42,  '!=', 137 );
            ok.numCmp( 137, '!=', 42 );
            ok.numCmp( 42,  '!=', '137' );
            ok.numCmp( 137, '!=', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(4,N,4)');
        done();
    });
});
