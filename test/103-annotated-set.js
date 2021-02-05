'use strict';
const { expect } = require( 'chai' );

const { AnnotatedSet } = require( '../lib/refute/util/annotated-set.js' );

describe( 'AnnotatedSet', () => {
    it ( 'can store & search data', done => {
        const foo = { foo: 42 };
        const bar = { bar: 137 };

        const nil = new AnnotatedSet();
        const one = nil.add( foo, 'food' );
        const two = one.add( bar, 'bard' );

        expect( nil.has( foo ) ).to.equal( undefined );
        expect( one.has( foo ) ).to.equal( 'food' );
        expect( two.has( foo ) ).to.equal( 'food' );

        expect( nil.has( bar ) ).to.equal( undefined );
        expect( one.has( bar ) ).to.equal( undefined );
        expect( two.has( bar ) ).to.equal( 'bard' );

        done();
    });
});
