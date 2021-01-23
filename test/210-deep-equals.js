'use strict';
const chai = require('chai');
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'deepEqual', () => {
    class Foo {
        constructor(arg) {
            this.arg = arg;
        }
    };

    const circularArray = [];
    circularArray.push( circularArray );

    // [ description, isPassing, got, expected, [ getDetails(1).diag ]
    const cases = [
        [
            'simple nested',
            true,
            ["foo", ["bar"], { quuz: 42 }],
            ["foo", ["bar"], { quuz: 42 }]
        ],
        [
            'function',
            false,
            x => x,
            x => x,
        ],
        [
            'diff type',
            false,
            { target: [] },
            { target: {} },
        ],
        [
            'diff type 2',
            false,
            { target: {length: 0} },
            { target: [] },
        ],
        [
            'diff type 3',
            false,
            { },
            "",
        ],
        [
            'null vs undef',
            false,
            null,
            undefined,
        ],
        [
            'diff keys',
            false,
            { foo: 42, bar: 137 },
            { bar: 137, quux: true },
        ],
        [
            'blessed vs unblessed',
            false,
            new Foo(42),
            {"arg":42},
        ],
        [
            'blessed vs blessed',
            true,
            new Foo([42]),
            new Foo([42]),
        ],
        [
            'same sets',
            true,
            new Set( "foo" ),
            new Set( "foo" ),
        ],
        [
            'different sets',
            true, // TODO
            new Set( "foo" ),
            new Set( "bar" ),
        ],
        [
            'multiple errors',
            false,
            [ { "foo": [42, 42]}, { "bar":137 }, { "quuz": true } ],
            [ { "foo": [42, 43]}, { "bar":137 }, { "quuz": false } ],
            (ok, lines) => {
                ok.equal( lines.length, 6 );
                ok.match( lines[0], /\[0\]\["foo"\]\[1\]/ );
            }
        ],
        [
            'circular expected',
            false,
            [[circularArray]], // bury it deep enough for === to fail
            circularArray,
            (ok, data) => {
                ok.match( data[0], /ircular.*auto-fail/ );
            },
        ],
        [
            'circular got',
            false,
            circularArray,
            [[[]]],
        ],
    ];

    for (let item of cases) {
        it( item[0], done => {
            const ok = refute.report( ok => {
                ok.diag( 'expecting '+(item[1] ? 'pass' : 'failure') );
                ok.deepEqual( item[2], item[3] );
            });

            if (ok.isPassing() !== item[1])
                throw new Error( ok.getTap() );

            // contract for output
            refute( ok.getDetails(1).reason, (ok, data) => {
                ok.equal( data.length % 3, 0, '3 lines per error' );
                for (let i = 0; i < data.length; i = i+3) {
                    ok.match( data[i], /at \$/, 'where difference was found');
                    ok.match( data[i+1], /^-/, 'got' );
                    ok.match( data[i+2], /^\+/, 'expected' );
                };
            });

            if (item[4])
                refute( ok.getDetails(1).reason, item[4] );

            done();
        });
    };
});
