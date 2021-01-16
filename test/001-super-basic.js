'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'refute.Contract', () => {
    it ( 'passes by default', done => {
        const ok = new refute.Contract();
        expect( ok.isPassing() ).to.equal(true);
        expect( ok.getSignature() ).to.equal('td');
        done();
    });

    it ( 'can pass', done => {
        const ok = new refute.Contract();
        ok.equals( 2*2, 4 );
        expect( ok.isPassing() ).to.equal(true);
        expect( ok.getSignature() ).to.equal('t1d');
        done();
    });
});
