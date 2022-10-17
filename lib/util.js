'use strict';

/**
 *   @namespace utilities
 *   @desc  These functions have nothing to do with refutable
 *          and should ideally be in separate modules.
 */

/* Determine n-th caller up the stack */
/* Inspired by Perl's Carp module */
const inStack = /([^:\s()]+:\d+(?::\d+)?)\W*(\n|$)/g;

/**
 *  @public
 *  @memberOf utilities
 *  @function
 *  @desc Returns source position n frames up the stack
 *  @example
 *  "/foo/bar.js:25:11"
 *  @param {integer} depth How many frames to skip
 *  @returns {string} source file, line, and column, separated by colon.
 */
function callerInfo (n) {
    /* a terrible rex that basically searches for file.js:nnn:nnn several times */
    return (new Error().stack.match(inStack)[n + 1].replace(/\W*\n$/, '') || '')
}

/**
 *  @public
 *  @instance
 *  @memberOf Report
 *  @desc Stringify objects recursively with limited depth
 *  and circular reference tracking.
 *  Generally JSON.stringify is used as reference:
 *  strings are escaped and double-quoted; numbers, boolean, and nulls are
 *  stringified "as is"; objects and arrays are descended into.
 *  The differences follow:
 *  undefined is reported as '<undef>'.
 *  Objects that have constructors are prefixed with class names.
 *  Object and array content is abbreviated as "..." and "Circular"
 *  in case of depth exhaustion and circular reference, respectively.
 *  Functions are naively stringified.
 *  @param {Any} target Thingy to serialize.
 *  @param {object} options
 *  @param {integer} options.depth How many levels to descend. Default = 3.
 *  @param {string}  options.path Circular reference path prefix. Default = '$'.
 *  @returns {string}
 */
function explain ( item, options = {} ) {
    return _explain( item, options.depth || 3, options.path || '$' );
}

function _explain (item, depth, path, seen = new Map()) {
    // simple types
    if (typeof item === 'string')
        return JSON.stringify(item); // don't want to spend time qouting
    if (typeof item === 'number' || typeof item === 'boolean' || item === null)
        return '' + item;
    if (item === undefined) return '<undef>';
    if (typeof item !== 'object') // maybe function
        return '' + item; // TODO don't print out a long function's body

    // check circularity
    if (seen.has(item)) {
        const note = 'Circular=' + seen.get(item);
        return Array.isArray(item) ? '[ ' + note + ' ]' : '{ ' + note + ' }';
    }

    // recurse
    try {
        // use try { ... } finally { ... } to remove item from seen on return
        seen.set( item, path );

        if (Array.isArray(item)) {
            if (depth < 1)
                return '[...]';
            // TODO <x empty items>
            const list = item.map(
                (val, index) => _explain(val, depth - 1, path + '[' + index + ']', seen)
            );
            return '[' + list.join(', ') + ']'; // TODO configurable whitespace
        }

        const type = item.constructor && item.constructor.name;
        const prefix = type && type !== 'Object' ? type + ' ' : '';
        if (depth < 1)
            return prefix + '{...}';
        const list = Object.keys(item).sort().map( key => {
            const index = JSON.stringify(key);
            return index + ':' + _explain(item[key], depth - 1, path + '[' + index + ']', seen);
        });
        return prefix + '{' + list.join(', ') + '}';
    } finally {
        seen.delete(item);
    }
}

module.exports = { callerInfo, explain };
