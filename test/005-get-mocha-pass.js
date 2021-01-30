const { Report } = require( '../lib/refute/report.js' );

new Report().setTitle('Report.getMocha()').run( ok=>{
    ok.pass('passing test');
    ok.nested( 'passing subtest', inner => {
        inner.pass();
        inner.pass();
    });
}).getMocha();
