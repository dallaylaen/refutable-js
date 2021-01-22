'use strict';
const chai = require('chai');
const expect = chai.expect;

const { NotedSet } = require( '../lib/refute/util/noted-set.js' );

describe( 'NotedSet', () => {
    it ('can store objects', done => {
        const foo = {};
        const bar = {};

        const ns = new NotedSet();

        ns.add( foo, "foo" );
        expect( ns.get(foo) ).to.equal( "foo" );
        expect( ns.get(bar) ).to.equal( undefined );

        ns.add( bar, "bar" );
        expect( ns.get(foo) ).to.equal( "foo" );
        expect( ns.get(bar) ).to.equal( "bar" );

        console.log(ns);

        done();
    });
    it ('can store many objects', done => {
        const ns = new NotedSet();

        const list = [];
        for (let i = 0; i<10000; i++) {
            const item = {id:i};
            list.push(item);
            ns.add(item, i);
        };

        for (let n of [1,2,4,8,16,32,64,128,256,512]) {
            expect( ns.get(list[n]) ).to.equal(n);
        };

        done();
    });
});
