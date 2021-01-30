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
        expect( explain(42) ).to.equal('42');
        expect( explain(null) ).to.equal('null');
        expect( explain(true) ).to.equal('true');
        expect( explain(false) ).to.equal('false');
        expect( explain("42") ).to.equal('"42"');
        expect( explain("null") ).to.equal('"null"');
        expect( explain("true") ).to.equal('"true"');
        expect( explain("false") ).to.equal('"false"');
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

        expect( explain( [foo, foo] ) ).to.equal('[Foo {"n":42}, Foo {"n":42}]');
        expect( explain( { x:foo, y:foo, z:new Foo(42) } ) )
            .to.equal('{"x":Foo {"n":42}, "y":Foo {"n":42}, "z":Foo {"n":42}}');

        done();
    });

    it ('handles circular objects', done => {
        const foo = {};
        foo.bar = [ 42, foo ];

        expect( explain( foo ) ).to.equal( '{"bar":[42, {Circular}]}' );

        const typed = new Foo(137);
        typed.bar = [ 42, typed ];

        expect( explain( typed ) ).to.equal( 'Foo {"bar":[42, Foo {Circular}], "n":137}' );

        const array = [];
        array[0] = 3.14;
        array[1] = [ array, array ];

        expect( explain(array) ).to.equal( '[3.14, [[Circular], [Circular]]]' );

        done();
    });
});

describe( 'explain vs JSON', () => {
    const input = [
        'foo bared',
        'foo\nbared',
        'foo "bared"',
        {foo:42},
        {foo:"bar"},
        42,
        false,
        true,
        null,
        [ null, null ],
        [ {foo:{bar:42}}, 0, false, [] ],
        '',
    ];

    for (let value of input) {
        const json = JSON.stringify(value).replace( /,/g, ', ' );
        it( json, done => {
            expect( explain( value, Infinity ) ).to.equal( json );
            done();
        });
    };
});
