'use strict';
const { expect } = require( 'chai' );

const { Report } = require( '../lib/refute/report.js' );

describe( 'Report', () => {
    it( 'can handle on_done callback', done => {
        const trace = [];

        const rep = new Report();
        const chain = rep.onDone( x => trace.push(x) );

        // method is chainable
        expect( chain ).to.equal( rep );
        expect( trace ).to.deep.equal( [] );

        rep.equal( 'war', 'peace', 'not really' );
        expect( trace ).to.deep.equal( [] );
        
        rep.done();
        expect( trace ).to.deep.equal( [rep] );

        done();
    });

    it( 'can handle on_done callback in async mode', done => {
        const trace = [];

        const rep = new Report();
        const chain = rep.onDone( x => trace.push(x) );
        expect( trace ).to.deep.equal( [] );

        // TODO write it better
        let pipe;
        const later = new Promise( resolve => {
            pipe = resolve;
        });

        rep.pass('nothing');
        rep.check( later, 'deferred check' );
        expect( trace ).to.deep.equal( [] );

        // still waiting for pending check
        rep.done();
        expect( trace ).to.deep.equal( [] );
        expect( rep.getDone() ).to.equal( false );
        expect( rep.getPass() ).to.equal( true ); // not failed just yet
        
        pipe( "foo bared" );
        setTimeout( () => {
            expect( rep.getDone() ).to.equal( true );
            expect( rep.getPass() ).to.equal( false );
            expect( trace ).to.deep.equal( [rep] );

            done();
        }, 0);
    });
});

