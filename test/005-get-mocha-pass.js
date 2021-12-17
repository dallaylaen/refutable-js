const { refuteUnit } = require( '../lib/mocha.js' );

refuteUnit( 'refuteUnit', ok=>{
    ok.pass('passing test');
    ok.nested( 'passing subtest', inner => {
        inner.pass();
        inner.check(null, "foo bared");
    });
});
