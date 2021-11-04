'use strict';

const { expect } = require( 'chai' );

const diffTree = require( '../../lib/diff-tree.js' );

// TODO do we need it in diffTree itself?
function embed( ...messages) {
    const log = diffTree.log();
    for( let i of messages )
        log.append(i);
    return log;
}

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

    it( 'can do a tap-like render', done => {
        const tree = diffTree.log();

        tree.append( diffTree.plan( '1..3' ) );
        tree.append( diffTree.pass( '1 - passing test' ) );

        const inner = diffTree.log();
        inner.append( diffTree.plan( '1..2' ) );
        inner.append( diffTree.fail( '1 - failing test' ) );
        inner.append( embed(
            diffTree.actual( 'war' ),
            diffTree.expected( 'peace' ),
            diffTree.note( 'we are not in 1984' )
        ));
        inner.append( diffTree.pass( '2' ) );

        tree.append( diffTree.fail( '2 (subtest) - war & peace' ) );
        tree.append( inner );

        tree.append( diffTree.pass( '3 - another passing test' ) );
        tree.append( diffTree.note( 'that\'s all folks' ) );

        console.log( tree.render() );

        done();
    });
});
