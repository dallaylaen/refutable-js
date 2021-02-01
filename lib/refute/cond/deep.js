'use strict';

const { addCondition, explain } = require( '../report.js' );

addCondition( 'deepEqual', {"args":2,hasOptions:true}, deep );

function deep( got, exp, options={} ) {
    if (!options.max)
        options.max = 5;
    const diff = _deep( got, exp, options );
    if (!diff.length)
        return 0;

    const ret = [];
    for (let item of diff) {
        ret.push( 
            "at "+item[0],
            "- "+explain( item[1], 2 ),
            "+ "+explain( item[2], 2 )
        );
    };
    return ret;
};

function getType(obj) {
    if (typeof obj !== 'object')
        return '';
    if (Array.isArray(obj))
        return 'Array';

    // in theory should be enough
    if ( typeof obj.constructor === 'function' 
        && obj instanceof obj.constructor
        && obj.constructor.name )
            return obj.constructor.name;

    // shrug
    return '';
};

function _deep( got, exp, options={}, path='$', seen=new Set() ) {
    // here and below we return --options.max as 4th (ignored) value
    // just to avoid writing a longer if. Sorry.

    if (got === exp || options.max <= 0)
        return [];
    if (typeof got !== typeof exp)
        return [ [ path, got, exp, --options.max ] ]

    // recurse by expected value - consider it more predictable
    if (typeof exp !== 'object' || exp === null ) {
        // non-objects - so can't descend
        // and comparison already done at the beginnning
        return [ [path, got, exp, --options.max] ];
    }

    // must detect loops before going down
    if (seen.has(exp))
        return [ [ path + ' (Expecting circular reference, auto-fail)', got, exp, options.max=0 ] ]
    seen.add(exp);

    // array
    if (Array.isArray(exp)) {
        if (!Array.isArray(got) || got.length !== exp.length)
            return [ [path, got, exp, --options.max] ];

        const ret = [];
        for (let i = 0; i < exp.length; i++) {
            ret.push( ..._deep( got[i], exp[i], options, path+'['+i+']', new Set(seen)) );
            if (options.max<=0)
                break;
        };
        return ret;
    };

    // compare object types
    if (getType(got) !== getType(exp))
        return [ [ path, got, exp, --options.max ] ];

    // compare keys - +1 for exp, -1 for got, nonzero key at end means keys differ
    const uniq = {};
    Object.keys(exp).forEach( x => uniq[x] = 1 );
    Object.keys(got).forEach( x => uniq[x] = (uniq[x] || 0) - 1 );
    for (let x in uniq) {
        if (uniq[x] !== 0)
            return [ [ path, got, exp, --options.max ] ];
    }
    
    // now typeof, object type, and object keys are the same.
    // recurse.
    const ret = [];
    for (let i in exp) {
        ret.push( ..._deep( got[i], exp[i], options, path+'['+explain(i)+']', new Set(seen)) );
        if (options.max<=0)
            break;
    };
    return ret;
};
