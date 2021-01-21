'use strict';
const chai = require('chai');
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'Report.strCmp', () => {
    it( '<', done => {
        const ok = refute.report( ok => {
            ok.strCmp( 'foo', '<', undefined );
            ok.strCmp( undefined, '<', 'foo' );

            ok.strCmp( 'bar', '<', 'foo' );
            ok.strCmp( 'foo', '<', 'bar' );
            ok.strCmp( 'foo', '<', 'foo' );

            ok.strCmp( 42,  '<', 137 );
            ok.strCmp( 137, '<', 42 );
            ok.strCmp( 42,  '<', '137' );
            ok.strCmp( 137, '<', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,1,N,N,N,1,N,1)');
        done();
    });
    it( '<=', done => {
        const ok = refute.report( ok => {
            ok.strCmp( 'foo', '<=', undefined );
            ok.strCmp( undefined, '<=', 'foo' );

            ok.strCmp( 'bar', '<=', 'foo' );
            ok.strCmp( 'foo', '<=', 'bar' );
            ok.strCmp( 'foo', '<=', 'foo' );

            ok.strCmp( 42,  '<=', 137 );
            ok.strCmp( 137, '<=', 42 );
            ok.strCmp( 42,  '<=', '137' );
            ok.strCmp( 137, '<=', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,1,N,1,N,1,N,1)');
        done();
    });

    it( '>', done => {
        const ok = refute.report( ok => {
            ok.strCmp( 'foo', '>', undefined );
            ok.strCmp( undefined, '>', 'foo' );

            ok.strCmp( 'bar', '>', 'foo' );
            ok.strCmp( 'foo', '>', 'bar' );
            ok.strCmp( 'foo', '>', 'foo' );

            ok.strCmp( 42,  '>', 137 );
            ok.strCmp( 137, '>', 42 );
            ok.strCmp( 42,  '>', '137' );
            ok.strCmp( 137, '>', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,N,1,N,1,N,1,N)');
        done();
    });
    it( '>=', done => {
        const ok = refute.report( ok => {
            ok.strCmp( 'foo', '>=', undefined );
            ok.strCmp( undefined, '>=', 'foo' );

            ok.strCmp( 'bar', '>=', 'foo' );
            ok.strCmp( 'foo', '>=', 'bar' );
            ok.strCmp( 'foo', '>=', 'foo' );

            ok.strCmp( 42,  '>=', 137 );
            ok.strCmp( 137, '>=', 42 );
            ok.strCmp( 42,  '>=', '137' );
            ok.strCmp( 137, '>=', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,N,3,N,1,N)');
        done();
    });
    it( '==', done => {
        const ok = refute.report( ok => {
            ok.strCmp( 'undefined', '==', undefined );
            ok.strCmp( undefined, '==', 'undefined' );

            ok.strCmp( 'bar', '==', 'foo' );
            ok.strCmp( 'foo', '==', 'bar' );
            ok.strCmp( 'foo', '==', 'foo' );

            ok.strCmp( 42,  '==', 137 );
            ok.strCmp( 137, '==', 42 );
            ok.strCmp( 42,  '==', '137' );
            ok.strCmp( 137, '==', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,N,N,1,N,N,N,N)');
        done();
    });
    it( '!=', done => {
        const ok = refute.report( ok => {
            ok.strCmp( 'undefined', '!=', undefined );
            ok.strCmp( undefined, '!=', 'undefined' );

            ok.strCmp( 'bar', '!=', 'foo' );
            ok.strCmp( 'foo', '!=', 'bar' );
            ok.strCmp( 'foo', '!=', 'foo' );

            ok.strCmp( 42,  '!=', 137 );
            ok.strCmp( 137, '!=', 42 );
            ok.strCmp( 42,  '!=', '137' );
            ok.strCmp( 137, '!=', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(4,N,4)');
        done();
    });
});
