'use strict';
const chai = require('chai');
const expect = chai.expect;

const refute = require( '../lib/refute.js' );
const Report = refute.Report;

describe( 'type', () => {
    // [ description, getPass, got, expected, [ getDetails(1).info ]
    const cases = [
        [
            'null pass',
            true,
            null,
            'null'
        ],
        [
            'null !object',
            false,
            null,
            'object',
        ],
        [
            'string',
            true,
            'foo bared',
            'string',
        ],
        [
            'string not',
            false,
            42,
            'string',
        ],
        [
            'array',
            true,
            [],
            'array',
        ],
        [
            'not array',
            false,
            {length:1},
            'array',
        ],
        [
            'object class',
            true,
            new Set(),
            Set,
        ],
        [
            'object class 2',
            true,
            new refute.Report(),
            refute.Report,
        ],
        [
            'object class failed',
            false,
            {},
            refute.Report,
            (ok,info) => {
                ok.equal( info[0], '- {}', 'what we got' );
                ok.match( info[1], /^\+ /, 'what we expected');
                ok.match( info[1], /Report/, 'Report class mentioned' );
                ok.numCmp( info[1].length, '<', 100, 'does not insert the whole class there');
            }
        ],
        [
            'not number',
            false,
            "42",
            'number',
        ],
        [
            'number',
            true,
            42,
            'number',
        ],
        [
            'number 2',
            true,
            3.14,
            'number',
        ],
        [
            'number inf',
            true,
            Infinity,
            'number',
        ],
        [
            'undef',
            true,
            undefined,
            'undefined',
        ],
        [
            'undef 2',
            false,
            null,
            'undefined',
        ],
        [
            'function',
            true,
            x=>x,
            'function',
        ],
        [
            'boolean',
            true,
            true,
            'boolean',
        ],
        [
            'expecting garbage',
            false,
            true,
            'true',
            (ok, data) => {
                ok.match( data[0], /nknown.*type/ );
            }
        ],
        [
            'object {}',
            true,
            {},
            'object',
        ],
        [
            'blessed object',
            true,
            new Set(),
            'object',
        ],
        [
            'not a number',
            false,
            NaN,
            'number',
        ],
        [
            'number+nan 1',
            true,
            NaN,
            ['number','nan'],
        ],
        [
            'number+nan 2',
            true,
            42,
            ['number','nan'],
        ],
        [
            'number+nan 3',
            true,
            3.14,
            ['number','nan'],
        ],
        [
            'number+nan fail',
            false,
            "42",
            ['number','nan'],
        ],
    ];

    for (let item of cases) {
        it( item[0], done => {
            const ok = refute.report( ok => {
                ok.info( 'expecting '+(item[1] ? 'pass' : 'failure') );
                ok.type( item[2], item[3] );
            });

            if (ok.getPass() !== item[1])
                throw new Error( ok.getTap() );

            if (item[4])
                refute( ok.getDetails(1).evidence, item[4] );

            done();
        });
    };

});
