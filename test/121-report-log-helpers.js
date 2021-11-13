'use strict';

const { expect } = require ('chai');
const { log } = require( '../lib/refute/report.js' );

describe ('Report.log', () => {
    it ('is a hash', done => {
        expect( typeof log ).to.equal( 'object' );
        expect( !!log ).to.equal( true ); // not null
        expect( Object.keys( log ).length > 3 ).to.equal( true );
        done();
    });

    for( let i in log ) {
        it( 'contains a helper function '+i, done => {
            expect( typeof log[i] ).to.equal( 'function' );

            // yikes, duck typing
            expect( typeof log[i]('foo bared') ).to.equal( 'object' );
            expect( log[i]('foo bared') ).to.match( /foo bared\n?$/ );
            done();
        });
    };
});
