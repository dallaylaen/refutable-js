'use strict';

const { expect } = require( 'chai' );

const diffTree = require( '../../lib/diff-tree.js' );

describe( 'DiffTree', () => {
    it( 'can append lines & render', done => {
        const tree = diffTree.log();
        expect( tree ).to.be.instanceof( diffTree.DiffTree );

        const minus = diffTree.actual("war");
        const plus  = diffTree.expected("peace");
        expect( tree.append( minus ).append( plus ) ).to.equal( tree ); // chainable

        const render = tree.render();

        expect( render ).to.equal( '- war\n+ peace\n' );

        done();
    });
});
