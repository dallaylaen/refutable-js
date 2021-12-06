'use strict';

const { expect } = require( 'chai' );
const { Report } = require( '../lib/refute/report.js' );

describe( 'Report.getText', () => {
    it( 'hanles multiline evidence', done => {
        const rep = new Report();
        rep.check( 'foo\nbar\nbaz\n' );
        const text = rep.getText();

        expect( text ).to.match(
            new RegExp("\n +\\| foo\n +\\| bar\n +\\| baz\n[)]") );

        done();
    });

    it( 'hanles multiline diff evidence', done => {
        const rep = new Report();
        rep.check( ['- foo\nbar', '+ bar\nfoo' ] );
        const text = rep.getText();

        expect( text ).to.match(
            new RegExp("\n +\\- foo\n +\\- bar\n +\\+ bar\n +\\+ foo\n[)]") );


        done();
    });
});
