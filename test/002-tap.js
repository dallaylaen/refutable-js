'use strict';
const { expect } = require('chai');
const { AssertionError } = require('assert');

const refute = require( '../lib/refute.js' );

describe( 'refute.Report', () => {
    it( 'can generate TAP', done => {
        const contract = new refute.Report();

        contract.equal( 'animal', 'animal', 'all animals are equal' );
        contract.diag(1984);
        contract.equal( 'freedom', 'slavery' );

        const tap = contract.getTap();
        const lines = tap.split('\n');

        expect( lines[0] ).to.equal('1..2');
        expect( lines[1] ).to.match(/^ok 1/);
        expect( lines[1] ).to.equal('ok 1 - all animals are equal');
        expect( lines[2] ).to.equal('# 1984');
        expect( lines[3] ).to.equal('not ok 2');

        expect( lines.slice(-2)[0] ).to.match(/^# .*Failed/i);
        expect( lines.slice(-1)[0] ).to.equal('');

        lines.pop(); // remove last empty string

        // generate array of lines prefixed with (true, false)
        const rex = /^(ok|not|1\.\.|#)/;

        // generate AssertionError by hand to give user some clue
        if (lines.filter(s=>!s.match(rex)).length)
            throw new AssertionError({
                expected: 'list of lines matching '+rex,
                actual:   tap
            });

        done();
    });
});
