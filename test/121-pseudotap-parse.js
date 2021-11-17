'use strict';

const { expect } = require('chai');

const { parse } = require('../lib/refute/parse.js');

describe( 'parse', () => {
    it( 'can parse a simple snippet', done => {
        const report = parse( `
            r(
                1. pass
                !2. fail
                    ^ Condition equal failed at foo.js:42
                    - war
                    + peace
            )
        `);

        console.log(report.getTap());

        done();

    });

    it( 'can parse a snippet', done => {
        const report = parse( `
            r(
                1. pass
                !2. fail
                    ^ Condition equal failed as foo.js:42
                    - war
                    + peace
                3. nested
                r(
                    ; some text
                    1. pass
                )
            )
        `);

        console.log(report.getTap());

        done();
    });
});
