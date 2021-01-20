'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'Report.errors', () => {
    const ok = new refute.Report();
    it( 'detects missing arguments', done => {
        expect( _ => ok.equals( 1 ) ).to.throw(/Bad argument/);
        done();
    });
    it( 'detects extra arguments', done => {
        expect( _ => ok.equals( 1, 1, 1, 'some test' ) ).to.throw(/Bad argument/);
        done();
    });
});
