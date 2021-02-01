'use strict';
const {expect} = require('chai');

const refute = require( '../lib/refute.js' );

describe( 'deepEqual p.2', () => {
    const sample = [];
    const oneOff = [];
    for (let i = 1; i<=100; i++) {
        sample.push({ foo:i+1 });
        oneOff.push({ foo:i });
    };

    it ( 'limits number of samples in output (2)', done => {
        const report = refute.report(ok => {
            ok.deepEqual(oneOff, sample, {max:2});
        });
        expect( report.getDetails(1).evidence.length ).to.equal(6);

        done();
    });

    it ( 'limits number of samples in output (6)', done => {
        const report = refute.report(ok => {
            ok.deepEqual(oneOff, sample, {max:6});
        });
        expect( report.getDetails(1).evidence.length ).to.equal(18);

        done();
    });

    it ( 'limits number of samples in output (Infinity)', done => {
        const report = refute.report(ok => {
            ok.deepEqual(oneOff, sample, {max:Infinity});
        });
        expect( report.getDetails(1).evidence.length ).to.equal(3*sample.length);

        done();
    });
});
