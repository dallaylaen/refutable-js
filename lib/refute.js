'use strict';

const { Report, report, addCondition , explain } = require ('./refute/report.js');

// import default condition arsenal
require( './refute/cond/basic.js' );
require( './refute/cond/array.js' );

// Allow creating multiple parallel configurations of refute
// e.g. one strict (throwing errors) and other lax (just debugging to console)
function setup( oldConf={}, newConf={} ) {
    const options = { ...oldConf, ...newConf };
    const onFail = options.onFail || (rep => { throw new Error(rep.getTap()) });
    const refute = (...args) => {
        const ok = report(...args);
        if (!ok.isPassing())
            onFail(ok, args);
    };

    // reexport all from report.js
    refute.Report = Report;
    refute.report = report; // TODO ouch, rename?
    refute.explain = explain;
    refute.addCondition = addCondition;

    // refute.conf({...}) will generate a _new_ refute
    refute.config = update => setup( options, update );
    return refute;
}

module.exports = setup();

