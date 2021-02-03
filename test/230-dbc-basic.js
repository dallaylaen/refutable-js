'use strict';
const { expect } = require ('chai' );

const {DBC} = require( '../lib/refute/dbc.js' );
require( '../lib/refute.js' ); // load condition library

describe( 'Eiffel-style contracts', () => {
    it( 'can decorate a function', done => {
        const orig = (a,b) => a + b;
        const dbc = new DBC()
        .pre( (must, _, a, b) => {
            must.type( a, 'number' );
            must.type( b, 'number' );
        })
        .post( (must, ret, a, b) => {
            must.numCmp( ret, '>', a );
            must.numCmp( ret, '>', b );
        });

        const deco = dbc.decorate(orig);

        expect( deco.orig ).to.equal( orig );

        expect( deco( 2, 2 ) ).to.equal(4);

        expect( () => deco( 2, '2' ) ).to.throw( /pre-condition.*\+ number/s );
        expect( () => deco( -1, 2  ) ).to.throw( /post-condition.*is not >/s );
        

        done();
    });
});
