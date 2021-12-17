'use strict';
const chai = require('chai');
const expect = chai.expect;

const refute = require( '../lib/index.js' );

describe( 'deepEqual', () => {
    class Foo {
        constructor(arg) {
            this.arg = arg;
        }
    };

    const circ = (n) => {
        const root = [];
        let deep = root;
        while(n-->0)
            deep = [deep];
        root.push(deep);
        return root;
    };

    // [ description, getPass, got, expected, [ getDetails(1).info ]
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
            [[circ(0)]], // bury it deep enough for === to fail
            circ(0),
            (ok, data) => {
                ok.equal( data.length, 3, '3 lines total' )
                ok.match( data[0], /ircular/ );
                ok.match( data[1], /=\$/ );
                ok.match( data[2], /=\$$/ );
                if (!ok.getPass()) {
                    ok.info( "result was: " );
                    data.forEach( s => ok.info( s ));
                };
            },
        ],
        [
            'circular got',
            false,
            circ(0),
            [[[]]],
            (ok, data) => {
                ok.match(data[0], /\$\[0\] *\([Cc]ircular\)/);
            },
        ],
        [
            'circular pass',
            true,
            circ(4),
            circ(4),
        ],
        [
            'circular not mislead',
            false,
            [  circ(4), ],
            [[ circ(3) ]],
            (ok, data) => {
                ok.match( data[1], /\$\[0\]$/ );
                ok.match( data[2], /\$\[0\]\[0\]$/ );
            },
        ]
    ];

    for (let item of cases) {
        it( item[0], done => {
            const ok = refute.report( ok => {
                ok.info( 'expecting '+(item[1] ? 'pass' : 'failure') );
                ok.deepEqual( item[2], item[3] );
            });

            if (ok.getPass() !== item[1])
                throw new Error( ok.toString() );

            // contract for output
            refute( ok.getDetails(1).evidence, (ok, data) => {
                ok.equal( data.length % 3, 0, '3 lines per error' );
                for (let i = 0; i < data.length; i = i+3) {
                    ok.match( data[i], /at \$/, 'where difference was found');
                    ok.match( data[i+1], /^-/, 'got' );
                    ok.match( data[i+2], /^\+/, 'expected' );
                };
            });

            if (item[4])
                refute( ok.getDetails(1).evidence, item[4] );

            done();
        });
    };
});
