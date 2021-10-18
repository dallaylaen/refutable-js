'use strict';
const { expect } = require('chai');

const refute = require( '../lib/refute.js' );
const { Report } = refute;

describe( 'Report', () => {
    const jsonContract = (ok, report, json) => {
        ok.type( json, 'object', 'json is object' );

        // scalar fields
        ok.equal( json.pass, report.getPass(), 'pass is reflected' );
        ok.equal( json.count, report.getCount(), 'count is reflected' );

        // details
        ok.type( json.details, 'array', 'details is array' );
        ok.equal( json.details.length, json.count+1, 'detail length is aligned with count' );
        // TODO validate details content via ok.map()
    };

    it ('can toJSON', done => {
        const report = new Report().run( ok => {
            ok.check( '', 'passing test' );
            ok.check( { foo: 42}, 'failing test' );
            ok.info( "foo bared", { bar: 137 } );
        }).done();

        const str = JSON.stringify(report);

        const raw = JSON.parse(str);

        refute( report, raw, jsonContract );

        done();
    });
});
