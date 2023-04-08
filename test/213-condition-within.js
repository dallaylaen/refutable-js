'use strict';

const { expect } = require('chai');
const { Report } = require('../lib/index');

describe( 'Report.within', () => {
    it('checks boundaries for numbers', done => {
        expect(new Report()
            .within(1, 2, 4)
            .within(2, 2, 4)
            .within(3, 2, 4)
            .within(4, 2, 4)
            .within(5, 2, 4)
            .getGhost()
        ).to.equal('r(N,3,N)');
        done();
    });
    it('checks boundaries for strings', done => {
        expect(new Report()
            .within('alpha', 'bravo', 'delta')
            .within('bravo', 'bravo', 'delta')
            .within('charlie', 'bravo', 'delta')
            .within('delta', 'bravo', 'delta')
            .within('echo', 'bravo', 'delta')
            .getGhost()
        ).to.equal('r(N,3,N)');
        done();
    });

    it ('provides useful error messages', done => {
        expect( new Report().within(1, 2, 4).toString() )
            .to.match(/\s1\s.*below.*\[2, 4\]/s);
        expect( new Report().within(5, 2, 4).toString() )
            .to.match(/\s5\s.*above.*\[2, 4\]/s);
        done();
    })
});
