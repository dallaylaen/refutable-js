(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

const { addCondition, Report } = require( '../report.js' );

/**
 *   @instance
 *   @memberOf conditions
 *   @method forEach
 *   @desc  Checks that a nested contract holds for each element of an array.
 *   @param {string} description
 *   @param {Array} array List of items.
 *   @param {Contract} nested First argument given to the callback
 *   is a Report object, and the second one is the array item in question.
 *   @returns {undefined}
 */

addCondition( 'forEach',
    // TODO better name that rhymes with the ordered one (map/reduce?)
    { fun: 1, args: 2 },
    (list, contract) => {
        if (!Array.isArray(list))
            return 'Expected a list, found a '.typeof(list);
        if (list.length < 1)
            return 0; // auto-pass

        const ok = new Report();
        list.forEach( (item, index) => ok.nested( 'item ' + index, item, contract ) );
        return ok.done();
    }
);

/**
 *   @instance
 *   @memberOf conditions
 *   @method ordered
 *   @desc  Checks that a nested contract holds for each pair
 *   of adjacent element of an array (i.e. 1&2, 2&3, 3&4, ...).
 *   @param {string} description
 *   @param {Array} array List of items.
 *   @param {Contract} nested First argument given to the callback
 *   is a Report object, and the second and third ones
 *   are the array items in question.
 *   @returns {undefined}
 */

// TODO this is called "compliant chain" but better just say here
// "oh we're checking element order"
addCondition( 'ordered',
    // TODO better name? pairwise? reduce?
    { fun: 1, args: 2 },
    (list, contract) => {
        if (!Array.isArray(list))
            return 'Expected a list, found a '.typeof(list);
        if (list.length < 2)
            return 0; // auto-pass

        const ok = new Report();
        for (let n = 0; n < list.length - 1; n++)
            ok.nested( 'items ' + n + ', ' + (n + 1), list[n], list[n + 1], contract);

        return ok.done();
    }
);

},{"../report.js":5}],2:[function(require,module,exports){
'use strict';

const { addCondition, explain } = require( '../report.js' );
const OK = false;

const cmpNum = {
    '<':  (x, y) => (x  < y),
    '>':  (x, y) => (x  > y),
    '<=': (x, y) => (x <= y),
    '>=': (x, y) => (x >= y),
    '==': (x, y) => (x === y),
    '!=': (x, y) => (x !== y),
};

/* eslint-disable eqeqeq -- we're filtering out undefined AND null here */
const cmpStr = {
    '<':  (x, y) => x != undefined && y != undefined && ('' + x  < '' + y),
    '>':  (x, y) => x != undefined && y != undefined && ('' + x  > '' + y),
    '<=': (x, y) => x != undefined && y != undefined && ('' + x <= '' + y),
    '>=': (x, y) => x != undefined && y != undefined && ('' + x >= '' + y),

    '==': (x, y) => x != undefined && y != undefined && ('' + x === '' + y),
    '!=': (x, y) => ((x == undefined) ^ (y == undefined)) || ('' + x !== '' + y),
};
/* eslint-enable eqeqeq */

/**
 *   @instance
 *   @memberOf conditions
 *   @method cmpNum
 *   @desc  Checks if a relation indeed holds between arguments.
 *          See also {@link cmpStr}
 *   @param {any} arg1    First argument
 *   @param {string} operation  One of '<', '<=', '==', '!=', '>=', or '>'
 *   @param {any} arg2    Second argument
 *   @param {string} [description]
 *   @returns {undefined}
 */
/**
 *   @instance
 *   @memberOf conditions
 *   @method cmpStr
 *   @desc  Checks if a relation indeed holds between arguments,
 *          assuming they are strings.
 *          See also {@link cmpNum}
 *   @param {any} arg1    First argument
 *   @param {string} operation  One of '<', '<=', '==', '!=', '>=', or '>'
 *   @param {any} arg2    Second argument
 *   @param {string} [description]
 *   @returns {undefined}
 */

addCondition( 'cmpNum',
    { args: 3 },
    (x, op, y) => cmpNum[op](x, y) ? 0 : [x, 'is not ' + op, y]
);
addCondition( 'cmpStr',
    { args: 3 },
    (x, op, y) => cmpStr[op](x, y) ? 0 : [x, 'is not ' + op, y]
);

const typeCheck = {
    undefined: x => x === undefined,
    null:      x => x === null,
    number:    x => typeof x === 'number' && !Number.isNaN(x),
    integer:   x => Number.isInteger(x),
    nan:       x => Number.isNaN(x),
    string:    x => typeof x === 'string',
    function:  x => typeof x === 'function',
    boolean:   x => typeof x === 'boolean',
    object:    x => x && typeof x === 'object' && !Array.isArray(x),
    array:     x => Array.isArray(x),
};
function typeExplain (x) {
    if (typeof x === 'string')
        return x;
    if (typeof x === 'function')
        return 'instanceof ' + (x.name || x);
}

/**
 *   @instance
 *   @memberOf conditions
 *   @method type
 *   @desc  Checks that a value is of the specified type.
 *   @param {any} value    First argument
 *   @param {string|function|Array} type
 *       One of 'undefined', 'null', 'number', 'integer', 'nan', 'string',
 *       'boolean', 'object', 'array', a class, or an array containing 1 or more
 *       of the above. 'number'/'integer' don't include NaN,
 *       and 'object' doesn't include arrays.
 *       A function implies an object and an instanceof check.
 *       Array means any of the specified types (aka sum of types).
 *   @param {string} [description]
 *   @returns {undefined}
 */
addCondition( 'type',
    { args: 2 },
    (got, exp) => {
        if ( !Array.isArray(exp) )
            exp = [exp];

        for (const variant of exp) {
            // known type
            if ( typeof variant === 'string' && typeCheck[variant] ) {
                if (typeCheck[variant](got))
                    return OK;
                continue;
            }

            // instanceof
            if ( typeof variant === 'function' && typeof got === 'object') {
                if ( got instanceof variant )
                    return OK;
                continue;
            }

            // don't know what you're asking for
            return 'unknown value type spec: ' + explain(variant, 1);
        }
        return [
            '- ' + explain(got, 1),
            '+ ' + exp.map( typeExplain ).join(' or '),
        ];
    }
);

},{"../report.js":5}],3:[function(require,module,exports){
'use strict';

const { addCondition, explain } = require( '../report.js' );

/**
 *   @instance
 *   @memberOf conditions
 *   @method deepEqual
 *   @desc Compares two structures, outputs diff if differences found.
 *   @param {any} actual    First structure
 *   @param {any} expected  Structure to compare to
 *   @param {Object} [options]
 *   @param {number} options.max how many differences to output (default 5)
 *   @param {string} [description]
 *   @returns {undefined}
 */
addCondition( 'deepEqual',
    { args: 2, hasOptions: true }, deep );

function deep ( got, exp, options = {} ) {
    if (!options.max)
        options.max = 5;
    options.diff = [];
    _deep( got, exp, options );
    if (!options.diff.length)
        return 0;

    const ret = [];
    for (const item of options.diff) {
        ret.push(
            'at ' + item[0],
            '- ' + (item[3] ? item[1] : explain( item[1], { depth: 2 } )),
            '+ ' + (item[3] ? item[2] : explain( item[2], { depth: 2 } )),
        );
    }
    return ret;
}

// result is stored in options.diff=[], return value is ignored
// if said diff exceeds max, return immediately & don't waste time
function _deep ( got, exp, options = {}, path = '$', seenL = new Map(), seenR = new Map() ) {
    if (got === exp || options.max <= options.diff.length)
        return;
    if (typeof got !== typeof exp)
        return options.diff.push( [path, got, exp] );

    // recurse by expected value - consider it more predictable
    if (typeof exp !== 'object' || exp === null ) {
        // non-objects - so can't descend
        // and comparison already done at the beginnning
        return options.diff.push( [path, got, exp] );
    }

    // must detect loops before going down
    const pathL = seenL.get(got);
    const pathR = seenR.get(exp);
    if (pathL || pathR) {
        // Loop detected = only check topology
        if (pathL === pathR)
            return;
        return options.diff.push( [
            path + ' (circular)',
            pathL ? 'Circular=' + pathL : explain(got, { depth: 2 }),
            pathR ? 'Circular=' + pathR : explain(exp, { depth: 2 }),
            true // don't stringify
        ]);
    }

    try {
        seenL.set(got, path);
        seenR.set(exp, path);

        // compare object types
        // (if a user is stupid enough to override constructor field, well the test
        // would fail later anyway)
        if (got.constructor !== exp.constructor)
            return options.diff.push( [path, got, exp] );

        // array
        if (Array.isArray(exp)) {
            if (!Array.isArray(got) || got.length !== exp.length)
                return options.diff.push( [path, got, exp] );

            for (let i = 0; i < exp.length; i++) {
                _deep( got[i], exp[i], options, extendPath(path, i), seenL, seenR );
                if (options.max <= options.diff.length)
                    break;
            }
            return;
        }

        // compare keys - +1 for exp, -1 for got, nonzero key at end means keys differ
        // TODO better, faster way to do it?
        const uniq = {};
        Object.keys(exp).forEach( x => { uniq[x] = 1 } );
        Object.keys(got).forEach( x => { uniq[x] = (uniq[x] || 0) - 1 } );
        for (const x in uniq) {
            if (uniq[x] !== 0)
                return options.diff.push( [path, got, exp] );
        }

        // now typeof, object type, and object keys are the same.
        // recurse.
        for (const i in exp) {
            _deep( got[i], exp[i], options, extendPath(path, i), seenL, seenR );
            if (options.max <= options.diff.length)
                break;
        }
    } finally {
        seenL.delete(got);
        seenR.delete(exp);
    }
}

function extendPath (path, suffix) {
    // array
    if ( typeof suffix === 'number' )
        return path + '[' + suffix + ']';
    //
    if ( suffix.match(/^[a-z_][a-z_0-9]*$/i) )
        return path + '.' + suffix;
    return path + '[' + JSON.stringify(suffix) + ']';
}

},{"../report.js":5}],4:[function(require,module,exports){
'use strict';

// the core (should explain even be there?)
const { Report, addCondition, explain } = require('./report.js');

// TODO add eiffel-style design-by-contract

// import default condition arsenal
require( './cond/basic.js' );
require( './cond/array.js' );
require( './cond/deep.js' );

const getReport = (...args) => new Report().run(...args).done();

// Allow creating multiple parallel configurations of refute
// e.g. one strict (throwing errors) and other lax (just debugging to console)
function setup ( options = {}, orig ) {
    // TODO validate options
    const onFail = options.onFail || (rep => { throw new Error(rep.toString()) });

    const refute = options.skip
        ? () => {}
        : (...args) => {
            const ok = new Report();
            ok.onDone( x => { if ( !x.getPass() ) onFail(x, args) } );
            ok.run(...args);
            ok.done();
        };

    // reexport all from report.js
    refute.Report = Report;
    refute.explain = explain;
    refute.addCondition = addCondition;

    // shortcut to validating & returning a fresh contract
    // TODO rename to avoid name clash with the class
    // (eval?)
    refute.report = getReport;

    // refute.conf({...}) will generate a _new_ refute
    refute.config = update => setup( { ...options, ...update }, refute );

    return refute;
}

module.exports = setup();

/**
 *   @namespace refute
 *   @desc   Functions exported by refutable's main module.
 */

/**
 *   @public
 *   @memberOf refute
 *   @function refute
 *   @param {Any} [...list] Data to feed to the callback
 *   @param {Contract} contract A code block with checks.
 *   @returns {undefined} Return value is ignored.
 *   @throws {Error} If one or more checks are failing, an exception is thrown
 *   with details about all passing/failing checks.
 *   This action can be changed via refute.config() call.
 *
 */

},{"./cond/array.js":1,"./cond/basic.js":2,"./cond/deep.js":3,"./report.js":5}],5:[function(require,module,exports){
'use strict';

const { callerInfo, explain } = require('./util.js');

/**
 *   @callback Contract
 *   @desc A code block containing one or more condition checks.
 *   A check is performed by calling one of a few special methods
 *   (equal, match, deepEqual, type etc)
 *   on the Report object.
 *   Contracts may be nested using the 'nested' method which accepts
 *   another contract and records a pass/failure in the parent accordingly.q
 *   A contract is always executed to the end.
 *   @param {Report} ok An object that records check results.
 *   @param {Any} [...list] Additional parameters
 *   (e.g. data structure to be validated)
 *   @returns {void} Returned value is ignored.
 */

const protocol = 1.1;

/**
 * @public
 * @classdesc
 * The core of the refutable library, the report object contains info
 * about passing and failing conditions.
 */
class Report {
    // setup
    /**
     *  @desc No constructor arguments supported.
     *  Contracts may need to be set up inside callbacks _after_ creation,
     *  hence this convention.
     */
    constructor () {
        this._count     = 0;
        this._failCount = 0;
        this._descr     = [];
        this._evidence  = [];
        this._where     = [];
        this._condName  = [];
        this._info      = [];
        this._nested    = [];
        this._pending   = new Set();
        this._onDone    = [];
        this._done      = false;
        // TODO add caller info about the report itself
    }

    // Setup methods follow. They must be chainable, i.e. return this.

    /**
     *   @desc Execute code when contract execution finishes.
     *   Report object cannot be modified at this point,
     *   and no additional checks my be present.
     *   @param {function} callback - first argument is report in question
     *   @returns {Report} this (chainable)
     *   @example
     *   report.onDone( r => { if (!r.getPass()) console.log(r.toString()) } )
     */
    onDone (fn) {
        if (typeof fn !== 'function')
            throw new Error('onDone(): callback must be a function');
        this._lock();
        this._onDone.push(fn);
        return this;
    }

    /**
     *   @desc Execute code when contract execution finishes, if it failed.
     *   Report object cannot be modified at this point,
     *   and no additional checks my be present.
     *   @param {function} callback - first argument is report in question
     *   @returns {Report} this (chainable)
     *   @example
     *   report.onFail( r => console.log(r.toString()) );
     */
    onFail (fn) {
        if (typeof fn !== 'function')
            throw new Error('onDone(): callback must be a function');
        this._lock();
        this._onDone.push(r => r.getPass() || fn(r));
        return this;
    }

    // Running the contract
    /**
     *   @desc apply given function to a Report object, lock report afterwards.
     *   If function is async (i.e. returns a {@link Promise}),
     *   the report will only be done() after the promise resolves.
     *   This is done so to ensure that all checks that await on a value
     *   are resolved.
     *   @param {Contract} contract The function to execute
     *   Additional parameters may be _prepended_ to contract
     *   and will be passed to it _after_ the Report object in question.
     *   @returns {Report} this (chainable)
     *   @example Basic usage
     *   const r = new Report().run( ok => ok.equal( 'war', 'peace', '1984' ) );
     *   r.getPass(); // false
     *   r.getDone(); // true
     *   r.toString();
     *   r(
     *      !1. 1984
     *      - war
     *      + peace
     *   )
     *
     *   @example Passing additional arguments to callback.
     *   // The contract body is the last argument.
     *   new Report().run( { v: 4.2, colors: [ 'blue' ] }, (r, arg) => {
     *       r.type( arg, 'object' );
     *       r.type( arg.v, 'number' );
     *       r.cmpNum( arg.v, '>=', 3.14 );
     *       r.type( arg.colors, 'array' );
     *   });
     *   @example Async function
     *   const r = new Report().run(
     *       async ok => ok.equal( await 6*9, 42, 'fails but later' ) );
     *   r.getPass(); // true
     *   r.getDone(); // false
     *   // ...wait for event loop to tick
     *   r.getPass(); // false
     *   r.getDone(); // true
     */
    run (...args) {
        // TODO either async() should support additional args, or run() shouldn't
        this._lock();
        const block = args.pop();
        if (typeof block !== 'function')
            throw new Error('Last argument of run() must be a function, not ' + typeof block);
        const result = block(this, ...args);
        if (result instanceof Promise)
            result.then( () => this.done() );
        else
            this.done();
        return this;
    }

    /**
     *   @desc apply given function (contract) to a Report object.
     *   Multiple such contrats may be applied, and the report is not locked.
     *   Async function are permitted but may not behave as expected.
     *   @param {Contract} contract The function to execute
     *   Additional parameters may be _prepended_ to contract
     *   and will be passed to it _after_ the Report object in question.
     *   @returns {Report} this (chainable)
     *   @example Basic usage
     *   const r = new Report()
     *       .runSync( ok => ok.equal( 'war', 'peace', '1984' ) )
     *       .runSync( ok => ok.type ( [], 'array', 'some more checks' ) )
     *       .done();
     */
    runSync (...args) {
        this._lock();
        const block = args.pop();
        if (typeof block !== 'function')
            throw new Error('Last argument of run() must be a function, not ' + typeof block);
        const result = block( this, ...args ); /* eslint-disable-line no-unused-vars */
        // TODO check that `result` is NOT a promise
        return this;
    }

    setResult (evidence, descr, condName, where) {
        this._lock();
        const n = ++this._count;
        if (descr)
            this._descr[n] = descr;
        // pass - return ASAP
        if (!evidence)
            return this;

        // nested report needs special handling
        if (evidence instanceof Report) {
            this._nested[n] = evidence;
            if (evidence.getDone()) {
                if (evidence.getPass())
                    return this; // short-circuit if possible
                evidence = []; // hack - failing without explanation
            } else {
                // nested contract is in async mode - coerce into a promise
                const curry = evidence; /* eslint-disable-line */
                evidence = new Promise( (resolve, reject) => {
                    curry.onDone( resolve );
                });
            }
        }

        // pending - we're in async mode
        if (evidence instanceof Promise) {
            this._pending.add(n);
            where = where || callerInfo(2); // must report actual caller, not then
            evidence.then( x => {
                this._pending.delete(n);
                this._setResult(n, x, condName, where );
                if (this.getDone()) {
                    for (let i = this._onDone.length; i-- > 0; )
                        this._onDone[i](this);
                }
            });
            return this;
        }

        this._setResult(n, evidence, condName, where || callerInfo(2));
        return this;
    }

    _setResult (n, evidence, condName, where) {
        if (!evidence)
            return;

        // listify & stringify evidence, so that it doesn't change post-factum
        if (!Array.isArray(evidence))
            evidence = [evidence];
        this._evidence[n] = evidence.map( x => _explain(x, Infinity) );
        this._where[n]    = where;
        this._condName[n] = condName;
        this._failCount++;
    }

    /**
     * @desc Append an informational message to the report.
     * Non-string values will be stringified via explain().
     * @param {Any} message
     * @returns {Report} chainable
     */
    info ( ...message ) {
        this._lock();
        if (!this._info[this._count])
            this._info[this._count] = [];
        this._info[this._count].push( message.map( s => _explain(s) ).join(' ') );
        return this;
    }

    /**
     *   @desc Locks the report object, so no modifications may be made later.
     *   Also if onDone callback(s) are present, they are executed
     *   unless there are pending async checks.
     *   @returns {Report} this (chainable)
     */
    done (callback) {
        if (callback !== undefined)
            this.onDone(callback);

        if (!this._done) {
            this._done = true;
            if (!this._pending.size) {
                for (let i = this._onDone.length; i-- > 0; )
                    this._onDone[i](this);
            }
        }
        return this;
    }

    // check if the Report object is still modifiable, throws otherwise.
    _lock () {
        if (this._done)
            throw new Error('Attempt to modify a finished contract');
    }

    // Querying methods

    /**
     *   @desc  Tells whether the report is finished,
     *          i.e. done() was called & no pending async checks.
     *   @returns {boolean}
     */
    getDone () {
        return this._done && !this._pending.size; // is it even needed?
    }

    /**
     *   @desc Without argument returns whether the contract was fulfilled.
     *   As a special case, if no checks were run and the contract is finished,
     *   returns false, as in "someone must have forgotten to execute
     *   planned checks. Use pass() if no checks are planned.
     *
     *   If a parameter is given, return the status of n-th check instead.
     *   @param {integer} n
     *   @returns {boolean}
     */
    getPass (n) {
        if (n === undefined)
            return this._failCount === 0;
        return (n > 0 && n <= this._count) ? !this._evidence[n] : undefined;
    }

    /**
     *   @desc Number of checks performed.
     *   @returns {number}
     */
    getCount () {
        return this._count;
    }

    /**
     *  @desc Whether the last check was a success.
     *  This is just a shortcut for foo.getDetails(foo.getCount).pass
     *  @returns {boolean}
     */
    last () {
        return this._count ? !this._evidence[this._count] : undefined;
    }

    /**
     *   @desc Number of checks failing.
     *   @returns {number}
     */
    getFailCount () {
        return this._failCount;
    }

    /**
     *   @desc Return a string of failing/passing checks.
     *   This may be useful for validating custom conditions.
     *   Consecutive passing checka are represented by numbers.
     *   A capital letter in the string represents failure.
     *   See also {@link Report#toString toString()}
     *   @returns {string}
     *   @example
     *   // 10 passing checks
     *   "r(10)"
     *   @example
     *   // 10 checks with 1 failure in the middle
     *   "r(5,N,4)"
     *   @example
     *   // 10 checks including a nested contract
     *   "r(3,r(1,N),6)"
     *   @example
     *   // no checks were run - auto-fail
     *   "r(Z)"
     */
    getGhost () {
        const ghost = [];
        let streak  = 0;
        for (let i = 1; i <= this._count; i++) {
            if (this._evidence[i] || this._nested[i]) {
                if (streak) ghost.push(streak);
                streak = 0;
                ghost.push( this._nested[i] ? this._nested[i].getGhost() : 'N');
            } else { /* eslint-desable-line curly */
                streak++;
            }
        }
        if (streak) ghost.push(streak);
        return 'r(' + ghost.join(',') + ')';
    }

    /**
     *  @desc Returns serialized diff-like report with nesting and indentation.
     *  Passing conditions are merked with numbers, failing are prefixed
     *  with a bang (!).
     *
     *  See also {@link Report#getGhost getGhost()}
     *  @returns {string}
     *  @example // no checks run
     *  const r = new Report();
     *  r.toString();
     *  r(
     *  )
     *  @example // pass
     *  const r = new Report();
     *  r.pass('foo bared');
     *  r.toString();
     *  r(
     *      1. foo bared
     *  )
     *  @example // fail
     *  const r = new Report();
     *  r.equal('war', 'peace');
     *  r.toString();
     *  r(
     *      !1.
     *      ^ Condition equal failed at <file>:<line>:<char>
     *      - war
     *      + peace
     *  )
     */
    toString () {
        // TODO replace with refute.io when we buy the domain
        return 'refute/' + protocol + '\n' + this.getLines().join('\n');
    }

    getLines (indent = '') {
        const out  = [indent + 'r('];
        const last = indent + ')';
        indent     = indent + '    ';

        const pad = prefix => s => indent + prefix + ' ' + s;

        if (this._info[0])
            out.push( ...this._info[0].map( pad(';') ) );
        for (let n = 1; n <= this._count; n++) {
            out.push( ...this.getLinesPartial( n, indent ) );
            if (this._info[n])
                out.push( ...this._info[n].map( pad(';') ) );
        }
        out.push(last);
        return out;
    }

    getLinesPartial (n, indent = '') {
        const out = [];
        out.push(
            indent
            + (this._pending.has(n) ? '...' : (this._evidence[n] ? '!' : '') )
            + n + (this._descr[n] ? '. ' + this._descr[n] : '.')
        );
        if (this._nested[n]) { /* eslint-disable-line curly */
            out.push( ...this._nested[n].getLines(indent) );
        } else if (this._evidence[n]) {
            out.push( indent + '    ^ Condition `' + (this._condName[n] || 'check')
                + '` failed at ' + this._where[n] );
            this._evidence[n].forEach( raw => {
                // Handle multiline evidence
                // TODO this is perl written in JS, rewrite more clearly
                let [_, prefix, s] = raw.match( /^([-+|] )?(.*?)\n?$/s );
                if (!prefix) prefix = '| ';
                if (!s.match(/\n/)) { /* esline-disable-line curly */
                    out.push( indent + '    ' + prefix + s );
                } else {
                    s.split('\n').forEach(
                        part => out.push( indent + '    ' + prefix + part ));
                }
            });
        }
        return out;
    }

    /**
     *  @desc returns a plain serializable object
     *  @returns {Object}
     */
    toJSON () {
        const n = this.getCount();
        const details = [];
        for (let i = 0; i <= n; i++) {
            const node = this.getDetails(i);
            // strip extra keys
            for (const key in node) {
                if (node[key] === undefined || (Array.isArray(node[key]) && node[key].length === 0))
                    delete node[key];
            }
            details.push(node);
        }
        return {
            pass:  this.getPass(),
            count: this.getCount(),
            details,
        };
    }

    /**
     *   @desc Returns detailed report on a specific check
     *   @param {integer} n - check number, must be <= getCount()
     *   @returns {object}
     */
    getDetails (n) {
        // TODO validate n

        // ugly but what can I do
        if (n === 0) {
            return {
                n:    0,
                info: this._info[0] || [],
            };
        }

        let evidence = this._evidence[n];
        if (evidence && !Array.isArray(evidence))
            evidence = [evidence];

        return {
            n:        n,
            name:     this._descr[n] || '',
            pass:     !evidence,
            evidence: evidence || [],
            where:    this._where[n],
            cond:     this._condName[n],
            info:     this._info[n] || [],
            nested:   this._nested[n],
            pending:  this._pending.has(n),
        };
    }
}

// this is for stuff like `object foo = {"foo":42}`
// we don't want the explanation to be quoted!
function _explain ( item, depth ) {
    if (typeof item === 'string' )
        return item;
    return explain( item, { depth } );
}

Report.prototype.explain = explain; // also make available via report
Report.protocol = protocol;

// part of addCondition
const knownChecks = new Set();

/* NOTE Please keep all addCondition invocations searchable via */
/* grep -r "^ *addCondition.*'" /
/**
 *  @memberOf refute
 *  @static
 *  @desc Create new check method available via all Report instances
 *  @param {string} name Name of the new condition.
 *  Must not be present in Report already, and should NOT start with
 *  get..., set..., or add... (these are reserved for Report itself)
 *  @param {Object} options Configuring the check's handling of arguments
 *  @param {integer} options.args The required number of arguments
 *  @param {integer} [options.minArgs] Minimum number of argument (defaults to args)
 *  @param {integer} [options.maxArgs] Maximum number of argument (defaults to args)
 *  @param {boolean} [options.hasOptions] If true, an optional object
can be supplied as last argument. It won't interfere with description.
 *  @param {boolean} [options.fun] The last argument is a callback
 *  @param {Function} implementation - a callback that takes {args} arguments
 *  and returns a falsey value if condition passes
 *  ("nothing to see here, move along"),
 *  or evidence if it fails
 *  (e.g. typically a got/expected diff).
 */
function addCondition (name, options, impl) {
    if (typeof name !== 'string')
        throw new Error('Condition name must be a string');
    if (name.match(/^(_|get[_A-Z]|set[_A-Z])/))
        throw new Error('Condition name must not start with get_, set_, or _');
    // TODO must do something about name clashes, but later
    // because eval in browser may (kind of legimitely) override conditions
    if (!knownChecks.has(name) && Report.prototype[name])
        throw new Error('Method already exists in Report: ' + name);
    if (typeof options !== 'object')
        throw new Error('bad options');
    if (typeof impl !== 'function')
        throw new Error('bad implementation');

    const minArgs    = options.minArgs || options.args;
    if (!Number.isInteger(minArgs) || minArgs < 0)
        throw new Error('args/minArgs must be nonnegative integer');
    const maxArgs    = options.maxArgs || options.args || Infinity;
    if (maxArgs !== Infinity && (!Number.isInteger(minArgs) || maxArgs < minArgs))
        throw new Error('maxArgs must be integer and greater than minArgs, or Infinity');
    const descrFirst    = options.descrFirst || options.fun || maxArgs > 10;
    const hasOptions    = !!options.hasOptions;
    const maxArgsReal   = maxArgs + (hasOptions ? 1 : 0);

    // TODO alert unknown options

    // TODO this code is cluttered, rewrite
    const code = function (...args) {
        // TODO const nArgs = args.length
        const descr = descrFirst
            ? args.shift()
            : ( (args.length > maxArgs && typeof args[args.length - 1] === 'string') ? args.pop() : undefined);
        if (args.length > maxArgsReal || args.length < minArgs)
            throw new Error('Condition ' + name + ' must have ' + minArgs + '..' + maxArgsReal + ' arguments '); // TODO

        return this.setResult( impl(...args), descr, name );
    };

    knownChecks.add(name);
    Report.prototype[name] = code;
}

// The most basic conditions are defined right here
// in order to be sure we can validate the Report class itself.

/**
 *  @namespace conditions
 *  @desc Condition check library. These methods must be run on a
 *  {@link Report} object.
 */
/**
 *   @instance
 *   @memberOf conditions
 *   @method check
 *   @desc A generic check of a condition.
 *   @param evidence If false, 0, '', or undefined, the check is assumed to pass.
 *   Otherwise it fails, and this argument will be displayed as the reason why.
 *   @param {string} [description] The reason why we care about the check.
 *   @returns {undefined}
 */
/**
 *   @instance
 *   @memberOf conditions
 *   @method pass
 *   @desc Always passes.
 *   @param {string} [description]
 *   @returns {undefined}
 */
/**
 *   @instance
 *   @memberOf conditions
 *   @method fail
 *   @desc Always fails with a "failed deliberately" message.
 *   @param {string} [description]
 *   @returns {undefined}
 */
/**
 *   @instance
 *   @memberOf conditions
 *   @method equal
 *   @desc Checks if === holds between two values.
 *   If not, both will be stringified and displayed as a diff.
 *   See deepEqual to check nested data structures ot objects.
 *   @param {any} actual
 *   @param {any} expected
 *   @param {string} [description]
 *   @returns {undefined}
 */
/**
 *   @instance
 *   @memberOf conditions
 *   @method match
 *   @desc Checks if a string matches a regular expression.
 *   @param {strung} actual
 *   @param {RegExp} expected
 *   @param {string} [description]
 *   @returns {undefined}
 */
/**
 *   @instance
 *   @memberOf conditions
 *   @method nested
 *   @desc Verify a nested contract.
 *   @param {string} description
 *   @param {Contract} contract
 *   @returns {undefined}
 */

addCondition( 'check',
    { args: 1 },
    x => x
);
addCondition( 'pass',
    { args: 0 },
    () => 0
);
addCondition( 'fail',
    { args: 0 },
    () => 'failed deliberately'
);
addCondition( 'equal',
    { args: 2 },
    (a, b) => a === b ? 0 : ['- ' + explain(a), '+ ' + explain(b)]
);
addCondition( 'match',
    { args: 2 },
    // TODO function(str, rex)
    (a, rex) => (a === undefined || a === null)
        ? ['' + a, 'Does not match : ' + rex]
        : ('' + a).match(rex)
            ? 0
            : [
                'String         : ' + a,
                'Does not match : ' + rex,
            ]
);
addCondition( 'nested',
    { fun: 1, minArgs: 1 },
    (...args) => new Report().run(...args).done()
);

module.exports = { Report, addCondition, explain };

},{"./util.js":6}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
'use strict';

/**
 *   This is the entry point for browser version.
 *   We are using webpack currently. See ../browsetify.sh
 */

// TODO check if refute already exists, also check version
window.refute = require( './index.js' );

},{"./index.js":4}]},{},[7])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvY29uZC9hcnJheS5qcyIsImxpYi9jb25kL2Jhc2ljLmpzIiwibGliL2NvbmQvZGVlcC5qcyIsImxpYi9pbmRleC5qcyIsImxpYi9yZXBvcnQuanMiLCJsaWIvdXRpbC5qcyIsImxpYi93ZWItaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2cEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCBSZXBvcnQgfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBmb3JFYWNoXG4gKiAgIEBkZXNjICBDaGVja3MgdGhhdCBhIG5lc3RlZCBjb250cmFjdCBob2xkcyBmb3IgZWFjaCBlbGVtZW50IG9mIGFuIGFycmF5LlxuICogICBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRpb25cbiAqICAgQHBhcmFtIHtBcnJheX0gYXJyYXkgTGlzdCBvZiBpdGVtcy5cbiAqICAgQHBhcmFtIHtDb250cmFjdH0gbmVzdGVkIEZpcnN0IGFyZ3VtZW50IGdpdmVuIHRvIHRoZSBjYWxsYmFja1xuICogICBpcyBhIFJlcG9ydCBvYmplY3QsIGFuZCB0aGUgc2Vjb25kIG9uZSBpcyB0aGUgYXJyYXkgaXRlbSBpbiBxdWVzdGlvbi5cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuXG5hZGRDb25kaXRpb24oICdmb3JFYWNoJyxcbiAgICAvLyBUT0RPIGJldHRlciBuYW1lIHRoYXQgcmh5bWVzIHdpdGggdGhlIG9yZGVyZWQgb25lIChtYXAvcmVkdWNlPylcbiAgICB7IGZ1bjogMSwgYXJnczogMiB9LFxuICAgIChsaXN0LCBjb250cmFjdCkgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpXG4gICAgICAgICAgICByZXR1cm4gJ0V4cGVjdGVkIGEgbGlzdCwgZm91bmQgYSAnLnR5cGVvZihsaXN0KTtcbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBhdXRvLXBhc3NcblxuICAgICAgICBjb25zdCBvayA9IG5ldyBSZXBvcnQoKTtcbiAgICAgICAgbGlzdC5mb3JFYWNoKCAoaXRlbSwgaW5kZXgpID0+IG9rLm5lc3RlZCggJ2l0ZW0gJyArIGluZGV4LCBpdGVtLCBjb250cmFjdCApICk7XG4gICAgICAgIHJldHVybiBvay5kb25lKCk7XG4gICAgfVxuKTtcblxuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIG9yZGVyZWRcbiAqICAgQGRlc2MgIENoZWNrcyB0aGF0IGEgbmVzdGVkIGNvbnRyYWN0IGhvbGRzIGZvciBlYWNoIHBhaXJcbiAqICAgb2YgYWRqYWNlbnQgZWxlbWVudCBvZiBhbiBhcnJheSAoaS5lLiAxJjIsIDImMywgMyY0LCAuLi4pLlxuICogICBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRpb25cbiAqICAgQHBhcmFtIHtBcnJheX0gYXJyYXkgTGlzdCBvZiBpdGVtcy5cbiAqICAgQHBhcmFtIHtDb250cmFjdH0gbmVzdGVkIEZpcnN0IGFyZ3VtZW50IGdpdmVuIHRvIHRoZSBjYWxsYmFja1xuICogICBpcyBhIFJlcG9ydCBvYmplY3QsIGFuZCB0aGUgc2Vjb25kIGFuZCB0aGlyZCBvbmVzXG4gKiAgIGFyZSB0aGUgYXJyYXkgaXRlbXMgaW4gcXVlc3Rpb24uXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cblxuLy8gVE9ETyB0aGlzIGlzIGNhbGxlZCBcImNvbXBsaWFudCBjaGFpblwiIGJ1dCBiZXR0ZXIganVzdCBzYXkgaGVyZVxuLy8gXCJvaCB3ZSdyZSBjaGVja2luZyBlbGVtZW50IG9yZGVyXCJcbmFkZENvbmRpdGlvbiggJ29yZGVyZWQnLFxuICAgIC8vIFRPRE8gYmV0dGVyIG5hbWU/IHBhaXJ3aXNlPyByZWR1Y2U/XG4gICAgeyBmdW46IDEsIGFyZ3M6IDIgfSxcbiAgICAobGlzdCwgY29udHJhY3QpID0+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKVxuICAgICAgICAgICAgcmV0dXJuICdFeHBlY3RlZCBhIGxpc3QsIGZvdW5kIGEgJy50eXBlb2YobGlzdCk7XG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA8IDIpXG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gYXV0by1wYXNzXG5cbiAgICAgICAgY29uc3Qgb2sgPSBuZXcgUmVwb3J0KCk7XG4gICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgbGlzdC5sZW5ndGggLSAxOyBuKyspXG4gICAgICAgICAgICBvay5uZXN0ZWQoICdpdGVtcyAnICsgbiArICcsICcgKyAobiArIDEpLCBsaXN0W25dLCBsaXN0W24gKyAxXSwgY29udHJhY3QpO1xuXG4gICAgICAgIHJldHVybiBvay5kb25lKCk7XG4gICAgfVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIGV4cGxhaW4gfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5jb25zdCBPSyA9IGZhbHNlO1xuXG5jb25zdCBjbXBOdW0gPSB7XG4gICAgJzwnOiAgKHgsIHkpID0+ICh4ICA8IHkpLFxuICAgICc+JzogICh4LCB5KSA9PiAoeCAgPiB5KSxcbiAgICAnPD0nOiAoeCwgeSkgPT4gKHggPD0geSksXG4gICAgJz49JzogKHgsIHkpID0+ICh4ID49IHkpLFxuICAgICc9PSc6ICh4LCB5KSA9PiAoeCA9PT0geSksXG4gICAgJyE9JzogKHgsIHkpID0+ICh4ICE9PSB5KSxcbn07XG5cbi8qIGVzbGludC1kaXNhYmxlIGVxZXFlcSAtLSB3ZSdyZSBmaWx0ZXJpbmcgb3V0IHVuZGVmaW5lZCBBTkQgbnVsbCBoZXJlICovXG5jb25zdCBjbXBTdHIgPSB7XG4gICAgJzwnOiAgKHgsIHkpID0+IHggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyArIHggIDwgJycgKyB5KSxcbiAgICAnPic6ICAoeCwgeSkgPT4geCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnICsgeCAgPiAnJyArIHkpLFxuICAgICc8PSc6ICh4LCB5KSA9PiB4ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycgKyB4IDw9ICcnICsgeSksXG4gICAgJz49JzogKHgsIHkpID0+IHggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyArIHggPj0gJycgKyB5KSxcblxuICAgICc9PSc6ICh4LCB5KSA9PiB4ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycgKyB4ID09PSAnJyArIHkpLFxuICAgICchPSc6ICh4LCB5KSA9PiAoKHggPT0gdW5kZWZpbmVkKSBeICh5ID09IHVuZGVmaW5lZCkpIHx8ICgnJyArIHggIT09ICcnICsgeSksXG59O1xuLyogZXNsaW50LWVuYWJsZSBlcWVxZXEgKi9cblxuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGNtcE51bVxuICogICBAZGVzYyAgQ2hlY2tzIGlmIGEgcmVsYXRpb24gaW5kZWVkIGhvbGRzIGJldHdlZW4gYXJndW1lbnRzLlxuICogICAgICAgICAgU2VlIGFsc28ge0BsaW5rIGNtcFN0cn1cbiAqICAgQHBhcmFtIHthbnl9IGFyZzEgICAgRmlyc3QgYXJndW1lbnRcbiAqICAgQHBhcmFtIHtzdHJpbmd9IG9wZXJhdGlvbiAgT25lIG9mICc8JywgJzw9JywgJz09JywgJyE9JywgJz49Jywgb3IgJz4nXG4gKiAgIEBwYXJhbSB7YW55fSBhcmcyICAgIFNlY29uZCBhcmd1bWVudFxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgY21wU3RyXG4gKiAgIEBkZXNjICBDaGVja3MgaWYgYSByZWxhdGlvbiBpbmRlZWQgaG9sZHMgYmV0d2VlbiBhcmd1bWVudHMsXG4gKiAgICAgICAgICBhc3N1bWluZyB0aGV5IGFyZSBzdHJpbmdzLlxuICogICAgICAgICAgU2VlIGFsc28ge0BsaW5rIGNtcE51bX1cbiAqICAgQHBhcmFtIHthbnl9IGFyZzEgICAgRmlyc3QgYXJndW1lbnRcbiAqICAgQHBhcmFtIHtzdHJpbmd9IG9wZXJhdGlvbiAgT25lIG9mICc8JywgJzw9JywgJz09JywgJyE9JywgJz49Jywgb3IgJz4nXG4gKiAgIEBwYXJhbSB7YW55fSBhcmcyICAgIFNlY29uZCBhcmd1bWVudFxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5cbmFkZENvbmRpdGlvbiggJ2NtcE51bScsXG4gICAgeyBhcmdzOiAzIH0sXG4gICAgKHgsIG9wLCB5KSA9PiBjbXBOdW1bb3BdKHgsIHkpID8gMCA6IFt4LCAnaXMgbm90ICcgKyBvcCwgeV1cbik7XG5hZGRDb25kaXRpb24oICdjbXBTdHInLFxuICAgIHsgYXJnczogMyB9LFxuICAgICh4LCBvcCwgeSkgPT4gY21wU3RyW29wXSh4LCB5KSA/IDAgOiBbeCwgJ2lzIG5vdCAnICsgb3AsIHldXG4pO1xuXG5jb25zdCB0eXBlQ2hlY2sgPSB7XG4gICAgdW5kZWZpbmVkOiB4ID0+IHggPT09IHVuZGVmaW5lZCxcbiAgICBudWxsOiAgICAgIHggPT4geCA9PT0gbnVsbCxcbiAgICBudW1iZXI6ICAgIHggPT4gdHlwZW9mIHggPT09ICdudW1iZXInICYmICFOdW1iZXIuaXNOYU4oeCksXG4gICAgaW50ZWdlcjogICB4ID0+IE51bWJlci5pc0ludGVnZXIoeCksXG4gICAgbmFuOiAgICAgICB4ID0+IE51bWJlci5pc05hTih4KSxcbiAgICBzdHJpbmc6ICAgIHggPT4gdHlwZW9mIHggPT09ICdzdHJpbmcnLFxuICAgIGZ1bmN0aW9uOiAgeCA9PiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyxcbiAgICBib29sZWFuOiAgIHggPT4gdHlwZW9mIHggPT09ICdib29sZWFuJyxcbiAgICBvYmplY3Q6ICAgIHggPT4geCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoeCksXG4gICAgYXJyYXk6ICAgICB4ID0+IEFycmF5LmlzQXJyYXkoeCksXG59O1xuZnVuY3Rpb24gdHlwZUV4cGxhaW4gKHgpIHtcbiAgICBpZiAodHlwZW9mIHggPT09ICdzdHJpbmcnKVxuICAgICAgICByZXR1cm4geDtcbiAgICBpZiAodHlwZW9mIHggPT09ICdmdW5jdGlvbicpXG4gICAgICAgIHJldHVybiAnaW5zdGFuY2VvZiAnICsgKHgubmFtZSB8fCB4KTtcbn1cblxuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIHR5cGVcbiAqICAgQGRlc2MgIENoZWNrcyB0aGF0IGEgdmFsdWUgaXMgb2YgdGhlIHNwZWNpZmllZCB0eXBlLlxuICogICBAcGFyYW0ge2FueX0gdmFsdWUgICAgRmlyc3QgYXJndW1lbnRcbiAqICAgQHBhcmFtIHtzdHJpbmd8ZnVuY3Rpb258QXJyYXl9IHR5cGVcbiAqICAgICAgIE9uZSBvZiAndW5kZWZpbmVkJywgJ251bGwnLCAnbnVtYmVyJywgJ2ludGVnZXInLCAnbmFuJywgJ3N0cmluZycsXG4gKiAgICAgICAnYm9vbGVhbicsICdvYmplY3QnLCAnYXJyYXknLCBhIGNsYXNzLCBvciBhbiBhcnJheSBjb250YWluaW5nIDEgb3IgbW9yZVxuICogICAgICAgb2YgdGhlIGFib3ZlLiAnbnVtYmVyJy8naW50ZWdlcicgZG9uJ3QgaW5jbHVkZSBOYU4sXG4gKiAgICAgICBhbmQgJ29iamVjdCcgZG9lc24ndCBpbmNsdWRlIGFycmF5cy5cbiAqICAgICAgIEEgZnVuY3Rpb24gaW1wbGllcyBhbiBvYmplY3QgYW5kIGFuIGluc3RhbmNlb2YgY2hlY2suXG4gKiAgICAgICBBcnJheSBtZWFucyBhbnkgb2YgdGhlIHNwZWNpZmllZCB0eXBlcyAoYWthIHN1bSBvZiB0eXBlcykuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbmFkZENvbmRpdGlvbiggJ3R5cGUnLFxuICAgIHsgYXJnczogMiB9LFxuICAgIChnb3QsIGV4cCkgPT4ge1xuICAgICAgICBpZiAoICFBcnJheS5pc0FycmF5KGV4cCkgKVxuICAgICAgICAgICAgZXhwID0gW2V4cF07XG5cbiAgICAgICAgZm9yIChjb25zdCB2YXJpYW50IG9mIGV4cCkge1xuICAgICAgICAgICAgLy8ga25vd24gdHlwZVxuICAgICAgICAgICAgaWYgKCB0eXBlb2YgdmFyaWFudCA9PT0gJ3N0cmluZycgJiYgdHlwZUNoZWNrW3ZhcmlhbnRdICkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlQ2hlY2tbdmFyaWFudF0oZ290KSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9LO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBpbnN0YW5jZW9mXG4gICAgICAgICAgICBpZiAoIHR5cGVvZiB2YXJpYW50ID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBnb3QgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgaWYgKCBnb3QgaW5zdGFuY2VvZiB2YXJpYW50IClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9LO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBkb24ndCBrbm93IHdoYXQgeW91J3JlIGFza2luZyBmb3JcbiAgICAgICAgICAgIHJldHVybiAndW5rbm93biB2YWx1ZSB0eXBlIHNwZWM6ICcgKyBleHBsYWluKHZhcmlhbnQsIDEpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAnLSAnICsgZXhwbGFpbihnb3QsIDEpLFxuICAgICAgICAgICAgJysgJyArIGV4cC5tYXAoIHR5cGVFeHBsYWluICkuam9pbignIG9yICcpLFxuICAgICAgICBdO1xuICAgIH1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCBleHBsYWluIH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgZGVlcEVxdWFsXG4gKiAgIEBkZXNjIENvbXBhcmVzIHR3byBzdHJ1Y3R1cmVzLCBvdXRwdXRzIGRpZmYgaWYgZGlmZmVyZW5jZXMgZm91bmQuXG4gKiAgIEBwYXJhbSB7YW55fSBhY3R1YWwgICAgRmlyc3Qgc3RydWN0dXJlXG4gKiAgIEBwYXJhbSB7YW55fSBleHBlY3RlZCAgU3RydWN0dXJlIHRvIGNvbXBhcmUgdG9cbiAqICAgQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogICBAcGFyYW0ge251bWJlcn0gb3B0aW9ucy5tYXggaG93IG1hbnkgZGlmZmVyZW5jZXMgdG8gb3V0cHV0IChkZWZhdWx0IDUpXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbmFkZENvbmRpdGlvbiggJ2RlZXBFcXVhbCcsXG4gICAgeyBhcmdzOiAyLCBoYXNPcHRpb25zOiB0cnVlIH0sIGRlZXAgKTtcblxuZnVuY3Rpb24gZGVlcCAoIGdvdCwgZXhwLCBvcHRpb25zID0ge30gKSB7XG4gICAgaWYgKCFvcHRpb25zLm1heClcbiAgICAgICAgb3B0aW9ucy5tYXggPSA1O1xuICAgIG9wdGlvbnMuZGlmZiA9IFtdO1xuICAgIF9kZWVwKCBnb3QsIGV4cCwgb3B0aW9ucyApO1xuICAgIGlmICghb3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgcmV0dXJuIDA7XG5cbiAgICBjb25zdCByZXQgPSBbXTtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2Ygb3B0aW9ucy5kaWZmKSB7XG4gICAgICAgIHJldC5wdXNoKFxuICAgICAgICAgICAgJ2F0ICcgKyBpdGVtWzBdLFxuICAgICAgICAgICAgJy0gJyArIChpdGVtWzNdID8gaXRlbVsxXSA6IGV4cGxhaW4oIGl0ZW1bMV0sIHsgZGVwdGg6IDIgfSApKSxcbiAgICAgICAgICAgICcrICcgKyAoaXRlbVszXSA/IGl0ZW1bMl0gOiBleHBsYWluKCBpdGVtWzJdLCB7IGRlcHRoOiAyIH0gKSksXG4gICAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59XG5cbi8vIHJlc3VsdCBpcyBzdG9yZWQgaW4gb3B0aW9ucy5kaWZmPVtdLCByZXR1cm4gdmFsdWUgaXMgaWdub3JlZFxuLy8gaWYgc2FpZCBkaWZmIGV4Y2VlZHMgbWF4LCByZXR1cm4gaW1tZWRpYXRlbHkgJiBkb24ndCB3YXN0ZSB0aW1lXG5mdW5jdGlvbiBfZGVlcCAoIGdvdCwgZXhwLCBvcHRpb25zID0ge30sIHBhdGggPSAnJCcsIHNlZW5MID0gbmV3IE1hcCgpLCBzZWVuUiA9IG5ldyBNYXAoKSApIHtcbiAgICBpZiAoZ290ID09PSBleHAgfHwgb3B0aW9ucy5tYXggPD0gb3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgcmV0dXJuO1xuICAgIGlmICh0eXBlb2YgZ290ICE9PSB0eXBlb2YgZXhwKVxuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cF0gKTtcblxuICAgIC8vIHJlY3Vyc2UgYnkgZXhwZWN0ZWQgdmFsdWUgLSBjb25zaWRlciBpdCBtb3JlIHByZWRpY3RhYmxlXG4gICAgaWYgKHR5cGVvZiBleHAgIT09ICdvYmplY3QnIHx8IGV4cCA9PT0gbnVsbCApIHtcbiAgICAgICAgLy8gbm9uLW9iamVjdHMgLSBzbyBjYW4ndCBkZXNjZW5kXG4gICAgICAgIC8vIGFuZCBjb21wYXJpc29uIGFscmVhZHkgZG9uZSBhdCB0aGUgYmVnaW5ubmluZ1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cF0gKTtcbiAgICB9XG5cbiAgICAvLyBtdXN0IGRldGVjdCBsb29wcyBiZWZvcmUgZ29pbmcgZG93blxuICAgIGNvbnN0IHBhdGhMID0gc2VlbkwuZ2V0KGdvdCk7XG4gICAgY29uc3QgcGF0aFIgPSBzZWVuUi5nZXQoZXhwKTtcbiAgICBpZiAocGF0aEwgfHwgcGF0aFIpIHtcbiAgICAgICAgLy8gTG9vcCBkZXRlY3RlZCA9IG9ubHkgY2hlY2sgdG9wb2xvZ3lcbiAgICAgICAgaWYgKHBhdGhMID09PSBwYXRoUilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbXG4gICAgICAgICAgICBwYXRoICsgJyAoY2lyY3VsYXIpJyxcbiAgICAgICAgICAgIHBhdGhMID8gJ0NpcmN1bGFyPScgKyBwYXRoTCA6IGV4cGxhaW4oZ290LCB7IGRlcHRoOiAyIH0pLFxuICAgICAgICAgICAgcGF0aFIgPyAnQ2lyY3VsYXI9JyArIHBhdGhSIDogZXhwbGFpbihleHAsIHsgZGVwdGg6IDIgfSksXG4gICAgICAgICAgICB0cnVlIC8vIGRvbid0IHN0cmluZ2lmeVxuICAgICAgICBdKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgICBzZWVuTC5zZXQoZ290LCBwYXRoKTtcbiAgICAgICAgc2VlblIuc2V0KGV4cCwgcGF0aCk7XG5cbiAgICAgICAgLy8gY29tcGFyZSBvYmplY3QgdHlwZXNcbiAgICAgICAgLy8gKGlmIGEgdXNlciBpcyBzdHVwaWQgZW5vdWdoIHRvIG92ZXJyaWRlIGNvbnN0cnVjdG9yIGZpZWxkLCB3ZWxsIHRoZSB0ZXN0XG4gICAgICAgIC8vIHdvdWxkIGZhaWwgbGF0ZXIgYW55d2F5KVxuICAgICAgICBpZiAoZ290LmNvbnN0cnVjdG9yICE9PSBleHAuY29uc3RydWN0b3IpXG4gICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cF0gKTtcblxuICAgICAgICAvLyBhcnJheVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShleHApKSB7XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZ290KSB8fCBnb3QubGVuZ3RoICE9PSBleHAubGVuZ3RoKVxuICAgICAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwXSApO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGV4cC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIF9kZWVwKCBnb3RbaV0sIGV4cFtpXSwgb3B0aW9ucywgZXh0ZW5kUGF0aChwYXRoLCBpKSwgc2VlbkwsIHNlZW5SICk7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMubWF4IDw9IG9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gY29tcGFyZSBrZXlzIC0gKzEgZm9yIGV4cCwgLTEgZm9yIGdvdCwgbm9uemVybyBrZXkgYXQgZW5kIG1lYW5zIGtleXMgZGlmZmVyXG4gICAgICAgIC8vIFRPRE8gYmV0dGVyLCBmYXN0ZXIgd2F5IHRvIGRvIGl0P1xuICAgICAgICBjb25zdCB1bmlxID0ge307XG4gICAgICAgIE9iamVjdC5rZXlzKGV4cCkuZm9yRWFjaCggeCA9PiB7IHVuaXFbeF0gPSAxIH0gKTtcbiAgICAgICAgT2JqZWN0LmtleXMoZ290KS5mb3JFYWNoKCB4ID0+IHsgdW5pcVt4XSA9ICh1bmlxW3hdIHx8IDApIC0gMSB9ICk7XG4gICAgICAgIGZvciAoY29uc3QgeCBpbiB1bmlxKSB7XG4gICAgICAgICAgICBpZiAodW5pcVt4XSAhPT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cF0gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIG5vdyB0eXBlb2YsIG9iamVjdCB0eXBlLCBhbmQgb2JqZWN0IGtleXMgYXJlIHRoZSBzYW1lLlxuICAgICAgICAvLyByZWN1cnNlLlxuICAgICAgICBmb3IgKGNvbnN0IGkgaW4gZXhwKSB7XG4gICAgICAgICAgICBfZGVlcCggZ290W2ldLCBleHBbaV0sIG9wdGlvbnMsIGV4dGVuZFBhdGgocGF0aCwgaSksIHNlZW5MLCBzZWVuUiApO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMubWF4IDw9IG9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBzZWVuTC5kZWxldGUoZ290KTtcbiAgICAgICAgc2VlblIuZGVsZXRlKGV4cCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBleHRlbmRQYXRoIChwYXRoLCBzdWZmaXgpIHtcbiAgICAvLyBhcnJheVxuICAgIGlmICggdHlwZW9mIHN1ZmZpeCA9PT0gJ251bWJlcicgKVxuICAgICAgICByZXR1cm4gcGF0aCArICdbJyArIHN1ZmZpeCArICddJztcbiAgICAvL1xuICAgIGlmICggc3VmZml4Lm1hdGNoKC9eW2Etel9dW2Etel8wLTldKiQvaSkgKVxuICAgICAgICByZXR1cm4gcGF0aCArICcuJyArIHN1ZmZpeDtcbiAgICByZXR1cm4gcGF0aCArICdbJyArIEpTT04uc3RyaW5naWZ5KHN1ZmZpeCkgKyAnXSc7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIHRoZSBjb3JlIChzaG91bGQgZXhwbGFpbiBldmVuIGJlIHRoZXJlPylcbmNvbnN0IHsgUmVwb3J0LCBhZGRDb25kaXRpb24sIGV4cGxhaW4gfSA9IHJlcXVpcmUoJy4vcmVwb3J0LmpzJyk7XG5cbi8vIFRPRE8gYWRkIGVpZmZlbC1zdHlsZSBkZXNpZ24tYnktY29udHJhY3RcblxuLy8gaW1wb3J0IGRlZmF1bHQgY29uZGl0aW9uIGFyc2VuYWxcbnJlcXVpcmUoICcuL2NvbmQvYmFzaWMuanMnICk7XG5yZXF1aXJlKCAnLi9jb25kL2FycmF5LmpzJyApO1xucmVxdWlyZSggJy4vY29uZC9kZWVwLmpzJyApO1xuXG5jb25zdCBnZXRSZXBvcnQgPSAoLi4uYXJncykgPT4gbmV3IFJlcG9ydCgpLnJ1biguLi5hcmdzKS5kb25lKCk7XG5cbi8vIEFsbG93IGNyZWF0aW5nIG11bHRpcGxlIHBhcmFsbGVsIGNvbmZpZ3VyYXRpb25zIG9mIHJlZnV0ZVxuLy8gZS5nLiBvbmUgc3RyaWN0ICh0aHJvd2luZyBlcnJvcnMpIGFuZCBvdGhlciBsYXggKGp1c3QgZGVidWdnaW5nIHRvIGNvbnNvbGUpXG5mdW5jdGlvbiBzZXR1cCAoIG9wdGlvbnMgPSB7fSwgb3JpZyApIHtcbiAgICAvLyBUT0RPIHZhbGlkYXRlIG9wdGlvbnNcbiAgICBjb25zdCBvbkZhaWwgPSBvcHRpb25zLm9uRmFpbCB8fCAocmVwID0+IHsgdGhyb3cgbmV3IEVycm9yKHJlcC50b1N0cmluZygpKSB9KTtcblxuICAgIGNvbnN0IHJlZnV0ZSA9IG9wdGlvbnMuc2tpcFxuICAgICAgICA/ICgpID0+IHt9XG4gICAgICAgIDogKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG9rID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICAgICAgb2sub25Eb25lKCB4ID0+IHsgaWYgKCAheC5nZXRQYXNzKCkgKSBvbkZhaWwoeCwgYXJncykgfSApO1xuICAgICAgICAgICAgb2sucnVuKC4uLmFyZ3MpO1xuICAgICAgICAgICAgb2suZG9uZSgpO1xuICAgICAgICB9O1xuXG4gICAgLy8gcmVleHBvcnQgYWxsIGZyb20gcmVwb3J0LmpzXG4gICAgcmVmdXRlLlJlcG9ydCA9IFJlcG9ydDtcbiAgICByZWZ1dGUuZXhwbGFpbiA9IGV4cGxhaW47XG4gICAgcmVmdXRlLmFkZENvbmRpdGlvbiA9IGFkZENvbmRpdGlvbjtcblxuICAgIC8vIHNob3J0Y3V0IHRvIHZhbGlkYXRpbmcgJiByZXR1cm5pbmcgYSBmcmVzaCBjb250cmFjdFxuICAgIC8vIFRPRE8gcmVuYW1lIHRvIGF2b2lkIG5hbWUgY2xhc2ggd2l0aCB0aGUgY2xhc3NcbiAgICAvLyAoZXZhbD8pXG4gICAgcmVmdXRlLnJlcG9ydCA9IGdldFJlcG9ydDtcblxuICAgIC8vIHJlZnV0ZS5jb25mKHsuLi59KSB3aWxsIGdlbmVyYXRlIGEgX25ld18gcmVmdXRlXG4gICAgcmVmdXRlLmNvbmZpZyA9IHVwZGF0ZSA9PiBzZXR1cCggeyAuLi5vcHRpb25zLCAuLi51cGRhdGUgfSwgcmVmdXRlICk7XG5cbiAgICByZXR1cm4gcmVmdXRlO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldHVwKCk7XG5cbi8qKlxuICogICBAbmFtZXNwYWNlIHJlZnV0ZVxuICogICBAZGVzYyAgIEZ1bmN0aW9ucyBleHBvcnRlZCBieSByZWZ1dGFibGUncyBtYWluIG1vZHVsZS5cbiAqL1xuXG4vKipcbiAqICAgQHB1YmxpY1xuICogICBAbWVtYmVyT2YgcmVmdXRlXG4gKiAgIEBmdW5jdGlvbiByZWZ1dGVcbiAqICAgQHBhcmFtIHtBbnl9IFsuLi5saXN0XSBEYXRhIHRvIGZlZWQgdG8gdGhlIGNhbGxiYWNrXG4gKiAgIEBwYXJhbSB7Q29udHJhY3R9IGNvbnRyYWN0IEEgY29kZSBibG9jayB3aXRoIGNoZWNrcy5cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH0gUmV0dXJuIHZhbHVlIGlzIGlnbm9yZWQuXG4gKiAgIEB0aHJvd3Mge0Vycm9yfSBJZiBvbmUgb3IgbW9yZSBjaGVja3MgYXJlIGZhaWxpbmcsIGFuIGV4Y2VwdGlvbiBpcyB0aHJvd25cbiAqICAgd2l0aCBkZXRhaWxzIGFib3V0IGFsbCBwYXNzaW5nL2ZhaWxpbmcgY2hlY2tzLlxuICogICBUaGlzIGFjdGlvbiBjYW4gYmUgY2hhbmdlZCB2aWEgcmVmdXRlLmNvbmZpZygpIGNhbGwuXG4gKlxuICovXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgY2FsbGVySW5mbywgZXhwbGFpbiB9ID0gcmVxdWlyZSgnLi91dGlsLmpzJyk7XG5cbi8qKlxuICogICBAY2FsbGJhY2sgQ29udHJhY3RcbiAqICAgQGRlc2MgQSBjb2RlIGJsb2NrIGNvbnRhaW5pbmcgb25lIG9yIG1vcmUgY29uZGl0aW9uIGNoZWNrcy5cbiAqICAgQSBjaGVjayBpcyBwZXJmb3JtZWQgYnkgY2FsbGluZyBvbmUgb2YgYSBmZXcgc3BlY2lhbCBtZXRob2RzXG4gKiAgIChlcXVhbCwgbWF0Y2gsIGRlZXBFcXVhbCwgdHlwZSBldGMpXG4gKiAgIG9uIHRoZSBSZXBvcnQgb2JqZWN0LlxuICogICBDb250cmFjdHMgbWF5IGJlIG5lc3RlZCB1c2luZyB0aGUgJ25lc3RlZCcgbWV0aG9kIHdoaWNoIGFjY2VwdHNcbiAqICAgYW5vdGhlciBjb250cmFjdCBhbmQgcmVjb3JkcyBhIHBhc3MvZmFpbHVyZSBpbiB0aGUgcGFyZW50IGFjY29yZGluZ2x5LnFcbiAqICAgQSBjb250cmFjdCBpcyBhbHdheXMgZXhlY3V0ZWQgdG8gdGhlIGVuZC5cbiAqICAgQHBhcmFtIHtSZXBvcnR9IG9rIEFuIG9iamVjdCB0aGF0IHJlY29yZHMgY2hlY2sgcmVzdWx0cy5cbiAqICAgQHBhcmFtIHtBbnl9IFsuLi5saXN0XSBBZGRpdGlvbmFsIHBhcmFtZXRlcnNcbiAqICAgKGUuZy4gZGF0YSBzdHJ1Y3R1cmUgdG8gYmUgdmFsaWRhdGVkKVxuICogICBAcmV0dXJucyB7dm9pZH0gUmV0dXJuZWQgdmFsdWUgaXMgaWdub3JlZC5cbiAqL1xuXG5jb25zdCBwcm90b2NvbCA9IDEuMTtcblxuLyoqXG4gKiBAcHVibGljXG4gKiBAY2xhc3NkZXNjXG4gKiBUaGUgY29yZSBvZiB0aGUgcmVmdXRhYmxlIGxpYnJhcnksIHRoZSByZXBvcnQgb2JqZWN0IGNvbnRhaW5zIGluZm9cbiAqIGFib3V0IHBhc3NpbmcgYW5kIGZhaWxpbmcgY29uZGl0aW9ucy5cbiAqL1xuY2xhc3MgUmVwb3J0IHtcbiAgICAvLyBzZXR1cFxuICAgIC8qKlxuICAgICAqICBAZGVzYyBObyBjb25zdHJ1Y3RvciBhcmd1bWVudHMgc3VwcG9ydGVkLlxuICAgICAqICBDb250cmFjdHMgbWF5IG5lZWQgdG8gYmUgc2V0IHVwIGluc2lkZSBjYWxsYmFja3MgX2FmdGVyXyBjcmVhdGlvbixcbiAgICAgKiAgaGVuY2UgdGhpcyBjb252ZW50aW9uLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yICgpIHtcbiAgICAgICAgdGhpcy5fY291bnQgICAgID0gMDtcbiAgICAgICAgdGhpcy5fZmFpbENvdW50ID0gMDtcbiAgICAgICAgdGhpcy5fZGVzY3IgICAgID0gW107XG4gICAgICAgIHRoaXMuX2V2aWRlbmNlICA9IFtdO1xuICAgICAgICB0aGlzLl93aGVyZSAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fY29uZE5hbWUgID0gW107XG4gICAgICAgIHRoaXMuX2luZm8gICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9uZXN0ZWQgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fcGVuZGluZyAgID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLl9vbkRvbmUgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fZG9uZSAgICAgID0gZmFsc2U7XG4gICAgICAgIC8vIFRPRE8gYWRkIGNhbGxlciBpbmZvIGFib3V0IHRoZSByZXBvcnQgaXRzZWxmXG4gICAgfVxuXG4gICAgLy8gU2V0dXAgbWV0aG9kcyBmb2xsb3cuIFRoZXkgbXVzdCBiZSBjaGFpbmFibGUsIGkuZS4gcmV0dXJuIHRoaXMuXG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIEV4ZWN1dGUgY29kZSB3aGVuIGNvbnRyYWN0IGV4ZWN1dGlvbiBmaW5pc2hlcy5cbiAgICAgKiAgIFJlcG9ydCBvYmplY3QgY2Fubm90IGJlIG1vZGlmaWVkIGF0IHRoaXMgcG9pbnQsXG4gICAgICogICBhbmQgbm8gYWRkaXRpb25hbCBjaGVja3MgbXkgYmUgcHJlc2VudC5cbiAgICAgKiAgIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gZmlyc3QgYXJndW1lbnQgaXMgcmVwb3J0IGluIHF1ZXN0aW9uXG4gICAgICogICBAcmV0dXJucyB7UmVwb3J0fSB0aGlzIChjaGFpbmFibGUpXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgcmVwb3J0Lm9uRG9uZSggciA9PiB7IGlmICghci5nZXRQYXNzKCkpIGNvbnNvbGUubG9nKHIudG9TdHJpbmcoKSkgfSApXG4gICAgICovXG4gICAgb25Eb25lIChmbikge1xuICAgICAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbkRvbmUoKTogY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgIHRoaXMuX2xvY2soKTtcbiAgICAgICAgdGhpcy5fb25Eb25lLnB1c2goZm4pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIEV4ZWN1dGUgY29kZSB3aGVuIGNvbnRyYWN0IGV4ZWN1dGlvbiBmaW5pc2hlcywgaWYgaXQgZmFpbGVkLlxuICAgICAqICAgUmVwb3J0IG9iamVjdCBjYW5ub3QgYmUgbW9kaWZpZWQgYXQgdGhpcyBwb2ludCxcbiAgICAgKiAgIGFuZCBubyBhZGRpdGlvbmFsIGNoZWNrcyBteSBiZSBwcmVzZW50LlxuICAgICAqICAgQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBmaXJzdCBhcmd1bWVudCBpcyByZXBvcnQgaW4gcXVlc3Rpb25cbiAgICAgKiAgIEByZXR1cm5zIHtSZXBvcnR9IHRoaXMgKGNoYWluYWJsZSlcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICByZXBvcnQub25GYWlsKCByID0+IGNvbnNvbGUubG9nKHIudG9TdHJpbmcoKSkgKTtcbiAgICAgKi9cbiAgICBvbkZhaWwgKGZuKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uRG9uZSgpOiBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICB0aGlzLl9vbkRvbmUucHVzaChyID0+IHIuZ2V0UGFzcygpIHx8IGZuKHIpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gUnVubmluZyB0aGUgY29udHJhY3RcbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIGFwcGx5IGdpdmVuIGZ1bmN0aW9uIHRvIGEgUmVwb3J0IG9iamVjdCwgbG9jayByZXBvcnQgYWZ0ZXJ3YXJkcy5cbiAgICAgKiAgIElmIGZ1bmN0aW9uIGlzIGFzeW5jIChpLmUuIHJldHVybnMgYSB7QGxpbmsgUHJvbWlzZX0pLFxuICAgICAqICAgdGhlIHJlcG9ydCB3aWxsIG9ubHkgYmUgZG9uZSgpIGFmdGVyIHRoZSBwcm9taXNlIHJlc29sdmVzLlxuICAgICAqICAgVGhpcyBpcyBkb25lIHNvIHRvIGVuc3VyZSB0aGF0IGFsbCBjaGVja3MgdGhhdCBhd2FpdCBvbiBhIHZhbHVlXG4gICAgICogICBhcmUgcmVzb2x2ZWQuXG4gICAgICogICBAcGFyYW0ge0NvbnRyYWN0fSBjb250cmFjdCBUaGUgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICAgICAqICAgQWRkaXRpb25hbCBwYXJhbWV0ZXJzIG1heSBiZSBfcHJlcGVuZGVkXyB0byBjb250cmFjdFxuICAgICAqICAgYW5kIHdpbGwgYmUgcGFzc2VkIHRvIGl0IF9hZnRlcl8gdGhlIFJlcG9ydCBvYmplY3QgaW4gcXVlc3Rpb24uXG4gICAgICogICBAcmV0dXJucyB7UmVwb3J0fSB0aGlzIChjaGFpbmFibGUpXG4gICAgICogICBAZXhhbXBsZSBCYXNpYyB1c2FnZVxuICAgICAqICAgY29uc3QgciA9IG5ldyBSZXBvcnQoKS5ydW4oIG9rID0+IG9rLmVxdWFsKCAnd2FyJywgJ3BlYWNlJywgJzE5ODQnICkgKTtcbiAgICAgKiAgIHIuZ2V0UGFzcygpOyAvLyBmYWxzZVxuICAgICAqICAgci5nZXREb25lKCk7IC8vIHRydWVcbiAgICAgKiAgIHIudG9TdHJpbmcoKTtcbiAgICAgKiAgIHIoXG4gICAgICogICAgICAhMS4gMTk4NFxuICAgICAqICAgICAgLSB3YXJcbiAgICAgKiAgICAgICsgcGVhY2VcbiAgICAgKiAgIClcbiAgICAgKlxuICAgICAqICAgQGV4YW1wbGUgUGFzc2luZyBhZGRpdGlvbmFsIGFyZ3VtZW50cyB0byBjYWxsYmFjay5cbiAgICAgKiAgIC8vIFRoZSBjb250cmFjdCBib2R5IGlzIHRoZSBsYXN0IGFyZ3VtZW50LlxuICAgICAqICAgbmV3IFJlcG9ydCgpLnJ1biggeyB2OiA0LjIsIGNvbG9yczogWyAnYmx1ZScgXSB9LCAociwgYXJnKSA9PiB7XG4gICAgICogICAgICAgci50eXBlKCBhcmcsICdvYmplY3QnICk7XG4gICAgICogICAgICAgci50eXBlKCBhcmcudiwgJ251bWJlcicgKTtcbiAgICAgKiAgICAgICByLmNtcE51bSggYXJnLnYsICc+PScsIDMuMTQgKTtcbiAgICAgKiAgICAgICByLnR5cGUoIGFyZy5jb2xvcnMsICdhcnJheScgKTtcbiAgICAgKiAgIH0pO1xuICAgICAqICAgQGV4YW1wbGUgQXN5bmMgZnVuY3Rpb25cbiAgICAgKiAgIGNvbnN0IHIgPSBuZXcgUmVwb3J0KCkucnVuKFxuICAgICAqICAgICAgIGFzeW5jIG9rID0+IG9rLmVxdWFsKCBhd2FpdCA2KjksIDQyLCAnZmFpbHMgYnV0IGxhdGVyJyApICk7XG4gICAgICogICByLmdldFBhc3MoKTsgLy8gdHJ1ZVxuICAgICAqICAgci5nZXREb25lKCk7IC8vIGZhbHNlXG4gICAgICogICAvLyAuLi53YWl0IGZvciBldmVudCBsb29wIHRvIHRpY2tcbiAgICAgKiAgIHIuZ2V0UGFzcygpOyAvLyBmYWxzZVxuICAgICAqICAgci5nZXREb25lKCk7IC8vIHRydWVcbiAgICAgKi9cbiAgICBydW4gKC4uLmFyZ3MpIHtcbiAgICAgICAgLy8gVE9ETyBlaXRoZXIgYXN5bmMoKSBzaG91bGQgc3VwcG9ydCBhZGRpdGlvbmFsIGFyZ3MsIG9yIHJ1bigpIHNob3VsZG4ndFxuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIGNvbnN0IGJsb2NrID0gYXJncy5wb3AoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBibG9jayAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTGFzdCBhcmd1bWVudCBvZiBydW4oKSBtdXN0IGJlIGEgZnVuY3Rpb24sIG5vdCAnICsgdHlwZW9mIGJsb2NrKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYmxvY2sodGhpcywgLi4uYXJncyk7XG4gICAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKVxuICAgICAgICAgICAgcmVzdWx0LnRoZW4oICgpID0+IHRoaXMuZG9uZSgpICk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHRoaXMuZG9uZSgpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIGFwcGx5IGdpdmVuIGZ1bmN0aW9uIChjb250cmFjdCkgdG8gYSBSZXBvcnQgb2JqZWN0LlxuICAgICAqICAgTXVsdGlwbGUgc3VjaCBjb250cmF0cyBtYXkgYmUgYXBwbGllZCwgYW5kIHRoZSByZXBvcnQgaXMgbm90IGxvY2tlZC5cbiAgICAgKiAgIEFzeW5jIGZ1bmN0aW9uIGFyZSBwZXJtaXR0ZWQgYnV0IG1heSBub3QgYmVoYXZlIGFzIGV4cGVjdGVkLlxuICAgICAqICAgQHBhcmFtIHtDb250cmFjdH0gY29udHJhY3QgVGhlIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAgICAgKiAgIEFkZGl0aW9uYWwgcGFyYW1ldGVycyBtYXkgYmUgX3ByZXBlbmRlZF8gdG8gY29udHJhY3RcbiAgICAgKiAgIGFuZCB3aWxsIGJlIHBhc3NlZCB0byBpdCBfYWZ0ZXJfIHRoZSBSZXBvcnQgb2JqZWN0IGluIHF1ZXN0aW9uLlxuICAgICAqICAgQHJldHVybnMge1JlcG9ydH0gdGhpcyAoY2hhaW5hYmxlKVxuICAgICAqICAgQGV4YW1wbGUgQmFzaWMgdXNhZ2VcbiAgICAgKiAgIGNvbnN0IHIgPSBuZXcgUmVwb3J0KClcbiAgICAgKiAgICAgICAucnVuU3luYyggb2sgPT4gb2suZXF1YWwoICd3YXInLCAncGVhY2UnLCAnMTk4NCcgKSApXG4gICAgICogICAgICAgLnJ1blN5bmMoIG9rID0+IG9rLnR5cGUgKCBbXSwgJ2FycmF5JywgJ3NvbWUgbW9yZSBjaGVja3MnICkgKVxuICAgICAqICAgICAgIC5kb25lKCk7XG4gICAgICovXG4gICAgcnVuU3luYyAoLi4uYXJncykge1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIGNvbnN0IGJsb2NrID0gYXJncy5wb3AoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBibG9jayAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTGFzdCBhcmd1bWVudCBvZiBydW4oKSBtdXN0IGJlIGEgZnVuY3Rpb24sIG5vdCAnICsgdHlwZW9mIGJsb2NrKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYmxvY2soIHRoaXMsIC4uLmFyZ3MgKTsgLyogZXNsaW50LWRpc2FibGUtbGluZSBuby11bnVzZWQtdmFycyAqL1xuICAgICAgICAvLyBUT0RPIGNoZWNrIHRoYXQgYHJlc3VsdGAgaXMgTk9UIGEgcHJvbWlzZVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBzZXRSZXN1bHQgKGV2aWRlbmNlLCBkZXNjciwgY29uZE5hbWUsIHdoZXJlKSB7XG4gICAgICAgIHRoaXMuX2xvY2soKTtcbiAgICAgICAgY29uc3QgbiA9ICsrdGhpcy5fY291bnQ7XG4gICAgICAgIGlmIChkZXNjcilcbiAgICAgICAgICAgIHRoaXMuX2Rlc2NyW25dID0gZGVzY3I7XG4gICAgICAgIC8vIHBhc3MgLSByZXR1cm4gQVNBUFxuICAgICAgICBpZiAoIWV2aWRlbmNlKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgICAgLy8gbmVzdGVkIHJlcG9ydCBuZWVkcyBzcGVjaWFsIGhhbmRsaW5nXG4gICAgICAgIGlmIChldmlkZW5jZSBpbnN0YW5jZW9mIFJlcG9ydCkge1xuICAgICAgICAgICAgdGhpcy5fbmVzdGVkW25dID0gZXZpZGVuY2U7XG4gICAgICAgICAgICBpZiAoZXZpZGVuY2UuZ2V0RG9uZSgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2aWRlbmNlLmdldFBhc3MoKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7IC8vIHNob3J0LWNpcmN1aXQgaWYgcG9zc2libGVcbiAgICAgICAgICAgICAgICBldmlkZW5jZSA9IFtdOyAvLyBoYWNrIC0gZmFpbGluZyB3aXRob3V0IGV4cGxhbmF0aW9uXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5lc3RlZCBjb250cmFjdCBpcyBpbiBhc3luYyBtb2RlIC0gY29lcmNlIGludG8gYSBwcm9taXNlXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycnkgPSBldmlkZW5jZTsgLyogZXNsaW50LWRpc2FibGUtbGluZSAqL1xuICAgICAgICAgICAgICAgIGV2aWRlbmNlID0gbmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY3Vycnkub25Eb25lKCByZXNvbHZlICk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwZW5kaW5nIC0gd2UncmUgaW4gYXN5bmMgbW9kZVxuICAgICAgICBpZiAoZXZpZGVuY2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nLmFkZChuKTtcbiAgICAgICAgICAgIHdoZXJlID0gd2hlcmUgfHwgY2FsbGVySW5mbygyKTsgLy8gbXVzdCByZXBvcnQgYWN0dWFsIGNhbGxlciwgbm90IHRoZW5cbiAgICAgICAgICAgIGV2aWRlbmNlLnRoZW4oIHggPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmcuZGVsZXRlKG4pO1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldFJlc3VsdChuLCB4LCBjb25kTmFtZSwgd2hlcmUgKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuX29uRG9uZS5sZW5ndGg7IGktLSA+IDA7IClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uRG9uZVtpXSh0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5fc2V0UmVzdWx0KG4sIGV2aWRlbmNlLCBjb25kTmFtZSwgd2hlcmUgfHwgY2FsbGVySW5mbygyKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIF9zZXRSZXN1bHQgKG4sIGV2aWRlbmNlLCBjb25kTmFtZSwgd2hlcmUpIHtcbiAgICAgICAgaWYgKCFldmlkZW5jZSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBsaXN0aWZ5ICYgc3RyaW5naWZ5IGV2aWRlbmNlLCBzbyB0aGF0IGl0IGRvZXNuJ3QgY2hhbmdlIHBvc3QtZmFjdHVtXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShldmlkZW5jZSkpXG4gICAgICAgICAgICBldmlkZW5jZSA9IFtldmlkZW5jZV07XG4gICAgICAgIHRoaXMuX2V2aWRlbmNlW25dID0gZXZpZGVuY2UubWFwKCB4ID0+IF9leHBsYWluKHgsIEluZmluaXR5KSApO1xuICAgICAgICB0aGlzLl93aGVyZVtuXSAgICA9IHdoZXJlO1xuICAgICAgICB0aGlzLl9jb25kTmFtZVtuXSA9IGNvbmROYW1lO1xuICAgICAgICB0aGlzLl9mYWlsQ291bnQrKztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBBcHBlbmQgYW4gaW5mb3JtYXRpb25hbCBtZXNzYWdlIHRvIHRoZSByZXBvcnQuXG4gICAgICogTm9uLXN0cmluZyB2YWx1ZXMgd2lsbCBiZSBzdHJpbmdpZmllZCB2aWEgZXhwbGFpbigpLlxuICAgICAqIEBwYXJhbSB7QW55fSBtZXNzYWdlXG4gICAgICogQHJldHVybnMge1JlcG9ydH0gY2hhaW5hYmxlXG4gICAgICovXG4gICAgaW5mbyAoIC4uLm1lc3NhZ2UgKSB7XG4gICAgICAgIHRoaXMuX2xvY2soKTtcbiAgICAgICAgaWYgKCF0aGlzLl9pbmZvW3RoaXMuX2NvdW50XSlcbiAgICAgICAgICAgIHRoaXMuX2luZm9bdGhpcy5fY291bnRdID0gW107XG4gICAgICAgIHRoaXMuX2luZm9bdGhpcy5fY291bnRdLnB1c2goIG1lc3NhZ2UubWFwKCBzID0+IF9leHBsYWluKHMpICkuam9pbignICcpICk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgTG9ja3MgdGhlIHJlcG9ydCBvYmplY3QsIHNvIG5vIG1vZGlmaWNhdGlvbnMgbWF5IGJlIG1hZGUgbGF0ZXIuXG4gICAgICogICBBbHNvIGlmIG9uRG9uZSBjYWxsYmFjayhzKSBhcmUgcHJlc2VudCwgdGhleSBhcmUgZXhlY3V0ZWRcbiAgICAgKiAgIHVubGVzcyB0aGVyZSBhcmUgcGVuZGluZyBhc3luYyBjaGVja3MuXG4gICAgICogICBAcmV0dXJucyB7UmVwb3J0fSB0aGlzIChjaGFpbmFibGUpXG4gICAgICovXG4gICAgZG9uZSAoY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKGNhbGxiYWNrICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICB0aGlzLm9uRG9uZShjYWxsYmFjayk7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9kb25lKSB7XG4gICAgICAgICAgICB0aGlzLl9kb25lID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmICghdGhpcy5fcGVuZGluZy5zaXplKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuX29uRG9uZS5sZW5ndGg7IGktLSA+IDA7IClcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25Eb25lW2ldKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIGNoZWNrIGlmIHRoZSBSZXBvcnQgb2JqZWN0IGlzIHN0aWxsIG1vZGlmaWFibGUsIHRocm93cyBvdGhlcndpc2UuXG4gICAgX2xvY2sgKCkge1xuICAgICAgICBpZiAodGhpcy5fZG9uZSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXR0ZW1wdCB0byBtb2RpZnkgYSBmaW5pc2hlZCBjb250cmFjdCcpO1xuICAgIH1cblxuICAgIC8vIFF1ZXJ5aW5nIG1ldGhvZHNcblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgIFRlbGxzIHdoZXRoZXIgdGhlIHJlcG9ydCBpcyBmaW5pc2hlZCxcbiAgICAgKiAgICAgICAgICBpLmUuIGRvbmUoKSB3YXMgY2FsbGVkICYgbm8gcGVuZGluZyBhc3luYyBjaGVja3MuXG4gICAgICogICBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBnZXREb25lICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RvbmUgJiYgIXRoaXMuX3BlbmRpbmcuc2l6ZTsgLy8gaXMgaXQgZXZlbiBuZWVkZWQ/XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBXaXRob3V0IGFyZ3VtZW50IHJldHVybnMgd2hldGhlciB0aGUgY29udHJhY3Qgd2FzIGZ1bGZpbGxlZC5cbiAgICAgKiAgIEFzIGEgc3BlY2lhbCBjYXNlLCBpZiBubyBjaGVja3Mgd2VyZSBydW4gYW5kIHRoZSBjb250cmFjdCBpcyBmaW5pc2hlZCxcbiAgICAgKiAgIHJldHVybnMgZmFsc2UsIGFzIGluIFwic29tZW9uZSBtdXN0IGhhdmUgZm9yZ290dGVuIHRvIGV4ZWN1dGVcbiAgICAgKiAgIHBsYW5uZWQgY2hlY2tzLiBVc2UgcGFzcygpIGlmIG5vIGNoZWNrcyBhcmUgcGxhbm5lZC5cbiAgICAgKlxuICAgICAqICAgSWYgYSBwYXJhbWV0ZXIgaXMgZ2l2ZW4sIHJldHVybiB0aGUgc3RhdHVzIG9mIG4tdGggY2hlY2sgaW5zdGVhZC5cbiAgICAgKiAgIEBwYXJhbSB7aW50ZWdlcn0gblxuICAgICAqICAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0UGFzcyAobikge1xuICAgICAgICBpZiAobiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ZhaWxDb3VudCA9PT0gMDtcbiAgICAgICAgcmV0dXJuIChuID4gMCAmJiBuIDw9IHRoaXMuX2NvdW50KSA/ICF0aGlzLl9ldmlkZW5jZVtuXSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgcGVyZm9ybWVkLlxuICAgICAqICAgQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRDb3VudCAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb3VudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgV2hldGhlciB0aGUgbGFzdCBjaGVjayB3YXMgYSBzdWNjZXNzLlxuICAgICAqICBUaGlzIGlzIGp1c3QgYSBzaG9ydGN1dCBmb3IgZm9vLmdldERldGFpbHMoZm9vLmdldENvdW50KS5wYXNzXG4gICAgICogIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGxhc3QgKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY291bnQgPyAhdGhpcy5fZXZpZGVuY2VbdGhpcy5fY291bnRdIDogdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgTnVtYmVyIG9mIGNoZWNrcyBmYWlsaW5nLlxuICAgICAqICAgQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRGYWlsQ291bnQgKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZmFpbENvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgUmV0dXJuIGEgc3RyaW5nIG9mIGZhaWxpbmcvcGFzc2luZyBjaGVja3MuXG4gICAgICogICBUaGlzIG1heSBiZSB1c2VmdWwgZm9yIHZhbGlkYXRpbmcgY3VzdG9tIGNvbmRpdGlvbnMuXG4gICAgICogICBDb25zZWN1dGl2ZSBwYXNzaW5nIGNoZWNrYSBhcmUgcmVwcmVzZW50ZWQgYnkgbnVtYmVycy5cbiAgICAgKiAgIEEgY2FwaXRhbCBsZXR0ZXIgaW4gdGhlIHN0cmluZyByZXByZXNlbnRzIGZhaWx1cmUuXG4gICAgICogICBTZWUgYWxzbyB7QGxpbmsgUmVwb3J0I3RvU3RyaW5nIHRvU3RyaW5nKCl9XG4gICAgICogICBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIHBhc3NpbmcgY2hlY2tzXG4gICAgICogICBcInIoMTApXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBjaGVja3Mgd2l0aCAxIGZhaWx1cmUgaW4gdGhlIG1pZGRsZVxuICAgICAqICAgXCJyKDUsTiw0KVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgY2hlY2tzIGluY2x1ZGluZyBhIG5lc3RlZCBjb250cmFjdFxuICAgICAqICAgXCJyKDMscigxLE4pLDYpXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyBubyBjaGVja3Mgd2VyZSBydW4gLSBhdXRvLWZhaWxcbiAgICAgKiAgIFwicihaKVwiXG4gICAgICovXG4gICAgZ2V0R2hvc3QgKCkge1xuICAgICAgICBjb25zdCBnaG9zdCA9IFtdO1xuICAgICAgICBsZXQgc3RyZWFrICA9IDA7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDw9IHRoaXMuX2NvdW50OyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9ldmlkZW5jZVtpXSB8fCB0aGlzLl9uZXN0ZWRbaV0pIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RyZWFrKSBnaG9zdC5wdXNoKHN0cmVhayk7XG4gICAgICAgICAgICAgICAgc3RyZWFrID0gMDtcbiAgICAgICAgICAgICAgICBnaG9zdC5wdXNoKCB0aGlzLl9uZXN0ZWRbaV0gPyB0aGlzLl9uZXN0ZWRbaV0uZ2V0R2hvc3QoKSA6ICdOJyk7XG4gICAgICAgICAgICB9IGVsc2UgeyAvKiBlc2xpbnQtZGVzYWJsZS1saW5lIGN1cmx5ICovXG4gICAgICAgICAgICAgICAgc3RyZWFrKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0cmVhaykgZ2hvc3QucHVzaChzdHJlYWspO1xuICAgICAgICByZXR1cm4gJ3IoJyArIGdob3N0LmpvaW4oJywnKSArICcpJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgUmV0dXJucyBzZXJpYWxpemVkIGRpZmYtbGlrZSByZXBvcnQgd2l0aCBuZXN0aW5nIGFuZCBpbmRlbnRhdGlvbi5cbiAgICAgKiAgUGFzc2luZyBjb25kaXRpb25zIGFyZSBtZXJrZWQgd2l0aCBudW1iZXJzLCBmYWlsaW5nIGFyZSBwcmVmaXhlZFxuICAgICAqICB3aXRoIGEgYmFuZyAoISkuXG4gICAgICpcbiAgICAgKiAgU2VlIGFsc28ge0BsaW5rIFJlcG9ydCNnZXRHaG9zdCBnZXRHaG9zdCgpfVxuICAgICAqICBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqICBAZXhhbXBsZSAvLyBubyBjaGVja3MgcnVuXG4gICAgICogIGNvbnN0IHIgPSBuZXcgUmVwb3J0KCk7XG4gICAgICogIHIudG9TdHJpbmcoKTtcbiAgICAgKiAgcihcbiAgICAgKiAgKVxuICAgICAqICBAZXhhbXBsZSAvLyBwYXNzXG4gICAgICogIGNvbnN0IHIgPSBuZXcgUmVwb3J0KCk7XG4gICAgICogIHIucGFzcygnZm9vIGJhcmVkJyk7XG4gICAgICogIHIudG9TdHJpbmcoKTtcbiAgICAgKiAgcihcbiAgICAgKiAgICAgIDEuIGZvbyBiYXJlZFxuICAgICAqICApXG4gICAgICogIEBleGFtcGxlIC8vIGZhaWxcbiAgICAgKiAgY29uc3QgciA9IG5ldyBSZXBvcnQoKTtcbiAgICAgKiAgci5lcXVhbCgnd2FyJywgJ3BlYWNlJyk7XG4gICAgICogIHIudG9TdHJpbmcoKTtcbiAgICAgKiAgcihcbiAgICAgKiAgICAgICExLlxuICAgICAqICAgICAgXiBDb25kaXRpb24gZXF1YWwgZmFpbGVkIGF0IDxmaWxlPjo8bGluZT46PGNoYXI+XG4gICAgICogICAgICAtIHdhclxuICAgICAqICAgICAgKyBwZWFjZVxuICAgICAqICApXG4gICAgICovXG4gICAgdG9TdHJpbmcgKCkge1xuICAgICAgICAvLyBUT0RPIHJlcGxhY2Ugd2l0aCByZWZ1dGUuaW8gd2hlbiB3ZSBidXkgdGhlIGRvbWFpblxuICAgICAgICByZXR1cm4gJ3JlZnV0ZS8nICsgcHJvdG9jb2wgKyAnXFxuJyArIHRoaXMuZ2V0TGluZXMoKS5qb2luKCdcXG4nKTtcbiAgICB9XG5cbiAgICBnZXRMaW5lcyAoaW5kZW50ID0gJycpIHtcbiAgICAgICAgY29uc3Qgb3V0ICA9IFtpbmRlbnQgKyAncignXTtcbiAgICAgICAgY29uc3QgbGFzdCA9IGluZGVudCArICcpJztcbiAgICAgICAgaW5kZW50ICAgICA9IGluZGVudCArICcgICAgJztcblxuICAgICAgICBjb25zdCBwYWQgPSBwcmVmaXggPT4gcyA9PiBpbmRlbnQgKyBwcmVmaXggKyAnICcgKyBzO1xuXG4gICAgICAgIGlmICh0aGlzLl9pbmZvWzBdKVxuICAgICAgICAgICAgb3V0LnB1c2goIC4uLnRoaXMuX2luZm9bMF0ubWFwKCBwYWQoJzsnKSApICk7XG4gICAgICAgIGZvciAobGV0IG4gPSAxOyBuIDw9IHRoaXMuX2NvdW50OyBuKyspIHtcbiAgICAgICAgICAgIG91dC5wdXNoKCAuLi50aGlzLmdldExpbmVzUGFydGlhbCggbiwgaW5kZW50ICkgKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9pbmZvW25dKVxuICAgICAgICAgICAgICAgIG91dC5wdXNoKCAuLi50aGlzLl9pbmZvW25dLm1hcCggcGFkKCc7JykgKSApO1xuICAgICAgICB9XG4gICAgICAgIG91dC5wdXNoKGxhc3QpO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cblxuICAgIGdldExpbmVzUGFydGlhbCAobiwgaW5kZW50ID0gJycpIHtcbiAgICAgICAgY29uc3Qgb3V0ID0gW107XG4gICAgICAgIG91dC5wdXNoKFxuICAgICAgICAgICAgaW5kZW50XG4gICAgICAgICAgICArICh0aGlzLl9wZW5kaW5nLmhhcyhuKSA/ICcuLi4nIDogKHRoaXMuX2V2aWRlbmNlW25dID8gJyEnIDogJycpIClcbiAgICAgICAgICAgICsgbiArICh0aGlzLl9kZXNjcltuXSA/ICcuICcgKyB0aGlzLl9kZXNjcltuXSA6ICcuJylcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHRoaXMuX25lc3RlZFtuXSkgeyAvKiBlc2xpbnQtZGlzYWJsZS1saW5lIGN1cmx5ICovXG4gICAgICAgICAgICBvdXQucHVzaCggLi4udGhpcy5fbmVzdGVkW25dLmdldExpbmVzKGluZGVudCkgKTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ldmlkZW5jZVtuXSkge1xuICAgICAgICAgICAgb3V0LnB1c2goIGluZGVudCArICcgICAgXiBDb25kaXRpb24gYCcgKyAodGhpcy5fY29uZE5hbWVbbl0gfHwgJ2NoZWNrJylcbiAgICAgICAgICAgICAgICArICdgIGZhaWxlZCBhdCAnICsgdGhpcy5fd2hlcmVbbl0gKTtcbiAgICAgICAgICAgIHRoaXMuX2V2aWRlbmNlW25dLmZvckVhY2goIHJhdyA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIG11bHRpbGluZSBldmlkZW5jZVxuICAgICAgICAgICAgICAgIC8vIFRPRE8gdGhpcyBpcyBwZXJsIHdyaXR0ZW4gaW4gSlMsIHJld3JpdGUgbW9yZSBjbGVhcmx5XG4gICAgICAgICAgICAgICAgbGV0IFtfLCBwcmVmaXgsIHNdID0gcmF3Lm1hdGNoKCAvXihbLSt8XSApPyguKj8pXFxuPyQvcyApO1xuICAgICAgICAgICAgICAgIGlmICghcHJlZml4KSBwcmVmaXggPSAnfCAnO1xuICAgICAgICAgICAgICAgIGlmICghcy5tYXRjaCgvXFxuLykpIHsgLyogZXNsaW5lLWRpc2FibGUtbGluZSBjdXJseSAqL1xuICAgICAgICAgICAgICAgICAgICBvdXQucHVzaCggaW5kZW50ICsgJyAgICAnICsgcHJlZml4ICsgcyApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHMuc3BsaXQoJ1xcbicpLmZvckVhY2goXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0ID0+IG91dC5wdXNoKCBpbmRlbnQgKyAnICAgICcgKyBwcmVmaXggKyBwYXJ0ICkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIHJldHVybnMgYSBwbGFpbiBzZXJpYWxpemFibGUgb2JqZWN0XG4gICAgICogIEByZXR1cm5zIHtPYmplY3R9XG4gICAgICovXG4gICAgdG9KU09OICgpIHtcbiAgICAgICAgY29uc3QgbiA9IHRoaXMuZ2V0Q291bnQoKTtcbiAgICAgICAgY29uc3QgZGV0YWlscyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8PSBuOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLmdldERldGFpbHMoaSk7XG4gICAgICAgICAgICAvLyBzdHJpcCBleHRyYSBrZXlzXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBpbiBub2RlKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGVba2V5XSA9PT0gdW5kZWZpbmVkIHx8IChBcnJheS5pc0FycmF5KG5vZGVba2V5XSkgJiYgbm9kZVtrZXldLmxlbmd0aCA9PT0gMCkpXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBub2RlW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZXRhaWxzLnB1c2gobm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHBhc3M6ICB0aGlzLmdldFBhc3MoKSxcbiAgICAgICAgICAgIGNvdW50OiB0aGlzLmdldENvdW50KCksXG4gICAgICAgICAgICBkZXRhaWxzLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgUmV0dXJucyBkZXRhaWxlZCByZXBvcnQgb24gYSBzcGVjaWZpYyBjaGVja1xuICAgICAqICAgQHBhcmFtIHtpbnRlZ2VyfSBuIC0gY2hlY2sgbnVtYmVyLCBtdXN0IGJlIDw9IGdldENvdW50KClcbiAgICAgKiAgIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICovXG4gICAgZ2V0RGV0YWlscyAobikge1xuICAgICAgICAvLyBUT0RPIHZhbGlkYXRlIG5cblxuICAgICAgICAvLyB1Z2x5IGJ1dCB3aGF0IGNhbiBJIGRvXG4gICAgICAgIGlmIChuID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG46ICAgIDAsXG4gICAgICAgICAgICAgICAgaW5mbzogdGhpcy5faW5mb1swXSB8fCBbXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZXZpZGVuY2UgPSB0aGlzLl9ldmlkZW5jZVtuXTtcbiAgICAgICAgaWYgKGV2aWRlbmNlICYmICFBcnJheS5pc0FycmF5KGV2aWRlbmNlKSlcbiAgICAgICAgICAgIGV2aWRlbmNlID0gW2V2aWRlbmNlXTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbjogICAgICAgIG4sXG4gICAgICAgICAgICBuYW1lOiAgICAgdGhpcy5fZGVzY3Jbbl0gfHwgJycsXG4gICAgICAgICAgICBwYXNzOiAgICAgIWV2aWRlbmNlLFxuICAgICAgICAgICAgZXZpZGVuY2U6IGV2aWRlbmNlIHx8IFtdLFxuICAgICAgICAgICAgd2hlcmU6ICAgIHRoaXMuX3doZXJlW25dLFxuICAgICAgICAgICAgY29uZDogICAgIHRoaXMuX2NvbmROYW1lW25dLFxuICAgICAgICAgICAgaW5mbzogICAgIHRoaXMuX2luZm9bbl0gfHwgW10sXG4gICAgICAgICAgICBuZXN0ZWQ6ICAgdGhpcy5fbmVzdGVkW25dLFxuICAgICAgICAgICAgcGVuZGluZzogIHRoaXMuX3BlbmRpbmcuaGFzKG4pLFxuICAgICAgICB9O1xuICAgIH1cbn1cblxuLy8gdGhpcyBpcyBmb3Igc3R1ZmYgbGlrZSBgb2JqZWN0IGZvbyA9IHtcImZvb1wiOjQyfWBcbi8vIHdlIGRvbid0IHdhbnQgdGhlIGV4cGxhbmF0aW9uIHRvIGJlIHF1b3RlZCFcbmZ1bmN0aW9uIF9leHBsYWluICggaXRlbSwgZGVwdGggKSB7XG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJyApXG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgIHJldHVybiBleHBsYWluKCBpdGVtLCB7IGRlcHRoIH0gKTtcbn1cblxuUmVwb3J0LnByb3RvdHlwZS5leHBsYWluID0gZXhwbGFpbjsgLy8gYWxzbyBtYWtlIGF2YWlsYWJsZSB2aWEgcmVwb3J0XG5SZXBvcnQucHJvdG9jb2wgPSBwcm90b2NvbDtcblxuLy8gcGFydCBvZiBhZGRDb25kaXRpb25cbmNvbnN0IGtub3duQ2hlY2tzID0gbmV3IFNldCgpO1xuXG4vKiBOT1RFIFBsZWFzZSBrZWVwIGFsbCBhZGRDb25kaXRpb24gaW52b2NhdGlvbnMgc2VhcmNoYWJsZSB2aWEgKi9cbi8qIGdyZXAgLXIgXCJeICphZGRDb25kaXRpb24uKidcIiAvXG4vKipcbiAqICBAbWVtYmVyT2YgcmVmdXRlXG4gKiAgQHN0YXRpY1xuICogIEBkZXNjIENyZWF0ZSBuZXcgY2hlY2sgbWV0aG9kIGF2YWlsYWJsZSB2aWEgYWxsIFJlcG9ydCBpbnN0YW5jZXNcbiAqICBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lIG9mIHRoZSBuZXcgY29uZGl0aW9uLlxuICogIE11c3Qgbm90IGJlIHByZXNlbnQgaW4gUmVwb3J0IGFscmVhZHksIGFuZCBzaG91bGQgTk9UIHN0YXJ0IHdpdGhcbiAqICBnZXQuLi4sIHNldC4uLiwgb3IgYWRkLi4uICh0aGVzZSBhcmUgcmVzZXJ2ZWQgZm9yIFJlcG9ydCBpdHNlbGYpXG4gKiAgQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgQ29uZmlndXJpbmcgdGhlIGNoZWNrJ3MgaGFuZGxpbmcgb2YgYXJndW1lbnRzXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLmFyZ3MgVGhlIHJlcXVpcmVkIG51bWJlciBvZiBhcmd1bWVudHNcbiAqICBAcGFyYW0ge2ludGVnZXJ9IFtvcHRpb25zLm1pbkFyZ3NdIE1pbmltdW0gbnVtYmVyIG9mIGFyZ3VtZW50IChkZWZhdWx0cyB0byBhcmdzKVxuICogIEBwYXJhbSB7aW50ZWdlcn0gW29wdGlvbnMubWF4QXJnc10gTWF4aW11bSBudW1iZXIgb2YgYXJndW1lbnQgKGRlZmF1bHRzIHRvIGFyZ3MpXG4gKiAgQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5oYXNPcHRpb25zXSBJZiB0cnVlLCBhbiBvcHRpb25hbCBvYmplY3RcbmNhbiBiZSBzdXBwbGllZCBhcyBsYXN0IGFyZ3VtZW50LiBJdCB3b24ndCBpbnRlcmZlcmUgd2l0aCBkZXNjcmlwdGlvbi5cbiAqICBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmZ1bl0gVGhlIGxhc3QgYXJndW1lbnQgaXMgYSBjYWxsYmFja1xuICogIEBwYXJhbSB7RnVuY3Rpb259IGltcGxlbWVudGF0aW9uIC0gYSBjYWxsYmFjayB0aGF0IHRha2VzIHthcmdzfSBhcmd1bWVudHNcbiAqICBhbmQgcmV0dXJucyBhIGZhbHNleSB2YWx1ZSBpZiBjb25kaXRpb24gcGFzc2VzXG4gKiAgKFwibm90aGluZyB0byBzZWUgaGVyZSwgbW92ZSBhbG9uZ1wiKSxcbiAqICBvciBldmlkZW5jZSBpZiBpdCBmYWlsc1xuICogIChlLmcuIHR5cGljYWxseSBhIGdvdC9leHBlY3RlZCBkaWZmKS5cbiAqL1xuZnVuY3Rpb24gYWRkQ29uZGl0aW9uIChuYW1lLCBvcHRpb25zLCBpbXBsKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gbmFtZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgaWYgKG5hbWUubWF0Y2goL14oX3xnZXRbX0EtWl18c2V0W19BLVpdKS8pKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiBuYW1lIG11c3Qgbm90IHN0YXJ0IHdpdGggZ2V0Xywgc2V0Xywgb3IgXycpO1xuICAgIC8vIFRPRE8gbXVzdCBkbyBzb21ldGhpbmcgYWJvdXQgbmFtZSBjbGFzaGVzLCBidXQgbGF0ZXJcbiAgICAvLyBiZWNhdXNlIGV2YWwgaW4gYnJvd3NlciBtYXkgKGtpbmQgb2YgbGVnaW1pdGVseSkgb3ZlcnJpZGUgY29uZGl0aW9uc1xuICAgIGlmICgha25vd25DaGVja3MuaGFzKG5hbWUpICYmIFJlcG9ydC5wcm90b3R5cGVbbmFtZV0pXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIGFscmVhZHkgZXhpc3RzIGluIFJlcG9ydDogJyArIG5hbWUpO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIG9wdGlvbnMnKTtcbiAgICBpZiAodHlwZW9mIGltcGwgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIGltcGxlbWVudGF0aW9uJyk7XG5cbiAgICBjb25zdCBtaW5BcmdzICAgID0gb3B0aW9ucy5taW5BcmdzIHx8IG9wdGlvbnMuYXJncztcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIobWluQXJncykgfHwgbWluQXJncyA8IDApXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYXJncy9taW5BcmdzIG11c3QgYmUgbm9ubmVnYXRpdmUgaW50ZWdlcicpO1xuICAgIGNvbnN0IG1heEFyZ3MgICAgPSBvcHRpb25zLm1heEFyZ3MgfHwgb3B0aW9ucy5hcmdzIHx8IEluZmluaXR5O1xuICAgIGlmIChtYXhBcmdzICE9PSBJbmZpbml0eSAmJiAoIU51bWJlci5pc0ludGVnZXIobWluQXJncykgfHwgbWF4QXJncyA8IG1pbkFyZ3MpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ21heEFyZ3MgbXVzdCBiZSBpbnRlZ2VyIGFuZCBncmVhdGVyIHRoYW4gbWluQXJncywgb3IgSW5maW5pdHknKTtcbiAgICBjb25zdCBkZXNjckZpcnN0ICAgID0gb3B0aW9ucy5kZXNjckZpcnN0IHx8IG9wdGlvbnMuZnVuIHx8IG1heEFyZ3MgPiAxMDtcbiAgICBjb25zdCBoYXNPcHRpb25zICAgID0gISFvcHRpb25zLmhhc09wdGlvbnM7XG4gICAgY29uc3QgbWF4QXJnc1JlYWwgICA9IG1heEFyZ3MgKyAoaGFzT3B0aW9ucyA/IDEgOiAwKTtcblxuICAgIC8vIFRPRE8gYWxlcnQgdW5rbm93biBvcHRpb25zXG5cbiAgICAvLyBUT0RPIHRoaXMgY29kZSBpcyBjbHV0dGVyZWQsIHJld3JpdGVcbiAgICBjb25zdCBjb2RlID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgLy8gVE9ETyBjb25zdCBuQXJncyA9IGFyZ3MubGVuZ3RoXG4gICAgICAgIGNvbnN0IGRlc2NyID0gZGVzY3JGaXJzdFxuICAgICAgICAgICAgPyBhcmdzLnNoaWZ0KClcbiAgICAgICAgICAgIDogKCAoYXJncy5sZW5ndGggPiBtYXhBcmdzICYmIHR5cGVvZiBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gPT09ICdzdHJpbmcnKSA/IGFyZ3MucG9wKCkgOiB1bmRlZmluZWQpO1xuICAgICAgICBpZiAoYXJncy5sZW5ndGggPiBtYXhBcmdzUmVhbCB8fCBhcmdzLmxlbmd0aCA8IG1pbkFyZ3MpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiAnICsgbmFtZSArICcgbXVzdCBoYXZlICcgKyBtaW5BcmdzICsgJy4uJyArIG1heEFyZ3NSZWFsICsgJyBhcmd1bWVudHMgJyk7IC8vIFRPRE9cblxuICAgICAgICByZXR1cm4gdGhpcy5zZXRSZXN1bHQoIGltcGwoLi4uYXJncyksIGRlc2NyLCBuYW1lICk7XG4gICAgfTtcblxuICAgIGtub3duQ2hlY2tzLmFkZChuYW1lKTtcbiAgICBSZXBvcnQucHJvdG90eXBlW25hbWVdID0gY29kZTtcbn1cblxuLy8gVGhlIG1vc3QgYmFzaWMgY29uZGl0aW9ucyBhcmUgZGVmaW5lZCByaWdodCBoZXJlXG4vLyBpbiBvcmRlciB0byBiZSBzdXJlIHdlIGNhbiB2YWxpZGF0ZSB0aGUgUmVwb3J0IGNsYXNzIGl0c2VsZi5cblxuLyoqXG4gKiAgQG5hbWVzcGFjZSBjb25kaXRpb25zXG4gKiAgQGRlc2MgQ29uZGl0aW9uIGNoZWNrIGxpYnJhcnkuIFRoZXNlIG1ldGhvZHMgbXVzdCBiZSBydW4gb24gYVxuICogIHtAbGluayBSZXBvcnR9IG9iamVjdC5cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGNoZWNrXG4gKiAgIEBkZXNjIEEgZ2VuZXJpYyBjaGVjayBvZiBhIGNvbmRpdGlvbi5cbiAqICAgQHBhcmFtIGV2aWRlbmNlIElmIGZhbHNlLCAwLCAnJywgb3IgdW5kZWZpbmVkLCB0aGUgY2hlY2sgaXMgYXNzdW1lZCB0byBwYXNzLlxuICogICBPdGhlcndpc2UgaXQgZmFpbHMsIGFuZCB0aGlzIGFyZ3VtZW50IHdpbGwgYmUgZGlzcGxheWVkIGFzIHRoZSByZWFzb24gd2h5LlxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXSBUaGUgcmVhc29uIHdoeSB3ZSBjYXJlIGFib3V0IHRoZSBjaGVjay5cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIHBhc3NcbiAqICAgQGRlc2MgQWx3YXlzIHBhc3Nlcy5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGZhaWxcbiAqICAgQGRlc2MgQWx3YXlzIGZhaWxzIHdpdGggYSBcImZhaWxlZCBkZWxpYmVyYXRlbHlcIiBtZXNzYWdlLlxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgZXF1YWxcbiAqICAgQGRlc2MgQ2hlY2tzIGlmID09PSBob2xkcyBiZXR3ZWVuIHR3byB2YWx1ZXMuXG4gKiAgIElmIG5vdCwgYm90aCB3aWxsIGJlIHN0cmluZ2lmaWVkIGFuZCBkaXNwbGF5ZWQgYXMgYSBkaWZmLlxuICogICBTZWUgZGVlcEVxdWFsIHRvIGNoZWNrIG5lc3RlZCBkYXRhIHN0cnVjdHVyZXMgb3Qgb2JqZWN0cy5cbiAqICAgQHBhcmFtIHthbnl9IGFjdHVhbFxuICogICBAcGFyYW0ge2FueX0gZXhwZWN0ZWRcbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIG1hdGNoXG4gKiAgIEBkZXNjIENoZWNrcyBpZiBhIHN0cmluZyBtYXRjaGVzIGEgcmVndWxhciBleHByZXNzaW9uLlxuICogICBAcGFyYW0ge3N0cnVuZ30gYWN0dWFsXG4gKiAgIEBwYXJhbSB7UmVnRXhwfSBleHBlY3RlZFxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgbmVzdGVkXG4gKiAgIEBkZXNjIFZlcmlmeSBhIG5lc3RlZCBjb250cmFjdC5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IGRlc2NyaXB0aW9uXG4gKiAgIEBwYXJhbSB7Q29udHJhY3R9IGNvbnRyYWN0XG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cblxuYWRkQ29uZGl0aW9uKCAnY2hlY2snLFxuICAgIHsgYXJnczogMSB9LFxuICAgIHggPT4geFxuKTtcbmFkZENvbmRpdGlvbiggJ3Bhc3MnLFxuICAgIHsgYXJnczogMCB9LFxuICAgICgpID0+IDBcbik7XG5hZGRDb25kaXRpb24oICdmYWlsJyxcbiAgICB7IGFyZ3M6IDAgfSxcbiAgICAoKSA9PiAnZmFpbGVkIGRlbGliZXJhdGVseSdcbik7XG5hZGRDb25kaXRpb24oICdlcXVhbCcsXG4gICAgeyBhcmdzOiAyIH0sXG4gICAgKGEsIGIpID0+IGEgPT09IGIgPyAwIDogWyctICcgKyBleHBsYWluKGEpLCAnKyAnICsgZXhwbGFpbihiKV1cbik7XG5hZGRDb25kaXRpb24oICdtYXRjaCcsXG4gICAgeyBhcmdzOiAyIH0sXG4gICAgLy8gVE9ETyBmdW5jdGlvbihzdHIsIHJleClcbiAgICAoYSwgcmV4KSA9PiAoYSA9PT0gdW5kZWZpbmVkIHx8IGEgPT09IG51bGwpXG4gICAgICAgID8gWycnICsgYSwgJ0RvZXMgbm90IG1hdGNoIDogJyArIHJleF1cbiAgICAgICAgOiAoJycgKyBhKS5tYXRjaChyZXgpXG4gICAgICAgICAgICA/IDBcbiAgICAgICAgICAgIDogW1xuICAgICAgICAgICAgICAgICdTdHJpbmcgICAgICAgICA6ICcgKyBhLFxuICAgICAgICAgICAgICAgICdEb2VzIG5vdCBtYXRjaCA6ICcgKyByZXgsXG4gICAgICAgICAgICBdXG4pO1xuYWRkQ29uZGl0aW9uKCAnbmVzdGVkJyxcbiAgICB7IGZ1bjogMSwgbWluQXJnczogMSB9LFxuICAgICguLi5hcmdzKSA9PiBuZXcgUmVwb3J0KCkucnVuKC4uLmFyZ3MpLmRvbmUoKVxuKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7IFJlcG9ydCwgYWRkQ29uZGl0aW9uLCBleHBsYWluIH07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogICBAbmFtZXNwYWNlIHV0aWxpdGllc1xuICogICBAZGVzYyAgVGhlc2UgZnVuY3Rpb25zIGhhdmUgbm90aGluZyB0byBkbyB3aXRoIHJlZnV0YWJsZVxuICogICAgICAgICAgYW5kIHNob3VsZCBpZGVhbGx5IGJlIGluIHNlcGFyYXRlIG1vZHVsZXMuXG4gKi9cblxuLyogRGV0ZXJtaW5lIG4tdGggY2FsbGVyIHVwIHRoZSBzdGFjayAqL1xuLyogSW5zcGlyZWQgYnkgUGVybCdzIENhcnAgbW9kdWxlICovXG5jb25zdCBpblN0YWNrID0gLyhbXjpcXHMoKV0rOlxcZCsoPzo6XFxkKyk/KVxcVyooXFxufCQpL2c7XG5cbi8qKlxuICogIEBwdWJsaWNcbiAqICBAbWVtYmVyT2YgdXRpbGl0aWVzXG4gKiAgQGZ1bmN0aW9uXG4gKiAgQGRlc2MgUmV0dXJucyBzb3VyY2UgcG9zaXRpb24gbiBmcmFtZXMgdXAgdGhlIHN0YWNrXG4gKiAgQGV4YW1wbGVcbiAqICBcIi9mb28vYmFyLmpzOjI1OjExXCJcbiAqICBAcGFyYW0ge2ludGVnZXJ9IGRlcHRoIEhvdyBtYW55IGZyYW1lcyB0byBza2lwXG4gKiAgQHJldHVybnMge3N0cmluZ30gc291cmNlIGZpbGUsIGxpbmUsIGFuZCBjb2x1bW4sIHNlcGFyYXRlZCBieSBjb2xvbi5cbiAqL1xuZnVuY3Rpb24gY2FsbGVySW5mbyAobikge1xuICAgIC8qIGEgdGVycmlibGUgcmV4IHRoYXQgYmFzaWNhbGx5IHNlYXJjaGVzIGZvciBmaWxlLmpzOm5ubjpubm4gc2V2ZXJhbCB0aW1lcyAqL1xuICAgIHJldHVybiAobmV3IEVycm9yKCkuc3RhY2subWF0Y2goaW5TdGFjaylbbiArIDFdLnJlcGxhY2UoL1xcVypcXG4kLywgJycpIHx8ICcnKVxufVxuXG4vKipcbiAqICBAcHVibGljXG4gKiAgQGluc3RhbmNlXG4gKiAgQG1lbWJlck9mIFJlcG9ydFxuICogIEBkZXNjIFN0cmluZ2lmeSBvYmplY3RzIHJlY3Vyc2l2ZWx5IHdpdGggbGltaXRlZCBkZXB0aFxuICogIGFuZCBjaXJjdWxhciByZWZlcmVuY2UgdHJhY2tpbmcuXG4gKiAgR2VuZXJhbGx5IEpTT04uc3RyaW5naWZ5IGlzIHVzZWQgYXMgcmVmZXJlbmNlOlxuICogIHN0cmluZ3MgYXJlIGVzY2FwZWQgYW5kIGRvdWJsZS1xdW90ZWQ7IG51bWJlcnMsIGJvb2xlYW4sIGFuZCBudWxscyBhcmVcbiAqICBzdHJpbmdpZmllZCBcImFzIGlzXCI7IG9iamVjdHMgYW5kIGFycmF5cyBhcmUgZGVzY2VuZGVkIGludG8uXG4gKiAgVGhlIGRpZmZlcmVuY2VzIGZvbGxvdzpcbiAqICB1bmRlZmluZWQgaXMgcmVwb3J0ZWQgYXMgJzx1bmRlZj4nLlxuICogIE9iamVjdHMgdGhhdCBoYXZlIGNvbnN0cnVjdG9ycyBhcmUgcHJlZml4ZWQgd2l0aCBjbGFzcyBuYW1lcy5cbiAqICBPYmplY3QgYW5kIGFycmF5IGNvbnRlbnQgaXMgYWJicmV2aWF0ZWQgYXMgXCIuLi5cIiBhbmQgXCJDaXJjdWxhclwiXG4gKiAgaW4gY2FzZSBvZiBkZXB0aCBleGhhdXN0aW9uIGFuZCBjaXJjdWxhciByZWZlcmVuY2UsIHJlc3BlY3RpdmVseS5cbiAqICBGdW5jdGlvbnMgYXJlIG5haXZlbHkgc3RyaW5naWZpZWQuXG4gKiAgQHBhcmFtIHtBbnl9IHRhcmdldCBUaGluZ3kgdG8gc2VyaWFsaXplLlxuICogIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLmRlcHRoIEhvdyBtYW55IGxldmVscyB0byBkZXNjZW5kLiBEZWZhdWx0ID0gMy5cbiAqICBAcGFyYW0ge3N0cmluZ30gIG9wdGlvbnMucGF0aCBDaXJjdWxhciByZWZlcmVuY2UgcGF0aCBwcmVmaXguIERlZmF1bHQgPSAnJCcuXG4gKiAgQHJldHVybnMge3N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZXhwbGFpbiAoIGl0ZW0sIG9wdGlvbnMgPSB7fSApIHtcbiAgICByZXR1cm4gX2V4cGxhaW4oIGl0ZW0sIG9wdGlvbnMuZGVwdGggfHwgMywgb3B0aW9ucy5wYXRoIHx8ICckJyApO1xufVxuXG5mdW5jdGlvbiBfZXhwbGFpbiAoaXRlbSwgZGVwdGgsIHBhdGgsIHNlZW4gPSBuZXcgTWFwKCkpIHtcbiAgICAvLyBzaW1wbGUgdHlwZXNcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKVxuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoaXRlbSk7IC8vIGRvbid0IHdhbnQgdG8gc3BlbmQgdGltZSBxb3V0aW5nXG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgaXRlbSA9PT0gJ2Jvb2xlYW4nIHx8IGl0ZW0gPT09IG51bGwpXG4gICAgICAgIHJldHVybiAnJyArIGl0ZW07XG4gICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCkgcmV0dXJuICc8dW5kZWY+JztcbiAgICBpZiAodHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnKSAvLyBtYXliZSBmdW5jdGlvblxuICAgICAgICByZXR1cm4gJycgKyBpdGVtOyAvLyBUT0RPIGRvbid0IHByaW50IG91dCBhIGxvbmcgZnVuY3Rpb24ncyBib2R5XG5cbiAgICAvLyBjaGVjayBjaXJjdWxhcml0eVxuICAgIGlmIChzZWVuLmhhcyhpdGVtKSkge1xuICAgICAgICBjb25zdCBub3RlID0gJ0NpcmN1bGFyPScgKyBzZWVuLmdldChpdGVtKTtcbiAgICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoaXRlbSkgPyAnWyAnICsgbm90ZSArICcgXScgOiAneyAnICsgbm90ZSArICcgfSc7XG4gICAgfVxuXG4gICAgLy8gcmVjdXJzZVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHVzZSB0cnkgeyAuLi4gfSBmaW5hbGx5IHsgLi4uIH0gdG8gcmVtb3ZlIGl0ZW0gZnJvbSBzZWVuIG9uIHJldHVyblxuICAgICAgICBzZWVuLnNldCggaXRlbSwgcGF0aCApO1xuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICAgICAgICBpZiAoZGVwdGggPCAxKVxuICAgICAgICAgICAgICAgIHJldHVybiAnWy4uLl0nO1xuICAgICAgICAgICAgLy8gVE9ETyA8eCBlbXB0eSBpdGVtcz5cbiAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBpdGVtLm1hcChcbiAgICAgICAgICAgICAgICAodmFsLCBpbmRleCkgPT4gX2V4cGxhaW4odmFsLCBkZXB0aCAtIDEsIHBhdGggKyAnWycgKyBpbmRleCArICddJywgc2VlbilcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4gJ1snICsgbGlzdC5qb2luKCcsICcpICsgJ10nOyAvLyBUT0RPIGNvbmZpZ3VyYWJsZSB3aGl0ZXNwYWNlXG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0eXBlID0gaXRlbS5jb25zdHJ1Y3RvciAmJiBpdGVtLmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgICAgIGNvbnN0IHByZWZpeCA9IHR5cGUgJiYgdHlwZSAhPT0gJ09iamVjdCcgPyB0eXBlICsgJyAnIDogJyc7XG4gICAgICAgIGlmIChkZXB0aCA8IDEpXG4gICAgICAgICAgICByZXR1cm4gcHJlZml4ICsgJ3suLi59JztcbiAgICAgICAgY29uc3QgbGlzdCA9IE9iamVjdC5rZXlzKGl0ZW0pLnNvcnQoKS5tYXAoIGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IEpTT04uc3RyaW5naWZ5KGtleSk7XG4gICAgICAgICAgICByZXR1cm4gaW5kZXggKyAnOicgKyBfZXhwbGFpbihpdGVtW2tleV0sIGRlcHRoIC0gMSwgcGF0aCArICdbJyArIGluZGV4ICsgJ10nLCBzZWVuKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBwcmVmaXggKyAneycgKyBsaXN0LmpvaW4oJywgJykgKyAnfSc7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgc2Vlbi5kZWxldGUoaXRlbSk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgY2FsbGVySW5mbywgZXhwbGFpbiB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqICAgVGhpcyBpcyB0aGUgZW50cnkgcG9pbnQgZm9yIGJyb3dzZXIgdmVyc2lvbi5cbiAqICAgV2UgYXJlIHVzaW5nIHdlYnBhY2sgY3VycmVudGx5LiBTZWUgLi4vYnJvd3NldGlmeS5zaFxuICovXG5cbi8vIFRPRE8gY2hlY2sgaWYgcmVmdXRlIGFscmVhZHkgZXhpc3RzLCBhbHNvIGNoZWNrIHZlcnNpb25cbndpbmRvdy5yZWZ1dGUgPSByZXF1aXJlKCAnLi9pbmRleC5qcycgKTtcbiJdfQ==
