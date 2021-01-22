'use strict';
const chai = require('chai');
const expect = chai.expect;

const { explain } = require( '../lib/refute/report.js' );

describe( 'explain', () => {
    class Foo {
        constructor(n) {
            this.n=n;
        }
    }

    it ('handles simple values', done => {
        expect( explain(undefined) ).to.equal('<undef>');
        expect( explain(42) ).to.equal(42);
        expect( explain('foo bar') ).to.equal('"foo bar"');
        expect( explain('"foo"\n"bar"') ).to.equal('"\\"foo\\"\\n\\"bar\\""');
        done();
    });

    it ('handles objects', done => {
        expect( explain({}) ).to.equal('{}');
        expect( explain([]) ).to.equal('[]');

        expect( explain([1,2,3]) ).to.equal('[1, 2, 3]');
        expect( explain({foo:42}) ).to.equal('{"foo":42}');

        expect( explain({foo:42,bar:[1,2,3]}) ).to.equal('{"bar":[1, 2, 3], "foo":42}');

        done();
    });

    it ('handles depth', done => {
        expect( explain( [[[]]], 1 ) ).to.equal('[[...]]');
        expect( explain( [[[]]], 2 ) ).to.equal('[[[...]]]');
        expect( explain( [[[]]], 3 ) ).to.equal('[[[]]]');

        expect( explain( { foo: { bar: {quux: 42 }, x: 137 }, f:3.14 }, 2 ) )
            .to.equal('{"f":3.14, "foo":{"bar":{...}, "x":137}}');

        done();
    });

    it ('handles objects', done => {
        const foo = new Foo(42);
        expect( explain( foo ) ).to.equal('Foo {"n":42}');

        done();
    });

    it ('handles seen objects', done => {
        const foo = new Foo(42);

        expect( explain( [foo, foo] ) ).to.equal('[Foo {"n":42}, Foo {...(seen)}]');
        expect( explain( { x:foo, y:foo, z:new Foo(42) } ) )
            .to.equal('{"x":Foo {"n":42}, "y":Foo {...(seen)}, "z":Foo {"n":42}}');

        done();
    });
});
