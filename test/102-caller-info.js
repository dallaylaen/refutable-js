'use strict';
const { expect } = require( 'chai' );
const { callerInfo } = require( '../lib/refute/util.js' );

/**
 *  Fragile test, handle with care
 */

function inner(n) {
    return callerInfo(n); /* line 10 */
};

function outer(n) {
    return inner(n); /* line 14 */
};

describe ( 'callerInfo', () => {
    it( 'points out the caller', done => {
        (function(){
            expect( callerInfo(0) ).to.match(/test\/\d+-[-\w]+\.js:20/); /* line 20 */
        })();
        done();
    });
    it( 'handles nested calls', done => {
            expect( outer(2) ).to.match( /test\/\d+-[-\w]+\.js:25/ ); /* line 25 */
            expect( outer(1) ).to.match( /test\/\d+-[-\w]+\.js:14/ );
            expect( outer(0) ).to.match( /test\/\d+-[-\w]+\.js:10/ );
            
        done();
    });

});
