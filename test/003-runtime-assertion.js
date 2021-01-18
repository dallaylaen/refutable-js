'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'refute()', () => {
    it ('can pass', done => {
        refute( ok => {
            ok.equals( 'animal', 'animal' );
        });

        done();
    });
    it ('can fail', done => {
        expect( function () {
            refute( ok => {
                ok.equals( 'freedom', 'slavery' );
            });
        } ).to.throw( /1..1.*Failed/s );

        done();
    });
});
