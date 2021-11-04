'use strict';

const { expect } = require( 'chai' );

const diffTree = require( '../../lib/diff-tree.js' );

describe( 'DiffTree', () => {
    it( 'generally exists', done => {
        const tree = diffTree.log();
        expect( tree ).to.be.instanceof( diffTree.PrettyLog );

        const minus = diffTree.actual("war");
        const plus  = diffTree.expected("peace");
        expect( tree.append( minus ).append( plus ) ).to.equal( tree ); // chainable

        const render = tree.format();

        expect( tree.format() ).to.equal( '- war\n+ peace\n' );

        done();
    });
});
