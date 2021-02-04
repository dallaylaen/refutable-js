'use strict';

const { addCondition, Report } = require( '../report.js' );

// TODO rename forEach or smth.
addCondition(
    'map',
    {fun:1,args:2},
    (list, contract) => {
        if (!Array.isArray(list))
            return 'Expected a list, found a '.typeof(list);
        if (list.length < 1)
            return 0; // auto-pass

        return new Report().run( ok => {
            list.forEach( (item, index) => ok.nested( "item "+index, item, contract ) );
        }).stop();
    }
);

// TODO this is called "compliant chain" but better just say here
// "oh we're checking element order"
addCondition(
    'ordered', // TODO better name?
    {fun:1,args:2},
    (list, contract) => {
        if (!Array.isArray(list))
            return 'Expected a list, found a '.typeof(list);
        if (list.length < 2)
            return 0; // auto-pass

        return new Report().run( ok => {
            for (let n = 0; n < list.length-1; n++) {
                ok.nested( "items "+n+", "+(n+1), list[n], list[n+1], contract);
            }
        }).stop();
    }
);

