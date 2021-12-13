'use strict';

const { refuteUnit } = require( '../lib/refute/mocha.js' );

refuteUnit( "Foo bar", ok => {
    ok.equal( 42, 137, 'life is fine' );
    ok.deepEqual( [1, 3, 7, {foo:1}], [1, 3, 8, {foo:2}], 'complex evd' );
    ok.ordered( 'even more complex evd',
         [1, 4, 16, 15, 30, 60],
         (r,x,y) => r.cmpNum( x, '<=', y, 'increasing values' ) );

});
