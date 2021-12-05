'use strict';

const { Report } = require( '../refute/report.js' );

const hasMocha = typeof describe === 'function' && typeof it === 'function';

function refuteUnit(name, contract) {
    // TODO name!!
    const report = new Report().run(contract).done();
    if (hasMocha) {
        describe( name, () => {
            for( let n = 1; n <= report.getCount(); n++) {
                const data = report.getDetails(n);
                it (data.name, done => {
                    report.getThrown(data);
                    done();
                });
            }
        });
    } else {
        console.log(report.getTap());
        if (!report.getPass())
            throw 'Contract failed: ' + name; // avoid stack trace
    };
    
};

module.exports = { refuteUnit };
