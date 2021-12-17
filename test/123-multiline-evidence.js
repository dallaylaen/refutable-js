'use strict';

const { expect } = require( 'chai' );
const { Report } = require( '../lib/report.js' );

describe( 'Report.toString', () => {
    it( 'hanles multiline evidence', done => {
        const rep = new Report();
        rep.check( 'foo\nbar\nbaz\n' );
        const text = rep.toString();

        expect( text ).to.match(
            new RegExp("\n +\\| foo\n +\\| bar\n +\\| baz\n[)]") );

        done();
    });

    it( 'hanles multiline diff evidence', done => {
        const rep = new Report();
        rep.check( ['- foo\nbar', '+ bar\nfoo' ] );
        const text = rep.toString();

        expect( text ).to.match(
            new RegExp("\n +\\- foo\n +\\- bar\n +\\+ bar\n +\\+ foo\n[)]") );


        done();
    });
});
