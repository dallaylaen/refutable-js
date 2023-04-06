'use strict';

const { expect } = require( 'chai' );
const { Report } = require( '../lib/index' );

describe( 'Report', () => {
    it('can be chained', done => {
        new Report()
            .equal(42, 137, 'life is fine')
            .match('str', /.*/, 'anything goes')
            .nested( 'inside contract', r => r
                .equal( 2+2, 4, 'ok test just in case' )
            )
            .done( r => {
                expect( r.getGhost() ).to.equal('r(N,1,r(1))');
                done();
            });
    });

    it('can handle promise', done => {
        new Report()
            .check(Promise.resolve('fail deliberately'))
            .done( r => {
                expect( r.getGhost() ).to.equal( 'r(N)');
                done();
            })
    });

    it('can handle nested promise', done => {
        new Report()
            .nested( 'deep', r => r.check( Promise.resolve('fail deliberately')))
            .done( r => {
                expect( r.getGhost() ).to.equal('r(r(N))');
                done();
            })
    })
})
