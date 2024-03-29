'use strict';
const { expect } = require('chai');

const { Report } = require( '../lib/report.js' );

function where() {
    return new Error("probe").stack.split('\n')[2].match( /([^()\s:]+:\d+)/ )[0];
};

describe( 'Report.getDetails(n)', () => {
    const ok = new Report();
    ok.info( 'some contract' );
    ok.check( '', 'passing check' );
    // Careful! must have "where" and failing check at the same line
    ok.check( {foo:42}, 'failing check' ); const line = where();
    ok.info( 'see?' );
    ok.nested( 'nested check', inner => inner.pass() );

    it ('n=0', done => {
        const data = ok.getDetails(0);
        expect( data.n ).to.equal( 0 );
        expect( data.info ).to.deep.equal( [ 'some contract' ] );
        done();
    });

    it ('n=1', done => {
        const data = ok.getDetails(1);
        expect( data.n ).to.equal( 1 );
        expect( data.name ).to.equal( 'passing check' );
        expect( data.pass ).to.equal( true );
        // TODO evidence should be missing, now it's empty array
        expect( data.info ).to.deep.equal( [ ] );
        done();
    });
    
    it ('n=2', done => {
        const data = ok.getDetails(2);
        expect( data.n ).to.equal( 2 );
        expect( data.name ).to.equal( 'failing check' );
        expect( data.pass ).to.equal( false );
        expect( data.evidence ).to.deep.equal( [ '{"foo":42}' ] );

        // must be within this file, whatever its name
        expect( data.where ).to.match( /test\/\d+-[-\w]+\.js:\d+/ );
        // must match what refute itself calculated
        expect( data.where ).to.match( new RegExp( line ));
        expect( data.info ).to.deep.equal( [ 'see?' ] );
        done();
    });

    it ('n=3', done => {
        const data = ok.getDetails(3);
        expect( data.n ).to.equal( 3 );
        expect( data.name ).to.equal( 'nested check' );
        expect( data.pass ).to.equal( true );
        expect( data.nested ).to.be.instanceof( Report );
        done();
    });

});
