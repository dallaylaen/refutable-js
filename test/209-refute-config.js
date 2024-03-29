'use strict';
const chai = require('chai');
const expect = chai.expect;

const refute = require( '../lib/index.js' );

describe( 'refute.config', () => {
    it ('can generate relaxed runtime assertion', done => {
        const contract = ok => { ok.fail() }; // always fails
        const trace = [];
        const laxRefute = refute.config(
            { onFail: rep => trace.push( rep.toString() ) }
        );
        laxRefute( contract );

        expect( trace.length ).to.equal(1);
        expect( trace[0] ).to.match(/r\(\n *!1\./s);

        expect( () => refute(contract) ).to.throw( /!1\./s );

        done();
    });

    it ('can skip', done => {
        const empty = refute.config({skip: true});
        const trace = [];
        const contract = ok => {
            ok.fail();
            trace.push("hello");
        };

        empty( contract );
        expect( trace.length ).to.equal(0);

        expect( () => refute(contract) ).to.throw(/!1\./);
        expect( trace.length ).to.equal(1);

        const etufer = empty.config( {skip: false, onFail: x=>x} );

        etufer(contract);
        expect( trace.length ).to.equal(2);

        done();
    });
});
