'use strict';
const { expect } = require( 'chai' );
const { Report } = require( '../lib/report.js' );

describe( 'Report.onFail()', () => {
    const preset = list => new Report()
        .onDone( x=>list.push(1) )
        .onFail( x=>list.push(x) )
        .onDone( x=>list.push(3) );

    it( 'can call onFail callback', done => {
        const trace = [];
        const rep = preset(trace).run( ok => ok.fail() );
        expect( trace ).to.deep.equal( [3,rep,1] );
        done();
    });

    it( 'can skip onFail callback', done => {
        const trace = [];
        const rep = preset(trace).run( ok => ok.pass() );
        expect( trace ).to.deep.equal( [3,1] );
        done();
    });
    // TODO async
});
