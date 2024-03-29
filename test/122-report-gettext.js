'use strict';

const { expect } = require( 'chai' );
const { Report } = require( '../lib/report.js' );
const { parse }  = require( '../lib/parse.js' );

const unused = require( '../lib/cond/deep.js' );

describe( 'Report+parse', () => {
    it( 'can generate a summary', done => {
        const rep = new Report().run( ok => {
            ok.equal( 42, 42, 'life is fine' );
            ok.equal( 'war', 'peace', 'we are in 1984' );
            ok.nested( 'nested contract', inner => {
                inner.pass();
                inner.deepEqual( [ { foo: 42 } ], [ { foo: 137 } ], 'deep test' );
            });
        });

        const text = rep.toString();
        // console.log(text);

        expect( text ).to.match(/r\(.*\)/s);
        expect( text ).to.match(/^ *1\./m);
        expect( text ).to.match(/^ *!2\./m);


        const text2 = parse(text).toString();

        expect( text2 ).to.equal( text );

        done();
    });
});
