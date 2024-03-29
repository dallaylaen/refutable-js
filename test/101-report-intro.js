'use strict';
const { expect } = require('chai');

const { Report } = require( '../lib/report.js' );

describe( 'Report', () => {
    it ('can execute checks', done => {
        const ok = new Report();
        expect( ok.getDone()    ).to.equal( false );
        expect( ok.getCount()  ).to.equal( 0 );
        expect( ok.getPass() ).to.equal( true );
        expect( ok.last() ).to.equal( undefined );

        expect( ok.check( 0, 'zero evidence check' ) ).to.equal( ok );
        expect( ok.getDone()    ).to.equal( false );
        expect( ok.getCount()  ).to.equal( 1 );
        expect( ok.getPass() ).to.equal( true );
        expect( ok.last() ).to.equal( true );

        expect( ok.check( 'objection!', 'Phoenix Wright appears' ) ).to.equal( ok );
        expect( ok.getDone()    ).to.equal( false );
        expect( ok.getCount()  ).to.equal( 2 );
        expect( ok.getPass() ).to.equal( false );
        expect( ok.last() ).to.equal( false );

        // check chainability
        expect( ok.info( 'some text' ) ).to.equal( ok );
        expect( ok.done() ).to.equal( ok );

        expect( ok.getDone()    ).to.equal( true );
        expect( ok.getCount()  ).to.equal( 2 );
        expect( ok.getPass() ).to.equal( false );
        expect( ok.getGhost()  ).to.equal( 'r(1,N)' );

        expect( () => ok.info('more text') ).to.throw(/finished/);
        expect( () => ok.check(0, 'extra check') ).to.throw(/finished/);

        // unaffected by dying calls
        expect( ok.getCount() ).to.equal( 2 );

        expect( ok.getPass(0) ).to.equal( undefined );
        expect( ok.getPass(1) ).to.equal( true );
        expect( ok.getPass(2) ).to.equal( false );
        expect( ok.getPass(3) ).to.equal( undefined );

        done();
    });

    it( 'passes when empty', done => {
        const ok = new Report();
        ok.done();
        expect( ok.getCount() ).to.equal( 0 );
        expect( ok.getPass() ).to.equal( true );
        expect( ok.getGhost() ).to.equal( 'r()' );
        done();
    });
});
