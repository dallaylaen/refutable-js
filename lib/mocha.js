'use strict';

/**
 *   A mocha/standalone unit test compatibility layer.
 *   Should be in a separate package.
 */

// we use just report but we also need the condition arsenal
const { Report } = require( './index.js' );
const { AssertionError } = require( 'assert' );

/* global describe, it */
const hasMocha = typeof describe === 'function' && typeof it === 'function';

function refuteUnit (name, contract) {
    // TODO name!!
    const report = new Report().run(contract).done();
    if (hasMocha) {
        describe( name, () => {
            for ( let n = 1; n <= report.getCount(); n++) {
                const data = report.getDetails(n);
                it(data.name, done => {
                    if (!data.pass) {
                        throw new AssertionError({
                            message:  report.getLinesPartial(n).join('\n'),
                            operator: data.cond,
                        });
                    }
                    done();
                });
            }
        });
    } else {
        console.log(report.toString());
        /* eslint-disable no-throw-literal -- we want to supress stack trace */
        if (!report.getPass())
            throw 'Contract failed: ' + name;
        /* eslint-enable */
    }
}

module.exports = { refuteUnit };
