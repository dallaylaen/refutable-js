'use strict';

const { Report } = require( '../refute/report.js' );
const { AssertionError } = require( 'assert' );

function reportToException( data ) {
    // TODO name!
    if (data.pass)
        return;
    throw new AssertionError({
        message:   data.name,
        actual:    Report.prototype.getTapEntry(data).join('\n'),
        expected:  "", // TODO
        operator:  data.cond,
    });
};

const hasMocha = typeof describe === 'function' && typeof it === 'function';

function refuteUnit(name, contract) {
    // TODO name!!
    const report = new Report().setTitle(name).run(contract).stop();
    if (hasMocha) {
        describe( report.getTitle(), () => {
            for( let n = 1; n <= report.getCount(); n++) {
                const data = report.getDetails(n);
                it (data.name, done => {
                    reportToException( data );
                    done();
                });
            }
        });
    } else {
        console.log(report.getTap());
        if (!report.isPassing())
            throw 'Contract failed: ' + report.getTitle(); // avoid stack trace
    };
    
};

module.exports = { refuteUnit };
