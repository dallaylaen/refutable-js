'use strict';
const chai = require('chai');
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'Report.cmpNum', () => {
    it( '<', done => {
        const ok = refute.report( ok => {
            ok.cmpNum( 'foo', '<', undefined );
            ok.cmpNum( undefined, '<', 'foo' );

            ok.cmpNum( 'bar', '<', 'foo' );
            ok.cmpNum( 'foo', '<', 'bar' );
            ok.cmpNum( 'foo', '<', 'foo' );

            ok.cmpNum( 42,  '<', 137 );
            ok.cmpNum( 137, '<', 42 );
            ok.cmpNum( 42,  '<', '137' );
            ok.cmpNum( 137, '<', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,1,N,N,1,N,1,N)');
        done();
    });
    it( '<=', done => {
        const ok = refute.report( ok => {
            ok.cmpNum( 'foo', '<=', undefined );
            ok.cmpNum( undefined, '<=', 'foo' );

            ok.cmpNum( 'bar', '<=', 'foo' );
            ok.cmpNum( 'foo', '<=', 'bar' );
            ok.cmpNum( 'foo', '<=', 'foo' );

            ok.cmpNum( 42,  '<=', 137 );
            ok.cmpNum( 137, '<=', 42 );
            ok.cmpNum( 42,  '<=', '137' );
            ok.cmpNum( 137, '<=', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,1,N,2,N,1,N)');
        done();
    });

    it( '>', done => {
        const ok = refute.report( ok => {
            ok.cmpNum( 'foo', '>', undefined );
            ok.cmpNum( undefined, '>', 'foo' );

            ok.cmpNum( 'bar', '>', 'foo' );
            ok.cmpNum( 'foo', '>', 'bar' );
            ok.cmpNum( 'foo', '>', 'foo' );

            ok.cmpNum( 42,  '>', 137 );
            ok.cmpNum( 137, '>', 42 );
            ok.cmpNum( 42,  '>', '137' );
            ok.cmpNum( 137, '>', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,N,1,N,N,1,N,1)');
        done();
    });
    it( '>=', done => {
        const ok = refute.report( ok => {
            ok.cmpNum( 'foo', '>=', undefined );
            ok.cmpNum( undefined, '>=', 'foo' );

            ok.cmpNum( 'bar', '>=', 'foo' );
            ok.cmpNum( 'foo', '>=', 'bar' );
            ok.cmpNum( 'foo', '>=', 'foo' );

            ok.cmpNum( 42,  '>=', 137 );
            ok.cmpNum( 137, '>=', 42 );
            ok.cmpNum( 42,  '>=', '137' );
            ok.cmpNum( 137, '>=', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,N,2,N,1,N,1)');
        done();
    });
    it( '==', done => {
        const ok = refute.report( ok => {
            ok.cmpNum( 'undefined', '==', undefined );
            ok.cmpNum( undefined, '==', 'undefined' );

            ok.cmpNum( 'bar', '==', 'foo' );
            ok.cmpNum( 'foo', '==', 'bar' );
            ok.cmpNum( 'foo', '==', 'foo' );

            ok.cmpNum( 42,  '==', 137 );
            ok.cmpNum( 137, '==', 42 );
            ok.cmpNum( 42,  '==', '137' );
            ok.cmpNum( 137, '==', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(N,N,N,N,1,N,N,N,N)');
        done();
    });
    it( '!=', done => {
        const ok = refute.report( ok => {
            ok.cmpNum( 'undefined', '!=', undefined );
            ok.cmpNum( undefined, '!=', 'undefined' );

            ok.cmpNum( 'bar', '!=', 'foo' );
            ok.cmpNum( 'foo', '!=', 'bar' );
            ok.cmpNum( 'foo', '!=', 'foo' );

            ok.cmpNum( 42,  '!=', 137 );
            ok.cmpNum( 137, '!=', 42 );
            ok.cmpNum( 42,  '!=', '137' );
            ok.cmpNum( 137, '!=', '42' );
        });
        expect( ok.getGhost() ).to.equal('r(4,N,4)');
        done();
    });
});
