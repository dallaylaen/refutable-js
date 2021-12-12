'use strict';
const chai = require('chai');
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'Report.cmpStr', () => {
    it( '<', done => {
        const ok = refute.report( ok => {
            ok.cmpStr( 'foo', '<', undefined );
            ok.cmpStr( undefined, '<', 'foo' );

            ok.cmpStr( 'bar', '<', 'foo' );
            ok.cmpStr( 'foo', '<', 'bar' );
            ok.cmpStr( 'foo', '<', 'foo' );

            ok.cmpStr( 42,  '<', 137 );
            ok.cmpStr( 137, '<', 42 );
            ok.cmpStr( 42,  '<', '137' );
            ok.cmpStr( 137, '<', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,1,N,N,N,1,N,1)');
        done();
    });
    it( '<=', done => {
        const ok = refute.report( ok => {
            ok.cmpStr( 'foo', '<=', undefined );
            ok.cmpStr( undefined, '<=', 'foo' );

            ok.cmpStr( 'bar', '<=', 'foo' );
            ok.cmpStr( 'foo', '<=', 'bar' );
            ok.cmpStr( 'foo', '<=', 'foo' );

            ok.cmpStr( 42,  '<=', 137 );
            ok.cmpStr( 137, '<=', 42 );
            ok.cmpStr( 42,  '<=', '137' );
            ok.cmpStr( 137, '<=', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,1,N,1,N,1,N,1)');
        done();
    });

    it( '>', done => {
        const ok = refute.report( ok => {
            ok.cmpStr( 'foo', '>', undefined );
            ok.cmpStr( undefined, '>', 'foo' );

            ok.cmpStr( 'bar', '>', 'foo' );
            ok.cmpStr( 'foo', '>', 'bar' );
            ok.cmpStr( 'foo', '>', 'foo' );

            ok.cmpStr( 42,  '>', 137 );
            ok.cmpStr( 137, '>', 42 );
            ok.cmpStr( 42,  '>', '137' );
            ok.cmpStr( 137, '>', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,N,1,N,1,N,1,N)');
        done();
    });
    it( '>=', done => {
        const ok = refute.report( ok => {
            ok.cmpStr( 'foo', '>=', undefined );
            ok.cmpStr( undefined, '>=', 'foo' );

            ok.cmpStr( 'bar', '>=', 'foo' );
            ok.cmpStr( 'foo', '>=', 'bar' );
            ok.cmpStr( 'foo', '>=', 'foo' );

            ok.cmpStr( 42,  '>=', 137 );
            ok.cmpStr( 137, '>=', 42 );
            ok.cmpStr( 42,  '>=', '137' );
            ok.cmpStr( 137, '>=', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,N,3,N,1,N)');
        done();
    });
    it( '==', done => {
        const ok = refute.report( ok => {
            ok.cmpStr( 'undefined', '==', undefined );
            ok.cmpStr( undefined, '==', 'undefined' );

            ok.cmpStr( 'bar', '==', 'foo' );
            ok.cmpStr( 'foo', '==', 'bar' );
            ok.cmpStr( 'foo', '==', 'foo' );

            ok.cmpStr( 42,  '==', 137 );
            ok.cmpStr( 137, '==', 42 );
            ok.cmpStr( 42,  '==', '137' );
            ok.cmpStr( 137, '==', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,N,N,1,N,N,N,N)');
        done();
    });
    it( '!=', done => {
        const ok = refute.report( ok => {
            ok.cmpStr( 'undefined', '!=', undefined );
            ok.cmpStr( undefined, '!=', 'undefined' );

            ok.cmpStr( 'bar', '!=', 'foo' );
            ok.cmpStr( 'foo', '!=', 'bar' );
            ok.cmpStr( 'foo', '!=', 'foo' );

            ok.cmpStr( 42,  '!=', 137 );
            ok.cmpStr( 137, '!=', 42 );
            ok.cmpStr( 42,  '!=', '137' );
            ok.cmpStr( 137, '!=', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(4,N,4)');
        done();
    });
});
