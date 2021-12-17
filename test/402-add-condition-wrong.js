'use strict';
const { expect } = require( 'chai' );
const { addCondition } = require( '../lib/index.js' );

describe( 'addCondition errors', () => {
    it( 'forbids bad args', done => {
        expect( _ => addCondition( 'foo', {args:1}, 42 ) )
            .to.throw(/impl/);
        expect( _ => addCondition( 42, {args:1}, x=>x ) )
            .to.throw(/must.*string/);
        expect( _ => addCondition( 'foo', 'args:1', x=>x ) )
            .to.throw(/options/);
        expect( _ => addCondition( 'foo', {}, x=>x ) )
            .to.throw(/[Aa]rgs.*integer/);
        done();
    });
    it( 'does not override Report methods', done => {
        expect( _ => addCondition( 'toJSON', {args:1}, x=>x ) )
            .to.throw(/[Mmethod].*toJSON/);
        done();
    });
});
