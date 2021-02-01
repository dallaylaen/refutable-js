'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'Report.errors', () => {
    const ok = new refute.Report();
    it( 'detects missing arguments', done => {
        expect( _ => ok.equal( 1 ) )
            .to.throw(/[Cc]ondition.*equal.*2..2.*arguments/);
        done();
    });
    it( 'detects extra arguments', done => {
        expect( _ => ok.equal( 1, 1, 1, 'some test' ) )
            .to.throw(/[Cc]ondition.*equal.*2..2.*arguments/);
        done();
    });
});
