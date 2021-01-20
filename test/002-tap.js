'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'refute.Report', () => {
    it( 'can generate TAP', done => {
        const contract = new refute.Report();

        contract.equals( 'animal', 'animal', 'all animals are equal' );
        contract.diag(1984);
        contract.equals( 'freedom', 'slavery' );

        const tap = contract.getTap();

        const lines = tap.split('\n');

        expect( lines[0] ).to.equal('1..2');
        expect( lines[1] ).to.match(/^ok 1/);
        expect( lines[1] ).to.equal('ok 1 - all animals are equal');
        expect( lines[2] ).to.equal('# 1984');
        expect( lines[3] ).to.equal('not ok 2');

        expect( lines.slice(-2)[0] ).to.match(/^# .*Failed/i);
        expect( lines.slice(-1)[0] ).to.equal('');
        
        done();
    });
});
