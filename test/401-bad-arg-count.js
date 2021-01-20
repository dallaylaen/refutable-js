'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'Report.errors', () => {
    it( 'detects arg count', done => {
        const ok = new refute.Report();
        expect( _ => ok.equals( 1 ) ).to.throw(/Bad argument/);
        expect( _ => ok.equals( 1, 1, 1, 'some test' ) ).to.throw(/Bad argument/);
        done();
    });
});
