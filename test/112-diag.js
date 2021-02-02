'use strict';
const chai = require('chai');
const expect = chai.expect;

const { Report } = require( '../lib/refute/report.js' );

describe( 'Report.info', () => {
    // description, values to pass, expected tap
    const cases = [
        [
            'numeric value',
            [42],
            '# 42',
        ],
        [
            'string value',
            [ "foo bared" ],
            '# foo bared',
        ],
        [
            'structure',
            [ [ 42, { foo: 137 }] ],
            '# [42, {"foo":137}]'
        ],
        [
            'multiple args',
            [ "result is", 42, "arguments were", [ "foo", "bar" ] ],
            '# result is 42 arguments were ["foo", "bar"]',
        ],
        [
            'missing value',
            [ "fetching", {foo:42}.bar ],
            '# fetching <undef>',
        ],
        [
            'null, true, false',
            [ null, true, false ],
            '# null true false',
        ],
    ];

    for (let item of cases) {
        it (item[0], done => {
            const ok = new Report();
            ok.info(...item[1]);
            expect( ok.getTap() ).to.equal( '1..0\n'+item[2]+'\n' );
            done();
        });
    };
});
