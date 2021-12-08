'use strict';

const { expect } = require('chai');

const { parse } = require('../lib/refute/parse.js');

describe( 'parse', () => {
    it( 'can parse a simple snippet', done => {
        const report = parse( `
            r(
                !1. fail
                    ^ Condition \`equal\` failed at foo.js:42
                    - war
                    + peace
            )
        `);

        expect( report.getDone() ).to.equal( true );
        expect( report.getPass() ).to.equal( false );
        expect( report.getCount() ).to.equal( 1 );

        const details = report.getDetails(1);
        expect( details.evidence ).to.deep.equal( [ '- war', '+ peace' ] );
        expect( details.cond  ).to.equal( 'equal' );
        expect( details.where ).to.equal( 'foo.js:42' );
        expect( details.name  ).to.equal( 'fail' );

        done();
    });

    it( 'can parse a snippet', done => {
        const report = parse( `
            r(
                1. pass
                !2. fail
                    ^ Condition \`equal\` failed at foo.js:42
                    - war
                    + peace
                3. nested
                r(
                    ; some text
                    1. pass
                )
            )
        `);

        expect( report.getGhost() ).to.equal( 'r(1,N,r(1))' );
        expect( report.getDone() ).to.equal( true );

        done();
    });
});
