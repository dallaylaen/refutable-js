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
    done () {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvY29uZC9hcnJheS5qcyIsImxpYi9jb25kL2Jhc2ljLmpzIiwibGliL2NvbmQvZGVlcC5qcyIsImxpYi9pbmRleC5qcyIsImxpYi9yZXBvcnQuanMiLCJsaWIvdXRpbC5qcyIsImxpYi93ZWItaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbnBCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgUmVwb3J0IH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgZm9yRWFjaFxuICogICBAZGVzYyAgQ2hlY2tzIHRoYXQgYSBuZXN0ZWQgY29udHJhY3QgaG9sZHMgZm9yIGVhY2ggZWxlbWVudCBvZiBhbiBhcnJheS5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IGRlc2NyaXB0aW9uXG4gKiAgIEBwYXJhbSB7QXJyYXl9IGFycmF5IExpc3Qgb2YgaXRlbXMuXG4gKiAgIEBwYXJhbSB7Q29udHJhY3R9IG5lc3RlZCBGaXJzdCBhcmd1bWVudCBnaXZlbiB0byB0aGUgY2FsbGJhY2tcbiAqICAgaXMgYSBSZXBvcnQgb2JqZWN0LCBhbmQgdGhlIHNlY29uZCBvbmUgaXMgdGhlIGFycmF5IGl0ZW0gaW4gcXVlc3Rpb24uXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cblxuYWRkQ29uZGl0aW9uKCAnZm9yRWFjaCcsXG4gICAgLy8gVE9ETyBiZXR0ZXIgbmFtZSB0aGF0IHJoeW1lcyB3aXRoIHRoZSBvcmRlcmVkIG9uZSAobWFwL3JlZHVjZT8pXG4gICAgeyBmdW46IDEsIGFyZ3M6IDIgfSxcbiAgICAobGlzdCwgY29udHJhY3QpID0+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKVxuICAgICAgICAgICAgcmV0dXJuICdFeHBlY3RlZCBhIGxpc3QsIGZvdW5kIGEgJy50eXBlb2YobGlzdCk7XG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA8IDEpXG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gYXV0by1wYXNzXG5cbiAgICAgICAgY29uc3Qgb2sgPSBuZXcgUmVwb3J0KCk7XG4gICAgICAgIGxpc3QuZm9yRWFjaCggKGl0ZW0sIGluZGV4KSA9PiBvay5uZXN0ZWQoICdpdGVtICcgKyBpbmRleCwgaXRlbSwgY29udHJhY3QgKSApO1xuICAgICAgICByZXR1cm4gb2suZG9uZSgpO1xuICAgIH1cbik7XG5cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBvcmRlcmVkXG4gKiAgIEBkZXNjICBDaGVja3MgdGhhdCBhIG5lc3RlZCBjb250cmFjdCBob2xkcyBmb3IgZWFjaCBwYWlyXG4gKiAgIG9mIGFkamFjZW50IGVsZW1lbnQgb2YgYW4gYXJyYXkgKGkuZS4gMSYyLCAyJjMsIDMmNCwgLi4uKS5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IGRlc2NyaXB0aW9uXG4gKiAgIEBwYXJhbSB7QXJyYXl9IGFycmF5IExpc3Qgb2YgaXRlbXMuXG4gKiAgIEBwYXJhbSB7Q29udHJhY3R9IG5lc3RlZCBGaXJzdCBhcmd1bWVudCBnaXZlbiB0byB0aGUgY2FsbGJhY2tcbiAqICAgaXMgYSBSZXBvcnQgb2JqZWN0LCBhbmQgdGhlIHNlY29uZCBhbmQgdGhpcmQgb25lc1xuICogICBhcmUgdGhlIGFycmF5IGl0ZW1zIGluIHF1ZXN0aW9uLlxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5cbi8vIFRPRE8gdGhpcyBpcyBjYWxsZWQgXCJjb21wbGlhbnQgY2hhaW5cIiBidXQgYmV0dGVyIGp1c3Qgc2F5IGhlcmVcbi8vIFwib2ggd2UncmUgY2hlY2tpbmcgZWxlbWVudCBvcmRlclwiXG5hZGRDb25kaXRpb24oICdvcmRlcmVkJyxcbiAgICAvLyBUT0RPIGJldHRlciBuYW1lPyBwYWlyd2lzZT8gcmVkdWNlP1xuICAgIHsgZnVuOiAxLCBhcmdzOiAyIH0sXG4gICAgKGxpc3QsIGNvbnRyYWN0KSA9PiB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSlcbiAgICAgICAgICAgIHJldHVybiAnRXhwZWN0ZWQgYSBsaXN0LCBmb3VuZCBhICcudHlwZW9mKGxpc3QpO1xuICAgICAgICBpZiAobGlzdC5sZW5ndGggPCAyKVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGF1dG8tcGFzc1xuXG4gICAgICAgIGNvbnN0IG9rID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IGxpc3QubGVuZ3RoIC0gMTsgbisrKVxuICAgICAgICAgICAgb2submVzdGVkKCAnaXRlbXMgJyArIG4gKyAnLCAnICsgKG4gKyAxKSwgbGlzdFtuXSwgbGlzdFtuICsgMV0sIGNvbnRyYWN0KTtcblxuICAgICAgICByZXR1cm4gb2suZG9uZSgpO1xuICAgIH1cbik7XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCBleHBsYWluIH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuY29uc3QgT0sgPSBmYWxzZTtcblxuY29uc3QgY21wTnVtID0ge1xuICAgICc8JzogICh4LCB5KSA9PiAoeCAgPCB5KSxcbiAgICAnPic6ICAoeCwgeSkgPT4gKHggID4geSksXG4gICAgJzw9JzogKHgsIHkpID0+ICh4IDw9IHkpLFxuICAgICc+PSc6ICh4LCB5KSA9PiAoeCA+PSB5KSxcbiAgICAnPT0nOiAoeCwgeSkgPT4gKHggPT09IHkpLFxuICAgICchPSc6ICh4LCB5KSA9PiAoeCAhPT0geSksXG59O1xuXG4vKiBlc2xpbnQtZGlzYWJsZSBlcWVxZXEgLS0gd2UncmUgZmlsdGVyaW5nIG91dCB1bmRlZmluZWQgQU5EIG51bGwgaGVyZSAqL1xuY29uc3QgY21wU3RyID0ge1xuICAgICc8JzogICh4LCB5KSA9PiB4ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycgKyB4ICA8ICcnICsgeSksXG4gICAgJz4nOiAgKHgsIHkpID0+IHggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyArIHggID4gJycgKyB5KSxcbiAgICAnPD0nOiAoeCwgeSkgPT4geCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnICsgeCA8PSAnJyArIHkpLFxuICAgICc+PSc6ICh4LCB5KSA9PiB4ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycgKyB4ID49ICcnICsgeSksXG5cbiAgICAnPT0nOiAoeCwgeSkgPT4geCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnICsgeCA9PT0gJycgKyB5KSxcbiAgICAnIT0nOiAoeCwgeSkgPT4gKCh4ID09IHVuZGVmaW5lZCkgXiAoeSA9PSB1bmRlZmluZWQpKSB8fCAoJycgKyB4ICE9PSAnJyArIHkpLFxufTtcbi8qIGVzbGludC1lbmFibGUgZXFlcWVxICovXG5cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBjbXBOdW1cbiAqICAgQGRlc2MgIENoZWNrcyBpZiBhIHJlbGF0aW9uIGluZGVlZCBob2xkcyBiZXR3ZWVuIGFyZ3VtZW50cy5cbiAqICAgICAgICAgIFNlZSBhbHNvIHtAbGluayBjbXBTdHJ9XG4gKiAgIEBwYXJhbSB7YW55fSBhcmcxICAgIEZpcnN0IGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBvcGVyYXRpb24gIE9uZSBvZiAnPCcsICc8PScsICc9PScsICchPScsICc+PScsIG9yICc+J1xuICogICBAcGFyYW0ge2FueX0gYXJnMiAgICBTZWNvbmQgYXJndW1lbnRcbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGNtcFN0clxuICogICBAZGVzYyAgQ2hlY2tzIGlmIGEgcmVsYXRpb24gaW5kZWVkIGhvbGRzIGJldHdlZW4gYXJndW1lbnRzLFxuICogICAgICAgICAgYXNzdW1pbmcgdGhleSBhcmUgc3RyaW5ncy5cbiAqICAgICAgICAgIFNlZSBhbHNvIHtAbGluayBjbXBOdW19XG4gKiAgIEBwYXJhbSB7YW55fSBhcmcxICAgIEZpcnN0IGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBvcGVyYXRpb24gIE9uZSBvZiAnPCcsICc8PScsICc9PScsICchPScsICc+PScsIG9yICc+J1xuICogICBAcGFyYW0ge2FueX0gYXJnMiAgICBTZWNvbmQgYXJndW1lbnRcbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuXG5hZGRDb25kaXRpb24oICdjbXBOdW0nLFxuICAgIHsgYXJnczogMyB9LFxuICAgICh4LCBvcCwgeSkgPT4gY21wTnVtW29wXSh4LCB5KSA/IDAgOiBbeCwgJ2lzIG5vdCAnICsgb3AsIHldXG4pO1xuYWRkQ29uZGl0aW9uKCAnY21wU3RyJyxcbiAgICB7IGFyZ3M6IDMgfSxcbiAgICAoeCwgb3AsIHkpID0+IGNtcFN0cltvcF0oeCwgeSkgPyAwIDogW3gsICdpcyBub3QgJyArIG9wLCB5XVxuKTtcblxuY29uc3QgdHlwZUNoZWNrID0ge1xuICAgIHVuZGVmaW5lZDogeCA9PiB4ID09PSB1bmRlZmluZWQsXG4gICAgbnVsbDogICAgICB4ID0+IHggPT09IG51bGwsXG4gICAgbnVtYmVyOiAgICB4ID0+IHR5cGVvZiB4ID09PSAnbnVtYmVyJyAmJiAhTnVtYmVyLmlzTmFOKHgpLFxuICAgIGludGVnZXI6ICAgeCA9PiBOdW1iZXIuaXNJbnRlZ2VyKHgpLFxuICAgIG5hbjogICAgICAgeCA9PiBOdW1iZXIuaXNOYU4oeCksXG4gICAgc3RyaW5nOiAgICB4ID0+IHR5cGVvZiB4ID09PSAnc3RyaW5nJyxcbiAgICBmdW5jdGlvbjogIHggPT4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicsXG4gICAgYm9vbGVhbjogICB4ID0+IHR5cGVvZiB4ID09PSAnYm9vbGVhbicsXG4gICAgb2JqZWN0OiAgICB4ID0+IHggJiYgdHlwZW9mIHggPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KHgpLFxuICAgIGFycmF5OiAgICAgeCA9PiBBcnJheS5pc0FycmF5KHgpLFxufTtcbmZ1bmN0aW9uIHR5cGVFeHBsYWluICh4KSB7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnc3RyaW5nJylcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKVxuICAgICAgICByZXR1cm4gJ2luc3RhbmNlb2YgJyArICh4Lm5hbWUgfHwgeCk7XG59XG5cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCB0eXBlXG4gKiAgIEBkZXNjICBDaGVja3MgdGhhdCBhIHZhbHVlIGlzIG9mIHRoZSBzcGVjaWZpZWQgdHlwZS5cbiAqICAgQHBhcmFtIHthbnl9IHZhbHVlICAgIEZpcnN0IGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfGZ1bmN0aW9ufEFycmF5fSB0eXBlXG4gKiAgICAgICBPbmUgb2YgJ3VuZGVmaW5lZCcsICdudWxsJywgJ251bWJlcicsICdpbnRlZ2VyJywgJ25hbicsICdzdHJpbmcnLFxuICogICAgICAgJ2Jvb2xlYW4nLCAnb2JqZWN0JywgJ2FycmF5JywgYSBjbGFzcywgb3IgYW4gYXJyYXkgY29udGFpbmluZyAxIG9yIG1vcmVcbiAqICAgICAgIG9mIHRoZSBhYm92ZS4gJ251bWJlcicvJ2ludGVnZXInIGRvbid0IGluY2x1ZGUgTmFOLFxuICogICAgICAgYW5kICdvYmplY3QnIGRvZXNuJ3QgaW5jbHVkZSBhcnJheXMuXG4gKiAgICAgICBBIGZ1bmN0aW9uIGltcGxpZXMgYW4gb2JqZWN0IGFuZCBhbiBpbnN0YW5jZW9mIGNoZWNrLlxuICogICAgICAgQXJyYXkgbWVhbnMgYW55IG9mIHRoZSBzcGVjaWZpZWQgdHlwZXMgKGFrYSBzdW0gb2YgdHlwZXMpLlxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5hZGRDb25kaXRpb24oICd0eXBlJyxcbiAgICB7IGFyZ3M6IDIgfSxcbiAgICAoZ290LCBleHApID0+IHtcbiAgICAgICAgaWYgKCAhQXJyYXkuaXNBcnJheShleHApIClcbiAgICAgICAgICAgIGV4cCA9IFtleHBdO1xuXG4gICAgICAgIGZvciAoY29uc3QgdmFyaWFudCBvZiBleHApIHtcbiAgICAgICAgICAgIC8vIGtub3duIHR5cGVcbiAgICAgICAgICAgIGlmICggdHlwZW9mIHZhcmlhbnQgPT09ICdzdHJpbmcnICYmIHR5cGVDaGVja1t2YXJpYW50XSApIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZUNoZWNrW3ZhcmlhbnRdKGdvdCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPSztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaW5zdGFuY2VvZlxuICAgICAgICAgICAgaWYgKCB0eXBlb2YgdmFyaWFudCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZ290ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGlmICggZ290IGluc3RhbmNlb2YgdmFyaWFudCApXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPSztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZG9uJ3Qga25vdyB3aGF0IHlvdSdyZSBhc2tpbmcgZm9yXG4gICAgICAgICAgICByZXR1cm4gJ3Vua25vd24gdmFsdWUgdHlwZSBzcGVjOiAnICsgZXhwbGFpbih2YXJpYW50LCAxKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgJy0gJyArIGV4cGxhaW4oZ290LCAxKSxcbiAgICAgICAgICAgICcrICcgKyBleHAubWFwKCB0eXBlRXhwbGFpbiApLmpvaW4oJyBvciAnKSxcbiAgICAgICAgXTtcbiAgICB9XG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcblxuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGRlZXBFcXVhbFxuICogICBAZGVzYyBDb21wYXJlcyB0d28gc3RydWN0dXJlcywgb3V0cHV0cyBkaWZmIGlmIGRpZmZlcmVuY2VzIGZvdW5kLlxuICogICBAcGFyYW0ge2FueX0gYWN0dWFsICAgIEZpcnN0IHN0cnVjdHVyZVxuICogICBAcGFyYW0ge2FueX0gZXhwZWN0ZWQgIFN0cnVjdHVyZSB0byBjb21wYXJlIHRvXG4gKiAgIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqICAgQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMubWF4IGhvdyBtYW55IGRpZmZlcmVuY2VzIHRvIG91dHB1dCAoZGVmYXVsdCA1KVxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5hZGRDb25kaXRpb24oICdkZWVwRXF1YWwnLFxuICAgIHsgYXJnczogMiwgaGFzT3B0aW9uczogdHJ1ZSB9LCBkZWVwICk7XG5cbmZ1bmN0aW9uIGRlZXAgKCBnb3QsIGV4cCwgb3B0aW9ucyA9IHt9ICkge1xuICAgIGlmICghb3B0aW9ucy5tYXgpXG4gICAgICAgIG9wdGlvbnMubWF4ID0gNTtcbiAgICBvcHRpb25zLmRpZmYgPSBbXTtcbiAgICBfZGVlcCggZ290LCBleHAsIG9wdGlvbnMgKTtcbiAgICBpZiAoIW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgIHJldHVybiAwO1xuXG4gICAgY29uc3QgcmV0ID0gW107XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIG9wdGlvbnMuZGlmZikge1xuICAgICAgICByZXQucHVzaChcbiAgICAgICAgICAgICdhdCAnICsgaXRlbVswXSxcbiAgICAgICAgICAgICctICcgKyAoaXRlbVszXSA/IGl0ZW1bMV0gOiBleHBsYWluKCBpdGVtWzFdLCB7IGRlcHRoOiAyIH0gKSksXG4gICAgICAgICAgICAnKyAnICsgKGl0ZW1bM10gPyBpdGVtWzJdIDogZXhwbGFpbiggaXRlbVsyXSwgeyBkZXB0aDogMiB9ICkpLFxuICAgICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xufVxuXG4vLyByZXN1bHQgaXMgc3RvcmVkIGluIG9wdGlvbnMuZGlmZj1bXSwgcmV0dXJuIHZhbHVlIGlzIGlnbm9yZWRcbi8vIGlmIHNhaWQgZGlmZiBleGNlZWRzIG1heCwgcmV0dXJuIGltbWVkaWF0ZWx5ICYgZG9uJ3Qgd2FzdGUgdGltZVxuZnVuY3Rpb24gX2RlZXAgKCBnb3QsIGV4cCwgb3B0aW9ucyA9IHt9LCBwYXRoID0gJyQnLCBzZWVuTCA9IG5ldyBNYXAoKSwgc2VlblIgPSBuZXcgTWFwKCkgKSB7XG4gICAgaWYgKGdvdCA9PT0gZXhwIHx8IG9wdGlvbnMubWF4IDw9IG9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgIHJldHVybjtcbiAgICBpZiAodHlwZW9mIGdvdCAhPT0gdHlwZW9mIGV4cClcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHBdICk7XG5cbiAgICAvLyByZWN1cnNlIGJ5IGV4cGVjdGVkIHZhbHVlIC0gY29uc2lkZXIgaXQgbW9yZSBwcmVkaWN0YWJsZVxuICAgIGlmICh0eXBlb2YgZXhwICE9PSAnb2JqZWN0JyB8fCBleHAgPT09IG51bGwgKSB7XG4gICAgICAgIC8vIG5vbi1vYmplY3RzIC0gc28gY2FuJ3QgZGVzY2VuZFxuICAgICAgICAvLyBhbmQgY29tcGFyaXNvbiBhbHJlYWR5IGRvbmUgYXQgdGhlIGJlZ2lubm5pbmdcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHBdICk7XG4gICAgfVxuXG4gICAgLy8gbXVzdCBkZXRlY3QgbG9vcHMgYmVmb3JlIGdvaW5nIGRvd25cbiAgICBjb25zdCBwYXRoTCA9IHNlZW5MLmdldChnb3QpO1xuICAgIGNvbnN0IHBhdGhSID0gc2VlblIuZ2V0KGV4cCk7XG4gICAgaWYgKHBhdGhMIHx8IHBhdGhSKSB7XG4gICAgICAgIC8vIExvb3AgZGV0ZWN0ZWQgPSBvbmx5IGNoZWNrIHRvcG9sb2d5XG4gICAgICAgIGlmIChwYXRoTCA9PT0gcGF0aFIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW1xuICAgICAgICAgICAgcGF0aCArICcgKGNpcmN1bGFyKScsXG4gICAgICAgICAgICBwYXRoTCA/ICdDaXJjdWxhcj0nICsgcGF0aEwgOiBleHBsYWluKGdvdCwgeyBkZXB0aDogMiB9KSxcbiAgICAgICAgICAgIHBhdGhSID8gJ0NpcmN1bGFyPScgKyBwYXRoUiA6IGV4cGxhaW4oZXhwLCB7IGRlcHRoOiAyIH0pLFxuICAgICAgICAgICAgdHJ1ZSAvLyBkb24ndCBzdHJpbmdpZnlcbiAgICAgICAgXSk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgICAgc2Vlbkwuc2V0KGdvdCwgcGF0aCk7XG4gICAgICAgIHNlZW5SLnNldChleHAsIHBhdGgpO1xuXG4gICAgICAgIC8vIGNvbXBhcmUgb2JqZWN0IHR5cGVzXG4gICAgICAgIC8vIChpZiBhIHVzZXIgaXMgc3R1cGlkIGVub3VnaCB0byBvdmVycmlkZSBjb25zdHJ1Y3RvciBmaWVsZCwgd2VsbCB0aGUgdGVzdFxuICAgICAgICAvLyB3b3VsZCBmYWlsIGxhdGVyIGFueXdheSlcbiAgICAgICAgaWYgKGdvdC5jb25zdHJ1Y3RvciAhPT0gZXhwLmNvbnN0cnVjdG9yKVxuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHBdICk7XG5cbiAgICAgICAgLy8gYXJyYXlcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZXhwKSkge1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGdvdCkgfHwgZ290Lmxlbmd0aCAhPT0gZXhwLmxlbmd0aClcbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cF0gKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBleHAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBfZGVlcCggZ290W2ldLCBleHBbaV0sIG9wdGlvbnMsIGV4dGVuZFBhdGgocGF0aCwgaSksIHNlZW5MLCBzZWVuUiApO1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm1heCA8PSBvcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbXBhcmUga2V5cyAtICsxIGZvciBleHAsIC0xIGZvciBnb3QsIG5vbnplcm8ga2V5IGF0IGVuZCBtZWFucyBrZXlzIGRpZmZlclxuICAgICAgICAvLyBUT0RPIGJldHRlciwgZmFzdGVyIHdheSB0byBkbyBpdD9cbiAgICAgICAgY29uc3QgdW5pcSA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyhleHApLmZvckVhY2goIHggPT4geyB1bmlxW3hdID0gMSB9ICk7XG4gICAgICAgIE9iamVjdC5rZXlzKGdvdCkuZm9yRWFjaCggeCA9PiB7IHVuaXFbeF0gPSAodW5pcVt4XSB8fCAwKSAtIDEgfSApO1xuICAgICAgICBmb3IgKGNvbnN0IHggaW4gdW5pcSkge1xuICAgICAgICAgICAgaWYgKHVuaXFbeF0gIT09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHBdICk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBub3cgdHlwZW9mLCBvYmplY3QgdHlwZSwgYW5kIG9iamVjdCBrZXlzIGFyZSB0aGUgc2FtZS5cbiAgICAgICAgLy8gcmVjdXJzZS5cbiAgICAgICAgZm9yIChjb25zdCBpIGluIGV4cCkge1xuICAgICAgICAgICAgX2RlZXAoIGdvdFtpXSwgZXhwW2ldLCBvcHRpb25zLCBleHRlbmRQYXRoKHBhdGgsIGkpLCBzZWVuTCwgc2VlblIgKTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLm1heCA8PSBvcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgc2VlbkwuZGVsZXRlKGdvdCk7XG4gICAgICAgIHNlZW5SLmRlbGV0ZShleHApO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZXh0ZW5kUGF0aCAocGF0aCwgc3VmZml4KSB7XG4gICAgLy8gYXJyYXlcbiAgICBpZiAoIHR5cGVvZiBzdWZmaXggPT09ICdudW1iZXInIClcbiAgICAgICAgcmV0dXJuIHBhdGggKyAnWycgKyBzdWZmaXggKyAnXSc7XG4gICAgLy9cbiAgICBpZiAoIHN1ZmZpeC5tYXRjaCgvXlthLXpfXVthLXpfMC05XSokL2kpIClcbiAgICAgICAgcmV0dXJuIHBhdGggKyAnLicgKyBzdWZmaXg7XG4gICAgcmV0dXJuIHBhdGggKyAnWycgKyBKU09OLnN0cmluZ2lmeShzdWZmaXgpICsgJ10nO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyB0aGUgY29yZSAoc2hvdWxkIGV4cGxhaW4gZXZlbiBiZSB0aGVyZT8pXG5jb25zdCB7IFJlcG9ydCwgYWRkQ29uZGl0aW9uLCBleHBsYWluIH0gPSByZXF1aXJlKCcuL3JlcG9ydC5qcycpO1xuXG4vLyBUT0RPIGFkZCBlaWZmZWwtc3R5bGUgZGVzaWduLWJ5LWNvbnRyYWN0XG5cbi8vIGltcG9ydCBkZWZhdWx0IGNvbmRpdGlvbiBhcnNlbmFsXG5yZXF1aXJlKCAnLi9jb25kL2Jhc2ljLmpzJyApO1xucmVxdWlyZSggJy4vY29uZC9hcnJheS5qcycgKTtcbnJlcXVpcmUoICcuL2NvbmQvZGVlcC5qcycgKTtcblxuY29uc3QgZ2V0UmVwb3J0ID0gKC4uLmFyZ3MpID0+IG5ldyBSZXBvcnQoKS5ydW4oLi4uYXJncykuZG9uZSgpO1xuXG4vLyBBbGxvdyBjcmVhdGluZyBtdWx0aXBsZSBwYXJhbGxlbCBjb25maWd1cmF0aW9ucyBvZiByZWZ1dGVcbi8vIGUuZy4gb25lIHN0cmljdCAodGhyb3dpbmcgZXJyb3JzKSBhbmQgb3RoZXIgbGF4IChqdXN0IGRlYnVnZ2luZyB0byBjb25zb2xlKVxuZnVuY3Rpb24gc2V0dXAgKCBvcHRpb25zID0ge30sIG9yaWcgKSB7XG4gICAgLy8gVE9ETyB2YWxpZGF0ZSBvcHRpb25zXG4gICAgY29uc3Qgb25GYWlsID0gb3B0aW9ucy5vbkZhaWwgfHwgKHJlcCA9PiB7IHRocm93IG5ldyBFcnJvcihyZXAudG9TdHJpbmcoKSkgfSk7XG5cbiAgICBjb25zdCByZWZ1dGUgPSBvcHRpb25zLnNraXBcbiAgICAgICAgPyAoKSA9PiB7fVxuICAgICAgICA6ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBvayA9IG5ldyBSZXBvcnQoKTtcbiAgICAgICAgICAgIG9rLm9uRG9uZSggeCA9PiB7IGlmICggIXguZ2V0UGFzcygpICkgb25GYWlsKHgsIGFyZ3MpIH0gKTtcbiAgICAgICAgICAgIG9rLnJ1biguLi5hcmdzKTtcbiAgICAgICAgICAgIG9rLmRvbmUoKTtcbiAgICAgICAgfTtcblxuICAgIC8vIHJlZXhwb3J0IGFsbCBmcm9tIHJlcG9ydC5qc1xuICAgIHJlZnV0ZS5SZXBvcnQgPSBSZXBvcnQ7XG4gICAgcmVmdXRlLmV4cGxhaW4gPSBleHBsYWluO1xuICAgIHJlZnV0ZS5hZGRDb25kaXRpb24gPSBhZGRDb25kaXRpb247XG5cbiAgICAvLyBzaG9ydGN1dCB0byB2YWxpZGF0aW5nICYgcmV0dXJuaW5nIGEgZnJlc2ggY29udHJhY3RcbiAgICAvLyBUT0RPIHJlbmFtZSB0byBhdm9pZCBuYW1lIGNsYXNoIHdpdGggdGhlIGNsYXNzXG4gICAgLy8gKGV2YWw/KVxuICAgIHJlZnV0ZS5yZXBvcnQgPSBnZXRSZXBvcnQ7XG5cbiAgICAvLyByZWZ1dGUuY29uZih7Li4ufSkgd2lsbCBnZW5lcmF0ZSBhIF9uZXdfIHJlZnV0ZVxuICAgIHJlZnV0ZS5jb25maWcgPSB1cGRhdGUgPT4gc2V0dXAoIHsgLi4ub3B0aW9ucywgLi4udXBkYXRlIH0sIHJlZnV0ZSApO1xuXG4gICAgcmV0dXJuIHJlZnV0ZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXR1cCgpO1xuXG4vKipcbiAqICAgQG5hbWVzcGFjZSByZWZ1dGVcbiAqICAgQGRlc2MgICBGdW5jdGlvbnMgZXhwb3J0ZWQgYnkgcmVmdXRhYmxlJ3MgbWFpbiBtb2R1bGUuXG4gKi9cblxuLyoqXG4gKiAgIEBwdWJsaWNcbiAqICAgQG1lbWJlck9mIHJlZnV0ZVxuICogICBAZnVuY3Rpb24gcmVmdXRlXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gRGF0YSB0byBmZWVkIHRvIHRoZSBjYWxsYmFja1xuICogICBAcGFyYW0ge0NvbnRyYWN0fSBjb250cmFjdCBBIGNvZGUgYmxvY2sgd2l0aCBjaGVja3MuXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9IFJldHVybiB2YWx1ZSBpcyBpZ25vcmVkLlxuICogICBAdGhyb3dzIHtFcnJvcn0gSWYgb25lIG9yIG1vcmUgY2hlY2tzIGFyZSBmYWlsaW5nLCBhbiBleGNlcHRpb24gaXMgdGhyb3duXG4gKiAgIHdpdGggZGV0YWlscyBhYm91dCBhbGwgcGFzc2luZy9mYWlsaW5nIGNoZWNrcy5cbiAqICAgVGhpcyBhY3Rpb24gY2FuIGJlIGNoYW5nZWQgdmlhIHJlZnV0ZS5jb25maWcoKSBjYWxsLlxuICpcbiAqL1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGNhbGxlckluZm8sIGV4cGxhaW4gfSA9IHJlcXVpcmUoJy4vdXRpbC5qcycpO1xuXG4vKipcbiAqICAgQGNhbGxiYWNrIENvbnRyYWN0XG4gKiAgIEBkZXNjIEEgY29kZSBibG9jayBjb250YWluaW5nIG9uZSBvciBtb3JlIGNvbmRpdGlvbiBjaGVja3MuXG4gKiAgIEEgY2hlY2sgaXMgcGVyZm9ybWVkIGJ5IGNhbGxpbmcgb25lIG9mIGEgZmV3IHNwZWNpYWwgbWV0aG9kc1xuICogICAoZXF1YWwsIG1hdGNoLCBkZWVwRXF1YWwsIHR5cGUgZXRjKVxuICogICBvbiB0aGUgUmVwb3J0IG9iamVjdC5cbiAqICAgQ29udHJhY3RzIG1heSBiZSBuZXN0ZWQgdXNpbmcgdGhlICduZXN0ZWQnIG1ldGhvZCB3aGljaCBhY2NlcHRzXG4gKiAgIGFub3RoZXIgY29udHJhY3QgYW5kIHJlY29yZHMgYSBwYXNzL2ZhaWx1cmUgaW4gdGhlIHBhcmVudCBhY2NvcmRpbmdseS5xXG4gKiAgIEEgY29udHJhY3QgaXMgYWx3YXlzIGV4ZWN1dGVkIHRvIHRoZSBlbmQuXG4gKiAgIEBwYXJhbSB7UmVwb3J0fSBvayBBbiBvYmplY3QgdGhhdCByZWNvcmRzIGNoZWNrIHJlc3VsdHMuXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzXG4gKiAgIChlLmcuIGRhdGEgc3RydWN0dXJlIHRvIGJlIHZhbGlkYXRlZClcbiAqICAgQHJldHVybnMge3ZvaWR9IFJldHVybmVkIHZhbHVlIGlzIGlnbm9yZWQuXG4gKi9cblxuY29uc3QgcHJvdG9jb2wgPSAxLjE7XG5cbi8qKlxuICogQHB1YmxpY1xuICogQGNsYXNzZGVzY1xuICogVGhlIGNvcmUgb2YgdGhlIHJlZnV0YWJsZSBsaWJyYXJ5LCB0aGUgcmVwb3J0IG9iamVjdCBjb250YWlucyBpbmZvXG4gKiBhYm91dCBwYXNzaW5nIGFuZCBmYWlsaW5nIGNvbmRpdGlvbnMuXG4gKi9cbmNsYXNzIFJlcG9ydCB7XG4gICAgLy8gc2V0dXBcbiAgICAvKipcbiAgICAgKiAgQGRlc2MgTm8gY29uc3RydWN0b3IgYXJndW1lbnRzIHN1cHBvcnRlZC5cbiAgICAgKiAgQ29udHJhY3RzIG1heSBuZWVkIHRvIGJlIHNldCB1cCBpbnNpZGUgY2FsbGJhY2tzIF9hZnRlcl8gY3JlYXRpb24sXG4gICAgICogIGhlbmNlIHRoaXMgY29udmVudGlvbi5cbiAgICAgKi9cbiAgICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgICAgIHRoaXMuX2NvdW50ICAgICA9IDA7XG4gICAgICAgIHRoaXMuX2ZhaWxDb3VudCA9IDA7XG4gICAgICAgIHRoaXMuX2Rlc2NyICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9ldmlkZW5jZSAgPSBbXTtcbiAgICAgICAgdGhpcy5fd2hlcmUgICAgID0gW107XG4gICAgICAgIHRoaXMuX2NvbmROYW1lICA9IFtdO1xuICAgICAgICB0aGlzLl9pbmZvICAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fbmVzdGVkICAgID0gW107XG4gICAgICAgIHRoaXMuX3BlbmRpbmcgICA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5fb25Eb25lICAgID0gW107XG4gICAgICAgIHRoaXMuX2RvbmUgICAgICA9IGZhbHNlO1xuICAgICAgICAvLyBUT0RPIGFkZCBjYWxsZXIgaW5mbyBhYm91dCB0aGUgcmVwb3J0IGl0c2VsZlxuICAgIH1cblxuICAgIC8vIFNldHVwIG1ldGhvZHMgZm9sbG93LiBUaGV5IG11c3QgYmUgY2hhaW5hYmxlLCBpLmUuIHJldHVybiB0aGlzLlxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBFeGVjdXRlIGNvZGUgd2hlbiBjb250cmFjdCBleGVjdXRpb24gZmluaXNoZXMuXG4gICAgICogICBSZXBvcnQgb2JqZWN0IGNhbm5vdCBiZSBtb2RpZmllZCBhdCB0aGlzIHBvaW50LFxuICAgICAqICAgYW5kIG5vIGFkZGl0aW9uYWwgY2hlY2tzIG15IGJlIHByZXNlbnQuXG4gICAgICogICBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIGZpcnN0IGFyZ3VtZW50IGlzIHJlcG9ydCBpbiBxdWVzdGlvblxuICAgICAqICAgQHJldHVybnMge1JlcG9ydH0gdGhpcyAoY2hhaW5hYmxlKVxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIHJlcG9ydC5vbkRvbmUoIHIgPT4geyBpZiAoIXIuZ2V0UGFzcygpKSBjb25zb2xlLmxvZyhyLnRvU3RyaW5nKCkpIH0gKVxuICAgICAqL1xuICAgIG9uRG9uZSAoZm4pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignb25Eb25lKCk6IGNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIHRoaXMuX29uRG9uZS5wdXNoKGZuKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBFeGVjdXRlIGNvZGUgd2hlbiBjb250cmFjdCBleGVjdXRpb24gZmluaXNoZXMsIGlmIGl0IGZhaWxlZC5cbiAgICAgKiAgIFJlcG9ydCBvYmplY3QgY2Fubm90IGJlIG1vZGlmaWVkIGF0IHRoaXMgcG9pbnQsXG4gICAgICogICBhbmQgbm8gYWRkaXRpb25hbCBjaGVja3MgbXkgYmUgcHJlc2VudC5cbiAgICAgKiAgIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gZmlyc3QgYXJndW1lbnQgaXMgcmVwb3J0IGluIHF1ZXN0aW9uXG4gICAgICogICBAcmV0dXJucyB7UmVwb3J0fSB0aGlzIChjaGFpbmFibGUpXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgcmVwb3J0Lm9uRmFpbCggciA9PiBjb25zb2xlLmxvZyhyLnRvU3RyaW5nKCkpICk7XG4gICAgICovXG4gICAgb25GYWlsIChmbikge1xuICAgICAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbkRvbmUoKTogY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgIHRoaXMuX2xvY2soKTtcbiAgICAgICAgdGhpcy5fb25Eb25lLnB1c2gociA9PiByLmdldFBhc3MoKSB8fCBmbihyKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIFJ1bm5pbmcgdGhlIGNvbnRyYWN0XG4gICAgLyoqXG4gICAgICogICBAZGVzYyBhcHBseSBnaXZlbiBmdW5jdGlvbiB0byBhIFJlcG9ydCBvYmplY3QsIGxvY2sgcmVwb3J0IGFmdGVyd2FyZHMuXG4gICAgICogICBJZiBmdW5jdGlvbiBpcyBhc3luYyAoaS5lLiByZXR1cm5zIGEge0BsaW5rIFByb21pc2V9KSxcbiAgICAgKiAgIHRoZSByZXBvcnQgd2lsbCBvbmx5IGJlIGRvbmUoKSBhZnRlciB0aGUgcHJvbWlzZSByZXNvbHZlcy5cbiAgICAgKiAgIFRoaXMgaXMgZG9uZSBzbyB0byBlbnN1cmUgdGhhdCBhbGwgY2hlY2tzIHRoYXQgYXdhaXQgb24gYSB2YWx1ZVxuICAgICAqICAgYXJlIHJlc29sdmVkLlxuICAgICAqICAgQHBhcmFtIHtDb250cmFjdH0gY29udHJhY3QgVGhlIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAgICAgKiAgIEFkZGl0aW9uYWwgcGFyYW1ldGVycyBtYXkgYmUgX3ByZXBlbmRlZF8gdG8gY29udHJhY3RcbiAgICAgKiAgIGFuZCB3aWxsIGJlIHBhc3NlZCB0byBpdCBfYWZ0ZXJfIHRoZSBSZXBvcnQgb2JqZWN0IGluIHF1ZXN0aW9uLlxuICAgICAqICAgQHJldHVybnMge1JlcG9ydH0gdGhpcyAoY2hhaW5hYmxlKVxuICAgICAqICAgQGV4YW1wbGUgQmFzaWMgdXNhZ2VcbiAgICAgKiAgIGNvbnN0IHIgPSBuZXcgUmVwb3J0KCkucnVuKCBvayA9PiBvay5lcXVhbCggJ3dhcicsICdwZWFjZScsICcxOTg0JyApICk7XG4gICAgICogICByLmdldFBhc3MoKTsgLy8gZmFsc2VcbiAgICAgKiAgIHIuZ2V0RG9uZSgpOyAvLyB0cnVlXG4gICAgICogICByLnRvU3RyaW5nKCk7XG4gICAgICogICByKFxuICAgICAqICAgICAgITEuIDE5ODRcbiAgICAgKiAgICAgIC0gd2FyXG4gICAgICogICAgICArIHBlYWNlXG4gICAgICogICApXG4gICAgICpcbiAgICAgKiAgIEBleGFtcGxlIFBhc3NpbmcgYWRkaXRpb25hbCBhcmd1bWVudHMgdG8gY2FsbGJhY2suXG4gICAgICogICAvLyBUaGUgY29udHJhY3QgYm9keSBpcyB0aGUgbGFzdCBhcmd1bWVudC5cbiAgICAgKiAgIG5ldyBSZXBvcnQoKS5ydW4oIHsgdjogNC4yLCBjb2xvcnM6IFsgJ2JsdWUnIF0gfSwgKHIsIGFyZykgPT4ge1xuICAgICAqICAgICAgIHIudHlwZSggYXJnLCAnb2JqZWN0JyApO1xuICAgICAqICAgICAgIHIudHlwZSggYXJnLnYsICdudW1iZXInICk7XG4gICAgICogICAgICAgci5jbXBOdW0oIGFyZy52LCAnPj0nLCAzLjE0ICk7XG4gICAgICogICAgICAgci50eXBlKCBhcmcuY29sb3JzLCAnYXJyYXknICk7XG4gICAgICogICB9KTtcbiAgICAgKiAgIEBleGFtcGxlIEFzeW5jIGZ1bmN0aW9uXG4gICAgICogICBjb25zdCByID0gbmV3IFJlcG9ydCgpLnJ1bihcbiAgICAgKiAgICAgICBhc3luYyBvayA9PiBvay5lcXVhbCggYXdhaXQgNio5LCA0MiwgJ2ZhaWxzIGJ1dCBsYXRlcicgKSApO1xuICAgICAqICAgci5nZXRQYXNzKCk7IC8vIHRydWVcbiAgICAgKiAgIHIuZ2V0RG9uZSgpOyAvLyBmYWxzZVxuICAgICAqICAgLy8gLi4ud2FpdCBmb3IgZXZlbnQgbG9vcCB0byB0aWNrXG4gICAgICogICByLmdldFBhc3MoKTsgLy8gZmFsc2VcbiAgICAgKiAgIHIuZ2V0RG9uZSgpOyAvLyB0cnVlXG4gICAgICovXG4gICAgcnVuICguLi5hcmdzKSB7XG4gICAgICAgIC8vIFRPRE8gZWl0aGVyIGFzeW5jKCkgc2hvdWxkIHN1cHBvcnQgYWRkaXRpb25hbCBhcmdzLCBvciBydW4oKSBzaG91bGRuJ3RcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICBjb25zdCBibG9jayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhc3QgYXJndW1lbnQgb2YgcnVuKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLCBub3QgJyArIHR5cGVvZiBibG9jayk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGJsb2NrKHRoaXMsIC4uLmFyZ3MpO1xuICAgICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSlcbiAgICAgICAgICAgIHJlc3VsdC50aGVuKCAoKSA9PiB0aGlzLmRvbmUoKSApO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICB0aGlzLmRvbmUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBhcHBseSBnaXZlbiBmdW5jdGlvbiAoY29udHJhY3QpIHRvIGEgUmVwb3J0IG9iamVjdC5cbiAgICAgKiAgIE11bHRpcGxlIHN1Y2ggY29udHJhdHMgbWF5IGJlIGFwcGxpZWQsIGFuZCB0aGUgcmVwb3J0IGlzIG5vdCBsb2NrZWQuXG4gICAgICogICBBc3luYyBmdW5jdGlvbiBhcmUgcGVybWl0dGVkIGJ1dCBtYXkgbm90IGJlaGF2ZSBhcyBleHBlY3RlZC5cbiAgICAgKiAgIEBwYXJhbSB7Q29udHJhY3R9IGNvbnRyYWN0IFRoZSBmdW5jdGlvbiB0byBleGVjdXRlXG4gICAgICogICBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgbWF5IGJlIF9wcmVwZW5kZWRfIHRvIGNvbnRyYWN0XG4gICAgICogICBhbmQgd2lsbCBiZSBwYXNzZWQgdG8gaXQgX2FmdGVyXyB0aGUgUmVwb3J0IG9iamVjdCBpbiBxdWVzdGlvbi5cbiAgICAgKiAgIEByZXR1cm5zIHtSZXBvcnR9IHRoaXMgKGNoYWluYWJsZSlcbiAgICAgKiAgIEBleGFtcGxlIEJhc2ljIHVzYWdlXG4gICAgICogICBjb25zdCByID0gbmV3IFJlcG9ydCgpXG4gICAgICogICAgICAgLnJ1blN5bmMoIG9rID0+IG9rLmVxdWFsKCAnd2FyJywgJ3BlYWNlJywgJzE5ODQnICkgKVxuICAgICAqICAgICAgIC5ydW5TeW5jKCBvayA9PiBvay50eXBlICggW10sICdhcnJheScsICdzb21lIG1vcmUgY2hlY2tzJyApIClcbiAgICAgKiAgICAgICAuZG9uZSgpO1xuICAgICAqL1xuICAgIHJ1blN5bmMgKC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICBjb25zdCBibG9jayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhc3QgYXJndW1lbnQgb2YgcnVuKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLCBub3QgJyArIHR5cGVvZiBibG9jayk7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGJsb2NrKCB0aGlzLCAuLi5hcmdzICk7IC8qIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW51c2VkLXZhcnMgKi9cbiAgICAgICAgLy8gVE9ETyBjaGVjayB0aGF0IGByZXN1bHRgIGlzIE5PVCBhIHByb21pc2VcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgc2V0UmVzdWx0IChldmlkZW5jZSwgZGVzY3IsIGNvbmROYW1lLCB3aGVyZSkge1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIGNvbnN0IG4gPSArK3RoaXMuX2NvdW50O1xuICAgICAgICBpZiAoZGVzY3IpXG4gICAgICAgICAgICB0aGlzLl9kZXNjcltuXSA9IGRlc2NyO1xuICAgICAgICAvLyBwYXNzIC0gcmV0dXJuIEFTQVBcbiAgICAgICAgaWYgKCFldmlkZW5jZSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBuZXN0ZWQgcmVwb3J0IG5lZWRzIHNwZWNpYWwgaGFuZGxpbmdcbiAgICAgICAgaWYgKGV2aWRlbmNlIGluc3RhbmNlb2YgUmVwb3J0KSB7XG4gICAgICAgICAgICB0aGlzLl9uZXN0ZWRbbl0gPSBldmlkZW5jZTtcbiAgICAgICAgICAgIGlmIChldmlkZW5jZS5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXZpZGVuY2UuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIHNob3J0LWNpcmN1aXQgaWYgcG9zc2libGVcbiAgICAgICAgICAgICAgICBldmlkZW5jZSA9IFtdOyAvLyBoYWNrIC0gZmFpbGluZyB3aXRob3V0IGV4cGxhbmF0aW9uXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5lc3RlZCBjb250cmFjdCBpcyBpbiBhc3luYyBtb2RlIC0gY29lcmNlIGludG8gYSBwcm9taXNlXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycnkgPSBldmlkZW5jZTsgLyogZXNsaW50LWRpc2FibGUtbGluZSAqL1xuICAgICAgICAgICAgICAgIGV2aWRlbmNlID0gbmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY3Vycnkub25Eb25lKCByZXNvbHZlICk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwZW5kaW5nIC0gd2UncmUgaW4gYXN5bmMgbW9kZVxuICAgICAgICBpZiAoZXZpZGVuY2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nLmFkZChuKTtcbiAgICAgICAgICAgIHdoZXJlID0gd2hlcmUgfHwgY2FsbGVySW5mbygyKTsgLy8gbXVzdCByZXBvcnQgYWN0dWFsIGNhbGxlciwgbm90IHRoZW5cbiAgICAgICAgICAgIGV2aWRlbmNlLnRoZW4oIHggPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmcuZGVsZXRlKG4pO1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldFJlc3VsdChuLCB4LCBjb25kTmFtZSwgd2hlcmUgKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuX29uRG9uZS5sZW5ndGg7IGktLSA+IDA7IClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uRG9uZVtpXSh0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLl9zZXRSZXN1bHQobiwgZXZpZGVuY2UsIGNvbmROYW1lLCB3aGVyZSB8fCBjYWxsZXJJbmZvKDIpKTtcbiAgICB9XG5cbiAgICBfc2V0UmVzdWx0IChuLCBldmlkZW5jZSwgY29uZE5hbWUsIHdoZXJlKSB7XG4gICAgICAgIGlmICghZXZpZGVuY2UpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgLy8gbGlzdGlmeSAmIHN0cmluZ2lmeSBldmlkZW5jZSwgc28gdGhhdCBpdCBkb2Vzbid0IGNoYW5nZSBwb3N0LWZhY3R1bVxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZXZpZGVuY2UpKVxuICAgICAgICAgICAgZXZpZGVuY2UgPSBbZXZpZGVuY2VdO1xuICAgICAgICB0aGlzLl9ldmlkZW5jZVtuXSA9IGV2aWRlbmNlLm1hcCggeCA9PiBfZXhwbGFpbih4LCBJbmZpbml0eSkgKTtcbiAgICAgICAgdGhpcy5fd2hlcmVbbl0gICAgPSB3aGVyZTtcbiAgICAgICAgdGhpcy5fY29uZE5hbWVbbl0gPSBjb25kTmFtZTtcbiAgICAgICAgdGhpcy5fZmFpbENvdW50Kys7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgQXBwZW5kIGFuIGluZm9ybWF0aW9uYWwgbWVzc2FnZSB0byB0aGUgcmVwb3J0LlxuICAgICAqIE5vbi1zdHJpbmcgdmFsdWVzIHdpbGwgYmUgc3RyaW5naWZpZWQgdmlhIGV4cGxhaW4oKS5cbiAgICAgKiBAcGFyYW0ge0FueX0gbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtSZXBvcnR9IGNoYWluYWJsZVxuICAgICAqL1xuICAgIGluZm8gKCAuLi5tZXNzYWdlICkge1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIGlmICghdGhpcy5faW5mb1t0aGlzLl9jb3VudF0pXG4gICAgICAgICAgICB0aGlzLl9pbmZvW3RoaXMuX2NvdW50XSA9IFtdO1xuICAgICAgICB0aGlzLl9pbmZvW3RoaXMuX2NvdW50XS5wdXNoKCBtZXNzYWdlLm1hcCggcyA9PiBfZXhwbGFpbihzKSApLmpvaW4oJyAnKSApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIExvY2tzIHRoZSByZXBvcnQgb2JqZWN0LCBzbyBubyBtb2RpZmljYXRpb25zIG1heSBiZSBtYWRlIGxhdGVyLlxuICAgICAqICAgQWxzbyBpZiBvbkRvbmUgY2FsbGJhY2socykgYXJlIHByZXNlbnQsIHRoZXkgYXJlIGV4ZWN1dGVkXG4gICAgICogICB1bmxlc3MgdGhlcmUgYXJlIHBlbmRpbmcgYXN5bmMgY2hlY2tzLlxuICAgICAqICAgQHJldHVybnMge1JlcG9ydH0gdGhpcyAoY2hhaW5hYmxlKVxuICAgICAqL1xuICAgIGRvbmUgKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2RvbmUpIHtcbiAgICAgICAgICAgIHRoaXMuX2RvbmUgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9wZW5kaW5nLnNpemUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5fb25Eb25lLmxlbmd0aDsgaS0tID4gMDsgKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbkRvbmVbaV0odGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgaWYgdGhlIFJlcG9ydCBvYmplY3QgaXMgc3RpbGwgbW9kaWZpYWJsZSwgdGhyb3dzIG90aGVyd2lzZS5cbiAgICBfbG9jayAoKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIGNvbnRyYWN0Jyk7XG4gICAgfVxuXG4gICAgLy8gUXVlcnlpbmcgbWV0aG9kc1xuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyAgVGVsbHMgd2hldGhlciB0aGUgcmVwb3J0IGlzIGZpbmlzaGVkLFxuICAgICAqICAgICAgICAgIGkuZS4gZG9uZSgpIHdhcyBjYWxsZWQgJiBubyBwZW5kaW5nIGFzeW5jIGNoZWNrcy5cbiAgICAgKiAgIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGdldERvbmUgKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZG9uZSAmJiAhdGhpcy5fcGVuZGluZy5zaXplOyAvLyBpcyBpdCBldmVuIG5lZWRlZD9cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIFdpdGhvdXQgYXJndW1lbnQgcmV0dXJucyB3aGV0aGVyIHRoZSBjb250cmFjdCB3YXMgZnVsZmlsbGVkLlxuICAgICAqICAgQXMgYSBzcGVjaWFsIGNhc2UsIGlmIG5vIGNoZWNrcyB3ZXJlIHJ1biBhbmQgdGhlIGNvbnRyYWN0IGlzIGZpbmlzaGVkLFxuICAgICAqICAgcmV0dXJucyBmYWxzZSwgYXMgaW4gXCJzb21lb25lIG11c3QgaGF2ZSBmb3Jnb3R0ZW4gdG8gZXhlY3V0ZVxuICAgICAqICAgcGxhbm5lZCBjaGVja3MuIFVzZSBwYXNzKCkgaWYgbm8gY2hlY2tzIGFyZSBwbGFubmVkLlxuICAgICAqXG4gICAgICogICBJZiBhIHBhcmFtZXRlciBpcyBnaXZlbiwgcmV0dXJuIHRoZSBzdGF0dXMgb2Ygbi10aCBjaGVjayBpbnN0ZWFkLlxuICAgICAqICAgQHBhcmFtIHtpbnRlZ2VyfSBuXG4gICAgICogICBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBnZXRQYXNzIChuKSB7XG4gICAgICAgIGlmIChuID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZmFpbENvdW50ID09PSAwO1xuICAgICAgICByZXR1cm4gKG4gPiAwICYmIG4gPD0gdGhpcy5fY291bnQpID8gIXRoaXMuX2V2aWRlbmNlW25dIDogdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgTnVtYmVyIG9mIGNoZWNrcyBwZXJmb3JtZWQuXG4gICAgICogICBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldENvdW50ICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBXaGV0aGVyIHRoZSBsYXN0IGNoZWNrIHdhcyBhIHN1Y2Nlc3MuXG4gICAgICogIFRoaXMgaXMganVzdCBhIHNob3J0Y3V0IGZvciBmb28uZ2V0RGV0YWlscyhmb28uZ2V0Q291bnQpLnBhc3NcbiAgICAgKiAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgbGFzdCAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb3VudCA/ICF0aGlzLl9ldmlkZW5jZVt0aGlzLl9jb3VudF0gOiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBOdW1iZXIgb2YgY2hlY2tzIGZhaWxpbmcuXG4gICAgICogICBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldEZhaWxDb3VudCAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9mYWlsQ291bnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBSZXR1cm4gYSBzdHJpbmcgb2YgZmFpbGluZy9wYXNzaW5nIGNoZWNrcy5cbiAgICAgKiAgIFRoaXMgbWF5IGJlIHVzZWZ1bCBmb3IgdmFsaWRhdGluZyBjdXN0b20gY29uZGl0aW9ucy5cbiAgICAgKiAgIENvbnNlY3V0aXZlIHBhc3NpbmcgY2hlY2thIGFyZSByZXByZXNlbnRlZCBieSBudW1iZXJzLlxuICAgICAqICAgQSBjYXBpdGFsIGxldHRlciBpbiB0aGUgc3RyaW5nIHJlcHJlc2VudHMgZmFpbHVyZS5cbiAgICAgKiAgIFNlZSBhbHNvIHtAbGluayBSZXBvcnQjdG9TdHJpbmcgdG9TdHJpbmcoKX1cbiAgICAgKiAgIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgcGFzc2luZyBjaGVja3NcbiAgICAgKiAgIFwicigxMClcIlxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIGNoZWNrcyB3aXRoIDEgZmFpbHVyZSBpbiB0aGUgbWlkZGxlXG4gICAgICogICBcInIoNSxOLDQpXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBjaGVja3MgaW5jbHVkaW5nIGEgbmVzdGVkIGNvbnRyYWN0XG4gICAgICogICBcInIoMyxyKDEsTiksNilcIlxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIG5vIGNoZWNrcyB3ZXJlIHJ1biAtIGF1dG8tZmFpbFxuICAgICAqICAgXCJyKFopXCJcbiAgICAgKi9cbiAgICBnZXRHaG9zdCAoKSB7XG4gICAgICAgIGNvbnN0IGdob3N0ID0gW107XG4gICAgICAgIGxldCBzdHJlYWsgID0gMDtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPD0gdGhpcy5fY291bnQ7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2V2aWRlbmNlW2ldIHx8IHRoaXMuX25lc3RlZFtpXSkge1xuICAgICAgICAgICAgICAgIGlmIChzdHJlYWspIGdob3N0LnB1c2goc3RyZWFrKTtcbiAgICAgICAgICAgICAgICBzdHJlYWsgPSAwO1xuICAgICAgICAgICAgICAgIGdob3N0LnB1c2goIHRoaXMuX25lc3RlZFtpXSA/IHRoaXMuX25lc3RlZFtpXS5nZXRHaG9zdCgpIDogJ04nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7IC8qIGVzbGludC1kZXNhYmxlLWxpbmUgY3VybHkgKi9cbiAgICAgICAgICAgICAgICBzdHJlYWsrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RyZWFrKSBnaG9zdC5wdXNoKHN0cmVhayk7XG4gICAgICAgIHJldHVybiAncignICsgZ2hvc3Quam9pbignLCcpICsgJyknO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBSZXR1cm5zIHNlcmlhbGl6ZWQgZGlmZi1saWtlIHJlcG9ydCB3aXRoIG5lc3RpbmcgYW5kIGluZGVudGF0aW9uLlxuICAgICAqICBQYXNzaW5nIGNvbmRpdGlvbnMgYXJlIG1lcmtlZCB3aXRoIG51bWJlcnMsIGZhaWxpbmcgYXJlIHByZWZpeGVkXG4gICAgICogIHdpdGggYSBiYW5nICghKS5cbiAgICAgKlxuICAgICAqICBTZWUgYWxzbyB7QGxpbmsgUmVwb3J0I2dldEdob3N0IGdldEdob3N0KCl9XG4gICAgICogIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICogIEBleGFtcGxlIC8vIG5vIGNoZWNrcyBydW5cbiAgICAgKiAgY29uc3QgciA9IG5ldyBSZXBvcnQoKTtcbiAgICAgKiAgci50b1N0cmluZygpO1xuICAgICAqICByKFxuICAgICAqICApXG4gICAgICogIEBleGFtcGxlIC8vIHBhc3NcbiAgICAgKiAgY29uc3QgciA9IG5ldyBSZXBvcnQoKTtcbiAgICAgKiAgci5wYXNzKCdmb28gYmFyZWQnKTtcbiAgICAgKiAgci50b1N0cmluZygpO1xuICAgICAqICByKFxuICAgICAqICAgICAgMS4gZm9vIGJhcmVkXG4gICAgICogIClcbiAgICAgKiAgQGV4YW1wbGUgLy8gZmFpbFxuICAgICAqICBjb25zdCByID0gbmV3IFJlcG9ydCgpO1xuICAgICAqICByLmVxdWFsKCd3YXInLCAncGVhY2UnKTtcbiAgICAgKiAgci50b1N0cmluZygpO1xuICAgICAqICByKFxuICAgICAqICAgICAgITEuXG4gICAgICogICAgICBeIENvbmRpdGlvbiBlcXVhbCBmYWlsZWQgYXQgPGZpbGU+OjxsaW5lPjo8Y2hhcj5cbiAgICAgKiAgICAgIC0gd2FyXG4gICAgICogICAgICArIHBlYWNlXG4gICAgICogIClcbiAgICAgKi9cbiAgICB0b1N0cmluZyAoKSB7XG4gICAgICAgIC8vIFRPRE8gcmVwbGFjZSB3aXRoIHJlZnV0ZS5pbyB3aGVuIHdlIGJ1eSB0aGUgZG9tYWluXG4gICAgICAgIHJldHVybiAncmVmdXRlLycgKyBwcm90b2NvbCArICdcXG4nICsgdGhpcy5nZXRMaW5lcygpLmpvaW4oJ1xcbicpO1xuICAgIH1cblxuICAgIGdldExpbmVzIChpbmRlbnQgPSAnJykge1xuICAgICAgICBjb25zdCBvdXQgID0gW2luZGVudCArICdyKCddO1xuICAgICAgICBjb25zdCBsYXN0ID0gaW5kZW50ICsgJyknO1xuICAgICAgICBpbmRlbnQgICAgID0gaW5kZW50ICsgJyAgICAnO1xuXG4gICAgICAgIGNvbnN0IHBhZCA9IHByZWZpeCA9PiBzID0+IGluZGVudCArIHByZWZpeCArICcgJyArIHM7XG5cbiAgICAgICAgaWYgKHRoaXMuX2luZm9bMF0pXG4gICAgICAgICAgICBvdXQucHVzaCggLi4udGhpcy5faW5mb1swXS5tYXAoIHBhZCgnOycpICkgKTtcbiAgICAgICAgZm9yIChsZXQgbiA9IDE7IG4gPD0gdGhpcy5fY291bnQ7IG4rKykge1xuICAgICAgICAgICAgb3V0LnB1c2goIC4uLnRoaXMuZ2V0TGluZXNQYXJ0aWFsKCBuLCBpbmRlbnQgKSApO1xuICAgICAgICAgICAgaWYgKHRoaXMuX2luZm9bbl0pXG4gICAgICAgICAgICAgICAgb3V0LnB1c2goIC4uLnRoaXMuX2luZm9bbl0ubWFwKCBwYWQoJzsnKSApICk7XG4gICAgICAgIH1cbiAgICAgICAgb3V0LnB1c2gobGFzdCk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuXG4gICAgZ2V0TGluZXNQYXJ0aWFsIChuLCBpbmRlbnQgPSAnJykge1xuICAgICAgICBjb25zdCBvdXQgPSBbXTtcbiAgICAgICAgb3V0LnB1c2goXG4gICAgICAgICAgICBpbmRlbnRcbiAgICAgICAgICAgICsgKHRoaXMuX3BlbmRpbmcuaGFzKG4pID8gJy4uLicgOiAodGhpcy5fZXZpZGVuY2Vbbl0gPyAnIScgOiAnJykgKVxuICAgICAgICAgICAgKyBuICsgKHRoaXMuX2Rlc2NyW25dID8gJy4gJyArIHRoaXMuX2Rlc2NyW25dIDogJy4nKVxuICAgICAgICApO1xuICAgICAgICBpZiAodGhpcy5fbmVzdGVkW25dKSB7IC8qIGVzbGludC1kaXNhYmxlLWxpbmUgY3VybHkgKi9cbiAgICAgICAgICAgIG91dC5wdXNoKCAuLi50aGlzLl9uZXN0ZWRbbl0uZ2V0TGluZXMoaW5kZW50KSApO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2V2aWRlbmNlW25dKSB7XG4gICAgICAgICAgICBvdXQucHVzaCggaW5kZW50ICsgJyAgICBeIENvbmRpdGlvbiBgJyArICh0aGlzLl9jb25kTmFtZVtuXSB8fCAnY2hlY2snKVxuICAgICAgICAgICAgICAgICsgJ2AgZmFpbGVkIGF0ICcgKyB0aGlzLl93aGVyZVtuXSApO1xuICAgICAgICAgICAgdGhpcy5fZXZpZGVuY2Vbbl0uZm9yRWFjaCggcmF3ID0+IHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgbXVsdGlsaW5lIGV2aWRlbmNlXG4gICAgICAgICAgICAgICAgLy8gVE9ETyB0aGlzIGlzIHBlcmwgd3JpdHRlbiBpbiBKUywgcmV3cml0ZSBtb3JlIGNsZWFybHlcbiAgICAgICAgICAgICAgICBsZXQgW18sIHByZWZpeCwgc10gPSByYXcubWF0Y2goIC9eKFstK3xdICk/KC4qPylcXG4/JC9zICk7XG4gICAgICAgICAgICAgICAgaWYgKCFwcmVmaXgpIHByZWZpeCA9ICd8ICc7XG4gICAgICAgICAgICAgICAgaWYgKCFzLm1hdGNoKC9cXG4vKSkgeyAvKiBlc2xpbmUtZGlzYWJsZS1saW5lIGN1cmx5ICovXG4gICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKCBpbmRlbnQgKyAnICAgICcgKyBwcmVmaXggKyBzICk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcy5zcGxpdCgnXFxuJykuZm9yRWFjaChcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnQgPT4gb3V0LnB1c2goIGluZGVudCArICcgICAgJyArIHByZWZpeCArIHBhcnQgKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgcmV0dXJucyBhIHBsYWluIHNlcmlhbGl6YWJsZSBvYmplY3RcbiAgICAgKiAgQHJldHVybnMge09iamVjdH1cbiAgICAgKi9cbiAgICB0b0pTT04gKCkge1xuICAgICAgICBjb25zdCBuID0gdGhpcy5nZXRDb3VudCgpO1xuICAgICAgICBjb25zdCBkZXRhaWxzID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IG47IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuZ2V0RGV0YWlscyhpKTtcbiAgICAgICAgICAgIC8vIHN0cmlwIGV4dHJhIGtleXNcbiAgICAgICAgICAgIGZvciAoY29uc3Qga2V5IGluIG5vZGUpIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZVtrZXldID09PSB1bmRlZmluZWQgfHwgKEFycmF5LmlzQXJyYXkobm9kZVtrZXldKSAmJiBub2RlW2tleV0ubGVuZ3RoID09PSAwKSlcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG5vZGVba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRldGFpbHMucHVzaChub2RlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcGFzczogIHRoaXMuZ2V0UGFzcygpLFxuICAgICAgICAgICAgY291bnQ6IHRoaXMuZ2V0Q291bnQoKSxcbiAgICAgICAgICAgIGRldGFpbHMsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBSZXR1cm5zIGRldGFpbGVkIHJlcG9ydCBvbiBhIHNwZWNpZmljIGNoZWNrXG4gICAgICogICBAcGFyYW0ge2ludGVnZXJ9IG4gLSBjaGVjayBudW1iZXIsIG11c3QgYmUgPD0gZ2V0Q291bnQoKVxuICAgICAqICAgQHJldHVybnMge29iamVjdH1cbiAgICAgKi9cbiAgICBnZXREZXRhaWxzIChuKSB7XG4gICAgICAgIC8vIFRPRE8gdmFsaWRhdGUgblxuXG4gICAgICAgIC8vIHVnbHkgYnV0IHdoYXQgY2FuIEkgZG9cbiAgICAgICAgaWYgKG4gPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbjogICAgMCxcbiAgICAgICAgICAgICAgICBpbmZvOiB0aGlzLl9pbmZvWzBdIHx8IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBldmlkZW5jZSA9IHRoaXMuX2V2aWRlbmNlW25dO1xuICAgICAgICBpZiAoZXZpZGVuY2UgJiYgIUFycmF5LmlzQXJyYXkoZXZpZGVuY2UpKVxuICAgICAgICAgICAgZXZpZGVuY2UgPSBbZXZpZGVuY2VdO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuOiAgICAgICAgbixcbiAgICAgICAgICAgIG5hbWU6ICAgICB0aGlzLl9kZXNjcltuXSB8fCAnJyxcbiAgICAgICAgICAgIHBhc3M6ICAgICAhZXZpZGVuY2UsXG4gICAgICAgICAgICBldmlkZW5jZTogZXZpZGVuY2UgfHwgW10sXG4gICAgICAgICAgICB3aGVyZTogICAgdGhpcy5fd2hlcmVbbl0sXG4gICAgICAgICAgICBjb25kOiAgICAgdGhpcy5fY29uZE5hbWVbbl0sXG4gICAgICAgICAgICBpbmZvOiAgICAgdGhpcy5faW5mb1tuXSB8fCBbXSxcbiAgICAgICAgICAgIG5lc3RlZDogICB0aGlzLl9uZXN0ZWRbbl0sXG4gICAgICAgICAgICBwZW5kaW5nOiAgdGhpcy5fcGVuZGluZy5oYXMobiksXG4gICAgICAgIH07XG4gICAgfVxufVxuXG4vLyB0aGlzIGlzIGZvciBzdHVmZiBsaWtlIGBvYmplY3QgZm9vID0ge1wiZm9vXCI6NDJ9YFxuLy8gd2UgZG9uJ3Qgd2FudCB0aGUgZXhwbGFuYXRpb24gdG8gYmUgcXVvdGVkIVxuZnVuY3Rpb24gX2V4cGxhaW4gKCBpdGVtLCBkZXB0aCApIHtcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnIClcbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgcmV0dXJuIGV4cGxhaW4oIGl0ZW0sIHsgZGVwdGggfSApO1xufVxuXG5SZXBvcnQucHJvdG90eXBlLmV4cGxhaW4gPSBleHBsYWluOyAvLyBhbHNvIG1ha2UgYXZhaWxhYmxlIHZpYSByZXBvcnRcblJlcG9ydC5wcm90b2NvbCA9IHByb3RvY29sO1xuXG4vLyBwYXJ0IG9mIGFkZENvbmRpdGlvblxuY29uc3Qga25vd25DaGVja3MgPSBuZXcgU2V0KCk7XG5cbi8qIE5PVEUgUGxlYXNlIGtlZXAgYWxsIGFkZENvbmRpdGlvbiBpbnZvY2F0aW9ucyBzZWFyY2hhYmxlIHZpYSAqL1xuLyogZ3JlcCAtciBcIl4gKmFkZENvbmRpdGlvbi4qJ1wiIC9cbi8qKlxuICogIEBtZW1iZXJPZiByZWZ1dGVcbiAqICBAc3RhdGljXG4gKiAgQGRlc2MgQ3JlYXRlIG5ldyBjaGVjayBtZXRob2QgYXZhaWxhYmxlIHZpYSBhbGwgUmVwb3J0IGluc3RhbmNlc1xuICogIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWUgb2YgdGhlIG5ldyBjb25kaXRpb24uXG4gKiAgTXVzdCBub3QgYmUgcHJlc2VudCBpbiBSZXBvcnQgYWxyZWFkeSwgYW5kIHNob3VsZCBOT1Qgc3RhcnQgd2l0aFxuICogIGdldC4uLiwgc2V0Li4uLCBvciBhZGQuLi4gKHRoZXNlIGFyZSByZXNlcnZlZCBmb3IgUmVwb3J0IGl0c2VsZilcbiAqICBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBDb25maWd1cmluZyB0aGUgY2hlY2sncyBoYW5kbGluZyBvZiBhcmd1bWVudHNcbiAqICBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMuYXJncyBUaGUgcmVxdWlyZWQgbnVtYmVyIG9mIGFyZ3VtZW50c1xuICogIEBwYXJhbSB7aW50ZWdlcn0gW29wdGlvbnMubWluQXJnc10gTWluaW11bSBudW1iZXIgb2YgYXJndW1lbnQgKGRlZmF1bHRzIHRvIGFyZ3MpXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBbb3B0aW9ucy5tYXhBcmdzXSBNYXhpbXVtIG51bWJlciBvZiBhcmd1bWVudCAoZGVmYXVsdHMgdG8gYXJncylcbiAqICBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmhhc09wdGlvbnNdIElmIHRydWUsIGFuIG9wdGlvbmFsIG9iamVjdFxuY2FuIGJlIHN1cHBsaWVkIGFzIGxhc3QgYXJndW1lbnQuIEl0IHdvbid0IGludGVyZmVyZSB3aXRoIGRlc2NyaXB0aW9uLlxuICogIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuZnVuXSBUaGUgbGFzdCBhcmd1bWVudCBpcyBhIGNhbGxiYWNrXG4gKiAgQHBhcmFtIHtGdW5jdGlvbn0gaW1wbGVtZW50YXRpb24gLSBhIGNhbGxiYWNrIHRoYXQgdGFrZXMge2FyZ3N9IGFyZ3VtZW50c1xuICogIGFuZCByZXR1cm5zIGEgZmFsc2V5IHZhbHVlIGlmIGNvbmRpdGlvbiBwYXNzZXNcbiAqICAoXCJub3RoaW5nIHRvIHNlZSBoZXJlLCBtb3ZlIGFsb25nXCIpLFxuICogIG9yIGV2aWRlbmNlIGlmIGl0IGZhaWxzXG4gKiAgKGUuZy4gdHlwaWNhbGx5IGEgZ290L2V4cGVjdGVkIGRpZmYpLlxuICovXG5mdW5jdGlvbiBhZGRDb25kaXRpb24gKG5hbWUsIG9wdGlvbnMsIGltcGwpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiBuYW1lIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXihffGdldFtfQS1aXXxzZXRbX0EtWl0pLykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uIG5hbWUgbXVzdCBub3Qgc3RhcnQgd2l0aCBnZXRfLCBzZXRfLCBvciBfJyk7XG4gICAgLy8gVE9ETyBtdXN0IGRvIHNvbWV0aGluZyBhYm91dCBuYW1lIGNsYXNoZXMsIGJ1dCBsYXRlclxuICAgIC8vIGJlY2F1c2UgZXZhbCBpbiBicm93c2VyIG1heSAoa2luZCBvZiBsZWdpbWl0ZWx5KSBvdmVycmlkZSBjb25kaXRpb25zXG4gICAgaWYgKCFrbm93bkNoZWNrcy5oYXMobmFtZSkgJiYgUmVwb3J0LnByb3RvdHlwZVtuYW1lXSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2QgYWxyZWFkeSBleGlzdHMgaW4gUmVwb3J0OiAnICsgbmFtZSk7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSAnb2JqZWN0JylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdiYWQgb3B0aW9ucycpO1xuICAgIGlmICh0eXBlb2YgaW1wbCAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdiYWQgaW1wbGVtZW50YXRpb24nKTtcblxuICAgIGNvbnN0IG1pbkFyZ3MgICAgPSBvcHRpb25zLm1pbkFyZ3MgfHwgb3B0aW9ucy5hcmdzO1xuICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihtaW5BcmdzKSB8fCBtaW5BcmdzIDwgMClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdhcmdzL21pbkFyZ3MgbXVzdCBiZSBub25uZWdhdGl2ZSBpbnRlZ2VyJyk7XG4gICAgY29uc3QgbWF4QXJncyAgICA9IG9wdGlvbnMubWF4QXJncyB8fCBvcHRpb25zLmFyZ3MgfHwgSW5maW5pdHk7XG4gICAgaWYgKG1heEFyZ3MgIT09IEluZmluaXR5ICYmICghTnVtYmVyLmlzSW50ZWdlcihtaW5BcmdzKSB8fCBtYXhBcmdzIDwgbWluQXJncykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbWF4QXJncyBtdXN0IGJlIGludGVnZXIgYW5kIGdyZWF0ZXIgdGhhbiBtaW5BcmdzLCBvciBJbmZpbml0eScpO1xuICAgIGNvbnN0IGRlc2NyRmlyc3QgICAgPSBvcHRpb25zLmRlc2NyRmlyc3QgfHwgb3B0aW9ucy5mdW4gfHwgbWF4QXJncyA+IDEwO1xuICAgIGNvbnN0IGhhc09wdGlvbnMgICAgPSAhIW9wdGlvbnMuaGFzT3B0aW9ucztcbiAgICBjb25zdCBtYXhBcmdzUmVhbCAgID0gbWF4QXJncyArIChoYXNPcHRpb25zID8gMSA6IDApO1xuXG4gICAgLy8gVE9ETyBhbGVydCB1bmtub3duIG9wdGlvbnNcblxuICAgIC8vIFRPRE8gdGhpcyBjb2RlIGlzIGNsdXR0ZXJlZCwgcmV3cml0ZVxuICAgIGNvbnN0IGNvZGUgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICAvLyBUT0RPIGNvbnN0IG5BcmdzID0gYXJncy5sZW5ndGhcbiAgICAgICAgY29uc3QgZGVzY3IgPSBkZXNjckZpcnN0XG4gICAgICAgICAgICA/IGFyZ3Muc2hpZnQoKVxuICAgICAgICAgICAgOiAoIChhcmdzLmxlbmd0aCA+IG1heEFyZ3MgJiYgdHlwZW9mIGFyZ3NbYXJncy5sZW5ndGggLSAxXSA9PT0gJ3N0cmluZycpID8gYXJncy5wb3AoKSA6IHVuZGVmaW5lZCk7XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IG1heEFyZ3NSZWFsIHx8IGFyZ3MubGVuZ3RoIDwgbWluQXJncylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uICcgKyBuYW1lICsgJyBtdXN0IGhhdmUgJyArIG1pbkFyZ3MgKyAnLi4nICsgbWF4QXJnc1JlYWwgKyAnIGFyZ3VtZW50cyAnKTsgLy8gVE9ET1xuXG4gICAgICAgIHJldHVybiB0aGlzLnNldFJlc3VsdCggaW1wbCguLi5hcmdzKSwgZGVzY3IsIG5hbWUgKTtcbiAgICB9O1xuXG4gICAga25vd25DaGVja3MuYWRkKG5hbWUpO1xuICAgIFJlcG9ydC5wcm90b3R5cGVbbmFtZV0gPSBjb2RlO1xufVxuXG4vLyBUaGUgbW9zdCBiYXNpYyBjb25kaXRpb25zIGFyZSBkZWZpbmVkIHJpZ2h0IGhlcmVcbi8vIGluIG9yZGVyIHRvIGJlIHN1cmUgd2UgY2FuIHZhbGlkYXRlIHRoZSBSZXBvcnQgY2xhc3MgaXRzZWxmLlxuXG4vKipcbiAqICBAbmFtZXNwYWNlIGNvbmRpdGlvbnNcbiAqICBAZGVzYyBDb25kaXRpb24gY2hlY2sgbGlicmFyeS4gVGhlc2UgbWV0aG9kcyBtdXN0IGJlIHJ1biBvbiBhXG4gKiAge0BsaW5rIFJlcG9ydH0gb2JqZWN0LlxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgY2hlY2tcbiAqICAgQGRlc2MgQSBnZW5lcmljIGNoZWNrIG9mIGEgY29uZGl0aW9uLlxuICogICBAcGFyYW0gZXZpZGVuY2UgSWYgZmFsc2UsIDAsICcnLCBvciB1bmRlZmluZWQsIHRoZSBjaGVjayBpcyBhc3N1bWVkIHRvIHBhc3MuXG4gKiAgIE90aGVyd2lzZSBpdCBmYWlscywgYW5kIHRoaXMgYXJndW1lbnQgd2lsbCBiZSBkaXNwbGF5ZWQgYXMgdGhlIHJlYXNvbiB3aHkuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dIFRoZSByZWFzb24gd2h5IHdlIGNhcmUgYWJvdXQgdGhlIGNoZWNrLlxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgcGFzc1xuICogICBAZGVzYyBBbHdheXMgcGFzc2VzLlxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgZmFpbFxuICogICBAZGVzYyBBbHdheXMgZmFpbHMgd2l0aCBhIFwiZmFpbGVkIGRlbGliZXJhdGVseVwiIG1lc3NhZ2UuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBlcXVhbFxuICogICBAZGVzYyBDaGVja3MgaWYgPT09IGhvbGRzIGJldHdlZW4gdHdvIHZhbHVlcy5cbiAqICAgSWYgbm90LCBib3RoIHdpbGwgYmUgc3RyaW5naWZpZWQgYW5kIGRpc3BsYXllZCBhcyBhIGRpZmYuXG4gKiAgIFNlZSBkZWVwRXF1YWwgdG8gY2hlY2sgbmVzdGVkIGRhdGEgc3RydWN0dXJlcyBvdCBvYmplY3RzLlxuICogICBAcGFyYW0ge2FueX0gYWN0dWFsXG4gKiAgIEBwYXJhbSB7YW55fSBleHBlY3RlZFxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgbWF0Y2hcbiAqICAgQGRlc2MgQ2hlY2tzIGlmIGEgc3RyaW5nIG1hdGNoZXMgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKiAgIEBwYXJhbSB7c3RydW5nfSBhY3R1YWxcbiAqICAgQHBhcmFtIHtSZWdFeHB9IGV4cGVjdGVkXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBuZXN0ZWRcbiAqICAgQGRlc2MgVmVyaWZ5IGEgbmVzdGVkIGNvbnRyYWN0LlxuICogICBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRpb25cbiAqICAgQHBhcmFtIHtDb250cmFjdH0gY29udHJhY3RcbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuXG5hZGRDb25kaXRpb24oICdjaGVjaycsXG4gICAgeyBhcmdzOiAxIH0sXG4gICAgeCA9PiB4XG4pO1xuYWRkQ29uZGl0aW9uKCAncGFzcycsXG4gICAgeyBhcmdzOiAwIH0sXG4gICAgKCkgPT4gMFxuKTtcbmFkZENvbmRpdGlvbiggJ2ZhaWwnLFxuICAgIHsgYXJnczogMCB9LFxuICAgICgpID0+ICdmYWlsZWQgZGVsaWJlcmF0ZWx5J1xuKTtcbmFkZENvbmRpdGlvbiggJ2VxdWFsJyxcbiAgICB7IGFyZ3M6IDIgfSxcbiAgICAoYSwgYikgPT4gYSA9PT0gYiA/IDAgOiBbJy0gJyArIGV4cGxhaW4oYSksICcrICcgKyBleHBsYWluKGIpXVxuKTtcbmFkZENvbmRpdGlvbiggJ21hdGNoJyxcbiAgICB7IGFyZ3M6IDIgfSxcbiAgICAvLyBUT0RPIGZ1bmN0aW9uKHN0ciwgcmV4KVxuICAgIChhLCByZXgpID0+IChhID09PSB1bmRlZmluZWQgfHwgYSA9PT0gbnVsbClcbiAgICAgICAgPyBbJycgKyBhLCAnRG9lcyBub3QgbWF0Y2ggOiAnICsgcmV4XVxuICAgICAgICA6ICgnJyArIGEpLm1hdGNoKHJleClcbiAgICAgICAgICAgID8gMFxuICAgICAgICAgICAgOiBbXG4gICAgICAgICAgICAgICAgJ1N0cmluZyAgICAgICAgIDogJyArIGEsXG4gICAgICAgICAgICAgICAgJ0RvZXMgbm90IG1hdGNoIDogJyArIHJleCxcbiAgICAgICAgICAgIF1cbik7XG5hZGRDb25kaXRpb24oICduZXN0ZWQnLFxuICAgIHsgZnVuOiAxLCBtaW5BcmdzOiAxIH0sXG4gICAgKC4uLmFyZ3MpID0+IG5ldyBSZXBvcnQoKS5ydW4oLi4uYXJncykuZG9uZSgpXG4pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHsgUmVwb3J0LCBhZGRDb25kaXRpb24sIGV4cGxhaW4gfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiAgIEBuYW1lc3BhY2UgdXRpbGl0aWVzXG4gKiAgIEBkZXNjICBUaGVzZSBmdW5jdGlvbnMgaGF2ZSBub3RoaW5nIHRvIGRvIHdpdGggcmVmdXRhYmxlXG4gKiAgICAgICAgICBhbmQgc2hvdWxkIGlkZWFsbHkgYmUgaW4gc2VwYXJhdGUgbW9kdWxlcy5cbiAqL1xuXG4vKiBEZXRlcm1pbmUgbi10aCBjYWxsZXIgdXAgdGhlIHN0YWNrICovXG4vKiBJbnNwaXJlZCBieSBQZXJsJ3MgQ2FycCBtb2R1bGUgKi9cbmNvbnN0IGluU3RhY2sgPSAvKFteOlxccygpXSs6XFxkKyg/OjpcXGQrKT8pXFxXKihcXG58JCkvZztcblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBtZW1iZXJPZiB1dGlsaXRpZXNcbiAqICBAZnVuY3Rpb25cbiAqICBAZGVzYyBSZXR1cm5zIHNvdXJjZSBwb3NpdGlvbiBuIGZyYW1lcyB1cCB0aGUgc3RhY2tcbiAqICBAZXhhbXBsZVxuICogIFwiL2Zvby9iYXIuanM6MjU6MTFcIlxuICogIEBwYXJhbSB7aW50ZWdlcn0gZGVwdGggSG93IG1hbnkgZnJhbWVzIHRvIHNraXBcbiAqICBAcmV0dXJucyB7c3RyaW5nfSBzb3VyY2UgZmlsZSwgbGluZSwgYW5kIGNvbHVtbiwgc2VwYXJhdGVkIGJ5IGNvbG9uLlxuICovXG5mdW5jdGlvbiBjYWxsZXJJbmZvIChuKSB7XG4gICAgLyogYSB0ZXJyaWJsZSByZXggdGhhdCBiYXNpY2FsbHkgc2VhcmNoZXMgZm9yIGZpbGUuanM6bm5uOm5ubiBzZXZlcmFsIHRpbWVzICovXG4gICAgcmV0dXJuIChuZXcgRXJyb3IoKS5zdGFjay5tYXRjaChpblN0YWNrKVtuICsgMV0ucmVwbGFjZSgvXFxXKlxcbiQvLCAnJykgfHwgJycpXG59XG5cbi8qKlxuICogIEBwdWJsaWNcbiAqICBAaW5zdGFuY2VcbiAqICBAbWVtYmVyT2YgUmVwb3J0XG4gKiAgQGRlc2MgU3RyaW5naWZ5IG9iamVjdHMgcmVjdXJzaXZlbHkgd2l0aCBsaW1pdGVkIGRlcHRoXG4gKiAgYW5kIGNpcmN1bGFyIHJlZmVyZW5jZSB0cmFja2luZy5cbiAqICBHZW5lcmFsbHkgSlNPTi5zdHJpbmdpZnkgaXMgdXNlZCBhcyByZWZlcmVuY2U6XG4gKiAgc3RyaW5ncyBhcmUgZXNjYXBlZCBhbmQgZG91YmxlLXF1b3RlZDsgbnVtYmVycywgYm9vbGVhbiwgYW5kIG51bGxzIGFyZVxuICogIHN0cmluZ2lmaWVkIFwiYXMgaXNcIjsgb2JqZWN0cyBhbmQgYXJyYXlzIGFyZSBkZXNjZW5kZWQgaW50by5cbiAqICBUaGUgZGlmZmVyZW5jZXMgZm9sbG93OlxuICogIHVuZGVmaW5lZCBpcyByZXBvcnRlZCBhcyAnPHVuZGVmPicuXG4gKiAgT2JqZWN0cyB0aGF0IGhhdmUgY29uc3RydWN0b3JzIGFyZSBwcmVmaXhlZCB3aXRoIGNsYXNzIG5hbWVzLlxuICogIE9iamVjdCBhbmQgYXJyYXkgY29udGVudCBpcyBhYmJyZXZpYXRlZCBhcyBcIi4uLlwiIGFuZCBcIkNpcmN1bGFyXCJcbiAqICBpbiBjYXNlIG9mIGRlcHRoIGV4aGF1c3Rpb24gYW5kIGNpcmN1bGFyIHJlZmVyZW5jZSwgcmVzcGVjdGl2ZWx5LlxuICogIEZ1bmN0aW9ucyBhcmUgbmFpdmVseSBzdHJpbmdpZmllZC5cbiAqICBAcGFyYW0ge0FueX0gdGFyZ2V0IFRoaW5neSB0byBzZXJpYWxpemUuXG4gKiAgQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcbiAqICBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMuZGVwdGggSG93IG1hbnkgbGV2ZWxzIHRvIGRlc2NlbmQuIERlZmF1bHQgPSAzLlxuICogIEBwYXJhbSB7c3RyaW5nfSAgb3B0aW9ucy5wYXRoIENpcmN1bGFyIHJlZmVyZW5jZSBwYXRoIHByZWZpeC4gRGVmYXVsdCA9ICckJy5cbiAqICBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5mdW5jdGlvbiBleHBsYWluICggaXRlbSwgb3B0aW9ucyA9IHt9ICkge1xuICAgIHJldHVybiBfZXhwbGFpbiggaXRlbSwgb3B0aW9ucy5kZXB0aCB8fCAzLCBvcHRpb25zLnBhdGggfHwgJyQnICk7XG59XG5cbmZ1bmN0aW9uIF9leHBsYWluIChpdGVtLCBkZXB0aCwgcGF0aCwgc2VlbiA9IG5ldyBNYXAoKSkge1xuICAgIC8vIHNpbXBsZSB0eXBlc1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpXG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShpdGVtKTsgLy8gZG9uJ3Qgd2FudCB0byBzcGVuZCB0aW1lIHFvdXRpbmdcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdudW1iZXInIHx8IHR5cGVvZiBpdGVtID09PSAnYm9vbGVhbicgfHwgaXRlbSA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuICcnICsgaXRlbTtcbiAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gJzx1bmRlZj4nO1xuICAgIGlmICh0eXBlb2YgaXRlbSAhPT0gJ29iamVjdCcpIC8vIG1heWJlIGZ1bmN0aW9uXG4gICAgICAgIHJldHVybiAnJyArIGl0ZW07IC8vIFRPRE8gZG9uJ3QgcHJpbnQgb3V0IGEgbG9uZyBmdW5jdGlvbidzIGJvZHlcblxuICAgIC8vIGNoZWNrIGNpcmN1bGFyaXR5XG4gICAgaWYgKHNlZW4uaGFzKGl0ZW0pKSB7XG4gICAgICAgIGNvbnN0IG5vdGUgPSAnQ2lyY3VsYXI9JyArIHNlZW4uZ2V0KGl0ZW0pO1xuICAgICAgICByZXR1cm4gQXJyYXkuaXNBcnJheShpdGVtKSA/ICdbICcgKyBub3RlICsgJyBdJyA6ICd7ICcgKyBub3RlICsgJyB9JztcbiAgICB9XG5cbiAgICAvLyByZWN1cnNlXG4gICAgdHJ5IHtcbiAgICAgICAgLy8gdXNlIHRyeSB7IC4uLiB9IGZpbmFsbHkgeyAuLi4gfSB0byByZW1vdmUgaXRlbSBmcm9tIHNlZW4gb24gcmV0dXJuXG4gICAgICAgIHNlZW4uc2V0KCBpdGVtLCBwYXRoICk7XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoaXRlbSkpIHtcbiAgICAgICAgICAgIGlmIChkZXB0aCA8IDEpXG4gICAgICAgICAgICAgICAgcmV0dXJuICdbLi4uXSc7XG4gICAgICAgICAgICAvLyBUT0RPIDx4IGVtcHR5IGl0ZW1zPlxuICAgICAgICAgICAgY29uc3QgbGlzdCA9IGl0ZW0ubWFwKFxuICAgICAgICAgICAgICAgICh2YWwsIGluZGV4KSA9PiBfZXhwbGFpbih2YWwsIGRlcHRoIC0gMSwgcGF0aCArICdbJyArIGluZGV4ICsgJ10nLCBzZWVuKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHJldHVybiAnWycgKyBsaXN0LmpvaW4oJywgJykgKyAnXSc7IC8vIFRPRE8gY29uZmlndXJhYmxlIHdoaXRlc3BhY2VcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHR5cGUgPSBpdGVtLmNvbnN0cnVjdG9yICYmIGl0ZW0uY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgY29uc3QgcHJlZml4ID0gdHlwZSAmJiB0eXBlICE9PSAnT2JqZWN0JyA/IHR5cGUgKyAnICcgOiAnJztcbiAgICAgICAgaWYgKGRlcHRoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiBwcmVmaXggKyAney4uLn0nO1xuICAgICAgICBjb25zdCBsaXN0ID0gT2JqZWN0LmtleXMoaXRlbSkuc29ydCgpLm1hcCgga2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gSlNPTi5zdHJpbmdpZnkoa2V5KTtcbiAgICAgICAgICAgIHJldHVybiBpbmRleCArICc6JyArIF9leHBsYWluKGl0ZW1ba2V5XSwgZGVwdGggLSAxLCBwYXRoICsgJ1snICsgaW5kZXggKyAnXScsIHNlZW4pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHByZWZpeCArICd7JyArIGxpc3Quam9pbignLCAnKSArICd9JztcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBzZWVuLmRlbGV0ZShpdGVtKTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBjYWxsZXJJbmZvLCBleHBsYWluIH07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogICBUaGlzIGlzIHRoZSBlbnRyeSBwb2ludCBmb3IgYnJvd3NlciB2ZXJzaW9uLlxuICogICBXZSBhcmUgdXNpbmcgd2VicGFjayBjdXJyZW50bHkuIFNlZSAuLi9icm93c2V0aWZ5LnNoXG4gKi9cblxuLy8gVE9ETyBjaGVjayBpZiByZWZ1dGUgYWxyZWFkeSBleGlzdHMsIGFsc28gY2hlY2sgdmVyc2lvblxud2luZG93LnJlZnV0ZSA9IHJlcXVpcmUoICcuL2luZGV4LmpzJyApO1xuIl19
