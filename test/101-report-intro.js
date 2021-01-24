'use strict';
const { expect } = require('chai');

const { Report } = require( '../lib/refute/report.js' );

describe( 'Report', () => {
    it ('can execute checks', done => {
        const ok = new Report();
        expect( ok.isDone()    ).to.equal( false );
        expect( ok.getCount()  ).to.equal( 0 );
        expect( ok.isPassing() ).to.equal( true );

        expect( ok.check( 0, 'zero evidence check' ) ).to.equal( true );
        expect( ok.isDone()    ).to.equal( false );
        expect( ok.getCount()  ).to.equal( 1 );
        expect( ok.isPassing() ).to.equal( true );
        
        expect( ok.check( 'objection!', 'Phoenix Wright appears' ) ).to.equal( false );
        expect( ok.isDone()    ).to.equal( false );
        expect( ok.getCount()  ).to.equal( 2 );
        expect( ok.isPassing() ).to.equal( false );

        // check chainability
        expect( ok.diag( 'some text' ) ).to.equal( ok );
        expect( ok.stop() ).to.equal( ok );

        expect( ok.isDone()    ).to.equal( true );
        expect( ok.getCount()  ).to.equal( 2 );
        expect( ok.isPassing() ).to.equal( false );
        expect( ok.getGhost()  ).to.equal( 'r(1,N)' );

        expect( () => ok.diag('more text') ).to.throw(/finished/);
        expect( () => ok.check(0, 'extra check') ).to.throw(/finished/);

        done();
    });

    it( 'fails when empty', done => {
        const ok = new Report();
        ok.stop();
        expect( ok.getCount() ).to.equal( 0 );
        expect( ok.isPassing() ).to.equal( false );
        done();
    });
});
