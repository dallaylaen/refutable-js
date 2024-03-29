'use strict';
const { expect } = require( 'chai' );
const { parse  } = require( '../lib/parse.js' );

describe( 'parse/toString tound trip', () => {
    const cases = [
        // [ name, text, ghost, extraChecks() ]
        [
            '1 pass',
            `r(
                1.
            )`,
            'r(1)',
        ],
        [
            '1 fail',
            `r(
                !1.
                    ^ Condition \`check\` failed at foo:42:6
            )`,
            'r(N)',
        ],
        [
            'pending',
            `r(
                ...1. pending test
            )`,
            'r(1)',
        ],
        [
            'nested',
            `r(
                1. foo
                r(
                    1. fine
                )
                !2. bar
                r(
                    !1. nope
                        ^ Condition \`foo\` failed at lol.js:42
                        - wut wut
                )
            )`,
            'r(r(1),r(N))'
        ],
    ];

    for( let i of cases ) {
        it( i[0], done => {
            // trim indentation
            const [ _, indent ] = i[1].match( new RegExp('\\n( *)\\)$', 's') );
            const text =
                'refute/'+parse.protocol+'\n'
                +i[1].replace( new RegExp( '^'+indent, 'mg' ), '' );

            // generate report
            const r = parse( text );
            if (i[3])
                i[3]( r, text );
            expect( r.getGhost() ).to.equal(i[2]);
            expect( r.toString() ).to.equal(text);
            done();
        });
    }
});
