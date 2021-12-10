'use strict';
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const refute = require( '../lib/refute.js' );

describe( 'refute()', () => {
    it ('can pass', done => {
        refute( ok => {
            ok.equal( 'animal', 'animal' );
        });

        done();
    });
    it ('can fail', done => {
        expect( function () {
            refute( ok => {
                ok.equal( 'freedom', 'slavery' );
            });
        } ).to.throw( /r\(\n *!1\.\n.*\)/s );

        done();
    });
});
