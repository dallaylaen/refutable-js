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
            return;

        // nested report needs special handling
        if (evidence instanceof Report) {
            this._nested[n] = evidence;
            if (evidence.getDone()) {
                if (evidence.getPass())
                    return; // short-circuit if possible
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
            return;
        }

        return this._setResult(n, evidence, condName, where || callerInfo(2));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvY29uZC9hcnJheS5qcyIsImxpYi9jb25kL2Jhc2ljLmpzIiwibGliL2NvbmQvZGVlcC5qcyIsImxpYi9pbmRleC5qcyIsImxpYi9yZXBvcnQuanMiLCJsaWIvdXRpbC5qcyIsImxpYi93ZWItaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdHBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgUmVwb3J0IH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgZm9yRWFjaFxuICogICBAZGVzYyAgQ2hlY2tzIHRoYXQgYSBuZXN0ZWQgY29udHJhY3QgaG9sZHMgZm9yIGVhY2ggZWxlbWVudCBvZiBhbiBhcnJheS5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IGRlc2NyaXB0aW9uXG4gKiAgIEBwYXJhbSB7QXJyYXl9IGFycmF5IExpc3Qgb2YgaXRlbXMuXG4gKiAgIEBwYXJhbSB7Q29udHJhY3R9IG5lc3RlZCBGaXJzdCBhcmd1bWVudCBnaXZlbiB0byB0aGUgY2FsbGJhY2tcbiAqICAgaXMgYSBSZXBvcnQgb2JqZWN0LCBhbmQgdGhlIHNlY29uZCBvbmUgaXMgdGhlIGFycmF5IGl0ZW0gaW4gcXVlc3Rpb24uXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cblxuYWRkQ29uZGl0aW9uKCAnZm9yRWFjaCcsXG4gICAgLy8gVE9ETyBiZXR0ZXIgbmFtZSB0aGF0IHJoeW1lcyB3aXRoIHRoZSBvcmRlcmVkIG9uZSAobWFwL3JlZHVjZT8pXG4gICAgeyBmdW46IDEsIGFyZ3M6IDIgfSxcbiAgICAobGlzdCwgY29udHJhY3QpID0+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKVxuICAgICAgICAgICAgcmV0dXJuICdFeHBlY3RlZCBhIGxpc3QsIGZvdW5kIGEgJy50eXBlb2YobGlzdCk7XG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA8IDEpXG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gYXV0by1wYXNzXG5cbiAgICAgICAgY29uc3Qgb2sgPSBuZXcgUmVwb3J0KCk7XG4gICAgICAgIGxpc3QuZm9yRWFjaCggKGl0ZW0sIGluZGV4KSA9PiBvay5uZXN0ZWQoICdpdGVtICcgKyBpbmRleCwgaXRlbSwgY29udHJhY3QgKSApO1xuICAgICAgICByZXR1cm4gb2suZG9uZSgpO1xuICAgIH1cbik7XG5cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBvcmRlcmVkXG4gKiAgIEBkZXNjICBDaGVja3MgdGhhdCBhIG5lc3RlZCBjb250cmFjdCBob2xkcyBmb3IgZWFjaCBwYWlyXG4gKiAgIG9mIGFkamFjZW50IGVsZW1lbnQgb2YgYW4gYXJyYXkgKGkuZS4gMSYyLCAyJjMsIDMmNCwgLi4uKS5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IGRlc2NyaXB0aW9uXG4gKiAgIEBwYXJhbSB7QXJyYXl9IGFycmF5IExpc3Qgb2YgaXRlbXMuXG4gKiAgIEBwYXJhbSB7Q29udHJhY3R9IG5lc3RlZCBGaXJzdCBhcmd1bWVudCBnaXZlbiB0byB0aGUgY2FsbGJhY2tcbiAqICAgaXMgYSBSZXBvcnQgb2JqZWN0LCBhbmQgdGhlIHNlY29uZCBhbmQgdGhpcmQgb25lc1xuICogICBhcmUgdGhlIGFycmF5IGl0ZW1zIGluIHF1ZXN0aW9uLlxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5cbi8vIFRPRE8gdGhpcyBpcyBjYWxsZWQgXCJjb21wbGlhbnQgY2hhaW5cIiBidXQgYmV0dGVyIGp1c3Qgc2F5IGhlcmVcbi8vIFwib2ggd2UncmUgY2hlY2tpbmcgZWxlbWVudCBvcmRlclwiXG5hZGRDb25kaXRpb24oICdvcmRlcmVkJyxcbiAgICAvLyBUT0RPIGJldHRlciBuYW1lPyBwYWlyd2lzZT8gcmVkdWNlP1xuICAgIHsgZnVuOiAxLCBhcmdzOiAyIH0sXG4gICAgKGxpc3QsIGNvbnRyYWN0KSA9PiB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSlcbiAgICAgICAgICAgIHJldHVybiAnRXhwZWN0ZWQgYSBsaXN0LCBmb3VuZCBhICcudHlwZW9mKGxpc3QpO1xuICAgICAgICBpZiAobGlzdC5sZW5ndGggPCAyKVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGF1dG8tcGFzc1xuXG4gICAgICAgIGNvbnN0IG9rID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IGxpc3QubGVuZ3RoIC0gMTsgbisrKVxuICAgICAgICAgICAgb2submVzdGVkKCAnaXRlbXMgJyArIG4gKyAnLCAnICsgKG4gKyAxKSwgbGlzdFtuXSwgbGlzdFtuICsgMV0sIGNvbnRyYWN0KTtcblxuICAgICAgICByZXR1cm4gb2suZG9uZSgpO1xuICAgIH1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCBleHBsYWluIH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuY29uc3QgT0sgPSBmYWxzZTtcblxuY29uc3QgY21wTnVtID0ge1xuICAgICc8JzogICh4LCB5KSA9PiAoeCAgPCB5KSxcbiAgICAnPic6ICAoeCwgeSkgPT4gKHggID4geSksXG4gICAgJzw9JzogKHgsIHkpID0+ICh4IDw9IHkpLFxuICAgICc+PSc6ICh4LCB5KSA9PiAoeCA+PSB5KSxcbiAgICAnPT0nOiAoeCwgeSkgPT4gKHggPT09IHkpLFxuICAgICchPSc6ICh4LCB5KSA9PiAoeCAhPT0geSksXG59O1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBlcWVxZXEgLS0gd2UncmUgZmlsdGVyaW5nIG91dCB1bmRlZmluZWQgQU5EIG51bGwgaGVyZSAqL1xuY29uc3QgY21wU3RyID0ge1xuICAgICc8JzogICh4LCB5KSA9PiB4ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycgKyB4ICA8ICcnICsgeSksXG4gICAgJz4nOiAgKHgsIHkpID0+IHggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyArIHggID4gJycgKyB5KSxcbiAgICAnPD0nOiAoeCwgeSkgPT4geCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnICsgeCA8PSAnJyArIHkpLFxuICAgICc+PSc6ICh4LCB5KSA9PiB4ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycgKyB4ID49ICcnICsgeSksXG5cbiAgICAnPT0nOiAoeCwgeSkgPT4geCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnICsgeCA9PT0gJycgKyB5KSxcbiAgICAnIT0nOiAoeCwgeSkgPT4gKCh4ID09IHVuZGVmaW5lZCkgXiAoeSA9PSB1bmRlZmluZWQpKSB8fCAoJycgKyB4ICE9PSAnJyArIHkpLFxufTtcbi8qIGVzbGludC1lbmFibGUgZXFlcWVxICovXG5cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBjbXBOdW1cbiAqICAgQGRlc2MgIENoZWNrcyBpZiBhIHJlbGF0aW9uIGluZGVlZCBob2xkcyBiZXR3ZWVuIGFyZ3VtZW50cy5cbiAqICAgICAgICAgIFNlZSBhbHNvIHtAbGluayBjbXBTdHJ9XG4gKiAgIEBwYXJhbSB7YW55fSBhcmcxICAgIEZpcnN0IGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBvcGVyYXRpb24gIE9uZSBvZiAnPCcsICc8PScsICc9PScsICchPScsICc+PScsIG9yICc+J1xuICogICBAcGFyYW0ge2FueX0gYXJnMiAgICBTZWNvbmQgYXJndW1lbnRcbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGNtcFN0clxuICogICBAZGVzYyAgQ2hlY2tzIGlmIGEgcmVsYXRpb24gaW5kZWVkIGhvbGRzIGJldHdlZW4gYXJndW1lbnRzLFxuICogICAgICAgICAgYXNzdW1pbmcgdGhleSBhcmUgc3RyaW5ncy5cbiAqICAgICAgICAgIFNlZSBhbHNvIHtAbGluayBjbXBOdW19XG4gKiAgIEBwYXJhbSB7YW55fSBhcmcxICAgIEZpcnN0IGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBvcGVyYXRpb24gIE9uZSBvZiAnPCcsICc8PScsICc9PScsICchPScsICc+PScsIG9yICc+J1xuICogICBAcGFyYW0ge2FueX0gYXJnMiAgICBTZWNvbmQgYXJndW1lbnRcbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuXG5hZGRDb25kaXRpb24oICdjbXBOdW0nLFxuICAgIHsgYXJnczogMyB9LFxuICAgICh4LCBvcCwgeSkgPT4gY21wTnVtW29wXSh4LCB5KSA/IDAgOiBbeCwgJ2lzIG5vdCAnICsgb3AsIHldXG4pO1xuYWRkQ29uZGl0aW9uKCAnY21wU3RyJyxcbiAgICB7IGFyZ3M6IDMgfSxcbiAgICAoeCwgb3AsIHkpID0+IGNtcFN0cltvcF0oeCwgeSkgPyAwIDogW3gsICdpcyBub3QgJyArIG9wLCB5XVxuKTtcblxuY29uc3QgdHlwZUNoZWNrID0ge1xuICAgIHVuZGVmaW5lZDogeCA9PiB4ID09PSB1bmRlZmluZWQsXG4gICAgbnVsbDogICAgICB4ID0+IHggPT09IG51bGwsXG4gICAgbnVtYmVyOiAgICB4ID0+IHR5cGVvZiB4ID09PSAnbnVtYmVyJyAmJiAhTnVtYmVyLmlzTmFOKHgpLFxuICAgIGludGVnZXI6ICAgeCA9PiBOdW1iZXIuaXNJbnRlZ2VyKHgpLFxuICAgIG5hbjogICAgICAgeCA9PiBOdW1iZXIuaXNOYU4oeCksXG4gICAgc3RyaW5nOiAgICB4ID0+IHR5cGVvZiB4ID09PSAnc3RyaW5nJyxcbiAgICBmdW5jdGlvbjogIHggPT4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicsXG4gICAgYm9vbGVhbjogICB4ID0+IHR5cGVvZiB4ID09PSAnYm9vbGVhbicsXG4gICAgb2JqZWN0OiAgICB4ID0+IHggJiYgdHlwZW9mIHggPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KHgpLFxuICAgIGFycmF5OiAgICAgeCA9PiBBcnJheS5pc0FycmF5KHgpLFxufTtcbmZ1bmN0aW9uIHR5cGVFeHBsYWluICh4KSB7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnc3RyaW5nJylcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKVxuICAgICAgICByZXR1cm4gJ2luc3RhbmNlb2YgJyArICh4Lm5hbWUgfHwgeCk7XG59XG5cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCB0eXBlXG4gKiAgIEBkZXNjICBDaGVja3MgdGhhdCBhIHZhbHVlIGlzIG9mIHRoZSBzcGVjaWZpZWQgdHlwZS5cbiAqICAgQHBhcmFtIHthbnl9IHZhbHVlICAgIEZpcnN0IGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfGZ1bmN0aW9ufEFycmF5fSB0eXBlXG4gKiAgICAgICBPbmUgb2YgJ3VuZGVmaW5lZCcsICdudWxsJywgJ251bWJlcicsICdpbnRlZ2VyJywgJ25hbicsICdzdHJpbmcnLFxuICogICAgICAgJ2Jvb2xlYW4nLCAnb2JqZWN0JywgJ2FycmF5JywgYSBjbGFzcywgb3IgYW4gYXJyYXkgY29udGFpbmluZyAxIG9yIG1vcmVcbiAqICAgICAgIG9mIHRoZSBhYm92ZS4gJ251bWJlcicvJ2ludGVnZXInIGRvbid0IGluY2x1ZGUgTmFOLFxuICogICAgICAgYW5kICdvYmplY3QnIGRvZXNuJ3QgaW5jbHVkZSBhcnJheXMuXG4gKiAgICAgICBBIGZ1bmN0aW9uIGltcGxpZXMgYW4gb2JqZWN0IGFuZCBhbiBpbnN0YW5jZW9mIGNoZWNrLlxuICogICAgICAgQXJyYXkgbWVhbnMgYW55IG9mIHRoZSBzcGVjaWZpZWQgdHlwZXMgKGFrYSBzdW0gb2YgdHlwZXMpLlxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5hZGRDb25kaXRpb24oICd0eXBlJyxcbiAgICB7IGFyZ3M6IDIgfSxcbiAgICAoZ290LCBleHApID0+IHtcbiAgICAgICAgaWYgKCAhQXJyYXkuaXNBcnJheShleHApIClcbiAgICAgICAgICAgIGV4cCA9IFtleHBdO1xuXG4gICAgICAgIGZvciAoY29uc3QgdmFyaWFudCBvZiBleHApIHtcbiAgICAgICAgICAgIC8vIGtub3duIHR5cGVcbiAgICAgICAgICAgIGlmICggdHlwZW9mIHZhcmlhbnQgPT09ICdzdHJpbmcnICYmIHR5cGVDaGVja1t2YXJpYW50XSApIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZUNoZWNrW3ZhcmlhbnRdKGdvdCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPSztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaW5zdGFuY2VvZlxuICAgICAgICAgICAgaWYgKCB0eXBlb2YgdmFyaWFudCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZ290ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGlmICggZ290IGluc3RhbmNlb2YgdmFyaWFudCApXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPSztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZG9uJ3Qga25vdyB3aGF0IHlvdSdyZSBhc2tpbmcgZm9yXG4gICAgICAgICAgICByZXR1cm4gJ3Vua25vd24gdmFsdWUgdHlwZSBzcGVjOiAnICsgZXhwbGFpbih2YXJpYW50LCAxKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgJy0gJyArIGV4cGxhaW4oZ290LCAxKSxcbiAgICAgICAgICAgICcrICcgKyBleHAubWFwKCB0eXBlRXhwbGFpbiApLmpvaW4oJyBvciAnKSxcbiAgICAgICAgXTtcbiAgICB9XG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcblxuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGRlZXBFcXVhbFxuICogICBAZGVzYyBDb21wYXJlcyB0d28gc3RydWN0dXJlcywgb3V0cHV0cyBkaWZmIGlmIGRpZmZlcmVuY2VzIGZvdW5kLlxuICogICBAcGFyYW0ge2FueX0gYWN0dWFsICAgIEZpcnN0IHN0cnVjdHVyZVxuICogICBAcGFyYW0ge2FueX0gZXhwZWN0ZWQgIFN0cnVjdHVyZSB0byBjb21wYXJlIHRvXG4gKiAgIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqICAgQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMubWF4IGhvdyBtYW55IGRpZmZlcmVuY2VzIHRvIG91dHB1dCAoZGVmYXVsdCA1KVxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5hZGRDb25kaXRpb24oICdkZWVwRXF1YWwnLFxuICAgIHsgYXJnczogMiwgaGFzT3B0aW9uczogdHJ1ZSB9LCBkZWVwICk7XG5cbmZ1bmN0aW9uIGRlZXAgKCBnb3QsIGV4cCwgb3B0aW9ucyA9IHt9ICkge1xuICAgIGlmICghb3B0aW9ucy5tYXgpXG4gICAgICAgIG9wdGlvbnMubWF4ID0gNTtcbiAgICBvcHRpb25zLmRpZmYgPSBbXTtcbiAgICBfZGVlcCggZ290LCBleHAsIG9wdGlvbnMgKTtcbiAgICBpZiAoIW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgIHJldHVybiAwO1xuXG4gICAgY29uc3QgcmV0ID0gW107XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIG9wdGlvbnMuZGlmZikge1xuICAgICAgICByZXQucHVzaChcbiAgICAgICAgICAgICdhdCAnICsgaXRlbVswXSxcbiAgICAgICAgICAgICctICcgKyAoaXRlbVszXSA/IGl0ZW1bMV0gOiBleHBsYWluKCBpdGVtWzFdLCB7IGRlcHRoOiAyIH0gKSksXG4gICAgICAgICAgICAnKyAnICsgKGl0ZW1bM10gPyBpdGVtWzJdIDogZXhwbGFpbiggaXRlbVsyXSwgeyBkZXB0aDogMiB9ICkpLFxuICAgICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufVxuXG4vLyByZXN1bHQgaXMgc3RvcmVkIGluIG9wdGlvbnMuZGlmZj1bXSwgcmV0dXJuIHZhbHVlIGlzIGlnbm9yZWRcbi8vIGlmIHNhaWQgZGlmZiBleGNlZWRzIG1heCwgcmV0dXJuIGltbWVkaWF0ZWx5ICYgZG9uJ3Qgd2FzdGUgdGltZVxuZnVuY3Rpb24gX2RlZXAgKCBnb3QsIGV4cCwgb3B0aW9ucyA9IHt9LCBwYXRoID0gJyQnLCBzZWVuTCA9IG5ldyBNYXAoKSwgc2VlblIgPSBuZXcgTWFwKCkgKSB7XG4gICAgaWYgKGdvdCA9PT0gZXhwIHx8IG9wdGlvbnMubWF4IDw9IG9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgIHJldHVybjtcbiAgICBpZiAodHlwZW9mIGdvdCAhPT0gdHlwZW9mIGV4cClcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHBdICk7XG5cbiAgICAvLyByZWN1cnNlIGJ5IGV4cGVjdGVkIHZhbHVlIC0gY29uc2lkZXIgaXQgbW9yZSBwcmVkaWN0YWJsZVxuICAgIGlmICh0eXBlb2YgZXhwICE9PSAnb2JqZWN0JyB8fCBleHAgPT09IG51bGwgKSB7XG4gICAgICAgIC8vIG5vbi1vYmplY3RzIC0gc28gY2FuJ3QgZGVzY2VuZFxuICAgICAgICAvLyBhbmQgY29tcGFyaXNvbiBhbHJlYWR5IGRvbmUgYXQgdGhlIGJlZ2lubm5pbmdcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHBdICk7XG4gICAgfVxuXG4gICAgLy8gbXVzdCBkZXRlY3QgbG9vcHMgYmVmb3JlIGdvaW5nIGRvd25cbiAgICBjb25zdCBwYXRoTCA9IHNlZW5MLmdldChnb3QpO1xuICAgIGNvbnN0IHBhdGhSID0gc2VlblIuZ2V0KGV4cCk7XG4gICAgaWYgKHBhdGhMIHx8IHBhdGhSKSB7XG4gICAgICAgIC8vIExvb3AgZGV0ZWN0ZWQgPSBvbmx5IGNoZWNrIHRvcG9sb2d5XG4gICAgICAgIGlmIChwYXRoTCA9PT0gcGF0aFIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW1xuICAgICAgICAgICAgcGF0aCArICcgKGNpcmN1bGFyKScsXG4gICAgICAgICAgICBwYXRoTCA/ICdDaXJjdWxhcj0nICsgcGF0aEwgOiBleHBsYWluKGdvdCwgeyBkZXB0aDogMiB9KSxcbiAgICAgICAgICAgIHBhdGhSID8gJ0NpcmN1bGFyPScgKyBwYXRoUiA6IGV4cGxhaW4oZXhwLCB7IGRlcHRoOiAyIH0pLFxuICAgICAgICAgICAgdHJ1ZSAvLyBkb24ndCBzdHJpbmdpZnlcbiAgICAgICAgXSk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgICAgc2Vlbkwuc2V0KGdvdCwgcGF0aCk7XG4gICAgICAgIHNlZW5SLnNldChleHAsIHBhdGgpO1xuXG4gICAgICAgIC8vIGNvbXBhcmUgb2JqZWN0IHR5cGVzXG4gICAgICAgIC8vIChpZiBhIHVzZXIgaXMgc3R1cGlkIGVub3VnaCB0byBvdmVycmlkZSBjb25zdHJ1Y3RvciBmaWVsZCwgd2VsbCB0aGUgdGVzdFxuICAgICAgICAvLyB3b3VsZCBmYWlsIGxhdGVyIGFueXdheSlcbiAgICAgICAgaWYgKGdvdC5jb25zdHJ1Y3RvciAhPT0gZXhwLmNvbnN0cnVjdG9yKVxuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHBdICk7XG5cbiAgICAgICAgLy8gYXJyYXlcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZXhwKSkge1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGdvdCkgfHwgZ290Lmxlbmd0aCAhPT0gZXhwLmxlbmd0aClcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cF0gKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBleHAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBfZGVlcCggZ290W2ldLCBleHBbaV0sIG9wdGlvbnMsIGV4dGVuZFBhdGgocGF0aCwgaSksIHNlZW5MLCBzZWVuUiApO1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm1heCA8PSBvcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbXBhcmUga2V5cyAtICsxIGZvciBleHAsIC0xIGZvciBnb3QsIG5vbnplcm8ga2V5IGF0IGVuZCBtZWFucyBrZXlzIGRpZmZlclxuICAgICAgICAvLyBUT0RPIGJldHRlciwgZmFzdGVyIHdheSB0byBkbyBpdD9cbiAgICAgICAgY29uc3QgdW5pcSA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyhleHApLmZvckVhY2goIHggPT4geyB1bmlxW3hdID0gMSB9ICk7XG4gICAgICAgIE9iamVjdC5rZXlzKGdvdCkuZm9yRWFjaCggeCA9PiB7IHVuaXFbeF0gPSAodW5pcVt4XSB8fCAwKSAtIDEgfSApO1xuICAgICAgICBmb3IgKGNvbnN0IHggaW4gdW5pcSkge1xuICAgICAgICAgICAgaWYgKHVuaXFbeF0gIT09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHBdICk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBub3cgdHlwZW9mLCBvYmplY3QgdHlwZSwgYW5kIG9iamVjdCBrZXlzIGFyZSB0aGUgc2FtZS5cbiAgICAgICAgLy8gcmVjdXJzZS5cbiAgICAgICAgZm9yIChjb25zdCBpIGluIGV4cCkge1xuICAgICAgICAgICAgX2RlZXAoIGdvdFtpXSwgZXhwW2ldLCBvcHRpb25zLCBleHRlbmRQYXRoKHBhdGgsIGkpLCBzZWVuTCwgc2VlblIgKTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLm1heCA8PSBvcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgc2VlbkwuZGVsZXRlKGdvdCk7XG4gICAgICAgIHNlZW5SLmRlbGV0ZShleHApO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZXh0ZW5kUGF0aCAocGF0aCwgc3VmZml4KSB7XG4gICAgLy8gYXJyYXlcbiAgICBpZiAoIHR5cGVvZiBzdWZmaXggPT09ICdudW1iZXInIClcbiAgICAgICAgcmV0dXJuIHBhdGggKyAnWycgKyBzdWZmaXggKyAnXSc7XG4gICAgLy9cbiAgICBpZiAoIHN1ZmZpeC5tYXRjaCgvXlthLXpfXVthLXpfMC05XSokL2kpIClcbiAgICAgICAgcmV0dXJuIHBhdGggKyAnLicgKyBzdWZmaXg7XG4gICAgcmV0dXJuIHBhdGggKyAnWycgKyBKU09OLnN0cmluZ2lmeShzdWZmaXgpICsgJ10nO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyB0aGUgY29yZSAoc2hvdWxkIGV4cGxhaW4gZXZlbiBiZSB0aGVyZT8pXG5jb25zdCB7IFJlcG9ydCwgYWRkQ29uZGl0aW9uLCBleHBsYWluIH0gPSByZXF1aXJlKCcuL3JlcG9ydC5qcycpO1xuXG4vLyBUT0RPIGFkZCBlaWZmZWwtc3R5bGUgZGVzaWduLWJ5LWNvbnRyYWN0XG5cbi8vIGltcG9ydCBkZWZhdWx0IGNvbmRpdGlvbiBhcnNlbmFsXG5yZXF1aXJlKCAnLi9jb25kL2Jhc2ljLmpzJyApO1xucmVxdWlyZSggJy4vY29uZC9hcnJheS5qcycgKTtcbnJlcXVpcmUoICcuL2NvbmQvZGVlcC5qcycgKTtcblxuY29uc3QgZ2V0UmVwb3J0ID0gKC4uLmFyZ3MpID0+IG5ldyBSZXBvcnQoKS5ydW4oLi4uYXJncykuZG9uZSgpO1xuXG4vLyBBbGxvdyBjcmVhdGluZyBtdWx0aXBsZSBwYXJhbGxlbCBjb25maWd1cmF0aW9ucyBvZiByZWZ1dGVcbi8vIGUuZy4gb25lIHN0cmljdCAodGhyb3dpbmcgZXJyb3JzKSBhbmQgb3RoZXIgbGF4IChqdXN0IGRlYnVnZ2luZyB0byBjb25zb2xlKVxuZnVuY3Rpb24gc2V0dXAgKCBvcHRpb25zID0ge30sIG9yaWcgKSB7XG4gICAgLy8gVE9ETyB2YWxpZGF0ZSBvcHRpb25zXG4gICAgY29uc3Qgb25GYWlsID0gb3B0aW9ucy5vbkZhaWwgfHwgKHJlcCA9PiB7IHRocm93IG5ldyBFcnJvcihyZXAudG9TdHJpbmcoKSkgfSk7XG5cbiAgICBjb25zdCByZWZ1dGUgPSBvcHRpb25zLnNraXBcbiAgICAgICAgPyAoKSA9PiB7fVxuICAgICAgICA6ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBvayA9IG5ldyBSZXBvcnQoKTtcbiAgICAgICAgICAgIG9rLm9uRG9uZSggeCA9PiB7IGlmICggIXguZ2V0UGFzcygpICkgb25GYWlsKHgsIGFyZ3MpIH0gKTtcbiAgICAgICAgICAgIG9rLnJ1biguLi5hcmdzKTtcbiAgICAgICAgICAgIG9rLmRvbmUoKTtcbiAgICAgICAgfTtcblxuICAgIC8vIHJlZXhwb3J0IGFsbCBmcm9tIHJlcG9ydC5qc1xuICAgIHJlZnV0ZS5SZXBvcnQgPSBSZXBvcnQ7XG4gICAgcmVmdXRlLmV4cGxhaW4gPSBleHBsYWluO1xuICAgIHJlZnV0ZS5hZGRDb25kaXRpb24gPSBhZGRDb25kaXRpb247XG5cbiAgICAvLyBzaG9ydGN1dCB0byB2YWxpZGF0aW5nICYgcmV0dXJuaW5nIGEgZnJlc2ggY29udHJhY3RcbiAgICAvLyBUT0RPIHJlbmFtZSB0byBhdm9pZCBuYW1lIGNsYXNoIHdpdGggdGhlIGNsYXNzXG4gICAgLy8gKGV2YWw/KVxuICAgIHJlZnV0ZS5yZXBvcnQgPSBnZXRSZXBvcnQ7XG5cbiAgICAvLyByZWZ1dGUuY29uZih7Li4ufSkgd2lsbCBnZW5lcmF0ZSBhIF9uZXdfIHJlZnV0ZVxuICAgIHJlZnV0ZS5jb25maWcgPSB1cGRhdGUgPT4gc2V0dXAoIHsgLi4ub3B0aW9ucywgLi4udXBkYXRlIH0sIHJlZnV0ZSApO1xuXG4gICAgcmV0dXJuIHJlZnV0ZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXR1cCgpO1xuXG4vKipcbiAqICAgQG5hbWVzcGFjZSByZWZ1dGVcbiAqICAgQGRlc2MgICBGdW5jdGlvbnMgZXhwb3J0ZWQgYnkgcmVmdXRhYmxlJ3MgbWFpbiBtb2R1bGUuXG4gKi9cblxuLyoqXG4gKiAgIEBwdWJsaWNcbiAqICAgQG1lbWJlck9mIHJlZnV0ZVxuICogICBAZnVuY3Rpb24gcmVmdXRlXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gRGF0YSB0byBmZWVkIHRvIHRoZSBjYWxsYmFja1xuICogICBAcGFyYW0ge0NvbnRyYWN0fSBjb250cmFjdCBBIGNvZGUgYmxvY2sgd2l0aCBjaGVja3MuXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9IFJldHVybiB2YWx1ZSBpcyBpZ25vcmVkLlxuICogICBAdGhyb3dzIHtFcnJvcn0gSWYgb25lIG9yIG1vcmUgY2hlY2tzIGFyZSBmYWlsaW5nLCBhbiBleGNlcHRpb24gaXMgdGhyb3duXG4gKiAgIHdpdGggZGV0YWlscyBhYm91dCBhbGwgcGFzc2luZy9mYWlsaW5nIGNoZWNrcy5cbiAqICAgVGhpcyBhY3Rpb24gY2FuIGJlIGNoYW5nZWQgdmlhIHJlZnV0ZS5jb25maWcoKSBjYWxsLlxuICpcbiAqL1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGNhbGxlckluZm8sIGV4cGxhaW4gfSA9IHJlcXVpcmUoJy4vdXRpbC5qcycpO1xuXG4vKipcbiAqICAgQGNhbGxiYWNrIENvbnRyYWN0XG4gKiAgIEBkZXNjIEEgY29kZSBibG9jayBjb250YWluaW5nIG9uZSBvciBtb3JlIGNvbmRpdGlvbiBjaGVja3MuXG4gKiAgIEEgY2hlY2sgaXMgcGVyZm9ybWVkIGJ5IGNhbGxpbmcgb25lIG9mIGEgZmV3IHNwZWNpYWwgbWV0aG9kc1xuICogICAoZXF1YWwsIG1hdGNoLCBkZWVwRXF1YWwsIHR5cGUgZXRjKVxuICogICBvbiB0aGUgUmVwb3J0IG9iamVjdC5cbiAqICAgQ29udHJhY3RzIG1heSBiZSBuZXN0ZWQgdXNpbmcgdGhlICduZXN0ZWQnIG1ldGhvZCB3aGljaCBhY2NlcHRzXG4gKiAgIGFub3RoZXIgY29udHJhY3QgYW5kIHJlY29yZHMgYSBwYXNzL2ZhaWx1cmUgaW4gdGhlIHBhcmVudCBhY2NvcmRpbmdseS5xXG4gKiAgIEEgY29udHJhY3QgaXMgYWx3YXlzIGV4ZWN1dGVkIHRvIHRoZSBlbmQuXG4gKiAgIEBwYXJhbSB7UmVwb3J0fSBvayBBbiBvYmplY3QgdGhhdCByZWNvcmRzIGNoZWNrIHJlc3VsdHMuXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzXG4gKiAgIChlLmcuIGRhdGEgc3RydWN0dXJlIHRvIGJlIHZhbGlkYXRlZClcbiAqICAgQHJldHVybnMge3ZvaWR9IFJldHVybmVkIHZhbHVlIGlzIGlnbm9yZWQuXG4gKi9cblxuY29uc3QgcHJvdG9jb2wgPSAxLjE7XG5cbi8qKlxuICogQHB1YmxpY1xuICogQGNsYXNzZGVzY1xuICogVGhlIGNvcmUgb2YgdGhlIHJlZnV0YWJsZSBsaWJyYXJ5LCB0aGUgcmVwb3J0IG9iamVjdCBjb250YWlucyBpbmZvXG4gKiBhYm91dCBwYXNzaW5nIGFuZCBmYWlsaW5nIGNvbmRpdGlvbnMuXG4gKi9cbmNsYXNzIFJlcG9ydCB7XG4gICAgLy8gc2V0dXBcbiAgICAvKipcbiAgICAgKiAgQGRlc2MgTm8gY29uc3RydWN0b3IgYXJndW1lbnRzIHN1cHBvcnRlZC5cbiAgICAgKiAgQ29udHJhY3RzIG1heSBuZWVkIHRvIGJlIHNldCB1cCBpbnNpZGUgY2FsbGJhY2tzIF9hZnRlcl8gY3JlYXRpb24sXG4gICAgICogIGhlbmNlIHRoaXMgY29udmVudGlvbi5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgICAgIHRoaXMuX2NvdW50ICAgICA9IDA7XG4gICAgICAgIHRoaXMuX2ZhaWxDb3VudCA9IDA7XG4gICAgICAgIHRoaXMuX2Rlc2NyICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9ldmlkZW5jZSAgPSBbXTtcbiAgICAgICAgdGhpcy5fd2hlcmUgICAgID0gW107XG4gICAgICAgIHRoaXMuX2NvbmROYW1lICA9IFtdO1xuICAgICAgICB0aGlzLl9pbmZvICAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fbmVzdGVkICAgID0gW107XG4gICAgICAgIHRoaXMuX3BlbmRpbmcgICA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5fb25Eb25lICAgID0gW107XG4gICAgICAgIHRoaXMuX2RvbmUgICAgICA9IGZhbHNlO1xuICAgICAgICAvLyBUT0RPIGFkZCBjYWxsZXIgaW5mbyBhYm91dCB0aGUgcmVwb3J0IGl0c2VsZlxuICAgIH1cblxuICAgIC8vIFNldHVwIG1ldGhvZHMgZm9sbG93LiBUaGV5IG11c3QgYmUgY2hhaW5hYmxlLCBpLmUuIHJldHVybiB0aGlzLlxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBFeGVjdXRlIGNvZGUgd2hlbiBjb250cmFjdCBleGVjdXRpb24gZmluaXNoZXMuXG4gICAgICogICBSZXBvcnQgb2JqZWN0IGNhbm5vdCBiZSBtb2RpZmllZCBhdCB0aGlzIHBvaW50LFxuICAgICAqICAgYW5kIG5vIGFkZGl0aW9uYWwgY2hlY2tzIG15IGJlIHByZXNlbnQuXG4gICAgICogICBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIGZpcnN0IGFyZ3VtZW50IGlzIHJlcG9ydCBpbiBxdWVzdGlvblxuICAgICAqICAgQHJldHVybnMge1JlcG9ydH0gdGhpcyAoY2hhaW5hYmxlKVxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIHJlcG9ydC5vbkRvbmUoIHIgPT4geyBpZiAoIXIuZ2V0UGFzcygpKSBjb25zb2xlLmxvZyhyLnRvU3RyaW5nKCkpIH0gKVxuICAgICAqL1xuICAgIG9uRG9uZSAoZm4pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignb25Eb25lKCk6IGNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIHRoaXMuX29uRG9uZS5wdXNoKGZuKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBFeGVjdXRlIGNvZGUgd2hlbiBjb250cmFjdCBleGVjdXRpb24gZmluaXNoZXMsIGlmIGl0IGZhaWxlZC5cbiAgICAgKiAgIFJlcG9ydCBvYmplY3QgY2Fubm90IGJlIG1vZGlmaWVkIGF0IHRoaXMgcG9pbnQsXG4gICAgICogICBhbmQgbm8gYWRkaXRpb25hbCBjaGVja3MgbXkgYmUgcHJlc2VudC5cbiAgICAgKiAgIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gZmlyc3QgYXJndW1lbnQgaXMgcmVwb3J0IGluIHF1ZXN0aW9uXG4gICAgICogICBAcmV0dXJucyB7UmVwb3J0fSB0aGlzIChjaGFpbmFibGUpXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgcmVwb3J0Lm9uRmFpbCggciA9PiBjb25zb2xlLmxvZyhyLnRvU3RyaW5nKCkpICk7XG4gICAgICovXG4gICAgb25GYWlsIChmbikge1xuICAgICAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbkRvbmUoKTogY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgIHRoaXMuX2xvY2soKTtcbiAgICAgICAgdGhpcy5fb25Eb25lLnB1c2gociA9PiByLmdldFBhc3MoKSB8fCBmbihyKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIFJ1bm5pbmcgdGhlIGNvbnRyYWN0XG4gICAgLyoqXG4gICAgICogICBAZGVzYyBhcHBseSBnaXZlbiBmdW5jdGlvbiB0byBhIFJlcG9ydCBvYmplY3QsIGxvY2sgcmVwb3J0IGFmdGVyd2FyZHMuXG4gICAgICogICBJZiBmdW5jdGlvbiBpcyBhc3luYyAoaS5lLiByZXR1cm5zIGEge0BsaW5rIFByb21pc2V9KSxcbiAgICAgKiAgIHRoZSByZXBvcnQgd2lsbCBvbmx5IGJlIGRvbmUoKSBhZnRlciB0aGUgcHJvbWlzZSByZXNvbHZlcy5cbiAgICAgKiAgIFRoaXMgaXMgZG9uZSBzbyB0byBlbnN1cmUgdGhhdCBhbGwgY2hlY2tzIHRoYXQgYXdhaXQgb24gYSB2YWx1ZVxuICAgICAqICAgYXJlIHJlc29sdmVkLlxuICAgICAqICAgQHBhcmFtIHtDb250cmFjdH0gY29udHJhY3QgVGhlIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAgICAgKiAgIEFkZGl0aW9uYWwgcGFyYW1ldGVycyBtYXkgYmUgX3ByZXBlbmRlZF8gdG8gY29udHJhY3RcbiAgICAgKiAgIGFuZCB3aWxsIGJlIHBhc3NlZCB0byBpdCBfYWZ0ZXJfIHRoZSBSZXBvcnQgb2JqZWN0IGluIHF1ZXN0aW9uLlxuICAgICAqICAgQHJldHVybnMge1JlcG9ydH0gdGhpcyAoY2hhaW5hYmxlKVxuICAgICAqICAgQGV4YW1wbGUgQmFzaWMgdXNhZ2VcbiAgICAgKiAgIGNvbnN0IHIgPSBuZXcgUmVwb3J0KCkucnVuKCBvayA9PiBvay5lcXVhbCggJ3dhcicsICdwZWFjZScsICcxOTg0JyApICk7XG4gICAgICogICByLmdldFBhc3MoKTsgLy8gZmFsc2VcbiAgICAgKiAgIHIuZ2V0RG9uZSgpOyAvLyB0cnVlXG4gICAgICogICByLnRvU3RyaW5nKCk7XG4gICAgICogICByKFxuICAgICAqICAgICAgITEuIDE5ODRcbiAgICAgKiAgICAgIC0gd2FyXG4gICAgICogICAgICArIHBlYWNlXG4gICAgICogICApXG4gICAgICpcbiAgICAgKiAgIEBleGFtcGxlIFBhc3NpbmcgYWRkaXRpb25hbCBhcmd1bWVudHMgdG8gY2FsbGJhY2suXG4gICAgICogICAvLyBUaGUgY29udHJhY3QgYm9keSBpcyB0aGUgbGFzdCBhcmd1bWVudC5cbiAgICAgKiAgIG5ldyBSZXBvcnQoKS5ydW4oIHsgdjogNC4yLCBjb2xvcnM6IFsgJ2JsdWUnIF0gfSwgKHIsIGFyZykgPT4ge1xuICAgICAqICAgICAgIHIudHlwZSggYXJnLCAnb2JqZWN0JyApO1xuICAgICAqICAgICAgIHIudHlwZSggYXJnLnYsICdudW1iZXInICk7XG4gICAgICogICAgICAgci5jbXBOdW0oIGFyZy52LCAnPj0nLCAzLjE0ICk7XG4gICAgICogICAgICAgci50eXBlKCBhcmcuY29sb3JzLCAnYXJyYXknICk7XG4gICAgICogICB9KTtcbiAgICAgKiAgIEBleGFtcGxlIEFzeW5jIGZ1bmN0aW9uXG4gICAgICogICBjb25zdCByID0gbmV3IFJlcG9ydCgpLnJ1bihcbiAgICAgKiAgICAgICBhc3luYyBvayA9PiBvay5lcXVhbCggYXdhaXQgNio5LCA0MiwgJ2ZhaWxzIGJ1dCBsYXRlcicgKSApO1xuICAgICAqICAgci5nZXRQYXNzKCk7IC8vIHRydWVcbiAgICAgKiAgIHIuZ2V0RG9uZSgpOyAvLyBmYWxzZVxuICAgICAqICAgLy8gLi4ud2FpdCBmb3IgZXZlbnQgbG9vcCB0byB0aWNrXG4gICAgICogICByLmdldFBhc3MoKTsgLy8gZmFsc2VcbiAgICAgKiAgIHIuZ2V0RG9uZSgpOyAvLyB0cnVlXG4gICAgICovXG4gICAgcnVuICguLi5hcmdzKSB7XG4gICAgICAgIC8vIFRPRE8gZWl0aGVyIGFzeW5jKCkgc2hvdWxkIHN1cHBvcnQgYWRkaXRpb25hbCBhcmdzLCBvciBydW4oKSBzaG91bGRuJ3RcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICBjb25zdCBibG9jayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhc3QgYXJndW1lbnQgb2YgcnVuKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLCBub3QgJyArIHR5cGVvZiBibG9jayk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGJsb2NrKHRoaXMsIC4uLmFyZ3MpO1xuICAgICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSlcbiAgICAgICAgICAgIHJlc3VsdC50aGVuKCAoKSA9PiB0aGlzLmRvbmUoKSApO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICB0aGlzLmRvbmUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBhcHBseSBnaXZlbiBmdW5jdGlvbiAoY29udHJhY3QpIHRvIGEgUmVwb3J0IG9iamVjdC5cbiAgICAgKiAgIE11bHRpcGxlIHN1Y2ggY29udHJhdHMgbWF5IGJlIGFwcGxpZWQsIGFuZCB0aGUgcmVwb3J0IGlzIG5vdCBsb2NrZWQuXG4gICAgICogICBBc3luYyBmdW5jdGlvbiBhcmUgcGVybWl0dGVkIGJ1dCBtYXkgbm90IGJlaGF2ZSBhcyBleHBlY3RlZC5cbiAgICAgKiAgIEBwYXJhbSB7Q29udHJhY3R9IGNvbnRyYWN0IFRoZSBmdW5jdGlvbiB0byBleGVjdXRlXG4gICAgICogICBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgbWF5IGJlIF9wcmVwZW5kZWRfIHRvIGNvbnRyYWN0XG4gICAgICogICBhbmQgd2lsbCBiZSBwYXNzZWQgdG8gaXQgX2FmdGVyXyB0aGUgUmVwb3J0IG9iamVjdCBpbiBxdWVzdGlvbi5cbiAgICAgKiAgIEByZXR1cm5zIHtSZXBvcnR9IHRoaXMgKGNoYWluYWJsZSlcbiAgICAgKiAgIEBleGFtcGxlIEJhc2ljIHVzYWdlXG4gICAgICogICBjb25zdCByID0gbmV3IFJlcG9ydCgpXG4gICAgICogICAgICAgLnJ1blN5bmMoIG9rID0+IG9rLmVxdWFsKCAnd2FyJywgJ3BlYWNlJywgJzE5ODQnICkgKVxuICAgICAqICAgICAgIC5ydW5TeW5jKCBvayA9PiBvay50eXBlICggW10sICdhcnJheScsICdzb21lIG1vcmUgY2hlY2tzJyApIClcbiAgICAgKiAgICAgICAuZG9uZSgpO1xuICAgICAqL1xuICAgIHJ1blN5bmMgKC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICBjb25zdCBibG9jayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhc3QgYXJndW1lbnQgb2YgcnVuKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLCBub3QgJyArIHR5cGVvZiBibG9jayk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGJsb2NrKCB0aGlzLCAuLi5hcmdzICk7IC8qIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW51c2VkLXZhcnMgKi9cbiAgICAgICAgLy8gVE9ETyBjaGVjayB0aGF0IGByZXN1bHRgIGlzIE5PVCBhIHByb21pc2VcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgc2V0UmVzdWx0IChldmlkZW5jZSwgZGVzY3IsIGNvbmROYW1lLCB3aGVyZSkge1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIGNvbnN0IG4gPSArK3RoaXMuX2NvdW50O1xuICAgICAgICBpZiAoZGVzY3IpXG4gICAgICAgICAgICB0aGlzLl9kZXNjcltuXSA9IGRlc2NyO1xuICAgICAgICAvLyBwYXNzIC0gcmV0dXJuIEFTQVBcbiAgICAgICAgaWYgKCFldmlkZW5jZSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBuZXN0ZWQgcmVwb3J0IG5lZWRzIHNwZWNpYWwgaGFuZGxpbmdcbiAgICAgICAgaWYgKGV2aWRlbmNlIGluc3RhbmNlb2YgUmVwb3J0KSB7XG4gICAgICAgICAgICB0aGlzLl9uZXN0ZWRbbl0gPSBldmlkZW5jZTtcbiAgICAgICAgICAgIGlmIChldmlkZW5jZS5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXZpZGVuY2UuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIHNob3J0LWNpcmN1aXQgaWYgcG9zc2libGVcbiAgICAgICAgICAgICAgICBldmlkZW5jZSA9IFtdOyAvLyBoYWNrIC0gZmFpbGluZyB3aXRob3V0IGV4cGxhbmF0aW9uXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5lc3RlZCBjb250cmFjdCBpcyBpbiBhc3luYyBtb2RlIC0gY29lcmNlIGludG8gYSBwcm9taXNlXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycnkgPSBldmlkZW5jZTsgLyogZXNsaW50LWRpc2FibGUtbGluZSAqL1xuICAgICAgICAgICAgICAgIGV2aWRlbmNlID0gbmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY3Vycnkub25Eb25lKCByZXNvbHZlICk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwZW5kaW5nIC0gd2UncmUgaW4gYXN5bmMgbW9kZVxuICAgICAgICBpZiAoZXZpZGVuY2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nLmFkZChuKTtcbiAgICAgICAgICAgIHdoZXJlID0gd2hlcmUgfHwgY2FsbGVySW5mbygyKTsgLy8gbXVzdCByZXBvcnQgYWN0dWFsIGNhbGxlciwgbm90IHRoZW5cbiAgICAgICAgICAgIGV2aWRlbmNlLnRoZW4oIHggPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmcuZGVsZXRlKG4pO1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldFJlc3VsdChuLCB4LCBjb25kTmFtZSwgd2hlcmUgKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuX29uRG9uZS5sZW5ndGg7IGktLSA+IDA7IClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uRG9uZVtpXSh0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLl9zZXRSZXN1bHQobiwgZXZpZGVuY2UsIGNvbmROYW1lLCB3aGVyZSB8fCBjYWxsZXJJbmZvKDIpKTtcbiAgICB9XG5cbiAgICBfc2V0UmVzdWx0IChuLCBldmlkZW5jZSwgY29uZE5hbWUsIHdoZXJlKSB7XG4gICAgICAgIGlmICghZXZpZGVuY2UpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgLy8gbGlzdGlmeSAmIHN0cmluZ2lmeSBldmlkZW5jZSwgc28gdGhhdCBpdCBkb2Vzbid0IGNoYW5nZSBwb3N0LWZhY3R1bVxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZXZpZGVuY2UpKVxuICAgICAgICAgICAgZXZpZGVuY2UgPSBbZXZpZGVuY2VdO1xuICAgICAgICB0aGlzLl9ldmlkZW5jZVtuXSA9IGV2aWRlbmNlLm1hcCggeCA9PiBfZXhwbGFpbih4LCBJbmZpbml0eSkgKTtcbiAgICAgICAgdGhpcy5fd2hlcmVbbl0gICAgPSB3aGVyZTtcbiAgICAgICAgdGhpcy5fY29uZE5hbWVbbl0gPSBjb25kTmFtZTtcbiAgICAgICAgdGhpcy5fZmFpbENvdW50Kys7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgQXBwZW5kIGFuIGluZm9ybWF0aW9uYWwgbWVzc2FnZSB0byB0aGUgcmVwb3J0LlxuICAgICAqIE5vbi1zdHJpbmcgdmFsdWVzIHdpbGwgYmUgc3RyaW5naWZpZWQgdmlhIGV4cGxhaW4oKS5cbiAgICAgKiBAcGFyYW0ge0FueX0gbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtSZXBvcnR9IGNoYWluYWJsZVxuICAgICAqL1xuICAgIGluZm8gKCAuLi5tZXNzYWdlICkge1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIGlmICghdGhpcy5faW5mb1t0aGlzLl9jb3VudF0pXG4gICAgICAgICAgICB0aGlzLl9pbmZvW3RoaXMuX2NvdW50XSA9IFtdO1xuICAgICAgICB0aGlzLl9pbmZvW3RoaXMuX2NvdW50XS5wdXNoKCBtZXNzYWdlLm1hcCggcyA9PiBfZXhwbGFpbihzKSApLmpvaW4oJyAnKSApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIExvY2tzIHRoZSByZXBvcnQgb2JqZWN0LCBzbyBubyBtb2RpZmljYXRpb25zIG1heSBiZSBtYWRlIGxhdGVyLlxuICAgICAqICAgQWxzbyBpZiBvbkRvbmUgY2FsbGJhY2socykgYXJlIHByZXNlbnQsIHRoZXkgYXJlIGV4ZWN1dGVkXG4gICAgICogICB1bmxlc3MgdGhlcmUgYXJlIHBlbmRpbmcgYXN5bmMgY2hlY2tzLlxuICAgICAqICAgQHJldHVybnMge1JlcG9ydH0gdGhpcyAoY2hhaW5hYmxlKVxuICAgICAqL1xuICAgIGRvbmUgKGNhbGxiYWNrKSB7XG4gICAgICAgIGlmIChjYWxsYmFjayAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgdGhpcy5vbkRvbmUoY2FsbGJhY2spO1xuXG4gICAgICAgIGlmICghdGhpcy5fZG9uZSkge1xuICAgICAgICAgICAgdGhpcy5fZG9uZSA9IHRydWU7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX3BlbmRpbmcuc2l6ZSkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSB0aGlzLl9vbkRvbmUubGVuZ3RoOyBpLS0gPiAwOyApXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX29uRG9uZVtpXSh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvLyBjaGVjayBpZiB0aGUgUmVwb3J0IG9iamVjdCBpcyBzdGlsbCBtb2RpZmlhYmxlLCB0aHJvd3Mgb3RoZXJ3aXNlLlxuICAgIF9sb2NrICgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RvbmUpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0F0dGVtcHQgdG8gbW9kaWZ5IGEgZmluaXNoZWQgY29udHJhY3QnKTtcbiAgICB9XG5cbiAgICAvLyBRdWVyeWluZyBtZXRob2RzXG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjICBUZWxscyB3aGV0aGVyIHRoZSByZXBvcnQgaXMgZmluaXNoZWQsXG4gICAgICogICAgICAgICAgaS5lLiBkb25lKCkgd2FzIGNhbGxlZCAmIG5vIHBlbmRpbmcgYXN5bmMgY2hlY2tzLlxuICAgICAqICAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0RG9uZSAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kb25lICYmICF0aGlzLl9wZW5kaW5nLnNpemU7IC8vIGlzIGl0IGV2ZW4gbmVlZGVkP1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgV2l0aG91dCBhcmd1bWVudCByZXR1cm5zIHdoZXRoZXIgdGhlIGNvbnRyYWN0IHdhcyBmdWxmaWxsZWQuXG4gICAgICogICBBcyBhIHNwZWNpYWwgY2FzZSwgaWYgbm8gY2hlY2tzIHdlcmUgcnVuIGFuZCB0aGUgY29udHJhY3QgaXMgZmluaXNoZWQsXG4gICAgICogICByZXR1cm5zIGZhbHNlLCBhcyBpbiBcInNvbWVvbmUgbXVzdCBoYXZlIGZvcmdvdHRlbiB0byBleGVjdXRlXG4gICAgICogICBwbGFubmVkIGNoZWNrcy4gVXNlIHBhc3MoKSBpZiBubyBjaGVja3MgYXJlIHBsYW5uZWQuXG4gICAgICpcbiAgICAgKiAgIElmIGEgcGFyYW1ldGVyIGlzIGdpdmVuLCByZXR1cm4gdGhlIHN0YXR1cyBvZiBuLXRoIGNoZWNrIGluc3RlYWQuXG4gICAgICogICBAcGFyYW0ge2ludGVnZXJ9IG5cbiAgICAgKiAgIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGdldFBhc3MgKG4pIHtcbiAgICAgICAgaWYgKG4gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9mYWlsQ291bnQgPT09IDA7XG4gICAgICAgIHJldHVybiAobiA+IDAgJiYgbiA8PSB0aGlzLl9jb3VudCkgPyAhdGhpcy5fZXZpZGVuY2Vbbl0gOiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBOdW1iZXIgb2YgY2hlY2tzIHBlcmZvcm1lZC5cbiAgICAgKiAgIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0Q291bnQgKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY291bnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIFdoZXRoZXIgdGhlIGxhc3QgY2hlY2sgd2FzIGEgc3VjY2Vzcy5cbiAgICAgKiAgVGhpcyBpcyBqdXN0IGEgc2hvcnRjdXQgZm9yIGZvby5nZXREZXRhaWxzKGZvby5nZXRDb3VudCkucGFzc1xuICAgICAqICBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBsYXN0ICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50ID8gIXRoaXMuX2V2aWRlbmNlW3RoaXMuX2NvdW50XSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgZmFpbGluZy5cbiAgICAgKiAgIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0RmFpbENvdW50ICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZhaWxDb3VudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIFJldHVybiBhIHN0cmluZyBvZiBmYWlsaW5nL3Bhc3NpbmcgY2hlY2tzLlxuICAgICAqICAgVGhpcyBtYXkgYmUgdXNlZnVsIGZvciB2YWxpZGF0aW5nIGN1c3RvbSBjb25kaXRpb25zLlxuICAgICAqICAgQ29uc2VjdXRpdmUgcGFzc2luZyBjaGVja2EgYXJlIHJlcHJlc2VudGVkIGJ5IG51bWJlcnMuXG4gICAgICogICBBIGNhcGl0YWwgbGV0dGVyIGluIHRoZSBzdHJpbmcgcmVwcmVzZW50cyBmYWlsdXJlLlxuICAgICAqICAgU2VlIGFsc28ge0BsaW5rIFJlcG9ydCN0b1N0cmluZyB0b1N0cmluZygpfVxuICAgICAqICAgQHJldHVybnMge3N0cmluZ31cbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBwYXNzaW5nIGNoZWNrc1xuICAgICAqICAgXCJyKDEwKVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgY2hlY2tzIHdpdGggMSBmYWlsdXJlIGluIHRoZSBtaWRkbGVcbiAgICAgKiAgIFwicig1LE4sNClcIlxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIGNoZWNrcyBpbmNsdWRpbmcgYSBuZXN0ZWQgY29udHJhY3RcbiAgICAgKiAgIFwicigzLHIoMSxOKSw2KVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gbm8gY2hlY2tzIHdlcmUgcnVuIC0gYXV0by1mYWlsXG4gICAgICogICBcInIoWilcIlxuICAgICAqL1xuICAgIGdldEdob3N0ICgpIHtcbiAgICAgICAgY29uc3QgZ2hvc3QgPSBbXTtcbiAgICAgICAgbGV0IHN0cmVhayAgPSAwO1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8PSB0aGlzLl9jb3VudDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fZXZpZGVuY2VbaV0gfHwgdGhpcy5fbmVzdGVkW2ldKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmVhaykgZ2hvc3QucHVzaChzdHJlYWspO1xuICAgICAgICAgICAgICAgIHN0cmVhayA9IDA7XG4gICAgICAgICAgICAgICAgZ2hvc3QucHVzaCggdGhpcy5fbmVzdGVkW2ldID8gdGhpcy5fbmVzdGVkW2ldLmdldEdob3N0KCkgOiAnTicpO1xuICAgICAgICAgICAgfSBlbHNlIHsgLyogZXNsaW50LWRlc2FibGUtbGluZSBjdXJseSAqL1xuICAgICAgICAgICAgICAgIHN0cmVhaysrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdHJlYWspIGdob3N0LnB1c2goc3RyZWFrKTtcbiAgICAgICAgcmV0dXJuICdyKCcgKyBnaG9zdC5qb2luKCcsJykgKyAnKSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIFJldHVybnMgc2VyaWFsaXplZCBkaWZmLWxpa2UgcmVwb3J0IHdpdGggbmVzdGluZyBhbmQgaW5kZW50YXRpb24uXG4gICAgICogIFBhc3NpbmcgY29uZGl0aW9ucyBhcmUgbWVya2VkIHdpdGggbnVtYmVycywgZmFpbGluZyBhcmUgcHJlZml4ZWRcbiAgICAgKiAgd2l0aCBhIGJhbmcgKCEpLlxuICAgICAqXG4gICAgICogIFNlZSBhbHNvIHtAbGluayBSZXBvcnQjZ2V0R2hvc3QgZ2V0R2hvc3QoKX1cbiAgICAgKiAgQHJldHVybnMge3N0cmluZ31cbiAgICAgKiAgQGV4YW1wbGUgLy8gbm8gY2hlY2tzIHJ1blxuICAgICAqICBjb25zdCByID0gbmV3IFJlcG9ydCgpO1xuICAgICAqICByLnRvU3RyaW5nKCk7XG4gICAgICogIHIoXG4gICAgICogIClcbiAgICAgKiAgQGV4YW1wbGUgLy8gcGFzc1xuICAgICAqICBjb25zdCByID0gbmV3IFJlcG9ydCgpO1xuICAgICAqICByLnBhc3MoJ2ZvbyBiYXJlZCcpO1xuICAgICAqICByLnRvU3RyaW5nKCk7XG4gICAgICogIHIoXG4gICAgICogICAgICAxLiBmb28gYmFyZWRcbiAgICAgKiAgKVxuICAgICAqICBAZXhhbXBsZSAvLyBmYWlsXG4gICAgICogIGNvbnN0IHIgPSBuZXcgUmVwb3J0KCk7XG4gICAgICogIHIuZXF1YWwoJ3dhcicsICdwZWFjZScpO1xuICAgICAqICByLnRvU3RyaW5nKCk7XG4gICAgICogIHIoXG4gICAgICogICAgICAhMS5cbiAgICAgKiAgICAgIF4gQ29uZGl0aW9uIGVxdWFsIGZhaWxlZCBhdCA8ZmlsZT46PGxpbmU+OjxjaGFyPlxuICAgICAqICAgICAgLSB3YXJcbiAgICAgKiAgICAgICsgcGVhY2VcbiAgICAgKiAgKVxuICAgICAqL1xuICAgIHRvU3RyaW5nICgpIHtcbiAgICAgICAgLy8gVE9ETyByZXBsYWNlIHdpdGggcmVmdXRlLmlvIHdoZW4gd2UgYnV5IHRoZSBkb21haW5cbiAgICAgICAgcmV0dXJuICdyZWZ1dGUvJyArIHByb3RvY29sICsgJ1xcbicgKyB0aGlzLmdldExpbmVzKCkuam9pbignXFxuJyk7XG4gICAgfVxuXG4gICAgZ2V0TGluZXMgKGluZGVudCA9ICcnKSB7XG4gICAgICAgIGNvbnN0IG91dCAgPSBbaW5kZW50ICsgJ3IoJ107XG4gICAgICAgIGNvbnN0IGxhc3QgPSBpbmRlbnQgKyAnKSc7XG4gICAgICAgIGluZGVudCAgICAgPSBpbmRlbnQgKyAnICAgICc7XG5cbiAgICAgICAgY29uc3QgcGFkID0gcHJlZml4ID0+IHMgPT4gaW5kZW50ICsgcHJlZml4ICsgJyAnICsgcztcblxuICAgICAgICBpZiAodGhpcy5faW5mb1swXSlcbiAgICAgICAgICAgIG91dC5wdXNoKCAuLi50aGlzLl9pbmZvWzBdLm1hcCggcGFkKCc7JykgKSApO1xuICAgICAgICBmb3IgKGxldCBuID0gMTsgbiA8PSB0aGlzLl9jb3VudDsgbisrKSB7XG4gICAgICAgICAgICBvdXQucHVzaCggLi4udGhpcy5nZXRMaW5lc1BhcnRpYWwoIG4sIGluZGVudCApICk7XG4gICAgICAgICAgICBpZiAodGhpcy5faW5mb1tuXSlcbiAgICAgICAgICAgICAgICBvdXQucHVzaCggLi4udGhpcy5faW5mb1tuXS5tYXAoIHBhZCgnOycpICkgKTtcbiAgICAgICAgfVxuICAgICAgICBvdXQucHVzaChsYXN0KTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG5cbiAgICBnZXRMaW5lc1BhcnRpYWwgKG4sIGluZGVudCA9ICcnKSB7XG4gICAgICAgIGNvbnN0IG91dCA9IFtdO1xuICAgICAgICBvdXQucHVzaChcbiAgICAgICAgICAgIGluZGVudFxuICAgICAgICAgICAgKyAodGhpcy5fcGVuZGluZy5oYXMobikgPyAnLi4uJyA6ICh0aGlzLl9ldmlkZW5jZVtuXSA/ICchJyA6ICcnKSApXG4gICAgICAgICAgICArIG4gKyAodGhpcy5fZGVzY3Jbbl0gPyAnLiAnICsgdGhpcy5fZGVzY3Jbbl0gOiAnLicpXG4gICAgICAgICk7XG4gICAgICAgIGlmICh0aGlzLl9uZXN0ZWRbbl0pIHsgLyogZXNsaW50LWRpc2FibGUtbGluZSBjdXJseSAqL1xuICAgICAgICAgICAgb3V0LnB1c2goIC4uLnRoaXMuX25lc3RlZFtuXS5nZXRMaW5lcyhpbmRlbnQpICk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5fZXZpZGVuY2Vbbl0pIHtcbiAgICAgICAgICAgIG91dC5wdXNoKCBpbmRlbnQgKyAnICAgIF4gQ29uZGl0aW9uIGAnICsgKHRoaXMuX2NvbmROYW1lW25dIHx8ICdjaGVjaycpXG4gICAgICAgICAgICAgICAgKyAnYCBmYWlsZWQgYXQgJyArIHRoaXMuX3doZXJlW25dICk7XG4gICAgICAgICAgICB0aGlzLl9ldmlkZW5jZVtuXS5mb3JFYWNoKCByYXcgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBtdWx0aWxpbmUgZXZpZGVuY2VcbiAgICAgICAgICAgICAgICAvLyBUT0RPIHRoaXMgaXMgcGVybCB3cml0dGVuIGluIEpTLCByZXdyaXRlIG1vcmUgY2xlYXJseVxuICAgICAgICAgICAgICAgIGxldCBbXywgcHJlZml4LCBzXSA9IHJhdy5tYXRjaCggL14oWy0rfF0gKT8oLio/KVxcbj8kL3MgKTtcbiAgICAgICAgICAgICAgICBpZiAoIXByZWZpeCkgcHJlZml4ID0gJ3wgJztcbiAgICAgICAgICAgICAgICBpZiAoIXMubWF0Y2goL1xcbi8pKSB7IC8qIGVzbGluZS1kaXNhYmxlLWxpbmUgY3VybHkgKi9cbiAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goIGluZGVudCArICcgICAgJyArIHByZWZpeCArIHMgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzLnNwbGl0KCdcXG4nKS5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFydCA9PiBvdXQucHVzaCggaW5kZW50ICsgJyAgICAnICsgcHJlZml4ICsgcGFydCApKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyByZXR1cm5zIGEgcGxhaW4gc2VyaWFsaXphYmxlIG9iamVjdFxuICAgICAqICBAcmV0dXJucyB7T2JqZWN0fVxuICAgICAqL1xuICAgIHRvSlNPTiAoKSB7XG4gICAgICAgIGNvbnN0IG4gPSB0aGlzLmdldENvdW50KCk7XG4gICAgICAgIGNvbnN0IGRldGFpbHMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gbjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBub2RlID0gdGhpcy5nZXREZXRhaWxzKGkpO1xuICAgICAgICAgICAgLy8gc3RyaXAgZXh0cmEga2V5c1xuICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgaW4gbm9kZSkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlW2tleV0gPT09IHVuZGVmaW5lZCB8fCAoQXJyYXkuaXNBcnJheShub2RlW2tleV0pICYmIG5vZGVba2V5XS5sZW5ndGggPT09IDApKVxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbm9kZVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGV0YWlscy5wdXNoKG5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwYXNzOiAgdGhpcy5nZXRQYXNzKCksXG4gICAgICAgICAgICBjb3VudDogdGhpcy5nZXRDb3VudCgpLFxuICAgICAgICAgICAgZGV0YWlscyxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIFJldHVybnMgZGV0YWlsZWQgcmVwb3J0IG9uIGEgc3BlY2lmaWMgY2hlY2tcbiAgICAgKiAgIEBwYXJhbSB7aW50ZWdlcn0gbiAtIGNoZWNrIG51bWJlciwgbXVzdCBiZSA8PSBnZXRDb3VudCgpXG4gICAgICogICBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldERldGFpbHMgKG4pIHtcbiAgICAgICAgLy8gVE9ETyB2YWxpZGF0ZSBuXG5cbiAgICAgICAgLy8gdWdseSBidXQgd2hhdCBjYW4gSSBkb1xuICAgICAgICBpZiAobiA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuOiAgICAwLFxuICAgICAgICAgICAgICAgIGluZm86IHRoaXMuX2luZm9bMF0gfHwgW10sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGV2aWRlbmNlID0gdGhpcy5fZXZpZGVuY2Vbbl07XG4gICAgICAgIGlmIChldmlkZW5jZSAmJiAhQXJyYXkuaXNBcnJheShldmlkZW5jZSkpXG4gICAgICAgICAgICBldmlkZW5jZSA9IFtldmlkZW5jZV07XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG46ICAgICAgICBuLFxuICAgICAgICAgICAgbmFtZTogICAgIHRoaXMuX2Rlc2NyW25dIHx8ICcnLFxuICAgICAgICAgICAgcGFzczogICAgICFldmlkZW5jZSxcbiAgICAgICAgICAgIGV2aWRlbmNlOiBldmlkZW5jZSB8fCBbXSxcbiAgICAgICAgICAgIHdoZXJlOiAgICB0aGlzLl93aGVyZVtuXSxcbiAgICAgICAgICAgIGNvbmQ6ICAgICB0aGlzLl9jb25kTmFtZVtuXSxcbiAgICAgICAgICAgIGluZm86ICAgICB0aGlzLl9pbmZvW25dIHx8IFtdLFxuICAgICAgICAgICAgbmVzdGVkOiAgIHRoaXMuX25lc3RlZFtuXSxcbiAgICAgICAgICAgIHBlbmRpbmc6ICB0aGlzLl9wZW5kaW5nLmhhcyhuKSxcbiAgICAgICAgfTtcbiAgICB9XG59XG5cbi8vIHRoaXMgaXMgZm9yIHN0dWZmIGxpa2UgYG9iamVjdCBmb28gPSB7XCJmb29cIjo0Mn1gXG4vLyB3ZSBkb24ndCB3YW50IHRoZSBleHBsYW5hdGlvbiB0byBiZSBxdW90ZWQhXG5mdW5jdGlvbiBfZXhwbGFpbiAoIGl0ZW0sIGRlcHRoICkge1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycgKVxuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICByZXR1cm4gZXhwbGFpbiggaXRlbSwgeyBkZXB0aCB9ICk7XG59XG5cblJlcG9ydC5wcm90b3R5cGUuZXhwbGFpbiA9IGV4cGxhaW47IC8vIGFsc28gbWFrZSBhdmFpbGFibGUgdmlhIHJlcG9ydFxuUmVwb3J0LnByb3RvY29sID0gcHJvdG9jb2w7XG5cbi8vIHBhcnQgb2YgYWRkQ29uZGl0aW9uXG5jb25zdCBrbm93bkNoZWNrcyA9IG5ldyBTZXQoKTtcblxuLyogTk9URSBQbGVhc2Uga2VlcCBhbGwgYWRkQ29uZGl0aW9uIGludm9jYXRpb25zIHNlYXJjaGFibGUgdmlhICovXG4vKiBncmVwIC1yIFwiXiAqYWRkQ29uZGl0aW9uLionXCIgL1xuLyoqXG4gKiAgQG1lbWJlck9mIHJlZnV0ZVxuICogIEBzdGF0aWNcbiAqICBAZGVzYyBDcmVhdGUgbmV3IGNoZWNrIG1ldGhvZCBhdmFpbGFibGUgdmlhIGFsbCBSZXBvcnQgaW5zdGFuY2VzXG4gKiAgQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSBvZiB0aGUgbmV3IGNvbmRpdGlvbi5cbiAqICBNdXN0IG5vdCBiZSBwcmVzZW50IGluIFJlcG9ydCBhbHJlYWR5LCBhbmQgc2hvdWxkIE5PVCBzdGFydCB3aXRoXG4gKiAgZ2V0Li4uLCBzZXQuLi4sIG9yIGFkZC4uLiAodGhlc2UgYXJlIHJlc2VydmVkIGZvciBSZXBvcnQgaXRzZWxmKVxuICogIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIENvbmZpZ3VyaW5nIHRoZSBjaGVjaydzIGhhbmRsaW5nIG9mIGFyZ3VtZW50c1xuICogIEBwYXJhbSB7aW50ZWdlcn0gb3B0aW9ucy5hcmdzIFRoZSByZXF1aXJlZCBudW1iZXIgb2YgYXJndW1lbnRzXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBbb3B0aW9ucy5taW5BcmdzXSBNaW5pbXVtIG51bWJlciBvZiBhcmd1bWVudCAoZGVmYXVsdHMgdG8gYXJncylcbiAqICBAcGFyYW0ge2ludGVnZXJ9IFtvcHRpb25zLm1heEFyZ3NdIE1heGltdW0gbnVtYmVyIG9mIGFyZ3VtZW50IChkZWZhdWx0cyB0byBhcmdzKVxuICogIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuaGFzT3B0aW9uc10gSWYgdHJ1ZSwgYW4gb3B0aW9uYWwgb2JqZWN0XG5jYW4gYmUgc3VwcGxpZWQgYXMgbGFzdCBhcmd1bWVudC4gSXQgd29uJ3QgaW50ZXJmZXJlIHdpdGggZGVzY3JpcHRpb24uXG4gKiAgQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5mdW5dIFRoZSBsYXN0IGFyZ3VtZW50IGlzIGEgY2FsbGJhY2tcbiAqICBAcGFyYW0ge0Z1bmN0aW9ufSBpbXBsZW1lbnRhdGlvbiAtIGEgY2FsbGJhY2sgdGhhdCB0YWtlcyB7YXJnc30gYXJndW1lbnRzXG4gKiAgYW5kIHJldHVybnMgYSBmYWxzZXkgdmFsdWUgaWYgY29uZGl0aW9uIHBhc3Nlc1xuICogIChcIm5vdGhpbmcgdG8gc2VlIGhlcmUsIG1vdmUgYWxvbmdcIiksXG4gKiAgb3IgZXZpZGVuY2UgaWYgaXQgZmFpbHNcbiAqICAoZS5nLiB0eXBpY2FsbHkgYSBnb3QvZXhwZWN0ZWQgZGlmZikuXG4gKi9cbmZ1bmN0aW9uIGFkZENvbmRpdGlvbiAobmFtZSwgb3B0aW9ucywgaW1wbCkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uIG5hbWUgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eKF98Z2V0W19BLVpdfHNldFtfQS1aXSkvKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gbmFtZSBtdXN0IG5vdCBzdGFydCB3aXRoIGdldF8sIHNldF8sIG9yIF8nKTtcbiAgICAvLyBUT0RPIG11c3QgZG8gc29tZXRoaW5nIGFib3V0IG5hbWUgY2xhc2hlcywgYnV0IGxhdGVyXG4gICAgLy8gYmVjYXVzZSBldmFsIGluIGJyb3dzZXIgbWF5IChraW5kIG9mIGxlZ2ltaXRlbHkpIG92ZXJyaWRlIGNvbmRpdGlvbnNcbiAgICBpZiAoIWtub3duQ2hlY2tzLmhhcyhuYW1lKSAmJiBSZXBvcnQucHJvdG90eXBlW25hbWVdKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBhbHJlYWR5IGV4aXN0cyBpbiBSZXBvcnQ6ICcgKyBuYW1lKTtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBvcHRpb25zJyk7XG4gICAgaWYgKHR5cGVvZiBpbXBsICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBpbXBsZW1lbnRhdGlvbicpO1xuXG4gICAgY29uc3QgbWluQXJncyAgICA9IG9wdGlvbnMubWluQXJncyB8fCBvcHRpb25zLmFyZ3M7XG4gICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFyZ3MpIHx8IG1pbkFyZ3MgPCAwKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FyZ3MvbWluQXJncyBtdXN0IGJlIG5vbm5lZ2F0aXZlIGludGVnZXInKTtcbiAgICBjb25zdCBtYXhBcmdzICAgID0gb3B0aW9ucy5tYXhBcmdzIHx8IG9wdGlvbnMuYXJncyB8fCBJbmZpbml0eTtcbiAgICBpZiAobWF4QXJncyAhPT0gSW5maW5pdHkgJiYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFyZ3MpIHx8IG1heEFyZ3MgPCBtaW5BcmdzKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdtYXhBcmdzIG11c3QgYmUgaW50ZWdlciBhbmQgZ3JlYXRlciB0aGFuIG1pbkFyZ3MsIG9yIEluZmluaXR5Jyk7XG4gICAgY29uc3QgZGVzY3JGaXJzdCAgICA9IG9wdGlvbnMuZGVzY3JGaXJzdCB8fCBvcHRpb25zLmZ1biB8fCBtYXhBcmdzID4gMTA7XG4gICAgY29uc3QgaGFzT3B0aW9ucyAgICA9ICEhb3B0aW9ucy5oYXNPcHRpb25zO1xuICAgIGNvbnN0IG1heEFyZ3NSZWFsICAgPSBtYXhBcmdzICsgKGhhc09wdGlvbnMgPyAxIDogMCk7XG5cbiAgICAvLyBUT0RPIGFsZXJ0IHVua25vd24gb3B0aW9uc1xuXG4gICAgLy8gVE9ETyB0aGlzIGNvZGUgaXMgY2x1dHRlcmVkLCByZXdyaXRlXG4gICAgY29uc3QgY29kZSA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICAgIC8vIFRPRE8gY29uc3QgbkFyZ3MgPSBhcmdzLmxlbmd0aFxuICAgICAgICBjb25zdCBkZXNjciA9IGRlc2NyRmlyc3RcbiAgICAgICAgICAgID8gYXJncy5zaGlmdCgpXG4gICAgICAgICAgICA6ICggKGFyZ3MubGVuZ3RoID4gbWF4QXJncyAmJiB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSAnc3RyaW5nJykgPyBhcmdzLnBvcCgpIDogdW5kZWZpbmVkKTtcbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gbWF4QXJnc1JlYWwgfHwgYXJncy5sZW5ndGggPCBtaW5BcmdzKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gJyArIG5hbWUgKyAnIG11c3QgaGF2ZSAnICsgbWluQXJncyArICcuLicgKyBtYXhBcmdzUmVhbCArICcgYXJndW1lbnRzICcpOyAvLyBUT0RPXG5cbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0UmVzdWx0KCBpbXBsKC4uLmFyZ3MpLCBkZXNjciwgbmFtZSApO1xuICAgIH07XG5cbiAgICBrbm93bkNoZWNrcy5hZGQobmFtZSk7XG4gICAgUmVwb3J0LnByb3RvdHlwZVtuYW1lXSA9IGNvZGU7XG59XG5cbi8vIFRoZSBtb3N0IGJhc2ljIGNvbmRpdGlvbnMgYXJlIGRlZmluZWQgcmlnaHQgaGVyZVxuLy8gaW4gb3JkZXIgdG8gYmUgc3VyZSB3ZSBjYW4gdmFsaWRhdGUgdGhlIFJlcG9ydCBjbGFzcyBpdHNlbGYuXG5cbi8qKlxuICogIEBuYW1lc3BhY2UgY29uZGl0aW9uc1xuICogIEBkZXNjIENvbmRpdGlvbiBjaGVjayBsaWJyYXJ5LiBUaGVzZSBtZXRob2RzIG11c3QgYmUgcnVuIG9uIGFcbiAqICB7QGxpbmsgUmVwb3J0fSBvYmplY3QuXG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBjaGVja1xuICogICBAZGVzYyBBIGdlbmVyaWMgY2hlY2sgb2YgYSBjb25kaXRpb24uXG4gKiAgIEBwYXJhbSBldmlkZW5jZSBJZiBmYWxzZSwgMCwgJycsIG9yIHVuZGVmaW5lZCwgdGhlIGNoZWNrIGlzIGFzc3VtZWQgdG8gcGFzcy5cbiAqICAgT3RoZXJ3aXNlIGl0IGZhaWxzLCBhbmQgdGhpcyBhcmd1bWVudCB3aWxsIGJlIGRpc3BsYXllZCBhcyB0aGUgcmVhc29uIHdoeS5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl0gVGhlIHJlYXNvbiB3aHkgd2UgY2FyZSBhYm91dCB0aGUgY2hlY2suXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBwYXNzXG4gKiAgIEBkZXNjIEFsd2F5cyBwYXNzZXMuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBmYWlsXG4gKiAgIEBkZXNjIEFsd2F5cyBmYWlscyB3aXRoIGEgXCJmYWlsZWQgZGVsaWJlcmF0ZWx5XCIgbWVzc2FnZS5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGVxdWFsXG4gKiAgIEBkZXNjIENoZWNrcyBpZiA9PT0gaG9sZHMgYmV0d2VlbiB0d28gdmFsdWVzLlxuICogICBJZiBub3QsIGJvdGggd2lsbCBiZSBzdHJpbmdpZmllZCBhbmQgZGlzcGxheWVkIGFzIGEgZGlmZi5cbiAqICAgU2VlIGRlZXBFcXVhbCB0byBjaGVjayBuZXN0ZWQgZGF0YSBzdHJ1Y3R1cmVzIG90IG9iamVjdHMuXG4gKiAgIEBwYXJhbSB7YW55fSBhY3R1YWxcbiAqICAgQHBhcmFtIHthbnl9IGV4cGVjdGVkXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBtYXRjaFxuICogICBAZGVzYyBDaGVja3MgaWYgYSBzdHJpbmcgbWF0Y2hlcyBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbiAqICAgQHBhcmFtIHtzdHJ1bmd9IGFjdHVhbFxuICogICBAcGFyYW0ge1JlZ0V4cH0gZXhwZWN0ZWRcbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIG5lc3RlZFxuICogICBAZGVzYyBWZXJpZnkgYSBuZXN0ZWQgY29udHJhY3QuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBkZXNjcmlwdGlvblxuICogICBAcGFyYW0ge0NvbnRyYWN0fSBjb250cmFjdFxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5cbmFkZENvbmRpdGlvbiggJ2NoZWNrJyxcbiAgICB7IGFyZ3M6IDEgfSxcbiAgICB4ID0+IHhcbik7XG5hZGRDb25kaXRpb24oICdwYXNzJyxcbiAgICB7IGFyZ3M6IDAgfSxcbiAgICAoKSA9PiAwXG4pO1xuYWRkQ29uZGl0aW9uKCAnZmFpbCcsXG4gICAgeyBhcmdzOiAwIH0sXG4gICAgKCkgPT4gJ2ZhaWxlZCBkZWxpYmVyYXRlbHknXG4pO1xuYWRkQ29uZGl0aW9uKCAnZXF1YWwnLFxuICAgIHsgYXJnczogMiB9LFxuICAgIChhLCBiKSA9PiBhID09PSBiID8gMCA6IFsnLSAnICsgZXhwbGFpbihhKSwgJysgJyArIGV4cGxhaW4oYildXG4pO1xuYWRkQ29uZGl0aW9uKCAnbWF0Y2gnLFxuICAgIHsgYXJnczogMiB9LFxuICAgIC8vIFRPRE8gZnVuY3Rpb24oc3RyLCByZXgpXG4gICAgKGEsIHJleCkgPT4gKGEgPT09IHVuZGVmaW5lZCB8fCBhID09PSBudWxsKVxuICAgICAgICA/IFsnJyArIGEsICdEb2VzIG5vdCBtYXRjaCA6ICcgKyByZXhdXG4gICAgICAgIDogKCcnICsgYSkubWF0Y2gocmV4KVxuICAgICAgICAgICAgPyAwXG4gICAgICAgICAgICA6IFtcbiAgICAgICAgICAgICAgICAnU3RyaW5nICAgICAgICAgOiAnICsgYSxcbiAgICAgICAgICAgICAgICAnRG9lcyBub3QgbWF0Y2ggOiAnICsgcmV4LFxuICAgICAgICAgICAgXVxuKTtcbmFkZENvbmRpdGlvbiggJ25lc3RlZCcsXG4gICAgeyBmdW46IDEsIG1pbkFyZ3M6IDEgfSxcbiAgICAoLi4uYXJncykgPT4gbmV3IFJlcG9ydCgpLnJ1biguLi5hcmdzKS5kb25lKClcbik7XG5cbm1vZHVsZS5leHBvcnRzID0geyBSZXBvcnQsIGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqICAgQG5hbWVzcGFjZSB1dGlsaXRpZXNcbiAqICAgQGRlc2MgIFRoZXNlIGZ1bmN0aW9ucyBoYXZlIG5vdGhpbmcgdG8gZG8gd2l0aCByZWZ1dGFibGVcbiAqICAgICAgICAgIGFuZCBzaG91bGQgaWRlYWxseSBiZSBpbiBzZXBhcmF0ZSBtb2R1bGVzLlxuICovXG5cbi8qIERldGVybWluZSBuLXRoIGNhbGxlciB1cCB0aGUgc3RhY2sgKi9cbi8qIEluc3BpcmVkIGJ5IFBlcmwncyBDYXJwIG1vZHVsZSAqL1xuY29uc3QgaW5TdGFjayA9IC8oW146XFxzKCldKzpcXGQrKD86OlxcZCspPylcXFcqKFxcbnwkKS9nO1xuXG4vKipcbiAqICBAcHVibGljXG4gKiAgQG1lbWJlck9mIHV0aWxpdGllc1xuICogIEBmdW5jdGlvblxuICogIEBkZXNjIFJldHVybnMgc291cmNlIHBvc2l0aW9uIG4gZnJhbWVzIHVwIHRoZSBzdGFja1xuICogIEBleGFtcGxlXG4gKiAgXCIvZm9vL2Jhci5qczoyNToxMVwiXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBkZXB0aCBIb3cgbWFueSBmcmFtZXMgdG8gc2tpcFxuICogIEByZXR1cm5zIHtzdHJpbmd9IHNvdXJjZSBmaWxlLCBsaW5lLCBhbmQgY29sdW1uLCBzZXBhcmF0ZWQgYnkgY29sb24uXG4gKi9cbmZ1bmN0aW9uIGNhbGxlckluZm8gKG4pIHtcbiAgICAvKiBhIHRlcnJpYmxlIHJleCB0aGF0IGJhc2ljYWxseSBzZWFyY2hlcyBmb3IgZmlsZS5qczpubm46bm5uIHNldmVyYWwgdGltZXMgKi9cbiAgICByZXR1cm4gKG5ldyBFcnJvcigpLnN0YWNrLm1hdGNoKGluU3RhY2spW24gKyAxXS5yZXBsYWNlKC9cXFcqXFxuJC8sICcnKSB8fCAnJylcbn1cblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBpbnN0YW5jZVxuICogIEBtZW1iZXJPZiBSZXBvcnRcbiAqICBAZGVzYyBTdHJpbmdpZnkgb2JqZWN0cyByZWN1cnNpdmVseSB3aXRoIGxpbWl0ZWQgZGVwdGhcbiAqICBhbmQgY2lyY3VsYXIgcmVmZXJlbmNlIHRyYWNraW5nLlxuICogIEdlbmVyYWxseSBKU09OLnN0cmluZ2lmeSBpcyB1c2VkIGFzIHJlZmVyZW5jZTpcbiAqICBzdHJpbmdzIGFyZSBlc2NhcGVkIGFuZCBkb3VibGUtcXVvdGVkOyBudW1iZXJzLCBib29sZWFuLCBhbmQgbnVsbHMgYXJlXG4gKiAgc3RyaW5naWZpZWQgXCJhcyBpc1wiOyBvYmplY3RzIGFuZCBhcnJheXMgYXJlIGRlc2NlbmRlZCBpbnRvLlxuICogIFRoZSBkaWZmZXJlbmNlcyBmb2xsb3c6XG4gKiAgdW5kZWZpbmVkIGlzIHJlcG9ydGVkIGFzICc8dW5kZWY+Jy5cbiAqICBPYmplY3RzIHRoYXQgaGF2ZSBjb25zdHJ1Y3RvcnMgYXJlIHByZWZpeGVkIHdpdGggY2xhc3MgbmFtZXMuXG4gKiAgT2JqZWN0IGFuZCBhcnJheSBjb250ZW50IGlzIGFiYnJldmlhdGVkIGFzIFwiLi4uXCIgYW5kIFwiQ2lyY3VsYXJcIlxuICogIGluIGNhc2Ugb2YgZGVwdGggZXhoYXVzdGlvbiBhbmQgY2lyY3VsYXIgcmVmZXJlbmNlLCByZXNwZWN0aXZlbHkuXG4gKiAgRnVuY3Rpb25zIGFyZSBuYWl2ZWx5IHN0cmluZ2lmaWVkLlxuICogIEBwYXJhbSB7QW55fSB0YXJnZXQgVGhpbmd5IHRvIHNlcmlhbGl6ZS5cbiAqICBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xuICogIEBwYXJhbSB7aW50ZWdlcn0gb3B0aW9ucy5kZXB0aCBIb3cgbWFueSBsZXZlbHMgdG8gZGVzY2VuZC4gRGVmYXVsdCA9IDMuXG4gKiAgQHBhcmFtIHtzdHJpbmd9ICBvcHRpb25zLnBhdGggQ2lyY3VsYXIgcmVmZXJlbmNlIHBhdGggcHJlZml4LiBEZWZhdWx0ID0gJyQnLlxuICogIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGV4cGxhaW4gKCBpdGVtLCBvcHRpb25zID0ge30gKSB7XG4gICAgcmV0dXJuIF9leHBsYWluKCBpdGVtLCBvcHRpb25zLmRlcHRoIHx8IDMsIG9wdGlvbnMucGF0aCB8fCAnJCcgKTtcbn1cblxuZnVuY3Rpb24gX2V4cGxhaW4gKGl0ZW0sIGRlcHRoLCBwYXRoLCBzZWVuID0gbmV3IE1hcCgpKSB7XG4gICAgLy8gc2ltcGxlIHR5cGVzXG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJylcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGl0ZW0pOyAvLyBkb24ndCB3YW50IHRvIHNwZW5kIHRpbWUgcW91dGluZ1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ251bWJlcicgfHwgdHlwZW9mIGl0ZW0gPT09ICdib29sZWFuJyB8fCBpdGVtID09PSBudWxsKVxuICAgICAgICByZXR1cm4gJycgKyBpdGVtO1xuICAgIGlmIChpdGVtID09PSB1bmRlZmluZWQpIHJldHVybiAnPHVuZGVmPic7XG4gICAgaWYgKHR5cGVvZiBpdGVtICE9PSAnb2JqZWN0JykgLy8gbWF5YmUgZnVuY3Rpb25cbiAgICAgICAgcmV0dXJuICcnICsgaXRlbTsgLy8gVE9ETyBkb24ndCBwcmludCBvdXQgYSBsb25nIGZ1bmN0aW9uJ3MgYm9keVxuXG4gICAgLy8gY2hlY2sgY2lyY3VsYXJpdHlcbiAgICBpZiAoc2Vlbi5oYXMoaXRlbSkpIHtcbiAgICAgICAgY29uc3Qgbm90ZSA9ICdDaXJjdWxhcj0nICsgc2Vlbi5nZXQoaXRlbSk7XG4gICAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KGl0ZW0pID8gJ1sgJyArIG5vdGUgKyAnIF0nIDogJ3sgJyArIG5vdGUgKyAnIH0nO1xuICAgIH1cblxuICAgIC8vIHJlY3Vyc2VcbiAgICB0cnkge1xuICAgICAgICAvLyB1c2UgdHJ5IHsgLi4uIH0gZmluYWxseSB7IC4uLiB9IHRvIHJlbW92ZSBpdGVtIGZyb20gc2VlbiBvbiByZXR1cm5cbiAgICAgICAgc2Vlbi5zZXQoIGl0ZW0sIHBhdGggKTtcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShpdGVtKSkge1xuICAgICAgICAgICAgaWYgKGRlcHRoIDwgMSlcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1suLi5dJztcbiAgICAgICAgICAgIC8vIFRPRE8gPHggZW1wdHkgaXRlbXM+XG4gICAgICAgICAgICBjb25zdCBsaXN0ID0gaXRlbS5tYXAoXG4gICAgICAgICAgICAgICAgKHZhbCwgaW5kZXgpID0+IF9leHBsYWluKHZhbCwgZGVwdGggLSAxLCBwYXRoICsgJ1snICsgaW5kZXggKyAnXScsIHNlZW4pXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgcmV0dXJuICdbJyArIGxpc3Quam9pbignLCAnKSArICddJzsgLy8gVE9ETyBjb25maWd1cmFibGUgd2hpdGVzcGFjZVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdHlwZSA9IGl0ZW0uY29uc3RydWN0b3IgJiYgaXRlbS5jb25zdHJ1Y3Rvci5uYW1lO1xuICAgICAgICBjb25zdCBwcmVmaXggPSB0eXBlICYmIHR5cGUgIT09ICdPYmplY3QnID8gdHlwZSArICcgJyA6ICcnO1xuICAgICAgICBpZiAoZGVwdGggPCAxKVxuICAgICAgICAgICAgcmV0dXJuIHByZWZpeCArICd7Li4ufSc7XG4gICAgICAgIGNvbnN0IGxpc3QgPSBPYmplY3Qua2V5cyhpdGVtKS5zb3J0KCkubWFwKCBrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBKU09OLnN0cmluZ2lmeShrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIGluZGV4ICsgJzonICsgX2V4cGxhaW4oaXRlbVtrZXldLCBkZXB0aCAtIDEsIHBhdGggKyAnWycgKyBpbmRleCArICddJywgc2Vlbik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcHJlZml4ICsgJ3snICsgbGlzdC5qb2luKCcsICcpICsgJ30nO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgIHNlZW4uZGVsZXRlKGl0ZW0pO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IGNhbGxlckluZm8sIGV4cGxhaW4gfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiAgIFRoaXMgaXMgdGhlIGVudHJ5IHBvaW50IGZvciBicm93c2VyIHZlcnNpb24uXG4gKiAgIFdlIGFyZSB1c2luZyB3ZWJwYWNrIGN1cnJlbnRseS4gU2VlIC4uL2Jyb3dzZXRpZnkuc2hcbiAqL1xuXG4vLyBUT0RPIGNoZWNrIGlmIHJlZnV0ZSBhbHJlYWR5IGV4aXN0cywgYWxzbyBjaGVjayB2ZXJzaW9uXG53aW5kb3cucmVmdXRlID0gcmVxdWlyZSggJy4vaW5kZXguanMnICk7XG4iXX0=
