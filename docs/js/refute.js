(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

// the core (should explain even be there?)
const { Report, addCondition, explain } = require ('./refute/report.js');

// TODO add eiffel-style design-by-contract

// import default condition arsenal
require( './refute/cond/basic.js' );
require( './refute/cond/array.js' );
require( './refute/cond/deep.js' );

const getReport = (...args) => new Report().run(...args).done();

// Allow creating multiple parallel configurations of refute
// e.g. one strict (throwing errors) and other lax (just debugging to console)
function setup( options={}, orig ) {
    // TODO validate options
    const onFail = options.onFail || (rep => { throw new Error(rep.getTap()) });

    const refute = options.skip
        ? ()=>{}
        : (...args) => {
            const ok = new Report();
            ok.onDone( x => { if( !x.getPass() ) onFail(x, args) } );
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

    // add design-by-contract
    Object.defineProperty( refute, 'dbc', { get: ()=>new DBC() } );

    // TODO this is stupid, come up with smth better
    // when in browser, window.refute.config() updates window.refute itself
    if (typeof window !== 'undefined' && orig === window.refute)
        window.refute = refute;

    return refute;
}

if (typeof module !== 'undefined')
    module.exports = setup();
if (typeof window !== 'undefined')
    window.refute = setup(); // TODO check preexisting

/**
 *   @namespace refute
 *   @desc   Functions exported by refute main module.
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


},{"./refute/cond/array.js":2,"./refute/cond/basic.js":3,"./refute/cond/deep.js":4,"./refute/report.js":5}],2:[function(require,module,exports){
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

addCondition(
    'forEach',
    {fun:1,args:2},
    (list, contract) => {
        if (!Array.isArray(list))
            return 'Expected a list, found a '.typeof(list);
        if (list.length < 1)
            return 0; // auto-pass

        const ok = new Report();
        list.forEach( (item, index) => ok.nested( "item "+index, item, contract ) );
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
addCondition(
    'ordered', // TODO better name? pairwise? reduce?
    {fun:1,args:2},
    (list, contract) => {
        if (!Array.isArray(list))
            return 'Expected a list, found a '.typeof(list);
        if (list.length < 2)
            return 0; // auto-pass

        const ok = new Report();
        for (let n = 0; n < list.length-1; n++) {
            ok.nested( "items "+n+", "+(n+1), list[n], list[n+1], contract);
        }
        return ok.done();
    }
);


},{"../report.js":5}],3:[function(require,module,exports){
'use strict';

const { addCondition, report, explain } = require( '../report.js' );
const OK = false;

const numCmp = {
    '<' : (x,y)=>(x  < y),
    '>' : (x,y)=>(x  > y),
    '<=': (x,y)=>(x <= y),
    '>=': (x,y)=>(x >= y),
    '==': (x,y)=>(x === y),
    '!=': (x,y)=>(x !== y),
};

// use != and not !== deliberately to filter out null & undefined
const strCmp = {
    '<' : (x,y)=>x != undefined && y != undefined && (''+x  < ''+y),
    '>' : (x,y)=>x != undefined && y != undefined && (''+x  > ''+y),
    '<=': (x,y)=>x != undefined && y != undefined && (''+x <= ''+y),
    '>=': (x,y)=>x != undefined && y != undefined && (''+x >= ''+y),

    '==': (x,y)=>x != undefined && y != undefined && (''+x === ''+y),
    '!=': (x,y)=>((x == undefined)^(y == undefined)) || (''+x !== ''+y),
};

/**
 *   @instance
 *   @memberOf conditions
 *   @method numCmp
 *   @desc  Checks if a relation indeed holds between arguments.
 *          See also {@link strCmp}
 *   @param {any} arg1    First argument
 *   @param {string} operation  One of '<', '<=', '==', '!=', '>=', or '>'
 *   @param {any} arg2    Second argument
 *   @param {string} [description]
 *   @returns {undefined}
 */
/**
 *   @instance
 *   @memberOf conditions
 *   @method strCmp
 *   @desc  Checks if a relation indeed holds between arguments,
 *          assuming they are strings.
 *          See also {@link numCmp}
 *   @param {any} arg1    First argument
 *   @param {string} operation  One of '<', '<=', '==', '!=', '>=', or '>'
 *   @param {any} arg2    Second argument
 *   @param {string} [description]
 *   @returns {undefined}
 */

addCondition(
    'numCmp',
    {args:3},
    (x,op,y) => numCmp[op](x,y)?0:[x,"is not "+op,y]
);
addCondition(
    'strCmp',
    {args:3},
    (x,op,y) => strCmp[op](x,y)?0:[x,"is not "+op,y]
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
        return 'instanceof '+(x.name || x);
};

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
addCondition(
    'type',
    {args: 2},
    (got, exp)=>{
        if ( !Array.isArray(exp) )
            exp = [exp];

        for (let variant of exp) {
            // known type
            if( typeof variant === 'string' && typeCheck[variant] ) {
                if (typeCheck[variant](got))
                    return OK;
                continue;
            };

            // instanceof
            if( typeof variant === 'function' && typeof got === 'object') {
                if( got instanceof variant )
                    return OK;
                continue;
            };

            // don't know what you're asking for
            return 'unknown value type spec: '+explain(variant, 1);
        };
        return [
            '- '+explain(got, 1),
            '+ '+exp.map( typeExplain ).join(" or "),
        ];
    }
);


},{"../report.js":5}],4:[function(require,module,exports){
'use strict';

const { addCondition, explain } = require( '../report.js' );
const { AnnotatedSet } = require( '../util/annotated-set.js' );

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
addCondition( 'deepEqual', {"args":2,hasOptions:true}, deep );

function deep( got, exp, options={} ) {
    if (!options.max)
        options.max = 5;
    options.diff = [];
    _deep( got, exp, options );
    if (!options.diff.length)
        return 0;

    const ret = [];
    for (let item of options.diff) {
        ret.push( 
            "at "+item[0],
            "- "+(item[3] ? item[1] : explain( item[1], 2 )),
            "+ "+(item[3] ? item[2] : explain( item[2], 2 )),
        );
    };
    return ret;
};

// result is stored in options.diff=[], return value is ignored
// if said diff exceeds max, return immediately & don't waste time
function _deep( got, exp, options={}, path='$', seenL=new AnnotatedSet(), seenR=new AnnotatedSet() ) {
    if (got === exp || options.max <= options.diff.length)
        return;
    if (typeof got !== typeof exp)
        return options.diff.push( [path, got, exp ] );

    // recurse by expected value - consider it more predictable
    if (typeof exp !== 'object' || exp === null ) {
        // non-objects - so can't descend
        // and comparison already done at the beginnning
        return options.diff.push( [path, got, exp ] );
    }

    // must detect loops before going down
    const pathL = seenL.has(got);
    const pathR = seenR.has(exp);
    if (pathL || pathR) {
        // Loop detected = only check topology
        if (pathL === pathR)
            return;
        return options.diff.push( [
            path + ' (circular)',
            pathL ? 'Circular='+pathL : explain(got, 2),
            pathR ? 'Circular='+pathR : explain(exp, 2),
            true // don't stringify
        ]);
    };
    seenL = seenL.add(got, path);
    seenR = seenR.add(exp, path);

    // compare object types
    // (if a user is stupid enough to override constructor field, well the test
    // would fail later anyway)
    if (got.constructor !== exp.constructor)
        return options.diff.push( [path, got, exp ] );

    // array
    if (Array.isArray(exp)) {
        if (!Array.isArray(got) || got.length !== exp.length)
            return options.diff.push( [path, got, exp ] );

        for (let i = 0; i < exp.length; i++) {
            _deep( got[i], exp[i], options, path+'['+i+']', seenL, seenR );
            if (options.max<=options.diff.length)
                break;
        };
        return;
    };

    // compare keys - +1 for exp, -1 for got, nonzero key at end means keys differ
    const uniq = {};
    Object.keys(exp).forEach( x => uniq[x] = 1 );
    Object.keys(got).forEach( x => uniq[x] = (uniq[x] || 0) - 1 );
    for (let x in uniq) {
        if (uniq[x] !== 0)
            return options.diff.push( [path, got, exp ] );
    }
    
    // now typeof, object type, and object keys are the same.
    // recurse.
    for (let i in exp) {
        _deep( got[i], exp[i], options, path+'['+explain(i)+']', seenL, seenR );
        if (options.max<=options.diff.length)
            break;
    };
    return;
};


},{"../report.js":5,"../util/annotated-set.js":7}],5:[function(require,module,exports){
'use strict';

const { callerInfo, explain, makeError } = require( './util.js' );

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

/**
 * @public
 * @classdesc
 * The core of the refute library, the report object contains info
 * about passing and failing conditions.
 */
class Report {
    // setup
    /**
     *  @desc No constructor arguments supported.
     *  Contracts may need to be set up inside callbacks _after_ creation,
     *  hence this convention.
     */
    constructor() {
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
     *   report.onDone( r => { if (!r.getPass()) console.log(r.getText()) } )
     */
    onDone(fn) {
        if( typeof fn !== 'function' )
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
     *   report.onFail( r => console.log(r.getText()) );
     */
    onFail(fn) {
        if( typeof fn !== 'function' )
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
     *   r.getText();
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
     *       r.numCmp( arg.v, '>=', 3.14 );
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
    run(...args) {
        // TODO either async() should support additional args, or run() shouldn't
        this._lock();
        const block = args.pop();
        if (typeof block !== 'function')
            throw new Error('Last argument of run() must be a function, not '+typeof(block));
        const result = block( this, ...args );
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
    runSync(...args) {
        this._lock();
        const block = args.pop();
        if (typeof block !== 'function')
            throw new Error('Last argument of run() must be a function, not '+typeof(block));
        const result = block( this, ...args );
        return this;
    }

    /**
     *  @desc Run a contract asynchronously with timeout.
     *  Returns a promise that will resolve when the contract finishes,
     *  passing along the contract object to then().
     *  @param {integer} timeout   Timeout in milliseconds before the promise is rejected.
     *  @param {Contract} contract A function to pass Report object to.
     *  @returns {Promise}
     */
    async(timeout, block) {
        // TODO either async() should support additional args, or run() shouldn't
        return new Promise( (resolve, reject) => {
            const timer = setTimeout(
                () => reject(new Error("Contract execution took too long")),
                timeout
            );
            const next = () => { clearTimeout(timer); resolve(this); };

            const result = block(this);
            if (result instanceof Promise)
                result.then( next );
            else
                next();
        });
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
                const curry = evidence;
                evidence = new Promise( done => {
                    curry.onDone( done );
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
                    for (let i = this._onDone.length; i-->0; )
                        this._onDone[i](this);
                }
            });
            return;
        }

        return this._setResult(n, evidence, condName, where || callerInfo(2));
    }

    _setResult(n, evidence, condName, where) {
        if (!evidence)
            return;

        // listify & stringify evidence, so that it doesn't change post-factum
        if (!Array.isArray(evidence))
            evidence = [ evidence ];
        this._evidence[n] = evidence.map( x=>_explain(x, Infinity) );
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
    info( ...message ) {
        this._lock();
        if (!this._info[this._count])
            this._info[this._count] = [];
        this._info[this._count].push( message.map( s=>_explain(s) ).join(" ") );
        return this;
    }

    /**
     *   @desc Locks the report object, so no modifications may be made later.
     *   Also if onDone callback(s) are present, they are executed
     *   unless there are pending async checks.
     *   @returns {Report} this (chainable)
     */
    done() {
        if (!this._done) {
            this._done = true;
            if (!this._pending.size) {
                for (let i = this._onDone.length; i-->0; )
                    this._onDone[i](this);
            }
        };
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
    getDone() {
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
    getPass(n) {
        if (n === undefined)
            return this._failCount === 0 && (!this.getDone() || this._count > 0);
        return (n > 0 && n <= this._count) ? !this._evidence[n] : undefined;
    }

    /**
     *   @desc Number of checks performed.
     *   @returns {number}
     */
    getCount() {
        return this._count;
    }

    /**
     *  @desc Whether the last check was a success.
     *  This is just a shortcut for foo.getDetails(foo.getCount).pass
     *  @returns {boolean}
     */
    last() {
        return this._count ? !this._evidence[this._count] : undefined;
    }

    /**
     *   @desc Number of checks failing.
     *   @returns {number}
     */
    getFailCount() {
        return this._failCount;
    }

    /**
     *   @desc Return a string of failing/passing checks.
     *   This may be useful for validating custom conditions.
     *   Consecutive passing checka are represented by numbers.
     *   A capital letter in the string represents failure.
     *   See also {@link Report#getText getText()}
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
    getGhost() {
        const ghost = [];
        let streak = 0;
        for (let i=1; i <= this._count; i++) {
            if (this._evidence[i] || this._nested[i]) {
                if (streak) ghost.push(streak);
                streak = 0;
                ghost.push( this._nested[i] ? this._nested[i].getGhost() : 'N');
            } else {
                streak++;
            }
        }
        if (streak) ghost.push(streak);
        if (ghost.length === 0 && !this.getPass())
            ghost.push('Z');
        return 'r('+ghost.join(',')+')';
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
     *  r.getText();
     *  r(
     *  )
     *  @example // pass
     *  const r = new Report();
     *  r.pass('foo bared');
     *  r.getText();
     *  r(
     *      1. foo bared
     *  )
     *  @example // fail
     *  const r = new Report();
     *  r.equal('war', 'peace');
     *  r.getText();
     *  r(
     *      !1.
     *      ^ Condition equal failed at <file>:<line>:<char>
     *      - war
     *      + peace
     *  )
     */
    getText() {
        // TODO prepend with 'refute/v/n.nn'
        return this.getLines().join('\n');
    }

    getLines(indent='') {
        const out = [indent + 'r('];
        const last = indent + ')';
        indent = indent + '    ';

        const pad = prefix => s => indent + prefix + ' ' + s;

        if (this._info[0])
            out.push( ...this._info[0].map( pad(';') ) );
        for (let n = 1; n<=this._count; n++) {
            out.push(
                indent
                +(this._pending.has(n) ? '...' : (this._evidence[n] ? '!':'') )
                +n+(this._descr[n] ? '. '+this._descr[n] : '.')
            );
            if( this._nested[n]) {
                out.push( ...this._nested[n].getLines(indent) );
            } else if( this._evidence[n] ) {
                out.push( indent + '    ^ Condition `'+(this._condName[n] || 'check')
                    +'` failed at '+this._where[n] );
                this._evidence[n].forEach( raw => {
                    // Handle multiline evidence
                    // TODO this is perl written in JS, rewrite more clearly
                    let[ _, prefix, s ] = raw.match( /^([-+|] )?(.*?)\n?$/s );
                    if (!prefix) prefix = '| ';
                    if (!s.match(/\n/)) {
                        out.push( indent + '    ' + prefix + s );
                    } else {
                        s.split('\n').forEach(
                            part => out.push( indent + '    ' + prefix + part ));
                    };
                });
            };
            if (this._info[n])
                out.push( ...this._info[n].map( pad(';') ) );
        };
        out.push(last);
        return out;
    }

    /**
     *  @desc returns a plain serializable object
     *  @returns {Object}
     */
    toJSON() {
        const n = this.getCount();
        const details = [];
        for (let i = 0; i<=n; i++) {
            const node = this.getDetails(i);
            // strip extra keys
            for( let key in node ) {
                if (node[key] === undefined || (Array.isArray(node[key]) && node[key].length === 0))
                    delete node[key];
            };
            details.push(node);
        };
        return {
            pass:  this.getPass(),
            count: this.getCount(),
            details,
        };
    }

    toString() {
        // TODO getText
        return this.getTap();
    }

    /**
     *  @desc Returns report stringified as TAP format
     *  @returns {string}
     */
    getTap(n) {
        const tap = n === undefined ? this.getTapLines() : this.getTapEntry(n);
        tap.push('');
        return tap.join('\n');
    }

    getTapLines(n) {
        // TAP for now, use another format later because "perl is scary"
        const tap = [ '1..'+this._count ];
        // TODO info[0]
        const preface = this.getDetails(0);
        tap.push( ...preface.info.map( s => '# '+s ) );
        for( let i = 1; i <= this._count; i++ )
            tap.push( ... this.getTapEntry(i) );
        if (!this.getPass()) {
            if (this.getCount() > 0)
                tap.push('# Failed '+this.getFailCount()+'/'+this.getCount()+ ' conditions');
            else
                tap.push('# No checks were run, consider using pass() if that\'s deliberate');
        };
        return tap;
    }

    getTapEntry(n) {
        const data = typeof(n) === 'object' ? n : this.getDetails(n);
        const tap = [];
        if (data.nested) {
            tap.push( '# subcontract:'+(data.name?' '+data.name:'') );
            tap.push( ... data.nested.getTapLines().map( s => '    '+s ));
        }
        if (data.pending) {
            tap.push( 'pending '+data.n+' <...>' );
            return tap;
        }
        tap.push((data.pass?'':'not ') + 'ok ' + data.n
            + (data.name ? ' - '+data.name : ''));
        if (!data.pass)
            tap.push('# Condition'+(data.cond ? ' '+data.cond : '')+' failed at '+data.where);
        tap.push(...data.evidence.map(s=>'# '+s));
        tap.push(...data.info.map(s=>'# '+s));
        return tap;
    }

    /**
     *   @desc Returns detailed report on a specific check
     *   @param {integer} n - check number, must be <= getCount()
     *   @returns {object}
     */
    getDetails(n) {
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

    /**
     *  @desc Convert report to an AssertionError (if available) or just Error.
     *  @param {number} [n] Number of check to convert to exception.
     *  Current error format is TAP, this may change in the future.
     *  If 0 or unspecified, convert the whole report.
     *  @param {object} [options]
     *  @param {boolean} options.pass If false (the default), return nothing
     *  if the report is passing.
     *  @returns {Error|undefined}
     */
    getError(n, options={}) {
        if (!n) {
            // no entry given
            if (!options.pass && this.getPass())
                return;

            return makeError({
                actual:   this.getTap(),
                expected: '',
                operator: 'contract',
            });
        };

        const data = typeof n === 'object' ? n : this.getDetails(n);

        // no error
        if (!options.pass && data.pass)
            return;

        return makeError({
            actual:   this.getTapEntry(data).join('\n'),
            expected: '',
            message:  data.name,
            operator: data.cond,
        });
    }

    getThrown(n, options={}) {
        // TODO rename to just throw?
        const err = this.getError(n, options);
        if (err)
            throw err;
    }
}

// this is for stuff like `object foo = {"foo":42}`
// we don't want the explanation to be quoted!
function _explain( item, depth ) {
    if (typeof item === 'string' )
        return item;
    return explain( item, depth );
};

Report.prototype.explain = explain; // also make available via report

// part of addCondition
const knownChecks = new Set();

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
        throw new Error('Method already exists in Report: '+name);
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
    const code = function(...args) {
        const descr = descrFirst
            ? args.shift()
            : ( (args.length > maxArgs && typeof args[args.length-1] === 'string') ? args.pop() : undefined);
        if (args.length > maxArgsReal || args.length < minArgs)
            throw new Error('Condition '+name+' must have '+minArgs+'..'+maxArgsReal+' arguments '); // TODO

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

addCondition(
    'check',
    {args:1},
    x=>x
);
addCondition(
    'pass',
    {args:0},
    ()=>0
);
addCondition(
    'fail',
    {args:0},
    ()=>'failed deliberately'
);
addCondition(
    'equal',
    {args:2},
    (a,b) => a === b ? 0 : [ '- '+explain(a), '+ ' + explain(b) ]
);
addCondition(
    'match',
    {args:2},
    (a,rex) => (''+a).match(rex) ? 0 : [
        'String         : '+a,
        'Does not match : '+rex
    ]
);
addCondition(
    'nested',
    {fun:1,minArgs:1},
    (...args) => new Report().run(...args).done()
);

module.exports = { Report, addCondition, explain };

},{"./util.js":6}],6:[function(require,module,exports){
'use strict';

const { AnnotatedSet } = require( './util/annotated-set.js' );

/**
 *   @namespace utilities
 *   @desc  These functions have nothing to do with refute and should
 *          ideally be in separate modules.
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
function callerInfo(n) {
    /* a terrible rex that basically searches for file.js:nnn:nnn several times*/
    return (new Error().stack.match(inStack)[n+1].replace(/\W*\n$/, '') || '')
}

/**
 *  @public
 *  @instancR
 *  @memberOf Report
 *  @desc Stringiry objects recursively with limited depth
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
 *  @param {Any} target Object to serialize.
 *  @param {integer} depth=3 Depth limit.
 *  @returns {string}
 */
function explain( item, depth=3, options={}, path='$', seen=new AnnotatedSet() ) {
    // simple types
    if (typeof item === 'string')
        return JSON.stringify(item); // don't want to spend time qouting
    if (typeof item === 'number' || typeof item === 'boolean' || item === null)
        return ''+item;
    if (item === undefined) return '<undef>';
    if (typeof item !== 'object') // maybe function
        return ''+item; // TODO don't print out a long function's body

    // recurse
    const whereSeen = seen.has(item);
    if (whereSeen) {
        const note = 'Circular='+whereSeen;
        return Array.isArray(item)?'[ '+note+' ]':'{ '+note+' }';
    };
    seen = seen.add( item, path ); // clones seen

    if (Array.isArray(item)) {
        if (depth < 1)
            return '[...]';
        seen.add(item);
        // TODO <x empty items>
        const list = item.map(
            (val, index) => explain(val, depth-1, options, path+'['+index+']', seen)
        );
        return '['+list.join(', ')+']'; // TODO configurable whitespace
    }

    const type = item.constructor && item.constructor.name;
    const prefix = type && type !== 'Object' ? type + ' ' : '';
    if (depth < 1)
        return prefix + '{...}';
    const list = Object.keys(item).sort().map( key => {
        const index = JSON.stringify(key);
        return index+":"+explain(item[key], depth-1, options, path+'['+index+']', seen);
    });
    return prefix + '{' + list.join(", ") + '}';
}

// Must work even without assert
const hasAssert = typeof assert === 'function'
    && typeof assert.AssertionError === 'function';

const makeError = hasAssert
    ? entry => new assert.AssertionError(entry)
    : entry => new Error( entry.actual );

module.exports = { callerInfo, explain, makeError };

},{"./util/annotated-set.js":7}],7:[function(require,module,exports){
'use strict';

// See also noted-set.js

class AnnotatedSet {
    constructor(all=new Set(), notes=[]) {
        this.all   = all;
        this.notes = notes;
    }
    add( item, note ) {
        if (this.all.has(item))
            return this;
        return new AnnotatedSet(
            new Set(this.all).add(item),
            [ ...this.notes, [ item, note ] ]
        );
    }
    has( item ) {
        if (!this.all.has( item ))
            return;
        for (let pair of this.notes) {
            if (pair[0] === item)
                return pair[1];
        };
        throw new Error('wtf, unreachable');
    };
};

module.exports = { AnnotatedSet };

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9yZWZ1dGUuanMiLCJsaWIvcmVmdXRlL2NvbmQvYXJyYXkuanMiLCJsaWIvcmVmdXRlL2NvbmQvYmFzaWMuanMiLCJsaWIvcmVmdXRlL2NvbmQvZGVlcC5qcyIsImxpYi9yZWZ1dGUvcmVwb3J0LmpzIiwibGliL3JlZnV0ZS91dGlsLmpzIiwibGliL3JlZnV0ZS91dGlsL2Fubm90YXRlZC1zZXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsd0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0JztcblxuLy8gdGhlIGNvcmUgKHNob3VsZCBleHBsYWluIGV2ZW4gYmUgdGhlcmU/KVxuY29uc3QgeyBSZXBvcnQsIGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9ID0gcmVxdWlyZSAoJy4vcmVmdXRlL3JlcG9ydC5qcycpO1xuXG4vLyBUT0RPIGFkZCBlaWZmZWwtc3R5bGUgZGVzaWduLWJ5LWNvbnRyYWN0XG5cbi8vIGltcG9ydCBkZWZhdWx0IGNvbmRpdGlvbiBhcnNlbmFsXG5yZXF1aXJlKCAnLi9yZWZ1dGUvY29uZC9iYXNpYy5qcycgKTtcbnJlcXVpcmUoICcuL3JlZnV0ZS9jb25kL2FycmF5LmpzJyApO1xucmVxdWlyZSggJy4vcmVmdXRlL2NvbmQvZGVlcC5qcycgKTtcblxuY29uc3QgZ2V0UmVwb3J0ID0gKC4uLmFyZ3MpID0+IG5ldyBSZXBvcnQoKS5ydW4oLi4uYXJncykuZG9uZSgpO1xuXG4vLyBBbGxvdyBjcmVhdGluZyBtdWx0aXBsZSBwYXJhbGxlbCBjb25maWd1cmF0aW9ucyBvZiByZWZ1dGVcbi8vIGUuZy4gb25lIHN0cmljdCAodGhyb3dpbmcgZXJyb3JzKSBhbmQgb3RoZXIgbGF4IChqdXN0IGRlYnVnZ2luZyB0byBjb25zb2xlKVxuZnVuY3Rpb24gc2V0dXAoIG9wdGlvbnM9e30sIG9yaWcgKSB7XG4gICAgLy8gVE9ETyB2YWxpZGF0ZSBvcHRpb25zXG4gICAgY29uc3Qgb25GYWlsID0gb3B0aW9ucy5vbkZhaWwgfHwgKHJlcCA9PiB7IHRocm93IG5ldyBFcnJvcihyZXAuZ2V0VGFwKCkpIH0pO1xuXG4gICAgY29uc3QgcmVmdXRlID0gb3B0aW9ucy5za2lwXG4gICAgICAgID8gKCk9Pnt9XG4gICAgICAgIDogKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG9rID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICAgICAgb2sub25Eb25lKCB4ID0+IHsgaWYoICF4LmdldFBhc3MoKSApIG9uRmFpbCh4LCBhcmdzKSB9ICk7XG4gICAgICAgICAgICBvay5ydW4oLi4uYXJncyk7XG4gICAgICAgICAgICBvay5kb25lKCk7XG4gICAgICAgIH07XG5cbiAgICAvLyByZWV4cG9ydCBhbGwgZnJvbSByZXBvcnQuanNcbiAgICByZWZ1dGUuUmVwb3J0ID0gUmVwb3J0O1xuICAgIHJlZnV0ZS5leHBsYWluID0gZXhwbGFpbjtcbiAgICByZWZ1dGUuYWRkQ29uZGl0aW9uID0gYWRkQ29uZGl0aW9uO1xuXG4gICAgLy8gc2hvcnRjdXQgdG8gdmFsaWRhdGluZyAmIHJldHVybmluZyBhIGZyZXNoIGNvbnRyYWN0XG4gICAgLy8gVE9ETyByZW5hbWUgdG8gYXZvaWQgbmFtZSBjbGFzaCB3aXRoIHRoZSBjbGFzc1xuICAgIC8vIChldmFsPylcbiAgICByZWZ1dGUucmVwb3J0ID0gZ2V0UmVwb3J0O1xuXG4gICAgLy8gcmVmdXRlLmNvbmYoey4uLn0pIHdpbGwgZ2VuZXJhdGUgYSBfbmV3XyByZWZ1dGVcbiAgICByZWZ1dGUuY29uZmlnID0gdXBkYXRlID0+IHNldHVwKCB7IC4uLm9wdGlvbnMsIC4uLnVwZGF0ZSB9LCByZWZ1dGUgKTtcblxuICAgIC8vIGFkZCBkZXNpZ24tYnktY29udHJhY3RcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoIHJlZnV0ZSwgJ2RiYycsIHsgZ2V0OiAoKT0+bmV3IERCQygpIH0gKTtcblxuICAgIC8vIFRPRE8gdGhpcyBpcyBzdHVwaWQsIGNvbWUgdXAgd2l0aCBzbXRoIGJldHRlclxuICAgIC8vIHdoZW4gaW4gYnJvd3Nlciwgd2luZG93LnJlZnV0ZS5jb25maWcoKSB1cGRhdGVzIHdpbmRvdy5yZWZ1dGUgaXRzZWxmXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIG9yaWcgPT09IHdpbmRvdy5yZWZ1dGUpXG4gICAgICAgIHdpbmRvdy5yZWZ1dGUgPSByZWZ1dGU7XG5cbiAgICByZXR1cm4gcmVmdXRlO1xufVxuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBzZXR1cCgpO1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuICAgIHdpbmRvdy5yZWZ1dGUgPSBzZXR1cCgpOyAvLyBUT0RPIGNoZWNrIHByZWV4aXN0aW5nXG5cbi8qKlxuICogICBAbmFtZXNwYWNlIHJlZnV0ZVxuICogICBAZGVzYyAgIEZ1bmN0aW9ucyBleHBvcnRlZCBieSByZWZ1dGUgbWFpbiBtb2R1bGUuXG4gKi9cblxuLyoqXG4gKiAgIEBwdWJsaWNcbiAqICAgQG1lbWJlck9mIHJlZnV0ZVxuICogICBAZnVuY3Rpb24gcmVmdXRlXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gRGF0YSB0byBmZWVkIHRvIHRoZSBjYWxsYmFja1xuICogICBAcGFyYW0ge0NvbnRyYWN0fSBjb250cmFjdCBBIGNvZGUgYmxvY2sgd2l0aCBjaGVja3MuXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9IFJldHVybiB2YWx1ZSBpcyBpZ25vcmVkLlxuICogICBAdGhyb3dzIHtFcnJvcn0gSWYgb25lIG9yIG1vcmUgY2hlY2tzIGFyZSBmYWlsaW5nLCBhbiBleGNlcHRpb24gaXMgdGhyb3duXG4gKiAgIHdpdGggZGV0YWlscyBhYm91dCBhbGwgcGFzc2luZy9mYWlsaW5nIGNoZWNrcy5cbiAqICAgVGhpcyBhY3Rpb24gY2FuIGJlIGNoYW5nZWQgdmlhIHJlZnV0ZS5jb25maWcoKSBjYWxsLlxuICpcbiAqL1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCBSZXBvcnQgfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBmb3JFYWNoXG4gKiAgIEBkZXNjICBDaGVja3MgdGhhdCBhIG5lc3RlZCBjb250cmFjdCBob2xkcyBmb3IgZWFjaCBlbGVtZW50IG9mIGFuIGFycmF5LlxuICogICBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRpb25cbiAqICAgQHBhcmFtIHtBcnJheX0gYXJyYXkgTGlzdCBvZiBpdGVtcy5cbiAqICAgQHBhcmFtIHtDb250cmFjdH0gbmVzdGVkIEZpcnN0IGFyZ3VtZW50IGdpdmVuIHRvIHRoZSBjYWxsYmFja1xuICogICBpcyBhIFJlcG9ydCBvYmplY3QsIGFuZCB0aGUgc2Vjb25kIG9uZSBpcyB0aGUgYXJyYXkgaXRlbSBpbiBxdWVzdGlvbi5cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuXG5hZGRDb25kaXRpb24oXG4gICAgJ2ZvckVhY2gnLFxuICAgIHtmdW46MSxhcmdzOjJ9LFxuICAgIChsaXN0LCBjb250cmFjdCkgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpXG4gICAgICAgICAgICByZXR1cm4gJ0V4cGVjdGVkIGEgbGlzdCwgZm91bmQgYSAnLnR5cGVvZihsaXN0KTtcbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBhdXRvLXBhc3NcblxuICAgICAgICBjb25zdCBvayA9IG5ldyBSZXBvcnQoKTtcbiAgICAgICAgbGlzdC5mb3JFYWNoKCAoaXRlbSwgaW5kZXgpID0+IG9rLm5lc3RlZCggXCJpdGVtIFwiK2luZGV4LCBpdGVtLCBjb250cmFjdCApICk7XG4gICAgICAgIHJldHVybiBvay5kb25lKCk7XG4gICAgfVxuKTtcblxuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIG9yZGVyZWRcbiAqICAgQGRlc2MgIENoZWNrcyB0aGF0IGEgbmVzdGVkIGNvbnRyYWN0IGhvbGRzIGZvciBlYWNoIHBhaXJcbiAqICAgb2YgYWRqYWNlbnQgZWxlbWVudCBvZiBhbiBhcnJheSAoaS5lLiAxJjIsIDImMywgMyY0LCAuLi4pLlxuICogICBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRpb25cbiAqICAgQHBhcmFtIHtBcnJheX0gYXJyYXkgTGlzdCBvZiBpdGVtcy5cbiAqICAgQHBhcmFtIHtDb250cmFjdH0gbmVzdGVkIEZpcnN0IGFyZ3VtZW50IGdpdmVuIHRvIHRoZSBjYWxsYmFja1xuICogICBpcyBhIFJlcG9ydCBvYmplY3QsIGFuZCB0aGUgc2Vjb25kIGFuZCB0aGlyZCBvbmVzXG4gKiAgIGFyZSB0aGUgYXJyYXkgaXRlbXMgaW4gcXVlc3Rpb24uXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cblxuLy8gVE9ETyB0aGlzIGlzIGNhbGxlZCBcImNvbXBsaWFudCBjaGFpblwiIGJ1dCBiZXR0ZXIganVzdCBzYXkgaGVyZVxuLy8gXCJvaCB3ZSdyZSBjaGVja2luZyBlbGVtZW50IG9yZGVyXCJcbmFkZENvbmRpdGlvbihcbiAgICAnb3JkZXJlZCcsIC8vIFRPRE8gYmV0dGVyIG5hbWU/IHBhaXJ3aXNlPyByZWR1Y2U/XG4gICAge2Z1bjoxLGFyZ3M6Mn0sXG4gICAgKGxpc3QsIGNvbnRyYWN0KSA9PiB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSlcbiAgICAgICAgICAgIHJldHVybiAnRXhwZWN0ZWQgYSBsaXN0LCBmb3VuZCBhICcudHlwZW9mKGxpc3QpO1xuICAgICAgICBpZiAobGlzdC5sZW5ndGggPCAyKVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGF1dG8tcGFzc1xuXG4gICAgICAgIGNvbnN0IG9rID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IGxpc3QubGVuZ3RoLTE7IG4rKykge1xuICAgICAgICAgICAgb2submVzdGVkKCBcIml0ZW1zIFwiK24rXCIsIFwiKyhuKzEpLCBsaXN0W25dLCBsaXN0W24rMV0sIGNvbnRyYWN0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2suZG9uZSgpO1xuICAgIH1cbik7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIHJlcG9ydCwgZXhwbGFpbiB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcbmNvbnN0IE9LID0gZmFsc2U7XG5cbmNvbnN0IG51bUNtcCA9IHtcbiAgICAnPCcgOiAoeCx5KT0+KHggIDwgeSksXG4gICAgJz4nIDogKHgseSk9Pih4ICA+IHkpLFxuICAgICc8PSc6ICh4LHkpPT4oeCA8PSB5KSxcbiAgICAnPj0nOiAoeCx5KT0+KHggPj0geSksXG4gICAgJz09JzogKHgseSk9Pih4ID09PSB5KSxcbiAgICAnIT0nOiAoeCx5KT0+KHggIT09IHkpLFxufTtcblxuLy8gdXNlICE9IGFuZCBub3QgIT09IGRlbGliZXJhdGVseSB0byBmaWx0ZXIgb3V0IG51bGwgJiB1bmRlZmluZWRcbmNvbnN0IHN0ckNtcCA9IHtcbiAgICAnPCcgOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggIDwgJycreSksXG4gICAgJz4nIDogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ICA+ICcnK3kpLFxuICAgICc8PSc6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCA8PSAnJyt5KSxcbiAgICAnPj0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPj0gJycreSksXG5cbiAgICAnPT0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPT09ICcnK3kpLFxuICAgICchPSc6ICh4LHkpPT4oKHggPT0gdW5kZWZpbmVkKV4oeSA9PSB1bmRlZmluZWQpKSB8fCAoJycreCAhPT0gJycreSksXG59O1xuXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgbnVtQ21wXG4gKiAgIEBkZXNjICBDaGVja3MgaWYgYSByZWxhdGlvbiBpbmRlZWQgaG9sZHMgYmV0d2VlbiBhcmd1bWVudHMuXG4gKiAgICAgICAgICBTZWUgYWxzbyB7QGxpbmsgc3RyQ21wfVxuICogICBAcGFyYW0ge2FueX0gYXJnMSAgICBGaXJzdCBhcmd1bWVudFxuICogICBAcGFyYW0ge3N0cmluZ30gb3BlcmF0aW9uICBPbmUgb2YgJzwnLCAnPD0nLCAnPT0nLCAnIT0nLCAnPj0nLCBvciAnPidcbiAqICAgQHBhcmFtIHthbnl9IGFyZzIgICAgU2Vjb25kIGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBzdHJDbXBcbiAqICAgQGRlc2MgIENoZWNrcyBpZiBhIHJlbGF0aW9uIGluZGVlZCBob2xkcyBiZXR3ZWVuIGFyZ3VtZW50cyxcbiAqICAgICAgICAgIGFzc3VtaW5nIHRoZXkgYXJlIHN0cmluZ3MuXG4gKiAgICAgICAgICBTZWUgYWxzbyB7QGxpbmsgbnVtQ21wfVxuICogICBAcGFyYW0ge2FueX0gYXJnMSAgICBGaXJzdCBhcmd1bWVudFxuICogICBAcGFyYW0ge3N0cmluZ30gb3BlcmF0aW9uICBPbmUgb2YgJzwnLCAnPD0nLCAnPT0nLCAnIT0nLCAnPj0nLCBvciAnPidcbiAqICAgQHBhcmFtIHthbnl9IGFyZzIgICAgU2Vjb25kIGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cblxuYWRkQ29uZGl0aW9uKFxuICAgICdudW1DbXAnLFxuICAgIHthcmdzOjN9LFxuICAgICh4LG9wLHkpID0+IG51bUNtcFtvcF0oeCx5KT8wOlt4LFwiaXMgbm90IFwiK29wLHldXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdzdHJDbXAnLFxuICAgIHthcmdzOjN9LFxuICAgICh4LG9wLHkpID0+IHN0ckNtcFtvcF0oeCx5KT8wOlt4LFwiaXMgbm90IFwiK29wLHldXG4pO1xuXG5jb25zdCB0eXBlQ2hlY2sgPSB7XG4gICAgdW5kZWZpbmVkOiB4ID0+IHggPT09IHVuZGVmaW5lZCxcbiAgICBudWxsOiAgICAgIHggPT4geCA9PT0gbnVsbCxcbiAgICBudW1iZXI6ICAgIHggPT4gdHlwZW9mIHggPT09ICdudW1iZXInICYmICFOdW1iZXIuaXNOYU4oeCksXG4gICAgaW50ZWdlcjogICB4ID0+IE51bWJlci5pc0ludGVnZXIoeCksXG4gICAgbmFuOiAgICAgICB4ID0+IE51bWJlci5pc05hTih4KSxcbiAgICBzdHJpbmc6ICAgIHggPT4gdHlwZW9mIHggPT09ICdzdHJpbmcnLFxuICAgIGZ1bmN0aW9uOiAgeCA9PiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyxcbiAgICBib29sZWFuOiAgIHggPT4gdHlwZW9mIHggPT09ICdib29sZWFuJyxcbiAgICBvYmplY3Q6ICAgIHggPT4geCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoeCksXG4gICAgYXJyYXk6ICAgICB4ID0+IEFycmF5LmlzQXJyYXkoeCksXG59O1xuZnVuY3Rpb24gdHlwZUV4cGxhaW4gKHgpIHtcbiAgICBpZiAodHlwZW9mIHggPT09ICdzdHJpbmcnKVxuICAgICAgICByZXR1cm4geDtcbiAgICBpZiAodHlwZW9mIHggPT09ICdmdW5jdGlvbicpXG4gICAgICAgIHJldHVybiAnaW5zdGFuY2VvZiAnKyh4Lm5hbWUgfHwgeCk7XG59O1xuXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgdHlwZVxuICogICBAZGVzYyAgQ2hlY2tzIHRoYXQgYSB2YWx1ZSBpcyBvZiB0aGUgc3BlY2lmaWVkIHR5cGUuXG4gKiAgIEBwYXJhbSB7YW55fSB2YWx1ZSAgICBGaXJzdCBhcmd1bWVudFxuICogICBAcGFyYW0ge3N0cmluZ3xmdW5jdGlvbnxBcnJheX0gdHlwZVxuICogICAgICAgT25lIG9mICd1bmRlZmluZWQnLCAnbnVsbCcsICdudW1iZXInLCAnaW50ZWdlcicsICduYW4nLCAnc3RyaW5nJyxcbiAqICAgICAgICdib29sZWFuJywgJ29iamVjdCcsICdhcnJheScsIGEgY2xhc3MsIG9yIGFuIGFycmF5IGNvbnRhaW5pbmcgMSBvciBtb3JlXG4gKiAgICAgICBvZiB0aGUgYWJvdmUuICdudW1iZXInLydpbnRlZ2VyJyBkb24ndCBpbmNsdWRlIE5hTixcbiAqICAgICAgIGFuZCAnb2JqZWN0JyBkb2Vzbid0IGluY2x1ZGUgYXJyYXlzLlxuICogICAgICAgQSBmdW5jdGlvbiBpbXBsaWVzIGFuIG9iamVjdCBhbmQgYW4gaW5zdGFuY2VvZiBjaGVjay5cbiAqICAgICAgIEFycmF5IG1lYW5zIGFueSBvZiB0aGUgc3BlY2lmaWVkIHR5cGVzIChha2Egc3VtIG9mIHR5cGVzKS5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuYWRkQ29uZGl0aW9uKFxuICAgICd0eXBlJyxcbiAgICB7YXJnczogMn0sXG4gICAgKGdvdCwgZXhwKT0+e1xuICAgICAgICBpZiAoICFBcnJheS5pc0FycmF5KGV4cCkgKVxuICAgICAgICAgICAgZXhwID0gW2V4cF07XG5cbiAgICAgICAgZm9yIChsZXQgdmFyaWFudCBvZiBleHApIHtcbiAgICAgICAgICAgIC8vIGtub3duIHR5cGVcbiAgICAgICAgICAgIGlmKCB0eXBlb2YgdmFyaWFudCA9PT0gJ3N0cmluZycgJiYgdHlwZUNoZWNrW3ZhcmlhbnRdICkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlQ2hlY2tbdmFyaWFudF0oZ290KSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9LO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gaW5zdGFuY2VvZlxuICAgICAgICAgICAgaWYoIHR5cGVvZiB2YXJpYW50ID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBnb3QgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgaWYoIGdvdCBpbnN0YW5jZW9mIHZhcmlhbnQgKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gT0s7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBkb24ndCBrbm93IHdoYXQgeW91J3JlIGFza2luZyBmb3JcbiAgICAgICAgICAgIHJldHVybiAndW5rbm93biB2YWx1ZSB0eXBlIHNwZWM6ICcrZXhwbGFpbih2YXJpYW50LCAxKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICctICcrZXhwbGFpbihnb3QsIDEpLFxuICAgICAgICAgICAgJysgJytleHAubWFwKCB0eXBlRXhwbGFpbiApLmpvaW4oXCIgb3IgXCIpLFxuICAgICAgICBdO1xuICAgIH1cbik7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIGV4cGxhaW4gfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5jb25zdCB7IEFubm90YXRlZFNldCB9ID0gcmVxdWlyZSggJy4uL3V0aWwvYW5ub3RhdGVkLXNldC5qcycgKTtcblxuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGRlZXBFcXVhbFxuICogICBAZGVzYyBDb21wYXJlcyB0d28gc3RydWN0dXJlcywgb3V0cHV0cyBkaWZmIGlmIGRpZmZlcmVuY2VzIGZvdW5kLlxuICogICBAcGFyYW0ge2FueX0gYWN0dWFsICAgIEZpcnN0IHN0cnVjdHVyZVxuICogICBAcGFyYW0ge2FueX0gZXhwZWN0ZWQgIFN0cnVjdHVyZSB0byBjb21wYXJlIHRvXG4gKiAgIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqICAgQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMubWF4IGhvdyBtYW55IGRpZmZlcmVuY2VzIHRvIG91dHB1dCAoZGVmYXVsdCA1KVxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5hZGRDb25kaXRpb24oICdkZWVwRXF1YWwnLCB7XCJhcmdzXCI6MixoYXNPcHRpb25zOnRydWV9LCBkZWVwICk7XG5cbmZ1bmN0aW9uIGRlZXAoIGdvdCwgZXhwLCBvcHRpb25zPXt9ICkge1xuICAgIGlmICghb3B0aW9ucy5tYXgpXG4gICAgICAgIG9wdGlvbnMubWF4ID0gNTtcbiAgICBvcHRpb25zLmRpZmYgPSBbXTtcbiAgICBfZGVlcCggZ290LCBleHAsIG9wdGlvbnMgKTtcbiAgICBpZiAoIW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgIHJldHVybiAwO1xuXG4gICAgY29uc3QgcmV0ID0gW107XG4gICAgZm9yIChsZXQgaXRlbSBvZiBvcHRpb25zLmRpZmYpIHtcbiAgICAgICAgcmV0LnB1c2goIFxuICAgICAgICAgICAgXCJhdCBcIitpdGVtWzBdLFxuICAgICAgICAgICAgXCItIFwiKyhpdGVtWzNdID8gaXRlbVsxXSA6IGV4cGxhaW4oIGl0ZW1bMV0sIDIgKSksXG4gICAgICAgICAgICBcIisgXCIrKGl0ZW1bM10gPyBpdGVtWzJdIDogZXhwbGFpbiggaXRlbVsyXSwgMiApKSxcbiAgICAgICAgKTtcbiAgICB9O1xuICAgIHJldHVybiByZXQ7XG59O1xuXG4vLyByZXN1bHQgaXMgc3RvcmVkIGluIG9wdGlvbnMuZGlmZj1bXSwgcmV0dXJuIHZhbHVlIGlzIGlnbm9yZWRcbi8vIGlmIHNhaWQgZGlmZiBleGNlZWRzIG1heCwgcmV0dXJuIGltbWVkaWF0ZWx5ICYgZG9uJ3Qgd2FzdGUgdGltZVxuZnVuY3Rpb24gX2RlZXAoIGdvdCwgZXhwLCBvcHRpb25zPXt9LCBwYXRoPSckJywgc2Vlbkw9bmV3IEFubm90YXRlZFNldCgpLCBzZWVuUj1uZXcgQW5ub3RhdGVkU2V0KCkgKSB7XG4gICAgaWYgKGdvdCA9PT0gZXhwIHx8IG9wdGlvbnMubWF4IDw9IG9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgIHJldHVybjtcbiAgICBpZiAodHlwZW9mIGdvdCAhPT0gdHlwZW9mIGV4cClcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuXG4gICAgLy8gcmVjdXJzZSBieSBleHBlY3RlZCB2YWx1ZSAtIGNvbnNpZGVyIGl0IG1vcmUgcHJlZGljdGFibGVcbiAgICBpZiAodHlwZW9mIGV4cCAhPT0gJ29iamVjdCcgfHwgZXhwID09PSBudWxsICkge1xuICAgICAgICAvLyBub24tb2JqZWN0cyAtIHNvIGNhbid0IGRlc2NlbmRcbiAgICAgICAgLy8gYW5kIGNvbXBhcmlzb24gYWxyZWFkeSBkb25lIGF0IHRoZSBiZWdpbm5uaW5nXG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcbiAgICB9XG5cbiAgICAvLyBtdXN0IGRldGVjdCBsb29wcyBiZWZvcmUgZ29pbmcgZG93blxuICAgIGNvbnN0IHBhdGhMID0gc2VlbkwuaGFzKGdvdCk7XG4gICAgY29uc3QgcGF0aFIgPSBzZWVuUi5oYXMoZXhwKTtcbiAgICBpZiAocGF0aEwgfHwgcGF0aFIpIHtcbiAgICAgICAgLy8gTG9vcCBkZXRlY3RlZCA9IG9ubHkgY2hlY2sgdG9wb2xvZ3lcbiAgICAgICAgaWYgKHBhdGhMID09PSBwYXRoUilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbXG4gICAgICAgICAgICBwYXRoICsgJyAoY2lyY3VsYXIpJyxcbiAgICAgICAgICAgIHBhdGhMID8gJ0NpcmN1bGFyPScrcGF0aEwgOiBleHBsYWluKGdvdCwgMiksXG4gICAgICAgICAgICBwYXRoUiA/ICdDaXJjdWxhcj0nK3BhdGhSIDogZXhwbGFpbihleHAsIDIpLFxuICAgICAgICAgICAgdHJ1ZSAvLyBkb24ndCBzdHJpbmdpZnlcbiAgICAgICAgXSk7XG4gICAgfTtcbiAgICBzZWVuTCA9IHNlZW5MLmFkZChnb3QsIHBhdGgpO1xuICAgIHNlZW5SID0gc2VlblIuYWRkKGV4cCwgcGF0aCk7XG5cbiAgICAvLyBjb21wYXJlIG9iamVjdCB0eXBlc1xuICAgIC8vIChpZiBhIHVzZXIgaXMgc3R1cGlkIGVub3VnaCB0byBvdmVycmlkZSBjb25zdHJ1Y3RvciBmaWVsZCwgd2VsbCB0aGUgdGVzdFxuICAgIC8vIHdvdWxkIGZhaWwgbGF0ZXIgYW55d2F5KVxuICAgIGlmIChnb3QuY29uc3RydWN0b3IgIT09IGV4cC5jb25zdHJ1Y3RvcilcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuXG4gICAgLy8gYXJyYXlcbiAgICBpZiAoQXJyYXkuaXNBcnJheShleHApKSB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShnb3QpIHx8IGdvdC5sZW5ndGggIT09IGV4cC5sZW5ndGgpXG4gICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBleHAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIF9kZWVwKCBnb3RbaV0sIGV4cFtpXSwgb3B0aW9ucywgcGF0aCsnWycraSsnXScsIHNlZW5MLCBzZWVuUiApO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMubWF4PD1vcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm47XG4gICAgfTtcblxuICAgIC8vIGNvbXBhcmUga2V5cyAtICsxIGZvciBleHAsIC0xIGZvciBnb3QsIG5vbnplcm8ga2V5IGF0IGVuZCBtZWFucyBrZXlzIGRpZmZlclxuICAgIGNvbnN0IHVuaXEgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhleHApLmZvckVhY2goIHggPT4gdW5pcVt4XSA9IDEgKTtcbiAgICBPYmplY3Qua2V5cyhnb3QpLmZvckVhY2goIHggPT4gdW5pcVt4XSA9ICh1bmlxW3hdIHx8IDApIC0gMSApO1xuICAgIGZvciAobGV0IHggaW4gdW5pcSkge1xuICAgICAgICBpZiAodW5pcVt4XSAhPT0gMClcbiAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcbiAgICB9XG4gICAgXG4gICAgLy8gbm93IHR5cGVvZiwgb2JqZWN0IHR5cGUsIGFuZCBvYmplY3Qga2V5cyBhcmUgdGhlIHNhbWUuXG4gICAgLy8gcmVjdXJzZS5cbiAgICBmb3IgKGxldCBpIGluIGV4cCkge1xuICAgICAgICBfZGVlcCggZ290W2ldLCBleHBbaV0sIG9wdGlvbnMsIHBhdGgrJ1snK2V4cGxhaW4oaSkrJ10nLCBzZWVuTCwgc2VlblIgKTtcbiAgICAgICAgaWYgKG9wdGlvbnMubWF4PD1vcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgfTtcbiAgICByZXR1cm47XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgY2FsbGVySW5mbywgZXhwbGFpbiwgbWFrZUVycm9yIH0gPSByZXF1aXJlKCAnLi91dGlsLmpzJyApO1xuXG4vKipcbiAqICAgQGNhbGxiYWNrIENvbnRyYWN0XG4gKiAgIEBkZXNjIEEgY29kZSBibG9jayBjb250YWluaW5nIG9uZSBvciBtb3JlIGNvbmRpdGlvbiBjaGVja3MuXG4gKiAgIEEgY2hlY2sgaXMgcGVyZm9ybWVkIGJ5IGNhbGxpbmcgb25lIG9mIGEgZmV3IHNwZWNpYWwgbWV0aG9kc1xuICogICAoZXF1YWwsIG1hdGNoLCBkZWVwRXF1YWwsIHR5cGUgZXRjKVxuICogICBvbiB0aGUgUmVwb3J0IG9iamVjdC5cbiAqICAgQ29udHJhY3RzIG1heSBiZSBuZXN0ZWQgdXNpbmcgdGhlICduZXN0ZWQnIG1ldGhvZCB3aGljaCBhY2NlcHRzXG4gKiAgIGFub3RoZXIgY29udHJhY3QgYW5kIHJlY29yZHMgYSBwYXNzL2ZhaWx1cmUgaW4gdGhlIHBhcmVudCBhY2NvcmRpbmdseS5xXG4gKiAgIEEgY29udHJhY3QgaXMgYWx3YXlzIGV4ZWN1dGVkIHRvIHRoZSBlbmQuXG4gKiAgIEBwYXJhbSB7UmVwb3J0fSBvayBBbiBvYmplY3QgdGhhdCByZWNvcmRzIGNoZWNrIHJlc3VsdHMuXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzXG4gKiAgIChlLmcuIGRhdGEgc3RydWN0dXJlIHRvIGJlIHZhbGlkYXRlZClcbiAqICAgQHJldHVybnMge3ZvaWR9IFJldHVybmVkIHZhbHVlIGlzIGlnbm9yZWQuXG4gKi9cblxuLyoqXG4gKiBAcHVibGljXG4gKiBAY2xhc3NkZXNjXG4gKiBUaGUgY29yZSBvZiB0aGUgcmVmdXRlIGxpYnJhcnksIHRoZSByZXBvcnQgb2JqZWN0IGNvbnRhaW5zIGluZm9cbiAqIGFib3V0IHBhc3NpbmcgYW5kIGZhaWxpbmcgY29uZGl0aW9ucy5cbiAqL1xuY2xhc3MgUmVwb3J0IHtcbiAgICAvLyBzZXR1cFxuICAgIC8qKlxuICAgICAqICBAZGVzYyBObyBjb25zdHJ1Y3RvciBhcmd1bWVudHMgc3VwcG9ydGVkLlxuICAgICAqICBDb250cmFjdHMgbWF5IG5lZWQgdG8gYmUgc2V0IHVwIGluc2lkZSBjYWxsYmFja3MgX2FmdGVyXyBjcmVhdGlvbixcbiAgICAgKiAgaGVuY2UgdGhpcyBjb252ZW50aW9uLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9jb3VudCAgICAgPSAwO1xuICAgICAgICB0aGlzLl9mYWlsQ291bnQgPSAwO1xuICAgICAgICB0aGlzLl9kZXNjciAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fZXZpZGVuY2UgID0gW107XG4gICAgICAgIHRoaXMuX3doZXJlICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9jb25kTmFtZSAgPSBbXTtcbiAgICAgICAgdGhpcy5faW5mbyAgICAgID0gW107XG4gICAgICAgIHRoaXMuX25lc3RlZCAgICA9IFtdO1xuICAgICAgICB0aGlzLl9wZW5kaW5nICAgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuX29uRG9uZSAgICA9IFtdO1xuICAgICAgICB0aGlzLl9kb25lICAgICAgPSBmYWxzZTtcbiAgICAgICAgLy8gVE9ETyBhZGQgY2FsbGVyIGluZm8gYWJvdXQgdGhlIHJlcG9ydCBpdHNlbGZcbiAgICB9XG5cbiAgICAvLyBTZXR1cCBtZXRob2RzIGZvbGxvdy4gVGhleSBtdXN0IGJlIGNoYWluYWJsZSwgaS5lLiByZXR1cm4gdGhpcy5cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgRXhlY3V0ZSBjb2RlIHdoZW4gY29udHJhY3QgZXhlY3V0aW9uIGZpbmlzaGVzLlxuICAgICAqICAgUmVwb3J0IG9iamVjdCBjYW5ub3QgYmUgbW9kaWZpZWQgYXQgdGhpcyBwb2ludCxcbiAgICAgKiAgIGFuZCBubyBhZGRpdGlvbmFsIGNoZWNrcyBteSBiZSBwcmVzZW50LlxuICAgICAqICAgQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBmaXJzdCBhcmd1bWVudCBpcyByZXBvcnQgaW4gcXVlc3Rpb25cbiAgICAgKiAgIEByZXR1cm5zIHtSZXBvcnR9IHRoaXMgKGNoYWluYWJsZSlcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICByZXBvcnQub25Eb25lKCByID0+IHsgaWYgKCFyLmdldFBhc3MoKSkgY29uc29sZS5sb2coci5nZXRUZXh0KCkpIH0gKVxuICAgICAqL1xuICAgIG9uRG9uZShmbikge1xuICAgICAgICBpZiggdHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nIClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignb25Eb25lKCk6IGNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIHRoaXMuX29uRG9uZS5wdXNoKGZuKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBFeGVjdXRlIGNvZGUgd2hlbiBjb250cmFjdCBleGVjdXRpb24gZmluaXNoZXMsIGlmIGl0IGZhaWxlZC5cbiAgICAgKiAgIFJlcG9ydCBvYmplY3QgY2Fubm90IGJlIG1vZGlmaWVkIGF0IHRoaXMgcG9pbnQsXG4gICAgICogICBhbmQgbm8gYWRkaXRpb25hbCBjaGVja3MgbXkgYmUgcHJlc2VudC5cbiAgICAgKiAgIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gZmlyc3QgYXJndW1lbnQgaXMgcmVwb3J0IGluIHF1ZXN0aW9uXG4gICAgICogICBAcmV0dXJucyB7UmVwb3J0fSB0aGlzIChjaGFpbmFibGUpXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgcmVwb3J0Lm9uRmFpbCggciA9PiBjb25zb2xlLmxvZyhyLmdldFRleHQoKSkgKTtcbiAgICAgKi9cbiAgICBvbkZhaWwoZm4pIHtcbiAgICAgICAgaWYoIHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJyApXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uRG9uZSgpOiBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICB0aGlzLl9vbkRvbmUucHVzaChyID0+IHIuZ2V0UGFzcygpIHx8IGZuKHIpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gUnVubmluZyB0aGUgY29udHJhY3RcbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIGFwcGx5IGdpdmVuIGZ1bmN0aW9uIHRvIGEgUmVwb3J0IG9iamVjdCwgbG9jayByZXBvcnQgYWZ0ZXJ3YXJkcy5cbiAgICAgKiAgIElmIGZ1bmN0aW9uIGlzIGFzeW5jIChpLmUuIHJldHVybnMgYSB7QGxpbmsgUHJvbWlzZX0pLFxuICAgICAqICAgdGhlIHJlcG9ydCB3aWxsIG9ubHkgYmUgZG9uZSgpIGFmdGVyIHRoZSBwcm9taXNlIHJlc29sdmVzLlxuICAgICAqICAgVGhpcyBpcyBkb25lIHNvIHRvIGVuc3VyZSB0aGF0IGFsbCBjaGVja3MgdGhhdCBhd2FpdCBvbiBhIHZhbHVlXG4gICAgICogICBhcmUgcmVzb2x2ZWQuXG4gICAgICogICBAcGFyYW0ge0NvbnRyYWN0fSBjb250cmFjdCBUaGUgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICAgICAqICAgQWRkaXRpb25hbCBwYXJhbWV0ZXJzIG1heSBiZSBfcHJlcGVuZGVkXyB0byBjb250cmFjdFxuICAgICAqICAgYW5kIHdpbGwgYmUgcGFzc2VkIHRvIGl0IF9hZnRlcl8gdGhlIFJlcG9ydCBvYmplY3QgaW4gcXVlc3Rpb24uXG4gICAgICogICBAcmV0dXJucyB7UmVwb3J0fSB0aGlzIChjaGFpbmFibGUpXG4gICAgICogICBAZXhhbXBsZSBCYXNpYyB1c2FnZVxuICAgICAqICAgY29uc3QgciA9IG5ldyBSZXBvcnQoKS5ydW4oIG9rID0+IG9rLmVxdWFsKCAnd2FyJywgJ3BlYWNlJywgJzE5ODQnICkgKTtcbiAgICAgKiAgIHIuZ2V0UGFzcygpOyAvLyBmYWxzZVxuICAgICAqICAgci5nZXREb25lKCk7IC8vIHRydWVcbiAgICAgKiAgIHIuZ2V0VGV4dCgpO1xuICAgICAqICAgcihcbiAgICAgKiAgICAgICExLiAxOTg0XG4gICAgICogICAgICAtIHdhclxuICAgICAqICAgICAgKyBwZWFjZVxuICAgICAqICAgKVxuICAgICAqXG4gICAgICogICBAZXhhbXBsZSBQYXNzaW5nIGFkZGl0aW9uYWwgYXJndW1lbnRzIHRvIGNhbGxiYWNrLlxuICAgICAqICAgLy8gVGhlIGNvbnRyYWN0IGJvZHkgaXMgdGhlIGxhc3QgYXJndW1lbnQuXG4gICAgICogICBuZXcgUmVwb3J0KCkucnVuKCB7IHY6IDQuMiwgY29sb3JzOiBbICdibHVlJyBdIH0sIChyLCBhcmcpID0+IHtcbiAgICAgKiAgICAgICByLnR5cGUoIGFyZywgJ29iamVjdCcgKTtcbiAgICAgKiAgICAgICByLnR5cGUoIGFyZy52LCAnbnVtYmVyJyApO1xuICAgICAqICAgICAgIHIubnVtQ21wKCBhcmcudiwgJz49JywgMy4xNCApO1xuICAgICAqICAgICAgIHIudHlwZSggYXJnLmNvbG9ycywgJ2FycmF5JyApO1xuICAgICAqICAgfSk7XG4gICAgICogICBAZXhhbXBsZSBBc3luYyBmdW5jdGlvblxuICAgICAqICAgY29uc3QgciA9IG5ldyBSZXBvcnQoKS5ydW4oXG4gICAgICogICAgICAgYXN5bmMgb2sgPT4gb2suZXF1YWwoIGF3YWl0IDYqOSwgNDIsICdmYWlscyBidXQgbGF0ZXInICkgKTtcbiAgICAgKiAgIHIuZ2V0UGFzcygpOyAvLyB0cnVlXG4gICAgICogICByLmdldERvbmUoKTsgLy8gZmFsc2VcbiAgICAgKiAgIC8vIC4uLndhaXQgZm9yIGV2ZW50IGxvb3AgdG8gdGlja1xuICAgICAqICAgci5nZXRQYXNzKCk7IC8vIGZhbHNlXG4gICAgICogICByLmdldERvbmUoKTsgLy8gdHJ1ZVxuICAgICAqL1xuICAgIHJ1biguLi5hcmdzKSB7XG4gICAgICAgIC8vIFRPRE8gZWl0aGVyIGFzeW5jKCkgc2hvdWxkIHN1cHBvcnQgYWRkaXRpb25hbCBhcmdzLCBvciBydW4oKSBzaG91bGRuJ3RcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICBjb25zdCBibG9jayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhc3QgYXJndW1lbnQgb2YgcnVuKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLCBub3QgJyt0eXBlb2YoYmxvY2spKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYmxvY2soIHRoaXMsIC4uLmFyZ3MgKTtcbiAgICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpXG4gICAgICAgICAgICByZXN1bHQudGhlbiggKCkgPT4gdGhpcy5kb25lKCkgKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhpcy5kb25lKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgYXBwbHkgZ2l2ZW4gZnVuY3Rpb24gKGNvbnRyYWN0KSB0byBhIFJlcG9ydCBvYmplY3QuXG4gICAgICogICBNdWx0aXBsZSBzdWNoIGNvbnRyYXRzIG1heSBiZSBhcHBsaWVkLCBhbmQgdGhlIHJlcG9ydCBpcyBub3QgbG9ja2VkLlxuICAgICAqICAgQXN5bmMgZnVuY3Rpb24gYXJlIHBlcm1pdHRlZCBidXQgbWF5IG5vdCBiZWhhdmUgYXMgZXhwZWN0ZWQuXG4gICAgICogICBAcGFyYW0ge0NvbnRyYWN0fSBjb250cmFjdCBUaGUgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICAgICAqICAgQWRkaXRpb25hbCBwYXJhbWV0ZXJzIG1heSBiZSBfcHJlcGVuZGVkXyB0byBjb250cmFjdFxuICAgICAqICAgYW5kIHdpbGwgYmUgcGFzc2VkIHRvIGl0IF9hZnRlcl8gdGhlIFJlcG9ydCBvYmplY3QgaW4gcXVlc3Rpb24uXG4gICAgICogICBAcmV0dXJucyB7UmVwb3J0fSB0aGlzIChjaGFpbmFibGUpXG4gICAgICogICBAZXhhbXBsZSBCYXNpYyB1c2FnZVxuICAgICAqICAgY29uc3QgciA9IG5ldyBSZXBvcnQoKVxuICAgICAqICAgICAgIC5ydW5TeW5jKCBvayA9PiBvay5lcXVhbCggJ3dhcicsICdwZWFjZScsICcxOTg0JyApIClcbiAgICAgKiAgICAgICAucnVuU3luYyggb2sgPT4gb2sudHlwZSAoIFtdLCAnYXJyYXknLCAnc29tZSBtb3JlIGNoZWNrcycgKSApXG4gICAgICogICAgICAgLmRvbmUoKTtcbiAgICAgKi9cbiAgICBydW5TeW5jKC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICBjb25zdCBibG9jayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhc3QgYXJndW1lbnQgb2YgcnVuKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLCBub3QgJyt0eXBlb2YoYmxvY2spKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYmxvY2soIHRoaXMsIC4uLmFyZ3MgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIFJ1biBhIGNvbnRyYWN0IGFzeW5jaHJvbm91c2x5IHdpdGggdGltZW91dC5cbiAgICAgKiAgUmV0dXJucyBhIHByb21pc2UgdGhhdCB3aWxsIHJlc29sdmUgd2hlbiB0aGUgY29udHJhY3QgZmluaXNoZXMsXG4gICAgICogIHBhc3NpbmcgYWxvbmcgdGhlIGNvbnRyYWN0IG9iamVjdCB0byB0aGVuKCkuXG4gICAgICogIEBwYXJhbSB7aW50ZWdlcn0gdGltZW91dCAgIFRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzIGJlZm9yZSB0aGUgcHJvbWlzZSBpcyByZWplY3RlZC5cbiAgICAgKiAgQHBhcmFtIHtDb250cmFjdH0gY29udHJhY3QgQSBmdW5jdGlvbiB0byBwYXNzIFJlcG9ydCBvYmplY3QgdG8uXG4gICAgICogIEByZXR1cm5zIHtQcm9taXNlfVxuICAgICAqL1xuICAgIGFzeW5jKHRpbWVvdXQsIGJsb2NrKSB7XG4gICAgICAgIC8vIFRPRE8gZWl0aGVyIGFzeW5jKCkgc2hvdWxkIHN1cHBvcnQgYWRkaXRpb25hbCBhcmdzLCBvciBydW4oKSBzaG91bGRuJ3RcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoXG4gICAgICAgICAgICAgICAgKCkgPT4gcmVqZWN0KG5ldyBFcnJvcihcIkNvbnRyYWN0IGV4ZWN1dGlvbiB0b29rIHRvbyBsb25nXCIpKSxcbiAgICAgICAgICAgICAgICB0aW1lb3V0XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgY29uc3QgbmV4dCA9ICgpID0+IHsgY2xlYXJUaW1lb3V0KHRpbWVyKTsgcmVzb2x2ZSh0aGlzKTsgfTtcblxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYmxvY2sodGhpcyk7XG4gICAgICAgICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSlcbiAgICAgICAgICAgICAgICByZXN1bHQudGhlbiggbmV4dCApO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0UmVzdWx0IChldmlkZW5jZSwgZGVzY3IsIGNvbmROYW1lLCB3aGVyZSkge1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIGNvbnN0IG4gPSArK3RoaXMuX2NvdW50O1xuICAgICAgICBpZiAoZGVzY3IpXG4gICAgICAgICAgICB0aGlzLl9kZXNjcltuXSA9IGRlc2NyO1xuICAgICAgICAvLyBwYXNzIC0gcmV0dXJuIEFTQVBcbiAgICAgICAgaWYgKCFldmlkZW5jZSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBuZXN0ZWQgcmVwb3J0IG5lZWRzIHNwZWNpYWwgaGFuZGxpbmdcbiAgICAgICAgaWYgKGV2aWRlbmNlIGluc3RhbmNlb2YgUmVwb3J0KSB7XG4gICAgICAgICAgICB0aGlzLl9uZXN0ZWRbbl0gPSBldmlkZW5jZTtcbiAgICAgICAgICAgIGlmIChldmlkZW5jZS5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXZpZGVuY2UuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIHNob3J0LWNpcmN1aXQgaWYgcG9zc2libGVcbiAgICAgICAgICAgICAgICBldmlkZW5jZSA9IFtdOyAvLyBoYWNrIC0gZmFpbGluZyB3aXRob3V0IGV4cGxhbmF0aW9uXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5lc3RlZCBjb250cmFjdCBpcyBpbiBhc3luYyBtb2RlIC0gY29lcmNlIGludG8gYSBwcm9taXNlXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycnkgPSBldmlkZW5jZTtcbiAgICAgICAgICAgICAgICBldmlkZW5jZSA9IG5ldyBQcm9taXNlKCBkb25lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY3Vycnkub25Eb25lKCBkb25lICk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwZW5kaW5nIC0gd2UncmUgaW4gYXN5bmMgbW9kZVxuICAgICAgICBpZiAoZXZpZGVuY2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nLmFkZChuKTtcbiAgICAgICAgICAgIHdoZXJlID0gd2hlcmUgfHwgY2FsbGVySW5mbygyKTsgLy8gbXVzdCByZXBvcnQgYWN0dWFsIGNhbGxlciwgbm90IHRoZW5cbiAgICAgICAgICAgIGV2aWRlbmNlLnRoZW4oIHggPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmcuZGVsZXRlKG4pO1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldFJlc3VsdChuLCB4LCBjb25kTmFtZSwgd2hlcmUgKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuX29uRG9uZS5sZW5ndGg7IGktLT4wOyApXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbkRvbmVbaV0odGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5fc2V0UmVzdWx0KG4sIGV2aWRlbmNlLCBjb25kTmFtZSwgd2hlcmUgfHwgY2FsbGVySW5mbygyKSk7XG4gICAgfVxuXG4gICAgX3NldFJlc3VsdChuLCBldmlkZW5jZSwgY29uZE5hbWUsIHdoZXJlKSB7XG4gICAgICAgIGlmICghZXZpZGVuY2UpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgLy8gbGlzdGlmeSAmIHN0cmluZ2lmeSBldmlkZW5jZSwgc28gdGhhdCBpdCBkb2Vzbid0IGNoYW5nZSBwb3N0LWZhY3R1bVxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZXZpZGVuY2UpKVxuICAgICAgICAgICAgZXZpZGVuY2UgPSBbIGV2aWRlbmNlIF07XG4gICAgICAgIHRoaXMuX2V2aWRlbmNlW25dID0gZXZpZGVuY2UubWFwKCB4PT5fZXhwbGFpbih4LCBJbmZpbml0eSkgKTtcbiAgICAgICAgdGhpcy5fd2hlcmVbbl0gICAgPSB3aGVyZTtcbiAgICAgICAgdGhpcy5fY29uZE5hbWVbbl0gPSBjb25kTmFtZTtcbiAgICAgICAgdGhpcy5fZmFpbENvdW50Kys7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgQXBwZW5kIGFuIGluZm9ybWF0aW9uYWwgbWVzc2FnZSB0byB0aGUgcmVwb3J0LlxuICAgICAqIE5vbi1zdHJpbmcgdmFsdWVzIHdpbGwgYmUgc3RyaW5naWZpZWQgdmlhIGV4cGxhaW4oKS5cbiAgICAgKiBAcGFyYW0ge0FueX0gbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtSZXBvcnR9IGNoYWluYWJsZVxuICAgICAqL1xuICAgIGluZm8oIC4uLm1lc3NhZ2UgKSB7XG4gICAgICAgIHRoaXMuX2xvY2soKTtcbiAgICAgICAgaWYgKCF0aGlzLl9pbmZvW3RoaXMuX2NvdW50XSlcbiAgICAgICAgICAgIHRoaXMuX2luZm9bdGhpcy5fY291bnRdID0gW107XG4gICAgICAgIHRoaXMuX2luZm9bdGhpcy5fY291bnRdLnB1c2goIG1lc3NhZ2UubWFwKCBzPT5fZXhwbGFpbihzKSApLmpvaW4oXCIgXCIpICk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgTG9ja3MgdGhlIHJlcG9ydCBvYmplY3QsIHNvIG5vIG1vZGlmaWNhdGlvbnMgbWF5IGJlIG1hZGUgbGF0ZXIuXG4gICAgICogICBBbHNvIGlmIG9uRG9uZSBjYWxsYmFjayhzKSBhcmUgcHJlc2VudCwgdGhleSBhcmUgZXhlY3V0ZWRcbiAgICAgKiAgIHVubGVzcyB0aGVyZSBhcmUgcGVuZGluZyBhc3luYyBjaGVja3MuXG4gICAgICogICBAcmV0dXJucyB7UmVwb3J0fSB0aGlzIChjaGFpbmFibGUpXG4gICAgICovXG4gICAgZG9uZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9kb25lKSB7XG4gICAgICAgICAgICB0aGlzLl9kb25lID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmICghdGhpcy5fcGVuZGluZy5zaXplKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuX29uRG9uZS5sZW5ndGg7IGktLT4wOyApXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX29uRG9uZVtpXSh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgaWYgdGhlIFJlcG9ydCBvYmplY3QgaXMgc3RpbGwgbW9kaWZpYWJsZSwgdGhyb3dzIG90aGVyd2lzZS5cbiAgICBfbG9jayAoKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIGNvbnRyYWN0Jyk7XG4gICAgfVxuXG4gICAgLy8gUXVlcnlpbmcgbWV0aG9kc1xuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyAgVGVsbHMgd2hldGhlciB0aGUgcmVwb3J0IGlzIGZpbmlzaGVkLFxuICAgICAqICAgICAgICAgIGkuZS4gZG9uZSgpIHdhcyBjYWxsZWQgJiBubyBwZW5kaW5nIGFzeW5jIGNoZWNrcy5cbiAgICAgKiAgIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGdldERvbmUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kb25lICYmICF0aGlzLl9wZW5kaW5nLnNpemU7IC8vIGlzIGl0IGV2ZW4gbmVlZGVkP1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgV2l0aG91dCBhcmd1bWVudCByZXR1cm5zIHdoZXRoZXIgdGhlIGNvbnRyYWN0IHdhcyBmdWxmaWxsZWQuXG4gICAgICogICBBcyBhIHNwZWNpYWwgY2FzZSwgaWYgbm8gY2hlY2tzIHdlcmUgcnVuIGFuZCB0aGUgY29udHJhY3QgaXMgZmluaXNoZWQsXG4gICAgICogICByZXR1cm5zIGZhbHNlLCBhcyBpbiBcInNvbWVvbmUgbXVzdCBoYXZlIGZvcmdvdHRlbiB0byBleGVjdXRlXG4gICAgICogICBwbGFubmVkIGNoZWNrcy4gVXNlIHBhc3MoKSBpZiBubyBjaGVja3MgYXJlIHBsYW5uZWQuXG4gICAgICpcbiAgICAgKiAgIElmIGEgcGFyYW1ldGVyIGlzIGdpdmVuLCByZXR1cm4gdGhlIHN0YXR1cyBvZiBuLXRoIGNoZWNrIGluc3RlYWQuXG4gICAgICogICBAcGFyYW0ge2ludGVnZXJ9IG5cbiAgICAgKiAgIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGdldFBhc3Mobikge1xuICAgICAgICBpZiAobiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ZhaWxDb3VudCA9PT0gMCAmJiAoIXRoaXMuZ2V0RG9uZSgpIHx8IHRoaXMuX2NvdW50ID4gMCk7XG4gICAgICAgIHJldHVybiAobiA+IDAgJiYgbiA8PSB0aGlzLl9jb3VudCkgPyAhdGhpcy5fZXZpZGVuY2Vbbl0gOiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBOdW1iZXIgb2YgY2hlY2tzIHBlcmZvcm1lZC5cbiAgICAgKiAgIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0Q291bnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb3VudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgV2hldGhlciB0aGUgbGFzdCBjaGVjayB3YXMgYSBzdWNjZXNzLlxuICAgICAqICBUaGlzIGlzIGp1c3QgYSBzaG9ydGN1dCBmb3IgZm9vLmdldERldGFpbHMoZm9vLmdldENvdW50KS5wYXNzXG4gICAgICogIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGxhc3QoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb3VudCA/ICF0aGlzLl9ldmlkZW5jZVt0aGlzLl9jb3VudF0gOiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBOdW1iZXIgb2YgY2hlY2tzIGZhaWxpbmcuXG4gICAgICogICBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldEZhaWxDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZhaWxDb3VudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIFJldHVybiBhIHN0cmluZyBvZiBmYWlsaW5nL3Bhc3NpbmcgY2hlY2tzLlxuICAgICAqICAgVGhpcyBtYXkgYmUgdXNlZnVsIGZvciB2YWxpZGF0aW5nIGN1c3RvbSBjb25kaXRpb25zLlxuICAgICAqICAgQ29uc2VjdXRpdmUgcGFzc2luZyBjaGVja2EgYXJlIHJlcHJlc2VudGVkIGJ5IG51bWJlcnMuXG4gICAgICogICBBIGNhcGl0YWwgbGV0dGVyIGluIHRoZSBzdHJpbmcgcmVwcmVzZW50cyBmYWlsdXJlLlxuICAgICAqICAgU2VlIGFsc28ge0BsaW5rIFJlcG9ydCNnZXRUZXh0IGdldFRleHQoKX1cbiAgICAgKiAgIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgcGFzc2luZyBjaGVja3NcbiAgICAgKiAgIFwicigxMClcIlxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIGNoZWNrcyB3aXRoIDEgZmFpbHVyZSBpbiB0aGUgbWlkZGxlXG4gICAgICogICBcInIoNSxOLDQpXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBjaGVja3MgaW5jbHVkaW5nIGEgbmVzdGVkIGNvbnRyYWN0XG4gICAgICogICBcInIoMyxyKDEsTiksNilcIlxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIG5vIGNoZWNrcyB3ZXJlIHJ1biAtIGF1dG8tZmFpbFxuICAgICAqICAgXCJyKFopXCJcbiAgICAgKi9cbiAgICBnZXRHaG9zdCgpIHtcbiAgICAgICAgY29uc3QgZ2hvc3QgPSBbXTtcbiAgICAgICAgbGV0IHN0cmVhayA9IDA7XG4gICAgICAgIGZvciAobGV0IGk9MTsgaSA8PSB0aGlzLl9jb3VudDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fZXZpZGVuY2VbaV0gfHwgdGhpcy5fbmVzdGVkW2ldKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmVhaykgZ2hvc3QucHVzaChzdHJlYWspO1xuICAgICAgICAgICAgICAgIHN0cmVhayA9IDA7XG4gICAgICAgICAgICAgICAgZ2hvc3QucHVzaCggdGhpcy5fbmVzdGVkW2ldID8gdGhpcy5fbmVzdGVkW2ldLmdldEdob3N0KCkgOiAnTicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdHJlYWsrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RyZWFrKSBnaG9zdC5wdXNoKHN0cmVhayk7XG4gICAgICAgIGlmIChnaG9zdC5sZW5ndGggPT09IDAgJiYgIXRoaXMuZ2V0UGFzcygpKVxuICAgICAgICAgICAgZ2hvc3QucHVzaCgnWicpO1xuICAgICAgICByZXR1cm4gJ3IoJytnaG9zdC5qb2luKCcsJykrJyknO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBSZXR1cm5zIHNlcmlhbGl6ZWQgZGlmZi1saWtlIHJlcG9ydCB3aXRoIG5lc3RpbmcgYW5kIGluZGVudGF0aW9uLlxuICAgICAqICBQYXNzaW5nIGNvbmRpdGlvbnMgYXJlIG1lcmtlZCB3aXRoIG51bWJlcnMsIGZhaWxpbmcgYXJlIHByZWZpeGVkXG4gICAgICogIHdpdGggYSBiYW5nICghKS5cbiAgICAgKlxuICAgICAqICBTZWUgYWxzbyB7QGxpbmsgUmVwb3J0I2dldEdob3N0IGdldEdob3N0KCl9XG4gICAgICogIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICogIEBleGFtcGxlIC8vIG5vIGNoZWNrcyBydW5cbiAgICAgKiAgY29uc3QgciA9IG5ldyBSZXBvcnQoKTtcbiAgICAgKiAgci5nZXRUZXh0KCk7XG4gICAgICogIHIoXG4gICAgICogIClcbiAgICAgKiAgQGV4YW1wbGUgLy8gcGFzc1xuICAgICAqICBjb25zdCByID0gbmV3IFJlcG9ydCgpO1xuICAgICAqICByLnBhc3MoJ2ZvbyBiYXJlZCcpO1xuICAgICAqICByLmdldFRleHQoKTtcbiAgICAgKiAgcihcbiAgICAgKiAgICAgIDEuIGZvbyBiYXJlZFxuICAgICAqICApXG4gICAgICogIEBleGFtcGxlIC8vIGZhaWxcbiAgICAgKiAgY29uc3QgciA9IG5ldyBSZXBvcnQoKTtcbiAgICAgKiAgci5lcXVhbCgnd2FyJywgJ3BlYWNlJyk7XG4gICAgICogIHIuZ2V0VGV4dCgpO1xuICAgICAqICByKFxuICAgICAqICAgICAgITEuXG4gICAgICogICAgICBeIENvbmRpdGlvbiBlcXVhbCBmYWlsZWQgYXQgPGZpbGU+OjxsaW5lPjo8Y2hhcj5cbiAgICAgKiAgICAgIC0gd2FyXG4gICAgICogICAgICArIHBlYWNlXG4gICAgICogIClcbiAgICAgKi9cbiAgICBnZXRUZXh0KCkge1xuICAgICAgICAvLyBUT0RPIHByZXBlbmQgd2l0aCAncmVmdXRlL3Yvbi5ubidcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0TGluZXMoKS5qb2luKCdcXG4nKTtcbiAgICB9XG5cbiAgICBnZXRMaW5lcyhpbmRlbnQ9JycpIHtcbiAgICAgICAgY29uc3Qgb3V0ID0gW2luZGVudCArICdyKCddO1xuICAgICAgICBjb25zdCBsYXN0ID0gaW5kZW50ICsgJyknO1xuICAgICAgICBpbmRlbnQgPSBpbmRlbnQgKyAnICAgICc7XG5cbiAgICAgICAgY29uc3QgcGFkID0gcHJlZml4ID0+IHMgPT4gaW5kZW50ICsgcHJlZml4ICsgJyAnICsgcztcblxuICAgICAgICBpZiAodGhpcy5faW5mb1swXSlcbiAgICAgICAgICAgIG91dC5wdXNoKCAuLi50aGlzLl9pbmZvWzBdLm1hcCggcGFkKCc7JykgKSApO1xuICAgICAgICBmb3IgKGxldCBuID0gMTsgbjw9dGhpcy5fY291bnQ7IG4rKykge1xuICAgICAgICAgICAgb3V0LnB1c2goXG4gICAgICAgICAgICAgICAgaW5kZW50XG4gICAgICAgICAgICAgICAgKyh0aGlzLl9wZW5kaW5nLmhhcyhuKSA/ICcuLi4nIDogKHRoaXMuX2V2aWRlbmNlW25dID8gJyEnOicnKSApXG4gICAgICAgICAgICAgICAgK24rKHRoaXMuX2Rlc2NyW25dID8gJy4gJyt0aGlzLl9kZXNjcltuXSA6ICcuJylcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiggdGhpcy5fbmVzdGVkW25dKSB7XG4gICAgICAgICAgICAgICAgb3V0LnB1c2goIC4uLnRoaXMuX25lc3RlZFtuXS5nZXRMaW5lcyhpbmRlbnQpICk7XG4gICAgICAgICAgICB9IGVsc2UgaWYoIHRoaXMuX2V2aWRlbmNlW25dICkge1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKCBpbmRlbnQgKyAnICAgIF4gQ29uZGl0aW9uIGAnKyh0aGlzLl9jb25kTmFtZVtuXSB8fCAnY2hlY2snKVxuICAgICAgICAgICAgICAgICAgICArJ2AgZmFpbGVkIGF0ICcrdGhpcy5fd2hlcmVbbl0gKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9ldmlkZW5jZVtuXS5mb3JFYWNoKCByYXcgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgbXVsdGlsaW5lIGV2aWRlbmNlXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPRE8gdGhpcyBpcyBwZXJsIHdyaXR0ZW4gaW4gSlMsIHJld3JpdGUgbW9yZSBjbGVhcmx5XG4gICAgICAgICAgICAgICAgICAgIGxldFsgXywgcHJlZml4LCBzIF0gPSByYXcubWF0Y2goIC9eKFstK3xdICk/KC4qPylcXG4/JC9zICk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcHJlZml4KSBwcmVmaXggPSAnfCAnO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXMubWF0Y2goL1xcbi8pKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaCggaW5kZW50ICsgJyAgICAnICsgcHJlZml4ICsgcyApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcy5zcGxpdCgnXFxuJykuZm9yRWFjaChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJ0ID0+IG91dC5wdXNoKCBpbmRlbnQgKyAnICAgICcgKyBwcmVmaXggKyBwYXJ0ICkpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9pbmZvW25dKVxuICAgICAgICAgICAgICAgIG91dC5wdXNoKCAuLi50aGlzLl9pbmZvW25dLm1hcCggcGFkKCc7JykgKSApO1xuICAgICAgICB9O1xuICAgICAgICBvdXQucHVzaChsYXN0KTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgcmV0dXJucyBhIHBsYWluIHNlcmlhbGl6YWJsZSBvYmplY3RcbiAgICAgKiAgQHJldHVybnMge09iamVjdH1cbiAgICAgKi9cbiAgICB0b0pTT04oKSB7XG4gICAgICAgIGNvbnN0IG4gPSB0aGlzLmdldENvdW50KCk7XG4gICAgICAgIGNvbnN0IGRldGFpbHMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGk8PW47IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuZ2V0RGV0YWlscyhpKTtcbiAgICAgICAgICAgIC8vIHN0cmlwIGV4dHJhIGtleXNcbiAgICAgICAgICAgIGZvciggbGV0IGtleSBpbiBub2RlICkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlW2tleV0gPT09IHVuZGVmaW5lZCB8fCAoQXJyYXkuaXNBcnJheShub2RlW2tleV0pICYmIG5vZGVba2V5XS5sZW5ndGggPT09IDApKVxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbm9kZVtrZXldO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChub2RlKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHBhc3M6ICB0aGlzLmdldFBhc3MoKSxcbiAgICAgICAgICAgIGNvdW50OiB0aGlzLmdldENvdW50KCksXG4gICAgICAgICAgICBkZXRhaWxzLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICAvLyBUT0RPIGdldFRleHRcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VGFwKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIFJldHVybnMgcmVwb3J0IHN0cmluZ2lmaWVkIGFzIFRBUCBmb3JtYXRcbiAgICAgKiAgQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXRUYXAobikge1xuICAgICAgICBjb25zdCB0YXAgPSBuID09PSB1bmRlZmluZWQgPyB0aGlzLmdldFRhcExpbmVzKCkgOiB0aGlzLmdldFRhcEVudHJ5KG4pO1xuICAgICAgICB0YXAucHVzaCgnJyk7XG4gICAgICAgIHJldHVybiB0YXAuam9pbignXFxuJyk7XG4gICAgfVxuXG4gICAgZ2V0VGFwTGluZXMobikge1xuICAgICAgICAvLyBUQVAgZm9yIG5vdywgdXNlIGFub3RoZXIgZm9ybWF0IGxhdGVyIGJlY2F1c2UgXCJwZXJsIGlzIHNjYXJ5XCJcbiAgICAgICAgY29uc3QgdGFwID0gWyAnMS4uJyt0aGlzLl9jb3VudCBdO1xuICAgICAgICAvLyBUT0RPIGluZm9bMF1cbiAgICAgICAgY29uc3QgcHJlZmFjZSA9IHRoaXMuZ2V0RGV0YWlscygwKTtcbiAgICAgICAgdGFwLnB1c2goIC4uLnByZWZhY2UuaW5mby5tYXAoIHMgPT4gJyMgJytzICkgKTtcbiAgICAgICAgZm9yKCBsZXQgaSA9IDE7IGkgPD0gdGhpcy5fY291bnQ7IGkrKyApXG4gICAgICAgICAgICB0YXAucHVzaCggLi4uIHRoaXMuZ2V0VGFwRW50cnkoaSkgKTtcbiAgICAgICAgaWYgKCF0aGlzLmdldFBhc3MoKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0Q291bnQoKSA+IDApXG4gICAgICAgICAgICAgICAgdGFwLnB1c2goJyMgRmFpbGVkICcrdGhpcy5nZXRGYWlsQ291bnQoKSsnLycrdGhpcy5nZXRDb3VudCgpKyAnIGNvbmRpdGlvbnMnKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB0YXAucHVzaCgnIyBObyBjaGVja3Mgd2VyZSBydW4sIGNvbnNpZGVyIHVzaW5nIHBhc3MoKSBpZiB0aGF0XFwncyBkZWxpYmVyYXRlJyk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0YXA7XG4gICAgfVxuXG4gICAgZ2V0VGFwRW50cnkobikge1xuICAgICAgICBjb25zdCBkYXRhID0gdHlwZW9mKG4pID09PSAnb2JqZWN0JyA/IG4gOiB0aGlzLmdldERldGFpbHMobik7XG4gICAgICAgIGNvbnN0IHRhcCA9IFtdO1xuICAgICAgICBpZiAoZGF0YS5uZXN0ZWQpIHtcbiAgICAgICAgICAgIHRhcC5wdXNoKCAnIyBzdWJjb250cmFjdDonKyhkYXRhLm5hbWU/JyAnK2RhdGEubmFtZTonJykgKTtcbiAgICAgICAgICAgIHRhcC5wdXNoKCAuLi4gZGF0YS5uZXN0ZWQuZ2V0VGFwTGluZXMoKS5tYXAoIHMgPT4gJyAgICAnK3MgKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEucGVuZGluZykge1xuICAgICAgICAgICAgdGFwLnB1c2goICdwZW5kaW5nICcrZGF0YS5uKycgPC4uLj4nICk7XG4gICAgICAgICAgICByZXR1cm4gdGFwO1xuICAgICAgICB9XG4gICAgICAgIHRhcC5wdXNoKChkYXRhLnBhc3M/Jyc6J25vdCAnKSArICdvayAnICsgZGF0YS5uXG4gICAgICAgICAgICArIChkYXRhLm5hbWUgPyAnIC0gJytkYXRhLm5hbWUgOiAnJykpO1xuICAgICAgICBpZiAoIWRhdGEucGFzcylcbiAgICAgICAgICAgIHRhcC5wdXNoKCcjIENvbmRpdGlvbicrKGRhdGEuY29uZCA/ICcgJytkYXRhLmNvbmQgOiAnJykrJyBmYWlsZWQgYXQgJytkYXRhLndoZXJlKTtcbiAgICAgICAgdGFwLnB1c2goLi4uZGF0YS5ldmlkZW5jZS5tYXAocz0+JyMgJytzKSk7XG4gICAgICAgIHRhcC5wdXNoKC4uLmRhdGEuaW5mby5tYXAocz0+JyMgJytzKSk7XG4gICAgICAgIHJldHVybiB0YXA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBSZXR1cm5zIGRldGFpbGVkIHJlcG9ydCBvbiBhIHNwZWNpZmljIGNoZWNrXG4gICAgICogICBAcGFyYW0ge2ludGVnZXJ9IG4gLSBjaGVjayBudW1iZXIsIG11c3QgYmUgPD0gZ2V0Q291bnQoKVxuICAgICAqICAgQHJldHVybnMge29iamVjdH1cbiAgICAgKi9cbiAgICBnZXREZXRhaWxzKG4pIHtcbiAgICAgICAgLy8gVE9ETyB2YWxpZGF0ZSBuXG5cbiAgICAgICAgLy8gdWdseSBidXQgd2hhdCBjYW4gSSBkb1xuICAgICAgICBpZiAobiA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuOiAgICAwLFxuICAgICAgICAgICAgICAgIGluZm86IHRoaXMuX2luZm9bMF0gfHwgW10sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGV2aWRlbmNlID0gdGhpcy5fZXZpZGVuY2Vbbl07XG4gICAgICAgIGlmIChldmlkZW5jZSAmJiAhQXJyYXkuaXNBcnJheShldmlkZW5jZSkpXG4gICAgICAgICAgICBldmlkZW5jZSA9IFtldmlkZW5jZV07XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG46ICAgICAgICBuLFxuICAgICAgICAgICAgbmFtZTogICAgIHRoaXMuX2Rlc2NyW25dIHx8ICcnLFxuICAgICAgICAgICAgcGFzczogICAgICFldmlkZW5jZSxcbiAgICAgICAgICAgIGV2aWRlbmNlOiBldmlkZW5jZSB8fCBbXSxcbiAgICAgICAgICAgIHdoZXJlOiAgICB0aGlzLl93aGVyZVtuXSxcbiAgICAgICAgICAgIGNvbmQ6ICAgICB0aGlzLl9jb25kTmFtZVtuXSxcbiAgICAgICAgICAgIGluZm86ICAgICB0aGlzLl9pbmZvW25dIHx8IFtdLFxuICAgICAgICAgICAgbmVzdGVkOiAgIHRoaXMuX25lc3RlZFtuXSxcbiAgICAgICAgICAgIHBlbmRpbmc6ICB0aGlzLl9wZW5kaW5nLmhhcyhuKSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgQ29udmVydCByZXBvcnQgdG8gYW4gQXNzZXJ0aW9uRXJyb3IgKGlmIGF2YWlsYWJsZSkgb3IganVzdCBFcnJvci5cbiAgICAgKiAgQHBhcmFtIHtudW1iZXJ9IFtuXSBOdW1iZXIgb2YgY2hlY2sgdG8gY29udmVydCB0byBleGNlcHRpb24uXG4gICAgICogIEN1cnJlbnQgZXJyb3IgZm9ybWF0IGlzIFRBUCwgdGhpcyBtYXkgY2hhbmdlIGluIHRoZSBmdXR1cmUuXG4gICAgICogIElmIDAgb3IgdW5zcGVjaWZpZWQsIGNvbnZlcnQgdGhlIHdob2xlIHJlcG9ydC5cbiAgICAgKiAgQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXVxuICAgICAqICBAcGFyYW0ge2Jvb2xlYW59IG9wdGlvbnMucGFzcyBJZiBmYWxzZSAodGhlIGRlZmF1bHQpLCByZXR1cm4gbm90aGluZ1xuICAgICAqICBpZiB0aGUgcmVwb3J0IGlzIHBhc3NpbmcuXG4gICAgICogIEByZXR1cm5zIHtFcnJvcnx1bmRlZmluZWR9XG4gICAgICovXG4gICAgZ2V0RXJyb3Iobiwgb3B0aW9ucz17fSkge1xuICAgICAgICBpZiAoIW4pIHtcbiAgICAgICAgICAgIC8vIG5vIGVudHJ5IGdpdmVuXG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMucGFzcyAmJiB0aGlzLmdldFBhc3MoKSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgIHJldHVybiBtYWtlRXJyb3Ioe1xuICAgICAgICAgICAgICAgIGFjdHVhbDogICB0aGlzLmdldFRhcCgpLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiAnJyxcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ2NvbnRyYWN0JyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGRhdGEgPSB0eXBlb2YgbiA9PT0gJ29iamVjdCcgPyBuIDogdGhpcy5nZXREZXRhaWxzKG4pO1xuXG4gICAgICAgIC8vIG5vIGVycm9yXG4gICAgICAgIGlmICghb3B0aW9ucy5wYXNzICYmIGRhdGEucGFzcylcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICByZXR1cm4gbWFrZUVycm9yKHtcbiAgICAgICAgICAgIGFjdHVhbDogICB0aGlzLmdldFRhcEVudHJ5KGRhdGEpLmpvaW4oJ1xcbicpLFxuICAgICAgICAgICAgZXhwZWN0ZWQ6ICcnLFxuICAgICAgICAgICAgbWVzc2FnZTogIGRhdGEubmFtZSxcbiAgICAgICAgICAgIG9wZXJhdG9yOiBkYXRhLmNvbmQsXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGdldFRocm93bihuLCBvcHRpb25zPXt9KSB7XG4gICAgICAgIC8vIFRPRE8gcmVuYW1lIHRvIGp1c3QgdGhyb3c/XG4gICAgICAgIGNvbnN0IGVyciA9IHRoaXMuZ2V0RXJyb3Iobiwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgfVxufVxuXG4vLyB0aGlzIGlzIGZvciBzdHVmZiBsaWtlIGBvYmplY3QgZm9vID0ge1wiZm9vXCI6NDJ9YFxuLy8gd2UgZG9uJ3Qgd2FudCB0aGUgZXhwbGFuYXRpb24gdG8gYmUgcXVvdGVkIVxuZnVuY3Rpb24gX2V4cGxhaW4oIGl0ZW0sIGRlcHRoICkge1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycgKVxuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICByZXR1cm4gZXhwbGFpbiggaXRlbSwgZGVwdGggKTtcbn07XG5cblJlcG9ydC5wcm90b3R5cGUuZXhwbGFpbiA9IGV4cGxhaW47IC8vIGFsc28gbWFrZSBhdmFpbGFibGUgdmlhIHJlcG9ydFxuXG4vLyBwYXJ0IG9mIGFkZENvbmRpdGlvblxuY29uc3Qga25vd25DaGVja3MgPSBuZXcgU2V0KCk7XG5cbi8qKlxuICogIEBtZW1iZXJPZiByZWZ1dGVcbiAqICBAc3RhdGljXG4gKiAgQGRlc2MgQ3JlYXRlIG5ldyBjaGVjayBtZXRob2QgYXZhaWxhYmxlIHZpYSBhbGwgUmVwb3J0IGluc3RhbmNlc1xuICogIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWUgb2YgdGhlIG5ldyBjb25kaXRpb24uXG4gKiAgTXVzdCBub3QgYmUgcHJlc2VudCBpbiBSZXBvcnQgYWxyZWFkeSwgYW5kIHNob3VsZCBOT1Qgc3RhcnQgd2l0aFxuICogIGdldC4uLiwgc2V0Li4uLCBvciBhZGQuLi4gKHRoZXNlIGFyZSByZXNlcnZlZCBmb3IgUmVwb3J0IGl0c2VsZilcbiAqICBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBDb25maWd1cmluZyB0aGUgY2hlY2sncyBoYW5kbGluZyBvZiBhcmd1bWVudHNcbiAqICBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMuYXJncyBUaGUgcmVxdWlyZWQgbnVtYmVyIG9mIGFyZ3VtZW50c1xuICogIEBwYXJhbSB7aW50ZWdlcn0gW29wdGlvbnMubWluQXJnc10gTWluaW11bSBudW1iZXIgb2YgYXJndW1lbnQgKGRlZmF1bHRzIHRvIGFyZ3MpXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBbb3B0aW9ucy5tYXhBcmdzXSBNYXhpbXVtIG51bWJlciBvZiBhcmd1bWVudCAoZGVmYXVsdHMgdG8gYXJncylcbiAqICBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmhhc09wdGlvbnNdIElmIHRydWUsIGFuIG9wdGlvbmFsIG9iamVjdFxuY2FuIGJlIHN1cHBsaWVkIGFzIGxhc3QgYXJndW1lbnQuIEl0IHdvbid0IGludGVyZmVyZSB3aXRoIGRlc2NyaXB0aW9uLlxuICogIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuZnVuXSBUaGUgbGFzdCBhcmd1bWVudCBpcyBhIGNhbGxiYWNrXG4gKiAgQHBhcmFtIHtGdW5jdGlvbn0gaW1wbGVtZW50YXRpb24gLSBhIGNhbGxiYWNrIHRoYXQgdGFrZXMge2FyZ3N9IGFyZ3VtZW50c1xuICogIGFuZCByZXR1cm5zIGEgZmFsc2V5IHZhbHVlIGlmIGNvbmRpdGlvbiBwYXNzZXNcbiAqICAoXCJub3RoaW5nIHRvIHNlZSBoZXJlLCBtb3ZlIGFsb25nXCIpLFxuICogIG9yIGV2aWRlbmNlIGlmIGl0IGZhaWxzXG4gKiAgKGUuZy4gdHlwaWNhbGx5IGEgZ290L2V4cGVjdGVkIGRpZmYpLlxuICovXG5mdW5jdGlvbiBhZGRDb25kaXRpb24gKG5hbWUsIG9wdGlvbnMsIGltcGwpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiBuYW1lIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXihffGdldFtfQS1aXXxzZXRbX0EtWl0pLykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uIG5hbWUgbXVzdCBub3Qgc3RhcnQgd2l0aCBnZXRfLCBzZXRfLCBvciBfJyk7XG4gICAgLy8gVE9ETyBtdXN0IGRvIHNvbWV0aGluZyBhYm91dCBuYW1lIGNsYXNoZXMsIGJ1dCBsYXRlclxuICAgIC8vIGJlY2F1c2UgZXZhbCBpbiBicm93c2VyIG1heSAoa2luZCBvZiBsZWdpbWl0ZWx5KSBvdmVycmlkZSBjb25kaXRpb25zXG4gICAgaWYgKCFrbm93bkNoZWNrcy5oYXMobmFtZSkgJiYgUmVwb3J0LnByb3RvdHlwZVtuYW1lXSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2QgYWxyZWFkeSBleGlzdHMgaW4gUmVwb3J0OiAnK25hbWUpO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIG9wdGlvbnMnKTtcbiAgICBpZiAodHlwZW9mIGltcGwgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIGltcGxlbWVudGF0aW9uJyk7XG5cbiAgICBjb25zdCBtaW5BcmdzICAgID0gb3B0aW9ucy5taW5BcmdzIHx8IG9wdGlvbnMuYXJncztcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIobWluQXJncykgfHwgbWluQXJncyA8IDApXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYXJncy9taW5BcmdzIG11c3QgYmUgbm9ubmVnYXRpdmUgaW50ZWdlcicpO1xuICAgIGNvbnN0IG1heEFyZ3MgICAgPSBvcHRpb25zLm1heEFyZ3MgfHwgb3B0aW9ucy5hcmdzIHx8IEluZmluaXR5O1xuICAgIGlmIChtYXhBcmdzICE9PSBJbmZpbml0eSAmJiAoIU51bWJlci5pc0ludGVnZXIobWluQXJncykgfHwgbWF4QXJncyA8IG1pbkFyZ3MpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ21heEFyZ3MgbXVzdCBiZSBpbnRlZ2VyIGFuZCBncmVhdGVyIHRoYW4gbWluQXJncywgb3IgSW5maW5pdHknKTtcbiAgICBjb25zdCBkZXNjckZpcnN0ICAgID0gb3B0aW9ucy5kZXNjckZpcnN0IHx8IG9wdGlvbnMuZnVuIHx8IG1heEFyZ3MgPiAxMDtcbiAgICBjb25zdCBoYXNPcHRpb25zICAgID0gISFvcHRpb25zLmhhc09wdGlvbnM7XG4gICAgY29uc3QgbWF4QXJnc1JlYWwgICA9IG1heEFyZ3MgKyAoaGFzT3B0aW9ucyA/IDEgOiAwKTtcblxuICAgIC8vIFRPRE8gYWxlcnQgdW5rbm93biBvcHRpb25zXG5cbiAgICAvLyBUT0RPIHRoaXMgY29kZSBpcyBjbHV0dGVyZWQsIHJld3JpdGVcbiAgICBjb25zdCBjb2RlID0gZnVuY3Rpb24oLi4uYXJncykge1xuICAgICAgICBjb25zdCBkZXNjciA9IGRlc2NyRmlyc3RcbiAgICAgICAgICAgID8gYXJncy5zaGlmdCgpXG4gICAgICAgICAgICA6ICggKGFyZ3MubGVuZ3RoID4gbWF4QXJncyAmJiB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aC0xXSA9PT0gJ3N0cmluZycpID8gYXJncy5wb3AoKSA6IHVuZGVmaW5lZCk7XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IG1heEFyZ3NSZWFsIHx8IGFyZ3MubGVuZ3RoIDwgbWluQXJncylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uICcrbmFtZSsnIG11c3QgaGF2ZSAnK21pbkFyZ3MrJy4uJyttYXhBcmdzUmVhbCsnIGFyZ3VtZW50cyAnKTsgLy8gVE9ET1xuXG4gICAgICAgIHJldHVybiB0aGlzLnNldFJlc3VsdCggaW1wbCguLi5hcmdzKSwgZGVzY3IsIG5hbWUgKTtcbiAgICB9O1xuXG4gICAga25vd25DaGVja3MuYWRkKG5hbWUpO1xuICAgIFJlcG9ydC5wcm90b3R5cGVbbmFtZV0gPSBjb2RlO1xufVxuXG4vLyBUaGUgbW9zdCBiYXNpYyBjb25kaXRpb25zIGFyZSBkZWZpbmVkIHJpZ2h0IGhlcmVcbi8vIGluIG9yZGVyIHRvIGJlIHN1cmUgd2UgY2FuIHZhbGlkYXRlIHRoZSBSZXBvcnQgY2xhc3MgaXRzZWxmLlxuXG4vKipcbiAqICBAbmFtZXNwYWNlIGNvbmRpdGlvbnNcbiAqICBAZGVzYyBDb25kaXRpb24gY2hlY2sgbGlicmFyeS4gVGhlc2UgbWV0aG9kcyBtdXN0IGJlIHJ1biBvbiBhXG4gKiAge0BsaW5rIFJlcG9ydH0gb2JqZWN0LlxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgY2hlY2tcbiAqICAgQGRlc2MgQSBnZW5lcmljIGNoZWNrIG9mIGEgY29uZGl0aW9uLlxuICogICBAcGFyYW0gZXZpZGVuY2UgSWYgZmFsc2UsIDAsICcnLCBvciB1bmRlZmluZWQsIHRoZSBjaGVjayBpcyBhc3N1bWVkIHRvIHBhc3MuXG4gKiAgIE90aGVyd2lzZSBpdCBmYWlscywgYW5kIHRoaXMgYXJndW1lbnQgd2lsbCBiZSBkaXNwbGF5ZWQgYXMgdGhlIHJlYXNvbiB3aHkuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dIFRoZSByZWFzb24gd2h5IHdlIGNhcmUgYWJvdXQgdGhlIGNoZWNrLlxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgcGFzc1xuICogICBAZGVzYyBBbHdheXMgcGFzc2VzLlxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgZmFpbFxuICogICBAZGVzYyBBbHdheXMgZmFpbHMgd2l0aCBhIFwiZmFpbGVkIGRlbGliZXJhdGVseVwiIG1lc3NhZ2UuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBlcXVhbFxuICogICBAZGVzYyBDaGVja3MgaWYgPT09IGhvbGRzIGJldHdlZW4gdHdvIHZhbHVlcy5cbiAqICAgSWYgbm90LCBib3RoIHdpbGwgYmUgc3RyaW5naWZpZWQgYW5kIGRpc3BsYXllZCBhcyBhIGRpZmYuXG4gKiAgIFNlZSBkZWVwRXF1YWwgdG8gY2hlY2sgbmVzdGVkIGRhdGEgc3RydWN0dXJlcyBvdCBvYmplY3RzLlxuICogICBAcGFyYW0ge2FueX0gYWN0dWFsXG4gKiAgIEBwYXJhbSB7YW55fSBleHBlY3RlZFxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgbWF0Y2hcbiAqICAgQGRlc2MgQ2hlY2tzIGlmIGEgc3RyaW5nIG1hdGNoZXMgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKiAgIEBwYXJhbSB7c3RydW5nfSBhY3R1YWxcbiAqICAgQHBhcmFtIHtSZWdFeHB9IGV4cGVjdGVkXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBuZXN0ZWRcbiAqICAgQGRlc2MgVmVyaWZ5IGEgbmVzdGVkIGNvbnRyYWN0LlxuICogICBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRpb25cbiAqICAgQHBhcmFtIHtDb250cmFjdH0gY29udHJhY3RcbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuXG5hZGRDb25kaXRpb24oXG4gICAgJ2NoZWNrJyxcbiAgICB7YXJnczoxfSxcbiAgICB4PT54XG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdwYXNzJyxcbiAgICB7YXJnczowfSxcbiAgICAoKT0+MFxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnZmFpbCcsXG4gICAge2FyZ3M6MH0sXG4gICAgKCk9PidmYWlsZWQgZGVsaWJlcmF0ZWx5J1xuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnZXF1YWwnLFxuICAgIHthcmdzOjJ9LFxuICAgIChhLGIpID0+IGEgPT09IGIgPyAwIDogWyAnLSAnK2V4cGxhaW4oYSksICcrICcgKyBleHBsYWluKGIpIF1cbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ21hdGNoJyxcbiAgICB7YXJnczoyfSxcbiAgICAoYSxyZXgpID0+ICgnJythKS5tYXRjaChyZXgpID8gMCA6IFtcbiAgICAgICAgJ1N0cmluZyAgICAgICAgIDogJythLFxuICAgICAgICAnRG9lcyBub3QgbWF0Y2ggOiAnK3JleFxuICAgIF1cbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ25lc3RlZCcsXG4gICAge2Z1bjoxLG1pbkFyZ3M6MX0sXG4gICAgKC4uLmFyZ3MpID0+IG5ldyBSZXBvcnQoKS5ydW4oLi4uYXJncykuZG9uZSgpXG4pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHsgUmVwb3J0LCBhZGRDb25kaXRpb24sIGV4cGxhaW4gfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBBbm5vdGF0ZWRTZXQgfSA9IHJlcXVpcmUoICcuL3V0aWwvYW5ub3RhdGVkLXNldC5qcycgKTtcblxuLyoqXG4gKiAgIEBuYW1lc3BhY2UgdXRpbGl0aWVzXG4gKiAgIEBkZXNjICBUaGVzZSBmdW5jdGlvbnMgaGF2ZSBub3RoaW5nIHRvIGRvIHdpdGggcmVmdXRlIGFuZCBzaG91bGRcbiAqICAgICAgICAgIGlkZWFsbHkgYmUgaW4gc2VwYXJhdGUgbW9kdWxlcy5cbiAqL1xuXG4vKiBEZXRlcm1pbmUgbi10aCBjYWxsZXIgdXAgdGhlIHN0YWNrICovXG4vKiBJbnNwaXJlZCBieSBQZXJsJ3MgQ2FycCBtb2R1bGUgKi9cbmNvbnN0IGluU3RhY2sgPSAvKFteOlxccygpXSs6XFxkKyg/OjpcXGQrKT8pXFxXKihcXG58JCkvZztcblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBtZW1iZXJPZiB1dGlsaXRpZXNcbiAqICBAZnVuY3Rpb25cbiAqICBAZGVzYyBSZXR1cm5zIHNvdXJjZSBwb3NpdGlvbiBuIGZyYW1lcyB1cCB0aGUgc3RhY2tcbiAqICBAZXhhbXBsZVxuICogIFwiL2Zvby9iYXIuanM6MjU6MTFcIlxuICogIEBwYXJhbSB7aW50ZWdlcn0gZGVwdGggSG93IG1hbnkgZnJhbWVzIHRvIHNraXBcbiAqICBAcmV0dXJucyB7c3RyaW5nfSBzb3VyY2UgZmlsZSwgbGluZSwgYW5kIGNvbHVtbiwgc2VwYXJhdGVkIGJ5IGNvbG9uLlxuICovXG5mdW5jdGlvbiBjYWxsZXJJbmZvKG4pIHtcbiAgICAvKiBhIHRlcnJpYmxlIHJleCB0aGF0IGJhc2ljYWxseSBzZWFyY2hlcyBmb3IgZmlsZS5qczpubm46bm5uIHNldmVyYWwgdGltZXMqL1xuICAgIHJldHVybiAobmV3IEVycm9yKCkuc3RhY2subWF0Y2goaW5TdGFjaylbbisxXS5yZXBsYWNlKC9cXFcqXFxuJC8sICcnKSB8fCAnJylcbn1cblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBpbnN0YW5jUlxuICogIEBtZW1iZXJPZiBSZXBvcnRcbiAqICBAZGVzYyBTdHJpbmdpcnkgb2JqZWN0cyByZWN1cnNpdmVseSB3aXRoIGxpbWl0ZWQgZGVwdGhcbiAqICBhbmQgY2lyY3VsYXIgcmVmZXJlbmNlIHRyYWNraW5nLlxuICogIEdlbmVyYWxseSBKU09OLnN0cmluZ2lmeSBpcyB1c2VkIGFzIHJlZmVyZW5jZTpcbiAqICBzdHJpbmdzIGFyZSBlc2NhcGVkIGFuZCBkb3VibGUtcXVvdGVkOyBudW1iZXJzLCBib29sZWFuLCBhbmQgbnVsbHMgYXJlXG4gKiAgc3RyaW5naWZpZWQgXCJhcyBpc1wiOyBvYmplY3RzIGFuZCBhcnJheXMgYXJlIGRlc2NlbmRlZCBpbnRvLlxuICogIFRoZSBkaWZmZXJlbmNlcyBmb2xsb3c6XG4gKiAgdW5kZWZpbmVkIGlzIHJlcG9ydGVkIGFzICc8dW5kZWY+Jy5cbiAqICBPYmplY3RzIHRoYXQgaGF2ZSBjb25zdHJ1Y3RvcnMgYXJlIHByZWZpeGVkIHdpdGggY2xhc3MgbmFtZXMuXG4gKiAgT2JqZWN0IGFuZCBhcnJheSBjb250ZW50IGlzIGFiYnJldmlhdGVkIGFzIFwiLi4uXCIgYW5kIFwiQ2lyY3VsYXJcIlxuICogIGluIGNhc2Ugb2YgZGVwdGggZXhoYXVzdGlvbiBhbmQgY2lyY3VsYXIgcmVmZXJlbmNlLCByZXNwZWN0aXZlbHkuXG4gKiAgRnVuY3Rpb25zIGFyZSBuYWl2ZWx5IHN0cmluZ2lmaWVkLlxuICogIEBwYXJhbSB7QW55fSB0YXJnZXQgT2JqZWN0IHRvIHNlcmlhbGl6ZS5cbiAqICBAcGFyYW0ge2ludGVnZXJ9IGRlcHRoPTMgRGVwdGggbGltaXQuXG4gKiAgQHJldHVybnMge3N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZXhwbGFpbiggaXRlbSwgZGVwdGg9Mywgb3B0aW9ucz17fSwgcGF0aD0nJCcsIHNlZW49bmV3IEFubm90YXRlZFNldCgpICkge1xuICAgIC8vIHNpbXBsZSB0eXBlc1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpXG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShpdGVtKTsgLy8gZG9uJ3Qgd2FudCB0byBzcGVuZCB0aW1lIHFvdXRpbmdcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdudW1iZXInIHx8IHR5cGVvZiBpdGVtID09PSAnYm9vbGVhbicgfHwgaXRlbSA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuICcnK2l0ZW07XG4gICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCkgcmV0dXJuICc8dW5kZWY+JztcbiAgICBpZiAodHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnKSAvLyBtYXliZSBmdW5jdGlvblxuICAgICAgICByZXR1cm4gJycraXRlbTsgLy8gVE9ETyBkb24ndCBwcmludCBvdXQgYSBsb25nIGZ1bmN0aW9uJ3MgYm9keVxuXG4gICAgLy8gcmVjdXJzZVxuICAgIGNvbnN0IHdoZXJlU2VlbiA9IHNlZW4uaGFzKGl0ZW0pO1xuICAgIGlmICh3aGVyZVNlZW4pIHtcbiAgICAgICAgY29uc3Qgbm90ZSA9ICdDaXJjdWxhcj0nK3doZXJlU2VlbjtcbiAgICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoaXRlbSk/J1sgJytub3RlKycgXSc6J3sgJytub3RlKycgfSc7XG4gICAgfTtcbiAgICBzZWVuID0gc2Vlbi5hZGQoIGl0ZW0sIHBhdGggKTsgLy8gY2xvbmVzIHNlZW5cblxuICAgIGlmIChBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICAgIGlmIChkZXB0aCA8IDEpXG4gICAgICAgICAgICByZXR1cm4gJ1suLi5dJztcbiAgICAgICAgc2Vlbi5hZGQoaXRlbSk7XG4gICAgICAgIC8vIFRPRE8gPHggZW1wdHkgaXRlbXM+XG4gICAgICAgIGNvbnN0IGxpc3QgPSBpdGVtLm1hcChcbiAgICAgICAgICAgICh2YWwsIGluZGV4KSA9PiBleHBsYWluKHZhbCwgZGVwdGgtMSwgb3B0aW9ucywgcGF0aCsnWycraW5kZXgrJ10nLCBzZWVuKVxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gJ1snK2xpc3Quam9pbignLCAnKSsnXSc7IC8vIFRPRE8gY29uZmlndXJhYmxlIHdoaXRlc3BhY2VcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlID0gaXRlbS5jb25zdHJ1Y3RvciAmJiBpdGVtLmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgY29uc3QgcHJlZml4ID0gdHlwZSAmJiB0eXBlICE9PSAnT2JqZWN0JyA/IHR5cGUgKyAnICcgOiAnJztcbiAgICBpZiAoZGVwdGggPCAxKVxuICAgICAgICByZXR1cm4gcHJlZml4ICsgJ3suLi59JztcbiAgICBjb25zdCBsaXN0ID0gT2JqZWN0LmtleXMoaXRlbSkuc29ydCgpLm1hcCgga2V5ID0+IHtcbiAgICAgICAgY29uc3QgaW5kZXggPSBKU09OLnN0cmluZ2lmeShrZXkpO1xuICAgICAgICByZXR1cm4gaW5kZXgrXCI6XCIrZXhwbGFpbihpdGVtW2tleV0sIGRlcHRoLTEsIG9wdGlvbnMsIHBhdGgrJ1snK2luZGV4KyddJywgc2Vlbik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByZWZpeCArICd7JyArIGxpc3Quam9pbihcIiwgXCIpICsgJ30nO1xufVxuXG4vLyBNdXN0IHdvcmsgZXZlbiB3aXRob3V0IGFzc2VydFxuY29uc3QgaGFzQXNzZXJ0ID0gdHlwZW9mIGFzc2VydCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IgPT09ICdmdW5jdGlvbic7XG5cbmNvbnN0IG1ha2VFcnJvciA9IGhhc0Fzc2VydFxuICAgID8gZW50cnkgPT4gbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcihlbnRyeSlcbiAgICA6IGVudHJ5ID0+IG5ldyBFcnJvciggZW50cnkuYWN0dWFsICk7XG5cbm1vZHVsZS5leHBvcnRzID0geyBjYWxsZXJJbmZvLCBleHBsYWluLCBtYWtlRXJyb3IgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gU2VlIGFsc28gbm90ZWQtc2V0LmpzXG5cbmNsYXNzIEFubm90YXRlZFNldCB7XG4gICAgY29uc3RydWN0b3IoYWxsPW5ldyBTZXQoKSwgbm90ZXM9W10pIHtcbiAgICAgICAgdGhpcy5hbGwgICA9IGFsbDtcbiAgICAgICAgdGhpcy5ub3RlcyA9IG5vdGVzO1xuICAgIH1cbiAgICBhZGQoIGl0ZW0sIG5vdGUgKSB7XG4gICAgICAgIGlmICh0aGlzLmFsbC5oYXMoaXRlbSkpXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBBbm5vdGF0ZWRTZXQoXG4gICAgICAgICAgICBuZXcgU2V0KHRoaXMuYWxsKS5hZGQoaXRlbSksXG4gICAgICAgICAgICBbIC4uLnRoaXMubm90ZXMsIFsgaXRlbSwgbm90ZSBdIF1cbiAgICAgICAgKTtcbiAgICB9XG4gICAgaGFzKCBpdGVtICkge1xuICAgICAgICBpZiAoIXRoaXMuYWxsLmhhcyggaXRlbSApKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKGxldCBwYWlyIG9mIHRoaXMubm90ZXMpIHtcbiAgICAgICAgICAgIGlmIChwYWlyWzBdID09PSBpdGVtKVxuICAgICAgICAgICAgICAgIHJldHVybiBwYWlyWzFdO1xuICAgICAgICB9O1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3d0ZiwgdW5yZWFjaGFibGUnKTtcbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7IEFubm90YXRlZFNldCB9O1xuIl19
