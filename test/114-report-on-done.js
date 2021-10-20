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
        setTimeout( () => { // let the event loop tick once
            expect( rep.getDone() ).to.equal( true );
            expect( rep.getPass() ).to.equal( false );
            expect( trace ).to.deep.equal( [rep] );

            done();
        }, 0);
    });

    it( 'can handle nested contracts in async mode', done => {
        const trace = [];
        const inner = new Report();
        const outer = new Report();
        outer.onDone( x => trace.push(x));

        outer.pass(); // add some padding so that we have at least 1 check
        outer.check( inner ); // hack!
        outer.done();

        expect( outer.getDone() ).to.equal( false );
        expect( outer.getPass() ).to.equal( true );

        expect( trace ).to.deep.equal( [] );

        inner.pass( 'padding' );
        inner.pass( 'padding' );
        inner.check( Promise.resolve('foo bared') );
        // TODO make sure inner promise doesn't resolve prematurely
        //      even if some future JS version permits that
        inner.done();

        // check that pending tests are reflected in TAP
        // console.log( outer.getTap() );
        expect( outer.getTap() ).to.match( new RegExp('^pending 2', 'm') );
        expect( outer.getTap() ).to.match( new RegExp('^  +pending 3', 'm') );

        setTimeout( () => { // let the event loop tick once
            // TODO check file & line attribution - must be _this_ file
            expect( outer.getDone() ).to.equal( true );
            expect( outer.getPass() ).to.equal( false );
            expect( trace ).to.deep.equal( [outer] );

            done();
        }, 0);
    });
});

