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
    const onFail = options.onFail || (rep => { throw new Error(rep.toString()) });

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

const cmpNum = {
    '<' : (x,y)=>(x  < y),
    '>' : (x,y)=>(x  > y),
    '<=': (x,y)=>(x <= y),
    '>=': (x,y)=>(x >= y),
    '==': (x,y)=>(x === y),
    '!=': (x,y)=>(x !== y),
};

// use != and not !== deliberately to filter out null & undefined
const cmpStr = {
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

addCondition(
    'cmpNum',
    {args:3},
    (x,op,y) => cmpNum[op](x,y)?0:[x,"is not "+op,y]
);
addCondition(
    'cmpStr',
    {args:3},
    (x,op,y) => cmpStr[op](x,y)?0:[x,"is not "+op,y]
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
            "- "+(item[3] ? item[1] : explain( item[1], {depth:2} )),
            "+ "+(item[3] ? item[2] : explain( item[2], {depth:2} )),
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
            pathL ? 'Circular='+pathL : explain(got, {depth:2}),
            pathR ? 'Circular='+pathR : explain(exp, {depth:2}),
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

const { callerInfo, explain } = require( './util.js' );

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
     *   report.onDone( r => { if (!r.getPass()) console.log(r.toString()) } )
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
     *   report.onFail( r => console.log(r.toString()) );
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
            return this._failCount === 0;
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
    toString() {
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
            out.push( ...this.getLinesPartial( n, indent ) );
            if (this._info[n])
                out.push( ...this._info[n].map( pad(';') ) );
        };
        out.push(last);
        return out;
    }

    getLinesPartial(n, indent='') {
        const out = [];
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
}

// this is for stuff like `object foo = {"foo":42}`
// we don't want the explanation to be quoted!
function _explain( item, depth ) {
    if (typeof item === 'string' )
        return item;
    return explain( item, { depth } );
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
function explain( item, options={}, path='$', seen=new AnnotatedSet() ) {
    // simple types
    return _explain( item, options.depth || 3, options, path, seen );
}

function _explain(item, depth, options, path, seen) {
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
            (val, index) => _explain(val, depth-1, options, path+'['+index+']', seen)
        );
        return '['+list.join(', ')+']'; // TODO configurable whitespace
    }

    const type = item.constructor && item.constructor.name;
    const prefix = type && type !== 'Object' ? type + ' ' : '';
    if (depth < 1)
        return prefix + '{...}';
    const list = Object.keys(item).sort().map( key => {
        const index = JSON.stringify(key);
        return index+":"+_explain(item[key], depth-1, options, path+'['+index+']', seen);
    });
    return prefix + '{' + list.join(", ") + '}';
}

module.exports = { callerInfo, explain };

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9yZWZ1dGUuanMiLCJsaWIvcmVmdXRlL2NvbmQvYXJyYXkuanMiLCJsaWIvcmVmdXRlL2NvbmQvYmFzaWMuanMiLCJsaWIvcmVmdXRlL2NvbmQvZGVlcC5qcyIsImxpYi9yZWZ1dGUvcmVwb3J0LmpzIiwibGliL3JlZnV0ZS91dGlsLmpzIiwibGliL3JlZnV0ZS91dGlsL2Fubm90YXRlZC1zZXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3b0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbi8vIHRoZSBjb3JlIChzaG91bGQgZXhwbGFpbiBldmVuIGJlIHRoZXJlPylcbmNvbnN0IHsgUmVwb3J0LCBhZGRDb25kaXRpb24sIGV4cGxhaW4gfSA9IHJlcXVpcmUgKCcuL3JlZnV0ZS9yZXBvcnQuanMnKTtcblxuLy8gVE9ETyBhZGQgZWlmZmVsLXN0eWxlIGRlc2lnbi1ieS1jb250cmFjdFxuXG4vLyBpbXBvcnQgZGVmYXVsdCBjb25kaXRpb24gYXJzZW5hbFxucmVxdWlyZSggJy4vcmVmdXRlL2NvbmQvYmFzaWMuanMnICk7XG5yZXF1aXJlKCAnLi9yZWZ1dGUvY29uZC9hcnJheS5qcycgKTtcbnJlcXVpcmUoICcuL3JlZnV0ZS9jb25kL2RlZXAuanMnICk7XG5cbmNvbnN0IGdldFJlcG9ydCA9ICguLi5hcmdzKSA9PiBuZXcgUmVwb3J0KCkucnVuKC4uLmFyZ3MpLmRvbmUoKTtcblxuLy8gQWxsb3cgY3JlYXRpbmcgbXVsdGlwbGUgcGFyYWxsZWwgY29uZmlndXJhdGlvbnMgb2YgcmVmdXRlXG4vLyBlLmcuIG9uZSBzdHJpY3QgKHRocm93aW5nIGVycm9ycykgYW5kIG90aGVyIGxheCAoanVzdCBkZWJ1Z2dpbmcgdG8gY29uc29sZSlcbmZ1bmN0aW9uIHNldHVwKCBvcHRpb25zPXt9LCBvcmlnICkge1xuICAgIC8vIFRPRE8gdmFsaWRhdGUgb3B0aW9uc1xuICAgIGNvbnN0IG9uRmFpbCA9IG9wdGlvbnMub25GYWlsIHx8IChyZXAgPT4geyB0aHJvdyBuZXcgRXJyb3IocmVwLnRvU3RyaW5nKCkpIH0pO1xuXG4gICAgY29uc3QgcmVmdXRlID0gb3B0aW9ucy5za2lwXG4gICAgICAgID8gKCk9Pnt9XG4gICAgICAgIDogKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG9rID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICAgICAgb2sub25Eb25lKCB4ID0+IHsgaWYoICF4LmdldFBhc3MoKSApIG9uRmFpbCh4LCBhcmdzKSB9ICk7XG4gICAgICAgICAgICBvay5ydW4oLi4uYXJncyk7XG4gICAgICAgICAgICBvay5kb25lKCk7XG4gICAgICAgIH07XG5cbiAgICAvLyByZWV4cG9ydCBhbGwgZnJvbSByZXBvcnQuanNcbiAgICByZWZ1dGUuUmVwb3J0ID0gUmVwb3J0O1xuICAgIHJlZnV0ZS5leHBsYWluID0gZXhwbGFpbjtcbiAgICByZWZ1dGUuYWRkQ29uZGl0aW9uID0gYWRkQ29uZGl0aW9uO1xuXG4gICAgLy8gc2hvcnRjdXQgdG8gdmFsaWRhdGluZyAmIHJldHVybmluZyBhIGZyZXNoIGNvbnRyYWN0XG4gICAgLy8gVE9ETyByZW5hbWUgdG8gYXZvaWQgbmFtZSBjbGFzaCB3aXRoIHRoZSBjbGFzc1xuICAgIC8vIChldmFsPylcbiAgICByZWZ1dGUucmVwb3J0ID0gZ2V0UmVwb3J0O1xuXG4gICAgLy8gcmVmdXRlLmNvbmYoey4uLn0pIHdpbGwgZ2VuZXJhdGUgYSBfbmV3XyByZWZ1dGVcbiAgICByZWZ1dGUuY29uZmlnID0gdXBkYXRlID0+IHNldHVwKCB7IC4uLm9wdGlvbnMsIC4uLnVwZGF0ZSB9LCByZWZ1dGUgKTtcblxuICAgIC8vIGFkZCBkZXNpZ24tYnktY29udHJhY3RcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoIHJlZnV0ZSwgJ2RiYycsIHsgZ2V0OiAoKT0+bmV3IERCQygpIH0gKTtcblxuICAgIC8vIFRPRE8gdGhpcyBpcyBzdHVwaWQsIGNvbWUgdXAgd2l0aCBzbXRoIGJldHRlclxuICAgIC8vIHdoZW4gaW4gYnJvd3Nlciwgd2luZG93LnJlZnV0ZS5jb25maWcoKSB1cGRhdGVzIHdpbmRvdy5yZWZ1dGUgaXRzZWxmXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIG9yaWcgPT09IHdpbmRvdy5yZWZ1dGUpXG4gICAgICAgIHdpbmRvdy5yZWZ1dGUgPSByZWZ1dGU7XG5cbiAgICByZXR1cm4gcmVmdXRlO1xufVxuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBzZXR1cCgpO1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuICAgIHdpbmRvdy5yZWZ1dGUgPSBzZXR1cCgpOyAvLyBUT0RPIGNoZWNrIHByZWV4aXN0aW5nXG5cbi8qKlxuICogICBAbmFtZXNwYWNlIHJlZnV0ZVxuICogICBAZGVzYyAgIEZ1bmN0aW9ucyBleHBvcnRlZCBieSByZWZ1dGUgbWFpbiBtb2R1bGUuXG4gKi9cblxuLyoqXG4gKiAgIEBwdWJsaWNcbiAqICAgQG1lbWJlck9mIHJlZnV0ZVxuICogICBAZnVuY3Rpb24gcmVmdXRlXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gRGF0YSB0byBmZWVkIHRvIHRoZSBjYWxsYmFja1xuICogICBAcGFyYW0ge0NvbnRyYWN0fSBjb250cmFjdCBBIGNvZGUgYmxvY2sgd2l0aCBjaGVja3MuXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9IFJldHVybiB2YWx1ZSBpcyBpZ25vcmVkLlxuICogICBAdGhyb3dzIHtFcnJvcn0gSWYgb25lIG9yIG1vcmUgY2hlY2tzIGFyZSBmYWlsaW5nLCBhbiBleGNlcHRpb24gaXMgdGhyb3duXG4gKiAgIHdpdGggZGV0YWlscyBhYm91dCBhbGwgcGFzc2luZy9mYWlsaW5nIGNoZWNrcy5cbiAqICAgVGhpcyBhY3Rpb24gY2FuIGJlIGNoYW5nZWQgdmlhIHJlZnV0ZS5jb25maWcoKSBjYWxsLlxuICpcbiAqL1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCBSZXBvcnQgfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBmb3JFYWNoXG4gKiAgIEBkZXNjICBDaGVja3MgdGhhdCBhIG5lc3RlZCBjb250cmFjdCBob2xkcyBmb3IgZWFjaCBlbGVtZW50IG9mIGFuIGFycmF5LlxuICogICBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRpb25cbiAqICAgQHBhcmFtIHtBcnJheX0gYXJyYXkgTGlzdCBvZiBpdGVtcy5cbiAqICAgQHBhcmFtIHtDb250cmFjdH0gbmVzdGVkIEZpcnN0IGFyZ3VtZW50IGdpdmVuIHRvIHRoZSBjYWxsYmFja1xuICogICBpcyBhIFJlcG9ydCBvYmplY3QsIGFuZCB0aGUgc2Vjb25kIG9uZSBpcyB0aGUgYXJyYXkgaXRlbSBpbiBxdWVzdGlvbi5cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuXG5hZGRDb25kaXRpb24oXG4gICAgJ2ZvckVhY2gnLFxuICAgIHtmdW46MSxhcmdzOjJ9LFxuICAgIChsaXN0LCBjb250cmFjdCkgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpXG4gICAgICAgICAgICByZXR1cm4gJ0V4cGVjdGVkIGEgbGlzdCwgZm91bmQgYSAnLnR5cGVvZihsaXN0KTtcbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBhdXRvLXBhc3NcblxuICAgICAgICBjb25zdCBvayA9IG5ldyBSZXBvcnQoKTtcbiAgICAgICAgbGlzdC5mb3JFYWNoKCAoaXRlbSwgaW5kZXgpID0+IG9rLm5lc3RlZCggXCJpdGVtIFwiK2luZGV4LCBpdGVtLCBjb250cmFjdCApICk7XG4gICAgICAgIHJldHVybiBvay5kb25lKCk7XG4gICAgfVxuKTtcblxuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIG9yZGVyZWRcbiAqICAgQGRlc2MgIENoZWNrcyB0aGF0IGEgbmVzdGVkIGNvbnRyYWN0IGhvbGRzIGZvciBlYWNoIHBhaXJcbiAqICAgb2YgYWRqYWNlbnQgZWxlbWVudCBvZiBhbiBhcnJheSAoaS5lLiAxJjIsIDImMywgMyY0LCAuLi4pLlxuICogICBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRpb25cbiAqICAgQHBhcmFtIHtBcnJheX0gYXJyYXkgTGlzdCBvZiBpdGVtcy5cbiAqICAgQHBhcmFtIHtDb250cmFjdH0gbmVzdGVkIEZpcnN0IGFyZ3VtZW50IGdpdmVuIHRvIHRoZSBjYWxsYmFja1xuICogICBpcyBhIFJlcG9ydCBvYmplY3QsIGFuZCB0aGUgc2Vjb25kIGFuZCB0aGlyZCBvbmVzXG4gKiAgIGFyZSB0aGUgYXJyYXkgaXRlbXMgaW4gcXVlc3Rpb24uXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cblxuLy8gVE9ETyB0aGlzIGlzIGNhbGxlZCBcImNvbXBsaWFudCBjaGFpblwiIGJ1dCBiZXR0ZXIganVzdCBzYXkgaGVyZVxuLy8gXCJvaCB3ZSdyZSBjaGVja2luZyBlbGVtZW50IG9yZGVyXCJcbmFkZENvbmRpdGlvbihcbiAgICAnb3JkZXJlZCcsIC8vIFRPRE8gYmV0dGVyIG5hbWU/IHBhaXJ3aXNlPyByZWR1Y2U/XG4gICAge2Z1bjoxLGFyZ3M6Mn0sXG4gICAgKGxpc3QsIGNvbnRyYWN0KSA9PiB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSlcbiAgICAgICAgICAgIHJldHVybiAnRXhwZWN0ZWQgYSBsaXN0LCBmb3VuZCBhICcudHlwZW9mKGxpc3QpO1xuICAgICAgICBpZiAobGlzdC5sZW5ndGggPCAyKVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGF1dG8tcGFzc1xuXG4gICAgICAgIGNvbnN0IG9rID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IGxpc3QubGVuZ3RoLTE7IG4rKykge1xuICAgICAgICAgICAgb2submVzdGVkKCBcIml0ZW1zIFwiK24rXCIsIFwiKyhuKzEpLCBsaXN0W25dLCBsaXN0W24rMV0sIGNvbnRyYWN0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2suZG9uZSgpO1xuICAgIH1cbik7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIHJlcG9ydCwgZXhwbGFpbiB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcbmNvbnN0IE9LID0gZmFsc2U7XG5cbmNvbnN0IGNtcE51bSA9IHtcbiAgICAnPCcgOiAoeCx5KT0+KHggIDwgeSksXG4gICAgJz4nIDogKHgseSk9Pih4ICA+IHkpLFxuICAgICc8PSc6ICh4LHkpPT4oeCA8PSB5KSxcbiAgICAnPj0nOiAoeCx5KT0+KHggPj0geSksXG4gICAgJz09JzogKHgseSk9Pih4ID09PSB5KSxcbiAgICAnIT0nOiAoeCx5KT0+KHggIT09IHkpLFxufTtcblxuLy8gdXNlICE9IGFuZCBub3QgIT09IGRlbGliZXJhdGVseSB0byBmaWx0ZXIgb3V0IG51bGwgJiB1bmRlZmluZWRcbmNvbnN0IGNtcFN0ciA9IHtcbiAgICAnPCcgOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggIDwgJycreSksXG4gICAgJz4nIDogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ICA+ICcnK3kpLFxuICAgICc8PSc6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCA8PSAnJyt5KSxcbiAgICAnPj0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPj0gJycreSksXG5cbiAgICAnPT0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPT09ICcnK3kpLFxuICAgICchPSc6ICh4LHkpPT4oKHggPT0gdW5kZWZpbmVkKV4oeSA9PSB1bmRlZmluZWQpKSB8fCAoJycreCAhPT0gJycreSksXG59O1xuXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgY21wTnVtXG4gKiAgIEBkZXNjICBDaGVja3MgaWYgYSByZWxhdGlvbiBpbmRlZWQgaG9sZHMgYmV0d2VlbiBhcmd1bWVudHMuXG4gKiAgICAgICAgICBTZWUgYWxzbyB7QGxpbmsgY21wU3RyfVxuICogICBAcGFyYW0ge2FueX0gYXJnMSAgICBGaXJzdCBhcmd1bWVudFxuICogICBAcGFyYW0ge3N0cmluZ30gb3BlcmF0aW9uICBPbmUgb2YgJzwnLCAnPD0nLCAnPT0nLCAnIT0nLCAnPj0nLCBvciAnPidcbiAqICAgQHBhcmFtIHthbnl9IGFyZzIgICAgU2Vjb25kIGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBjbXBTdHJcbiAqICAgQGRlc2MgIENoZWNrcyBpZiBhIHJlbGF0aW9uIGluZGVlZCBob2xkcyBiZXR3ZWVuIGFyZ3VtZW50cyxcbiAqICAgICAgICAgIGFzc3VtaW5nIHRoZXkgYXJlIHN0cmluZ3MuXG4gKiAgICAgICAgICBTZWUgYWxzbyB7QGxpbmsgY21wTnVtfVxuICogICBAcGFyYW0ge2FueX0gYXJnMSAgICBGaXJzdCBhcmd1bWVudFxuICogICBAcGFyYW0ge3N0cmluZ30gb3BlcmF0aW9uICBPbmUgb2YgJzwnLCAnPD0nLCAnPT0nLCAnIT0nLCAnPj0nLCBvciAnPidcbiAqICAgQHBhcmFtIHthbnl9IGFyZzIgICAgU2Vjb25kIGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cblxuYWRkQ29uZGl0aW9uKFxuICAgICdjbXBOdW0nLFxuICAgIHthcmdzOjN9LFxuICAgICh4LG9wLHkpID0+IGNtcE51bVtvcF0oeCx5KT8wOlt4LFwiaXMgbm90IFwiK29wLHldXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdjbXBTdHInLFxuICAgIHthcmdzOjN9LFxuICAgICh4LG9wLHkpID0+IGNtcFN0cltvcF0oeCx5KT8wOlt4LFwiaXMgbm90IFwiK29wLHldXG4pO1xuXG5jb25zdCB0eXBlQ2hlY2sgPSB7XG4gICAgdW5kZWZpbmVkOiB4ID0+IHggPT09IHVuZGVmaW5lZCxcbiAgICBudWxsOiAgICAgIHggPT4geCA9PT0gbnVsbCxcbiAgICBudW1iZXI6ICAgIHggPT4gdHlwZW9mIHggPT09ICdudW1iZXInICYmICFOdW1iZXIuaXNOYU4oeCksXG4gICAgaW50ZWdlcjogICB4ID0+IE51bWJlci5pc0ludGVnZXIoeCksXG4gICAgbmFuOiAgICAgICB4ID0+IE51bWJlci5pc05hTih4KSxcbiAgICBzdHJpbmc6ICAgIHggPT4gdHlwZW9mIHggPT09ICdzdHJpbmcnLFxuICAgIGZ1bmN0aW9uOiAgeCA9PiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyxcbiAgICBib29sZWFuOiAgIHggPT4gdHlwZW9mIHggPT09ICdib29sZWFuJyxcbiAgICBvYmplY3Q6ICAgIHggPT4geCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoeCksXG4gICAgYXJyYXk6ICAgICB4ID0+IEFycmF5LmlzQXJyYXkoeCksXG59O1xuZnVuY3Rpb24gdHlwZUV4cGxhaW4gKHgpIHtcbiAgICBpZiAodHlwZW9mIHggPT09ICdzdHJpbmcnKVxuICAgICAgICByZXR1cm4geDtcbiAgICBpZiAodHlwZW9mIHggPT09ICdmdW5jdGlvbicpXG4gICAgICAgIHJldHVybiAnaW5zdGFuY2VvZiAnKyh4Lm5hbWUgfHwgeCk7XG59O1xuXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgdHlwZVxuICogICBAZGVzYyAgQ2hlY2tzIHRoYXQgYSB2YWx1ZSBpcyBvZiB0aGUgc3BlY2lmaWVkIHR5cGUuXG4gKiAgIEBwYXJhbSB7YW55fSB2YWx1ZSAgICBGaXJzdCBhcmd1bWVudFxuICogICBAcGFyYW0ge3N0cmluZ3xmdW5jdGlvbnxBcnJheX0gdHlwZVxuICogICAgICAgT25lIG9mICd1bmRlZmluZWQnLCAnbnVsbCcsICdudW1iZXInLCAnaW50ZWdlcicsICduYW4nLCAnc3RyaW5nJyxcbiAqICAgICAgICdib29sZWFuJywgJ29iamVjdCcsICdhcnJheScsIGEgY2xhc3MsIG9yIGFuIGFycmF5IGNvbnRhaW5pbmcgMSBvciBtb3JlXG4gKiAgICAgICBvZiB0aGUgYWJvdmUuICdudW1iZXInLydpbnRlZ2VyJyBkb24ndCBpbmNsdWRlIE5hTixcbiAqICAgICAgIGFuZCAnb2JqZWN0JyBkb2Vzbid0IGluY2x1ZGUgYXJyYXlzLlxuICogICAgICAgQSBmdW5jdGlvbiBpbXBsaWVzIGFuIG9iamVjdCBhbmQgYW4gaW5zdGFuY2VvZiBjaGVjay5cbiAqICAgICAgIEFycmF5IG1lYW5zIGFueSBvZiB0aGUgc3BlY2lmaWVkIHR5cGVzIChha2Egc3VtIG9mIHR5cGVzKS5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuYWRkQ29uZGl0aW9uKFxuICAgICd0eXBlJyxcbiAgICB7YXJnczogMn0sXG4gICAgKGdvdCwgZXhwKT0+e1xuICAgICAgICBpZiAoICFBcnJheS5pc0FycmF5KGV4cCkgKVxuICAgICAgICAgICAgZXhwID0gW2V4cF07XG5cbiAgICAgICAgZm9yIChsZXQgdmFyaWFudCBvZiBleHApIHtcbiAgICAgICAgICAgIC8vIGtub3duIHR5cGVcbiAgICAgICAgICAgIGlmKCB0eXBlb2YgdmFyaWFudCA9PT0gJ3N0cmluZycgJiYgdHlwZUNoZWNrW3ZhcmlhbnRdICkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlQ2hlY2tbdmFyaWFudF0oZ290KSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9LO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gaW5zdGFuY2VvZlxuICAgICAgICAgICAgaWYoIHR5cGVvZiB2YXJpYW50ID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBnb3QgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgaWYoIGdvdCBpbnN0YW5jZW9mIHZhcmlhbnQgKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gT0s7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBkb24ndCBrbm93IHdoYXQgeW91J3JlIGFza2luZyBmb3JcbiAgICAgICAgICAgIHJldHVybiAndW5rbm93biB2YWx1ZSB0eXBlIHNwZWM6ICcrZXhwbGFpbih2YXJpYW50LCAxKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICctICcrZXhwbGFpbihnb3QsIDEpLFxuICAgICAgICAgICAgJysgJytleHAubWFwKCB0eXBlRXhwbGFpbiApLmpvaW4oXCIgb3IgXCIpLFxuICAgICAgICBdO1xuICAgIH1cbik7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIGV4cGxhaW4gfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5jb25zdCB7IEFubm90YXRlZFNldCB9ID0gcmVxdWlyZSggJy4uL3V0aWwvYW5ub3RhdGVkLXNldC5qcycgKTtcblxuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGRlZXBFcXVhbFxuICogICBAZGVzYyBDb21wYXJlcyB0d28gc3RydWN0dXJlcywgb3V0cHV0cyBkaWZmIGlmIGRpZmZlcmVuY2VzIGZvdW5kLlxuICogICBAcGFyYW0ge2FueX0gYWN0dWFsICAgIEZpcnN0IHN0cnVjdHVyZVxuICogICBAcGFyYW0ge2FueX0gZXhwZWN0ZWQgIFN0cnVjdHVyZSB0byBjb21wYXJlIHRvXG4gKiAgIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAqICAgQHBhcmFtIHtudW1iZXJ9IG9wdGlvbnMubWF4IGhvdyBtYW55IGRpZmZlcmVuY2VzIHRvIG91dHB1dCAoZGVmYXVsdCA1KVxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5hZGRDb25kaXRpb24oICdkZWVwRXF1YWwnLCB7XCJhcmdzXCI6MixoYXNPcHRpb25zOnRydWV9LCBkZWVwICk7XG5cbmZ1bmN0aW9uIGRlZXAoIGdvdCwgZXhwLCBvcHRpb25zPXt9ICkge1xuICAgIGlmICghb3B0aW9ucy5tYXgpXG4gICAgICAgIG9wdGlvbnMubWF4ID0gNTtcbiAgICBvcHRpb25zLmRpZmYgPSBbXTtcbiAgICBfZGVlcCggZ290LCBleHAsIG9wdGlvbnMgKTtcbiAgICBpZiAoIW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgIHJldHVybiAwO1xuXG4gICAgY29uc3QgcmV0ID0gW107XG4gICAgZm9yIChsZXQgaXRlbSBvZiBvcHRpb25zLmRpZmYpIHtcbiAgICAgICAgcmV0LnB1c2goIFxuICAgICAgICAgICAgXCJhdCBcIitpdGVtWzBdLFxuICAgICAgICAgICAgXCItIFwiKyhpdGVtWzNdID8gaXRlbVsxXSA6IGV4cGxhaW4oIGl0ZW1bMV0sIHtkZXB0aDoyfSApKSxcbiAgICAgICAgICAgIFwiKyBcIisoaXRlbVszXSA/IGl0ZW1bMl0gOiBleHBsYWluKCBpdGVtWzJdLCB7ZGVwdGg6Mn0gKSksXG4gICAgICAgICk7XG4gICAgfTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuLy8gcmVzdWx0IGlzIHN0b3JlZCBpbiBvcHRpb25zLmRpZmY9W10sIHJldHVybiB2YWx1ZSBpcyBpZ25vcmVkXG4vLyBpZiBzYWlkIGRpZmYgZXhjZWVkcyBtYXgsIHJldHVybiBpbW1lZGlhdGVseSAmIGRvbid0IHdhc3RlIHRpbWVcbmZ1bmN0aW9uIF9kZWVwKCBnb3QsIGV4cCwgb3B0aW9ucz17fSwgcGF0aD0nJCcsIHNlZW5MPW5ldyBBbm5vdGF0ZWRTZXQoKSwgc2VlblI9bmV3IEFubm90YXRlZFNldCgpICkge1xuICAgIGlmIChnb3QgPT09IGV4cCB8fCBvcHRpb25zLm1heCA8PSBvcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICByZXR1cm47XG4gICAgaWYgKHR5cGVvZiBnb3QgIT09IHR5cGVvZiBleHApXG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcblxuICAgIC8vIHJlY3Vyc2UgYnkgZXhwZWN0ZWQgdmFsdWUgLSBjb25zaWRlciBpdCBtb3JlIHByZWRpY3RhYmxlXG4gICAgaWYgKHR5cGVvZiBleHAgIT09ICdvYmplY3QnIHx8IGV4cCA9PT0gbnVsbCApIHtcbiAgICAgICAgLy8gbm9uLW9iamVjdHMgLSBzbyBjYW4ndCBkZXNjZW5kXG4gICAgICAgIC8vIGFuZCBjb21wYXJpc29uIGFscmVhZHkgZG9uZSBhdCB0aGUgYmVnaW5ubmluZ1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG4gICAgfVxuXG4gICAgLy8gbXVzdCBkZXRlY3QgbG9vcHMgYmVmb3JlIGdvaW5nIGRvd25cbiAgICBjb25zdCBwYXRoTCA9IHNlZW5MLmhhcyhnb3QpO1xuICAgIGNvbnN0IHBhdGhSID0gc2VlblIuaGFzKGV4cCk7XG4gICAgaWYgKHBhdGhMIHx8IHBhdGhSKSB7XG4gICAgICAgIC8vIExvb3AgZGV0ZWN0ZWQgPSBvbmx5IGNoZWNrIHRvcG9sb2d5XG4gICAgICAgIGlmIChwYXRoTCA9PT0gcGF0aFIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW1xuICAgICAgICAgICAgcGF0aCArICcgKGNpcmN1bGFyKScsXG4gICAgICAgICAgICBwYXRoTCA/ICdDaXJjdWxhcj0nK3BhdGhMIDogZXhwbGFpbihnb3QsIHtkZXB0aDoyfSksXG4gICAgICAgICAgICBwYXRoUiA/ICdDaXJjdWxhcj0nK3BhdGhSIDogZXhwbGFpbihleHAsIHtkZXB0aDoyfSksXG4gICAgICAgICAgICB0cnVlIC8vIGRvbid0IHN0cmluZ2lmeVxuICAgICAgICBdKTtcbiAgICB9O1xuICAgIHNlZW5MID0gc2VlbkwuYWRkKGdvdCwgcGF0aCk7XG4gICAgc2VlblIgPSBzZWVuUi5hZGQoZXhwLCBwYXRoKTtcblxuICAgIC8vIGNvbXBhcmUgb2JqZWN0IHR5cGVzXG4gICAgLy8gKGlmIGEgdXNlciBpcyBzdHVwaWQgZW5vdWdoIHRvIG92ZXJyaWRlIGNvbnN0cnVjdG9yIGZpZWxkLCB3ZWxsIHRoZSB0ZXN0XG4gICAgLy8gd291bGQgZmFpbCBsYXRlciBhbnl3YXkpXG4gICAgaWYgKGdvdC5jb25zdHJ1Y3RvciAhPT0gZXhwLmNvbnN0cnVjdG9yKVxuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG5cbiAgICAvLyBhcnJheVxuICAgIGlmIChBcnJheS5pc0FycmF5KGV4cCkpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGdvdCkgfHwgZ290Lmxlbmd0aCAhPT0gZXhwLmxlbmd0aClcbiAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGV4cC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgX2RlZXAoIGdvdFtpXSwgZXhwW2ldLCBvcHRpb25zLCBwYXRoKydbJytpKyddJywgc2VlbkwsIHNlZW5SICk7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5tYXg8PW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybjtcbiAgICB9O1xuXG4gICAgLy8gY29tcGFyZSBrZXlzIC0gKzEgZm9yIGV4cCwgLTEgZm9yIGdvdCwgbm9uemVybyBrZXkgYXQgZW5kIG1lYW5zIGtleXMgZGlmZmVyXG4gICAgY29uc3QgdW5pcSA9IHt9O1xuICAgIE9iamVjdC5rZXlzKGV4cCkuZm9yRWFjaCggeCA9PiB1bmlxW3hdID0gMSApO1xuICAgIE9iamVjdC5rZXlzKGdvdCkuZm9yRWFjaCggeCA9PiB1bmlxW3hdID0gKHVuaXFbeF0gfHwgMCkgLSAxICk7XG4gICAgZm9yIChsZXQgeCBpbiB1bmlxKSB7XG4gICAgICAgIGlmICh1bmlxW3hdICE9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuICAgIH1cbiAgICBcbiAgICAvLyBub3cgdHlwZW9mLCBvYmplY3QgdHlwZSwgYW5kIG9iamVjdCBrZXlzIGFyZSB0aGUgc2FtZS5cbiAgICAvLyByZWN1cnNlLlxuICAgIGZvciAobGV0IGkgaW4gZXhwKSB7XG4gICAgICAgIF9kZWVwKCBnb3RbaV0sIGV4cFtpXSwgb3B0aW9ucywgcGF0aCsnWycrZXhwbGFpbihpKSsnXScsIHNlZW5MLCBzZWVuUiApO1xuICAgICAgICBpZiAob3B0aW9ucy5tYXg8PW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgICAgICBicmVhaztcbiAgICB9O1xuICAgIHJldHVybjtcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBjYWxsZXJJbmZvLCBleHBsYWluIH0gPSByZXF1aXJlKCAnLi91dGlsLmpzJyApO1xuXG4vKipcbiAqICAgQGNhbGxiYWNrIENvbnRyYWN0XG4gKiAgIEBkZXNjIEEgY29kZSBibG9jayBjb250YWluaW5nIG9uZSBvciBtb3JlIGNvbmRpdGlvbiBjaGVja3MuXG4gKiAgIEEgY2hlY2sgaXMgcGVyZm9ybWVkIGJ5IGNhbGxpbmcgb25lIG9mIGEgZmV3IHNwZWNpYWwgbWV0aG9kc1xuICogICAoZXF1YWwsIG1hdGNoLCBkZWVwRXF1YWwsIHR5cGUgZXRjKVxuICogICBvbiB0aGUgUmVwb3J0IG9iamVjdC5cbiAqICAgQ29udHJhY3RzIG1heSBiZSBuZXN0ZWQgdXNpbmcgdGhlICduZXN0ZWQnIG1ldGhvZCB3aGljaCBhY2NlcHRzXG4gKiAgIGFub3RoZXIgY29udHJhY3QgYW5kIHJlY29yZHMgYSBwYXNzL2ZhaWx1cmUgaW4gdGhlIHBhcmVudCBhY2NvcmRpbmdseS5xXG4gKiAgIEEgY29udHJhY3QgaXMgYWx3YXlzIGV4ZWN1dGVkIHRvIHRoZSBlbmQuXG4gKiAgIEBwYXJhbSB7UmVwb3J0fSBvayBBbiBvYmplY3QgdGhhdCByZWNvcmRzIGNoZWNrIHJlc3VsdHMuXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzXG4gKiAgIChlLmcuIGRhdGEgc3RydWN0dXJlIHRvIGJlIHZhbGlkYXRlZClcbiAqICAgQHJldHVybnMge3ZvaWR9IFJldHVybmVkIHZhbHVlIGlzIGlnbm9yZWQuXG4gKi9cblxuLyoqXG4gKiBAcHVibGljXG4gKiBAY2xhc3NkZXNjXG4gKiBUaGUgY29yZSBvZiB0aGUgcmVmdXRlIGxpYnJhcnksIHRoZSByZXBvcnQgb2JqZWN0IGNvbnRhaW5zIGluZm9cbiAqIGFib3V0IHBhc3NpbmcgYW5kIGZhaWxpbmcgY29uZGl0aW9ucy5cbiAqL1xuY2xhc3MgUmVwb3J0IHtcbiAgICAvLyBzZXR1cFxuICAgIC8qKlxuICAgICAqICBAZGVzYyBObyBjb25zdHJ1Y3RvciBhcmd1bWVudHMgc3VwcG9ydGVkLlxuICAgICAqICBDb250cmFjdHMgbWF5IG5lZWQgdG8gYmUgc2V0IHVwIGluc2lkZSBjYWxsYmFja3MgX2FmdGVyXyBjcmVhdGlvbixcbiAgICAgKiAgaGVuY2UgdGhpcyBjb252ZW50aW9uLlxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9jb3VudCAgICAgPSAwO1xuICAgICAgICB0aGlzLl9mYWlsQ291bnQgPSAwO1xuICAgICAgICB0aGlzLl9kZXNjciAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fZXZpZGVuY2UgID0gW107XG4gICAgICAgIHRoaXMuX3doZXJlICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9jb25kTmFtZSAgPSBbXTtcbiAgICAgICAgdGhpcy5faW5mbyAgICAgID0gW107XG4gICAgICAgIHRoaXMuX25lc3RlZCAgICA9IFtdO1xuICAgICAgICB0aGlzLl9wZW5kaW5nICAgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuX29uRG9uZSAgICA9IFtdO1xuICAgICAgICB0aGlzLl9kb25lICAgICAgPSBmYWxzZTtcbiAgICAgICAgLy8gVE9ETyBhZGQgY2FsbGVyIGluZm8gYWJvdXQgdGhlIHJlcG9ydCBpdHNlbGZcbiAgICB9XG5cbiAgICAvLyBTZXR1cCBtZXRob2RzIGZvbGxvdy4gVGhleSBtdXN0IGJlIGNoYWluYWJsZSwgaS5lLiByZXR1cm4gdGhpcy5cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgRXhlY3V0ZSBjb2RlIHdoZW4gY29udHJhY3QgZXhlY3V0aW9uIGZpbmlzaGVzLlxuICAgICAqICAgUmVwb3J0IG9iamVjdCBjYW5ub3QgYmUgbW9kaWZpZWQgYXQgdGhpcyBwb2ludCxcbiAgICAgKiAgIGFuZCBubyBhZGRpdGlvbmFsIGNoZWNrcyBteSBiZSBwcmVzZW50LlxuICAgICAqICAgQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBmaXJzdCBhcmd1bWVudCBpcyByZXBvcnQgaW4gcXVlc3Rpb25cbiAgICAgKiAgIEByZXR1cm5zIHtSZXBvcnR9IHRoaXMgKGNoYWluYWJsZSlcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICByZXBvcnQub25Eb25lKCByID0+IHsgaWYgKCFyLmdldFBhc3MoKSkgY29uc29sZS5sb2coci50b1N0cmluZygpKSB9IClcbiAgICAgKi9cbiAgICBvbkRvbmUoZm4pIHtcbiAgICAgICAgaWYoIHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJyApXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ29uRG9uZSgpOiBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICB0aGlzLl9vbkRvbmUucHVzaChmbik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgRXhlY3V0ZSBjb2RlIHdoZW4gY29udHJhY3QgZXhlY3V0aW9uIGZpbmlzaGVzLCBpZiBpdCBmYWlsZWQuXG4gICAgICogICBSZXBvcnQgb2JqZWN0IGNhbm5vdCBiZSBtb2RpZmllZCBhdCB0aGlzIHBvaW50LFxuICAgICAqICAgYW5kIG5vIGFkZGl0aW9uYWwgY2hlY2tzIG15IGJlIHByZXNlbnQuXG4gICAgICogICBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIGZpcnN0IGFyZ3VtZW50IGlzIHJlcG9ydCBpbiBxdWVzdGlvblxuICAgICAqICAgQHJldHVybnMge1JlcG9ydH0gdGhpcyAoY2hhaW5hYmxlKVxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIHJlcG9ydC5vbkZhaWwoIHIgPT4gY29uc29sZS5sb2coci50b1N0cmluZygpKSApO1xuICAgICAqL1xuICAgIG9uRmFpbChmbikge1xuICAgICAgICBpZiggdHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nIClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignb25Eb25lKCk6IGNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIHRoaXMuX29uRG9uZS5wdXNoKHIgPT4gci5nZXRQYXNzKCkgfHwgZm4ocikpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvLyBSdW5uaW5nIHRoZSBjb250cmFjdFxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgYXBwbHkgZ2l2ZW4gZnVuY3Rpb24gdG8gYSBSZXBvcnQgb2JqZWN0LCBsb2NrIHJlcG9ydCBhZnRlcndhcmRzLlxuICAgICAqICAgSWYgZnVuY3Rpb24gaXMgYXN5bmMgKGkuZS4gcmV0dXJucyBhIHtAbGluayBQcm9taXNlfSksXG4gICAgICogICB0aGUgcmVwb3J0IHdpbGwgb25seSBiZSBkb25lKCkgYWZ0ZXIgdGhlIHByb21pc2UgcmVzb2x2ZXMuXG4gICAgICogICBUaGlzIGlzIGRvbmUgc28gdG8gZW5zdXJlIHRoYXQgYWxsIGNoZWNrcyB0aGF0IGF3YWl0IG9uIGEgdmFsdWVcbiAgICAgKiAgIGFyZSByZXNvbHZlZC5cbiAgICAgKiAgIEBwYXJhbSB7Q29udHJhY3R9IGNvbnRyYWN0IFRoZSBmdW5jdGlvbiB0byBleGVjdXRlXG4gICAgICogICBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgbWF5IGJlIF9wcmVwZW5kZWRfIHRvIGNvbnRyYWN0XG4gICAgICogICBhbmQgd2lsbCBiZSBwYXNzZWQgdG8gaXQgX2FmdGVyXyB0aGUgUmVwb3J0IG9iamVjdCBpbiBxdWVzdGlvbi5cbiAgICAgKiAgIEByZXR1cm5zIHtSZXBvcnR9IHRoaXMgKGNoYWluYWJsZSlcbiAgICAgKiAgIEBleGFtcGxlIEJhc2ljIHVzYWdlXG4gICAgICogICBjb25zdCByID0gbmV3IFJlcG9ydCgpLnJ1biggb2sgPT4gb2suZXF1YWwoICd3YXInLCAncGVhY2UnLCAnMTk4NCcgKSApO1xuICAgICAqICAgci5nZXRQYXNzKCk7IC8vIGZhbHNlXG4gICAgICogICByLmdldERvbmUoKTsgLy8gdHJ1ZVxuICAgICAqICAgci50b1N0cmluZygpO1xuICAgICAqICAgcihcbiAgICAgKiAgICAgICExLiAxOTg0XG4gICAgICogICAgICAtIHdhclxuICAgICAqICAgICAgKyBwZWFjZVxuICAgICAqICAgKVxuICAgICAqXG4gICAgICogICBAZXhhbXBsZSBQYXNzaW5nIGFkZGl0aW9uYWwgYXJndW1lbnRzIHRvIGNhbGxiYWNrLlxuICAgICAqICAgLy8gVGhlIGNvbnRyYWN0IGJvZHkgaXMgdGhlIGxhc3QgYXJndW1lbnQuXG4gICAgICogICBuZXcgUmVwb3J0KCkucnVuKCB7IHY6IDQuMiwgY29sb3JzOiBbICdibHVlJyBdIH0sIChyLCBhcmcpID0+IHtcbiAgICAgKiAgICAgICByLnR5cGUoIGFyZywgJ29iamVjdCcgKTtcbiAgICAgKiAgICAgICByLnR5cGUoIGFyZy52LCAnbnVtYmVyJyApO1xuICAgICAqICAgICAgIHIuY21wTnVtKCBhcmcudiwgJz49JywgMy4xNCApO1xuICAgICAqICAgICAgIHIudHlwZSggYXJnLmNvbG9ycywgJ2FycmF5JyApO1xuICAgICAqICAgfSk7XG4gICAgICogICBAZXhhbXBsZSBBc3luYyBmdW5jdGlvblxuICAgICAqICAgY29uc3QgciA9IG5ldyBSZXBvcnQoKS5ydW4oXG4gICAgICogICAgICAgYXN5bmMgb2sgPT4gb2suZXF1YWwoIGF3YWl0IDYqOSwgNDIsICdmYWlscyBidXQgbGF0ZXInICkgKTtcbiAgICAgKiAgIHIuZ2V0UGFzcygpOyAvLyB0cnVlXG4gICAgICogICByLmdldERvbmUoKTsgLy8gZmFsc2VcbiAgICAgKiAgIC8vIC4uLndhaXQgZm9yIGV2ZW50IGxvb3AgdG8gdGlja1xuICAgICAqICAgci5nZXRQYXNzKCk7IC8vIGZhbHNlXG4gICAgICogICByLmdldERvbmUoKTsgLy8gdHJ1ZVxuICAgICAqL1xuICAgIHJ1biguLi5hcmdzKSB7XG4gICAgICAgIC8vIFRPRE8gZWl0aGVyIGFzeW5jKCkgc2hvdWxkIHN1cHBvcnQgYWRkaXRpb25hbCBhcmdzLCBvciBydW4oKSBzaG91bGRuJ3RcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICBjb25zdCBibG9jayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhc3QgYXJndW1lbnQgb2YgcnVuKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLCBub3QgJyt0eXBlb2YoYmxvY2spKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYmxvY2soIHRoaXMsIC4uLmFyZ3MgKTtcbiAgICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpXG4gICAgICAgICAgICByZXN1bHQudGhlbiggKCkgPT4gdGhpcy5kb25lKCkgKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhpcy5kb25lKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgYXBwbHkgZ2l2ZW4gZnVuY3Rpb24gKGNvbnRyYWN0KSB0byBhIFJlcG9ydCBvYmplY3QuXG4gICAgICogICBNdWx0aXBsZSBzdWNoIGNvbnRyYXRzIG1heSBiZSBhcHBsaWVkLCBhbmQgdGhlIHJlcG9ydCBpcyBub3QgbG9ja2VkLlxuICAgICAqICAgQXN5bmMgZnVuY3Rpb24gYXJlIHBlcm1pdHRlZCBidXQgbWF5IG5vdCBiZWhhdmUgYXMgZXhwZWN0ZWQuXG4gICAgICogICBAcGFyYW0ge0NvbnRyYWN0fSBjb250cmFjdCBUaGUgZnVuY3Rpb24gdG8gZXhlY3V0ZVxuICAgICAqICAgQWRkaXRpb25hbCBwYXJhbWV0ZXJzIG1heSBiZSBfcHJlcGVuZGVkXyB0byBjb250cmFjdFxuICAgICAqICAgYW5kIHdpbGwgYmUgcGFzc2VkIHRvIGl0IF9hZnRlcl8gdGhlIFJlcG9ydCBvYmplY3QgaW4gcXVlc3Rpb24uXG4gICAgICogICBAcmV0dXJucyB7UmVwb3J0fSB0aGlzIChjaGFpbmFibGUpXG4gICAgICogICBAZXhhbXBsZSBCYXNpYyB1c2FnZVxuICAgICAqICAgY29uc3QgciA9IG5ldyBSZXBvcnQoKVxuICAgICAqICAgICAgIC5ydW5TeW5jKCBvayA9PiBvay5lcXVhbCggJ3dhcicsICdwZWFjZScsICcxOTg0JyApIClcbiAgICAgKiAgICAgICAucnVuU3luYyggb2sgPT4gb2sudHlwZSAoIFtdLCAnYXJyYXknLCAnc29tZSBtb3JlIGNoZWNrcycgKSApXG4gICAgICogICAgICAgLmRvbmUoKTtcbiAgICAgKi9cbiAgICBydW5TeW5jKC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICBjb25zdCBibG9jayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhc3QgYXJndW1lbnQgb2YgcnVuKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLCBub3QgJyt0eXBlb2YoYmxvY2spKTtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYmxvY2soIHRoaXMsIC4uLmFyZ3MgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgc2V0UmVzdWx0IChldmlkZW5jZSwgZGVzY3IsIGNvbmROYW1lLCB3aGVyZSkge1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIGNvbnN0IG4gPSArK3RoaXMuX2NvdW50O1xuICAgICAgICBpZiAoZGVzY3IpXG4gICAgICAgICAgICB0aGlzLl9kZXNjcltuXSA9IGRlc2NyO1xuICAgICAgICAvLyBwYXNzIC0gcmV0dXJuIEFTQVBcbiAgICAgICAgaWYgKCFldmlkZW5jZSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBuZXN0ZWQgcmVwb3J0IG5lZWRzIHNwZWNpYWwgaGFuZGxpbmdcbiAgICAgICAgaWYgKGV2aWRlbmNlIGluc3RhbmNlb2YgUmVwb3J0KSB7XG4gICAgICAgICAgICB0aGlzLl9uZXN0ZWRbbl0gPSBldmlkZW5jZTtcbiAgICAgICAgICAgIGlmIChldmlkZW5jZS5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXZpZGVuY2UuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIHNob3J0LWNpcmN1aXQgaWYgcG9zc2libGVcbiAgICAgICAgICAgICAgICBldmlkZW5jZSA9IFtdOyAvLyBoYWNrIC0gZmFpbGluZyB3aXRob3V0IGV4cGxhbmF0aW9uXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5lc3RlZCBjb250cmFjdCBpcyBpbiBhc3luYyBtb2RlIC0gY29lcmNlIGludG8gYSBwcm9taXNlXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycnkgPSBldmlkZW5jZTtcbiAgICAgICAgICAgICAgICBldmlkZW5jZSA9IG5ldyBQcm9taXNlKCBkb25lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY3Vycnkub25Eb25lKCBkb25lICk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwZW5kaW5nIC0gd2UncmUgaW4gYXN5bmMgbW9kZVxuICAgICAgICBpZiAoZXZpZGVuY2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nLmFkZChuKTtcbiAgICAgICAgICAgIHdoZXJlID0gd2hlcmUgfHwgY2FsbGVySW5mbygyKTsgLy8gbXVzdCByZXBvcnQgYWN0dWFsIGNhbGxlciwgbm90IHRoZW5cbiAgICAgICAgICAgIGV2aWRlbmNlLnRoZW4oIHggPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuX3BlbmRpbmcuZGVsZXRlKG4pO1xuICAgICAgICAgICAgICAgIHRoaXMuX3NldFJlc3VsdChuLCB4LCBjb25kTmFtZSwgd2hlcmUgKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuX29uRG9uZS5sZW5ndGg7IGktLT4wOyApXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbkRvbmVbaV0odGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcy5fc2V0UmVzdWx0KG4sIGV2aWRlbmNlLCBjb25kTmFtZSwgd2hlcmUgfHwgY2FsbGVySW5mbygyKSk7XG4gICAgfVxuXG4gICAgX3NldFJlc3VsdChuLCBldmlkZW5jZSwgY29uZE5hbWUsIHdoZXJlKSB7XG4gICAgICAgIGlmICghZXZpZGVuY2UpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgLy8gbGlzdGlmeSAmIHN0cmluZ2lmeSBldmlkZW5jZSwgc28gdGhhdCBpdCBkb2Vzbid0IGNoYW5nZSBwb3N0LWZhY3R1bVxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZXZpZGVuY2UpKVxuICAgICAgICAgICAgZXZpZGVuY2UgPSBbIGV2aWRlbmNlIF07XG4gICAgICAgIHRoaXMuX2V2aWRlbmNlW25dID0gZXZpZGVuY2UubWFwKCB4PT5fZXhwbGFpbih4LCBJbmZpbml0eSkgKTtcbiAgICAgICAgdGhpcy5fd2hlcmVbbl0gICAgPSB3aGVyZTtcbiAgICAgICAgdGhpcy5fY29uZE5hbWVbbl0gPSBjb25kTmFtZTtcbiAgICAgICAgdGhpcy5fZmFpbENvdW50Kys7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgQXBwZW5kIGFuIGluZm9ybWF0aW9uYWwgbWVzc2FnZSB0byB0aGUgcmVwb3J0LlxuICAgICAqIE5vbi1zdHJpbmcgdmFsdWVzIHdpbGwgYmUgc3RyaW5naWZpZWQgdmlhIGV4cGxhaW4oKS5cbiAgICAgKiBAcGFyYW0ge0FueX0gbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtSZXBvcnR9IGNoYWluYWJsZVxuICAgICAqL1xuICAgIGluZm8oIC4uLm1lc3NhZ2UgKSB7XG4gICAgICAgIHRoaXMuX2xvY2soKTtcbiAgICAgICAgaWYgKCF0aGlzLl9pbmZvW3RoaXMuX2NvdW50XSlcbiAgICAgICAgICAgIHRoaXMuX2luZm9bdGhpcy5fY291bnRdID0gW107XG4gICAgICAgIHRoaXMuX2luZm9bdGhpcy5fY291bnRdLnB1c2goIG1lc3NhZ2UubWFwKCBzPT5fZXhwbGFpbihzKSApLmpvaW4oXCIgXCIpICk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgTG9ja3MgdGhlIHJlcG9ydCBvYmplY3QsIHNvIG5vIG1vZGlmaWNhdGlvbnMgbWF5IGJlIG1hZGUgbGF0ZXIuXG4gICAgICogICBBbHNvIGlmIG9uRG9uZSBjYWxsYmFjayhzKSBhcmUgcHJlc2VudCwgdGhleSBhcmUgZXhlY3V0ZWRcbiAgICAgKiAgIHVubGVzcyB0aGVyZSBhcmUgcGVuZGluZyBhc3luYyBjaGVja3MuXG4gICAgICogICBAcmV0dXJucyB7UmVwb3J0fSB0aGlzIChjaGFpbmFibGUpXG4gICAgICovXG4gICAgZG9uZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9kb25lKSB7XG4gICAgICAgICAgICB0aGlzLl9kb25lID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmICghdGhpcy5fcGVuZGluZy5zaXplKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuX29uRG9uZS5sZW5ndGg7IGktLT4wOyApXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX29uRG9uZVtpXSh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gY2hlY2sgaWYgdGhlIFJlcG9ydCBvYmplY3QgaXMgc3RpbGwgbW9kaWZpYWJsZSwgdGhyb3dzIG90aGVyd2lzZS5cbiAgICBfbG9jayAoKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIGNvbnRyYWN0Jyk7XG4gICAgfVxuXG4gICAgLy8gUXVlcnlpbmcgbWV0aG9kc1xuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyAgVGVsbHMgd2hldGhlciB0aGUgcmVwb3J0IGlzIGZpbmlzaGVkLFxuICAgICAqICAgICAgICAgIGkuZS4gZG9uZSgpIHdhcyBjYWxsZWQgJiBubyBwZW5kaW5nIGFzeW5jIGNoZWNrcy5cbiAgICAgKiAgIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGdldERvbmUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kb25lICYmICF0aGlzLl9wZW5kaW5nLnNpemU7IC8vIGlzIGl0IGV2ZW4gbmVlZGVkP1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgV2l0aG91dCBhcmd1bWVudCByZXR1cm5zIHdoZXRoZXIgdGhlIGNvbnRyYWN0IHdhcyBmdWxmaWxsZWQuXG4gICAgICogICBBcyBhIHNwZWNpYWwgY2FzZSwgaWYgbm8gY2hlY2tzIHdlcmUgcnVuIGFuZCB0aGUgY29udHJhY3QgaXMgZmluaXNoZWQsXG4gICAgICogICByZXR1cm5zIGZhbHNlLCBhcyBpbiBcInNvbWVvbmUgbXVzdCBoYXZlIGZvcmdvdHRlbiB0byBleGVjdXRlXG4gICAgICogICBwbGFubmVkIGNoZWNrcy4gVXNlIHBhc3MoKSBpZiBubyBjaGVja3MgYXJlIHBsYW5uZWQuXG4gICAgICpcbiAgICAgKiAgIElmIGEgcGFyYW1ldGVyIGlzIGdpdmVuLCByZXR1cm4gdGhlIHN0YXR1cyBvZiBuLXRoIGNoZWNrIGluc3RlYWQuXG4gICAgICogICBAcGFyYW0ge2ludGVnZXJ9IG5cbiAgICAgKiAgIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGdldFBhc3Mobikge1xuICAgICAgICBpZiAobiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ZhaWxDb3VudCA9PT0gMDtcbiAgICAgICAgcmV0dXJuIChuID4gMCAmJiBuIDw9IHRoaXMuX2NvdW50KSA/ICF0aGlzLl9ldmlkZW5jZVtuXSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgcGVyZm9ybWVkLlxuICAgICAqICAgQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBXaGV0aGVyIHRoZSBsYXN0IGNoZWNrIHdhcyBhIHN1Y2Nlc3MuXG4gICAgICogIFRoaXMgaXMganVzdCBhIHNob3J0Y3V0IGZvciBmb28uZ2V0RGV0YWlscyhmb28uZ2V0Q291bnQpLnBhc3NcbiAgICAgKiAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgbGFzdCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50ID8gIXRoaXMuX2V2aWRlbmNlW3RoaXMuX2NvdW50XSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgZmFpbGluZy5cbiAgICAgKiAgIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0RmFpbENvdW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZmFpbENvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgUmV0dXJuIGEgc3RyaW5nIG9mIGZhaWxpbmcvcGFzc2luZyBjaGVja3MuXG4gICAgICogICBUaGlzIG1heSBiZSB1c2VmdWwgZm9yIHZhbGlkYXRpbmcgY3VzdG9tIGNvbmRpdGlvbnMuXG4gICAgICogICBDb25zZWN1dGl2ZSBwYXNzaW5nIGNoZWNrYSBhcmUgcmVwcmVzZW50ZWQgYnkgbnVtYmVycy5cbiAgICAgKiAgIEEgY2FwaXRhbCBsZXR0ZXIgaW4gdGhlIHN0cmluZyByZXByZXNlbnRzIGZhaWx1cmUuXG4gICAgICogICBTZWUgYWxzbyB7QGxpbmsgUmVwb3J0I3RvU3RyaW5nIHRvU3RyaW5nKCl9XG4gICAgICogICBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIHBhc3NpbmcgY2hlY2tzXG4gICAgICogICBcInIoMTApXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBjaGVja3Mgd2l0aCAxIGZhaWx1cmUgaW4gdGhlIG1pZGRsZVxuICAgICAqICAgXCJyKDUsTiw0KVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgY2hlY2tzIGluY2x1ZGluZyBhIG5lc3RlZCBjb250cmFjdFxuICAgICAqICAgXCJyKDMscigxLE4pLDYpXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyBubyBjaGVja3Mgd2VyZSBydW4gLSBhdXRvLWZhaWxcbiAgICAgKiAgIFwicihaKVwiXG4gICAgICovXG4gICAgZ2V0R2hvc3QoKSB7XG4gICAgICAgIGNvbnN0IGdob3N0ID0gW107XG4gICAgICAgIGxldCBzdHJlYWsgPSAwO1xuICAgICAgICBmb3IgKGxldCBpPTE7IGkgPD0gdGhpcy5fY291bnQ7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2V2aWRlbmNlW2ldIHx8IHRoaXMuX25lc3RlZFtpXSkge1xuICAgICAgICAgICAgICAgIGlmIChzdHJlYWspIGdob3N0LnB1c2goc3RyZWFrKTtcbiAgICAgICAgICAgICAgICBzdHJlYWsgPSAwO1xuICAgICAgICAgICAgICAgIGdob3N0LnB1c2goIHRoaXMuX25lc3RlZFtpXSA/IHRoaXMuX25lc3RlZFtpXS5nZXRHaG9zdCgpIDogJ04nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RyZWFrKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0cmVhaykgZ2hvc3QucHVzaChzdHJlYWspO1xuICAgICAgICByZXR1cm4gJ3IoJytnaG9zdC5qb2luKCcsJykrJyknO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBSZXR1cm5zIHNlcmlhbGl6ZWQgZGlmZi1saWtlIHJlcG9ydCB3aXRoIG5lc3RpbmcgYW5kIGluZGVudGF0aW9uLlxuICAgICAqICBQYXNzaW5nIGNvbmRpdGlvbnMgYXJlIG1lcmtlZCB3aXRoIG51bWJlcnMsIGZhaWxpbmcgYXJlIHByZWZpeGVkXG4gICAgICogIHdpdGggYSBiYW5nICghKS5cbiAgICAgKlxuICAgICAqICBTZWUgYWxzbyB7QGxpbmsgUmVwb3J0I2dldEdob3N0IGdldEdob3N0KCl9XG4gICAgICogIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICogIEBleGFtcGxlIC8vIG5vIGNoZWNrcyBydW5cbiAgICAgKiAgY29uc3QgciA9IG5ldyBSZXBvcnQoKTtcbiAgICAgKiAgci50b1N0cmluZygpO1xuICAgICAqICByKFxuICAgICAqICApXG4gICAgICogIEBleGFtcGxlIC8vIHBhc3NcbiAgICAgKiAgY29uc3QgciA9IG5ldyBSZXBvcnQoKTtcbiAgICAgKiAgci5wYXNzKCdmb28gYmFyZWQnKTtcbiAgICAgKiAgci50b1N0cmluZygpO1xuICAgICAqICByKFxuICAgICAqICAgICAgMS4gZm9vIGJhcmVkXG4gICAgICogIClcbiAgICAgKiAgQGV4YW1wbGUgLy8gZmFpbFxuICAgICAqICBjb25zdCByID0gbmV3IFJlcG9ydCgpO1xuICAgICAqICByLmVxdWFsKCd3YXInLCAncGVhY2UnKTtcbiAgICAgKiAgci50b1N0cmluZygpO1xuICAgICAqICByKFxuICAgICAqICAgICAgITEuXG4gICAgICogICAgICBeIENvbmRpdGlvbiBlcXVhbCBmYWlsZWQgYXQgPGZpbGU+OjxsaW5lPjo8Y2hhcj5cbiAgICAgKiAgICAgIC0gd2FyXG4gICAgICogICAgICArIHBlYWNlXG4gICAgICogIClcbiAgICAgKi9cbiAgICB0b1N0cmluZygpIHtcbiAgICAgICAgLy8gVE9ETyBwcmVwZW5kIHdpdGggJ3JlZnV0ZS92L24ubm4nXG4gICAgICAgIHJldHVybiB0aGlzLmdldExpbmVzKCkuam9pbignXFxuJyk7XG4gICAgfVxuXG4gICAgZ2V0TGluZXMoaW5kZW50PScnKSB7XG4gICAgICAgIGNvbnN0IG91dCA9IFtpbmRlbnQgKyAncignXTtcbiAgICAgICAgY29uc3QgbGFzdCA9IGluZGVudCArICcpJztcbiAgICAgICAgaW5kZW50ID0gaW5kZW50ICsgJyAgICAnO1xuXG4gICAgICAgIGNvbnN0IHBhZCA9IHByZWZpeCA9PiBzID0+IGluZGVudCArIHByZWZpeCArICcgJyArIHM7XG5cbiAgICAgICAgaWYgKHRoaXMuX2luZm9bMF0pXG4gICAgICAgICAgICBvdXQucHVzaCggLi4udGhpcy5faW5mb1swXS5tYXAoIHBhZCgnOycpICkgKTtcbiAgICAgICAgZm9yIChsZXQgbiA9IDE7IG48PXRoaXMuX2NvdW50OyBuKyspIHtcbiAgICAgICAgICAgIG91dC5wdXNoKCAuLi50aGlzLmdldExpbmVzUGFydGlhbCggbiwgaW5kZW50ICkgKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9pbmZvW25dKVxuICAgICAgICAgICAgICAgIG91dC5wdXNoKCAuLi50aGlzLl9pbmZvW25dLm1hcCggcGFkKCc7JykgKSApO1xuICAgICAgICB9O1xuICAgICAgICBvdXQucHVzaChsYXN0KTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG5cbiAgICBnZXRMaW5lc1BhcnRpYWwobiwgaW5kZW50PScnKSB7XG4gICAgICAgIGNvbnN0IG91dCA9IFtdO1xuICAgICAgICBvdXQucHVzaChcbiAgICAgICAgICAgIGluZGVudFxuICAgICAgICAgICAgKyh0aGlzLl9wZW5kaW5nLmhhcyhuKSA/ICcuLi4nIDogKHRoaXMuX2V2aWRlbmNlW25dID8gJyEnOicnKSApXG4gICAgICAgICAgICArbisodGhpcy5fZGVzY3Jbbl0gPyAnLiAnK3RoaXMuX2Rlc2NyW25dIDogJy4nKVxuICAgICAgICApO1xuICAgICAgICBpZiggdGhpcy5fbmVzdGVkW25dKSB7XG4gICAgICAgICAgICBvdXQucHVzaCggLi4udGhpcy5fbmVzdGVkW25dLmdldExpbmVzKGluZGVudCkgKTtcbiAgICAgICAgfSBlbHNlIGlmKCB0aGlzLl9ldmlkZW5jZVtuXSApIHtcbiAgICAgICAgICAgIG91dC5wdXNoKCBpbmRlbnQgKyAnICAgIF4gQ29uZGl0aW9uIGAnKyh0aGlzLl9jb25kTmFtZVtuXSB8fCAnY2hlY2snKVxuICAgICAgICAgICAgICAgICsnYCBmYWlsZWQgYXQgJyt0aGlzLl93aGVyZVtuXSApO1xuICAgICAgICAgICAgdGhpcy5fZXZpZGVuY2Vbbl0uZm9yRWFjaCggcmF3ID0+IHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgbXVsdGlsaW5lIGV2aWRlbmNlXG4gICAgICAgICAgICAgICAgLy8gVE9ETyB0aGlzIGlzIHBlcmwgd3JpdHRlbiBpbiBKUywgcmV3cml0ZSBtb3JlIGNsZWFybHlcbiAgICAgICAgICAgICAgICBsZXRbIF8sIHByZWZpeCwgcyBdID0gcmF3Lm1hdGNoKCAvXihbLSt8XSApPyguKj8pXFxuPyQvcyApO1xuICAgICAgICAgICAgICAgIGlmICghcHJlZml4KSBwcmVmaXggPSAnfCAnO1xuICAgICAgICAgICAgICAgIGlmICghcy5tYXRjaCgvXFxuLykpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goIGluZGVudCArICcgICAgJyArIHByZWZpeCArIHMgKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzLnNwbGl0KCdcXG4nKS5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFydCA9PiBvdXQucHVzaCggaW5kZW50ICsgJyAgICAnICsgcHJlZml4ICsgcGFydCApKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIHJldHVybnMgYSBwbGFpbiBzZXJpYWxpemFibGUgb2JqZWN0XG4gICAgICogIEByZXR1cm5zIHtPYmplY3R9XG4gICAgICovXG4gICAgdG9KU09OKCkge1xuICAgICAgICBjb25zdCBuID0gdGhpcy5nZXRDb3VudCgpO1xuICAgICAgICBjb25zdCBkZXRhaWxzID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpPD1uOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLmdldERldGFpbHMoaSk7XG4gICAgICAgICAgICAvLyBzdHJpcCBleHRyYSBrZXlzXG4gICAgICAgICAgICBmb3IoIGxldCBrZXkgaW4gbm9kZSApIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZVtrZXldID09PSB1bmRlZmluZWQgfHwgKEFycmF5LmlzQXJyYXkobm9kZVtrZXldKSAmJiBub2RlW2tleV0ubGVuZ3RoID09PSAwKSlcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG5vZGVba2V5XTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBkZXRhaWxzLnB1c2gobm9kZSk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwYXNzOiAgdGhpcy5nZXRQYXNzKCksXG4gICAgICAgICAgICBjb3VudDogdGhpcy5nZXRDb3VudCgpLFxuICAgICAgICAgICAgZGV0YWlscyxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIFJldHVybnMgZGV0YWlsZWQgcmVwb3J0IG9uIGEgc3BlY2lmaWMgY2hlY2tcbiAgICAgKiAgIEBwYXJhbSB7aW50ZWdlcn0gbiAtIGNoZWNrIG51bWJlciwgbXVzdCBiZSA8PSBnZXRDb3VudCgpXG4gICAgICogICBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldERldGFpbHMobikge1xuICAgICAgICAvLyBUT0RPIHZhbGlkYXRlIG5cblxuICAgICAgICAvLyB1Z2x5IGJ1dCB3aGF0IGNhbiBJIGRvXG4gICAgICAgIGlmIChuID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG46ICAgIDAsXG4gICAgICAgICAgICAgICAgaW5mbzogdGhpcy5faW5mb1swXSB8fCBbXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZXZpZGVuY2UgPSB0aGlzLl9ldmlkZW5jZVtuXTtcbiAgICAgICAgaWYgKGV2aWRlbmNlICYmICFBcnJheS5pc0FycmF5KGV2aWRlbmNlKSlcbiAgICAgICAgICAgIGV2aWRlbmNlID0gW2V2aWRlbmNlXTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbjogICAgICAgIG4sXG4gICAgICAgICAgICBuYW1lOiAgICAgdGhpcy5fZGVzY3Jbbl0gfHwgJycsXG4gICAgICAgICAgICBwYXNzOiAgICAgIWV2aWRlbmNlLFxuICAgICAgICAgICAgZXZpZGVuY2U6IGV2aWRlbmNlIHx8IFtdLFxuICAgICAgICAgICAgd2hlcmU6ICAgIHRoaXMuX3doZXJlW25dLFxuICAgICAgICAgICAgY29uZDogICAgIHRoaXMuX2NvbmROYW1lW25dLFxuICAgICAgICAgICAgaW5mbzogICAgIHRoaXMuX2luZm9bbl0gfHwgW10sXG4gICAgICAgICAgICBuZXN0ZWQ6ICAgdGhpcy5fbmVzdGVkW25dLFxuICAgICAgICAgICAgcGVuZGluZzogIHRoaXMuX3BlbmRpbmcuaGFzKG4pLFxuICAgICAgICB9O1xuICAgIH1cbn1cblxuLy8gdGhpcyBpcyBmb3Igc3R1ZmYgbGlrZSBgb2JqZWN0IGZvbyA9IHtcImZvb1wiOjQyfWBcbi8vIHdlIGRvbid0IHdhbnQgdGhlIGV4cGxhbmF0aW9uIHRvIGJlIHF1b3RlZCFcbmZ1bmN0aW9uIF9leHBsYWluKCBpdGVtLCBkZXB0aCApIHtcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnIClcbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgcmV0dXJuIGV4cGxhaW4oIGl0ZW0sIHsgZGVwdGggfSApO1xufTtcblxuUmVwb3J0LnByb3RvdHlwZS5leHBsYWluID0gZXhwbGFpbjsgLy8gYWxzbyBtYWtlIGF2YWlsYWJsZSB2aWEgcmVwb3J0XG5cbi8vIHBhcnQgb2YgYWRkQ29uZGl0aW9uXG5jb25zdCBrbm93bkNoZWNrcyA9IG5ldyBTZXQoKTtcblxuLyoqXG4gKiAgQG1lbWJlck9mIHJlZnV0ZVxuICogIEBzdGF0aWNcbiAqICBAZGVzYyBDcmVhdGUgbmV3IGNoZWNrIG1ldGhvZCBhdmFpbGFibGUgdmlhIGFsbCBSZXBvcnQgaW5zdGFuY2VzXG4gKiAgQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSBvZiB0aGUgbmV3IGNvbmRpdGlvbi5cbiAqICBNdXN0IG5vdCBiZSBwcmVzZW50IGluIFJlcG9ydCBhbHJlYWR5LCBhbmQgc2hvdWxkIE5PVCBzdGFydCB3aXRoXG4gKiAgZ2V0Li4uLCBzZXQuLi4sIG9yIGFkZC4uLiAodGhlc2UgYXJlIHJlc2VydmVkIGZvciBSZXBvcnQgaXRzZWxmKVxuICogIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIENvbmZpZ3VyaW5nIHRoZSBjaGVjaydzIGhhbmRsaW5nIG9mIGFyZ3VtZW50c1xuICogIEBwYXJhbSB7aW50ZWdlcn0gb3B0aW9ucy5hcmdzIFRoZSByZXF1aXJlZCBudW1iZXIgb2YgYXJndW1lbnRzXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBbb3B0aW9ucy5taW5BcmdzXSBNaW5pbXVtIG51bWJlciBvZiBhcmd1bWVudCAoZGVmYXVsdHMgdG8gYXJncylcbiAqICBAcGFyYW0ge2ludGVnZXJ9IFtvcHRpb25zLm1heEFyZ3NdIE1heGltdW0gbnVtYmVyIG9mIGFyZ3VtZW50IChkZWZhdWx0cyB0byBhcmdzKVxuICogIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuaGFzT3B0aW9uc10gSWYgdHJ1ZSwgYW4gb3B0aW9uYWwgb2JqZWN0XG5jYW4gYmUgc3VwcGxpZWQgYXMgbGFzdCBhcmd1bWVudC4gSXQgd29uJ3QgaW50ZXJmZXJlIHdpdGggZGVzY3JpcHRpb24uXG4gKiAgQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5mdW5dIFRoZSBsYXN0IGFyZ3VtZW50IGlzIGEgY2FsbGJhY2tcbiAqICBAcGFyYW0ge0Z1bmN0aW9ufSBpbXBsZW1lbnRhdGlvbiAtIGEgY2FsbGJhY2sgdGhhdCB0YWtlcyB7YXJnc30gYXJndW1lbnRzXG4gKiAgYW5kIHJldHVybnMgYSBmYWxzZXkgdmFsdWUgaWYgY29uZGl0aW9uIHBhc3Nlc1xuICogIChcIm5vdGhpbmcgdG8gc2VlIGhlcmUsIG1vdmUgYWxvbmdcIiksXG4gKiAgb3IgZXZpZGVuY2UgaWYgaXQgZmFpbHNcbiAqICAoZS5nLiB0eXBpY2FsbHkgYSBnb3QvZXhwZWN0ZWQgZGlmZikuXG4gKi9cbmZ1bmN0aW9uIGFkZENvbmRpdGlvbiAobmFtZSwgb3B0aW9ucywgaW1wbCkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uIG5hbWUgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eKF98Z2V0W19BLVpdfHNldFtfQS1aXSkvKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gbmFtZSBtdXN0IG5vdCBzdGFydCB3aXRoIGdldF8sIHNldF8sIG9yIF8nKTtcbiAgICAvLyBUT0RPIG11c3QgZG8gc29tZXRoaW5nIGFib3V0IG5hbWUgY2xhc2hlcywgYnV0IGxhdGVyXG4gICAgLy8gYmVjYXVzZSBldmFsIGluIGJyb3dzZXIgbWF5IChraW5kIG9mIGxlZ2ltaXRlbHkpIG92ZXJyaWRlIGNvbmRpdGlvbnNcbiAgICBpZiAoIWtub3duQ2hlY2tzLmhhcyhuYW1lKSAmJiBSZXBvcnQucHJvdG90eXBlW25hbWVdKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBhbHJlYWR5IGV4aXN0cyBpbiBSZXBvcnQ6ICcrbmFtZSk7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSAnb2JqZWN0JylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdiYWQgb3B0aW9ucycpO1xuICAgIGlmICh0eXBlb2YgaW1wbCAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdiYWQgaW1wbGVtZW50YXRpb24nKTtcblxuICAgIGNvbnN0IG1pbkFyZ3MgICAgPSBvcHRpb25zLm1pbkFyZ3MgfHwgb3B0aW9ucy5hcmdzO1xuICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihtaW5BcmdzKSB8fCBtaW5BcmdzIDwgMClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdhcmdzL21pbkFyZ3MgbXVzdCBiZSBub25uZWdhdGl2ZSBpbnRlZ2VyJyk7XG4gICAgY29uc3QgbWF4QXJncyAgICA9IG9wdGlvbnMubWF4QXJncyB8fCBvcHRpb25zLmFyZ3MgfHwgSW5maW5pdHk7XG4gICAgaWYgKG1heEFyZ3MgIT09IEluZmluaXR5ICYmICghTnVtYmVyLmlzSW50ZWdlcihtaW5BcmdzKSB8fCBtYXhBcmdzIDwgbWluQXJncykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbWF4QXJncyBtdXN0IGJlIGludGVnZXIgYW5kIGdyZWF0ZXIgdGhhbiBtaW5BcmdzLCBvciBJbmZpbml0eScpO1xuICAgIGNvbnN0IGRlc2NyRmlyc3QgICAgPSBvcHRpb25zLmRlc2NyRmlyc3QgfHwgb3B0aW9ucy5mdW4gfHwgbWF4QXJncyA+IDEwO1xuICAgIGNvbnN0IGhhc09wdGlvbnMgICAgPSAhIW9wdGlvbnMuaGFzT3B0aW9ucztcbiAgICBjb25zdCBtYXhBcmdzUmVhbCAgID0gbWF4QXJncyArIChoYXNPcHRpb25zID8gMSA6IDApO1xuXG4gICAgLy8gVE9ETyBhbGVydCB1bmtub3duIG9wdGlvbnNcblxuICAgIC8vIFRPRE8gdGhpcyBjb2RlIGlzIGNsdXR0ZXJlZCwgcmV3cml0ZVxuICAgIGNvbnN0IGNvZGUgPSBmdW5jdGlvbiguLi5hcmdzKSB7XG4gICAgICAgIGNvbnN0IGRlc2NyID0gZGVzY3JGaXJzdFxuICAgICAgICAgICAgPyBhcmdzLnNoaWZ0KClcbiAgICAgICAgICAgIDogKCAoYXJncy5sZW5ndGggPiBtYXhBcmdzICYmIHR5cGVvZiBhcmdzW2FyZ3MubGVuZ3RoLTFdID09PSAnc3RyaW5nJykgPyBhcmdzLnBvcCgpIDogdW5kZWZpbmVkKTtcbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gbWF4QXJnc1JlYWwgfHwgYXJncy5sZW5ndGggPCBtaW5BcmdzKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gJytuYW1lKycgbXVzdCBoYXZlICcrbWluQXJncysnLi4nK21heEFyZ3NSZWFsKycgYXJndW1lbnRzICcpOyAvLyBUT0RPXG5cbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0UmVzdWx0KCBpbXBsKC4uLmFyZ3MpLCBkZXNjciwgbmFtZSApO1xuICAgIH07XG5cbiAgICBrbm93bkNoZWNrcy5hZGQobmFtZSk7XG4gICAgUmVwb3J0LnByb3RvdHlwZVtuYW1lXSA9IGNvZGU7XG59XG5cbi8vIFRoZSBtb3N0IGJhc2ljIGNvbmRpdGlvbnMgYXJlIGRlZmluZWQgcmlnaHQgaGVyZVxuLy8gaW4gb3JkZXIgdG8gYmUgc3VyZSB3ZSBjYW4gdmFsaWRhdGUgdGhlIFJlcG9ydCBjbGFzcyBpdHNlbGYuXG5cbi8qKlxuICogIEBuYW1lc3BhY2UgY29uZGl0aW9uc1xuICogIEBkZXNjIENvbmRpdGlvbiBjaGVjayBsaWJyYXJ5LiBUaGVzZSBtZXRob2RzIG11c3QgYmUgcnVuIG9uIGFcbiAqICB7QGxpbmsgUmVwb3J0fSBvYmplY3QuXG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBjaGVja1xuICogICBAZGVzYyBBIGdlbmVyaWMgY2hlY2sgb2YgYSBjb25kaXRpb24uXG4gKiAgIEBwYXJhbSBldmlkZW5jZSBJZiBmYWxzZSwgMCwgJycsIG9yIHVuZGVmaW5lZCwgdGhlIGNoZWNrIGlzIGFzc3VtZWQgdG8gcGFzcy5cbiAqICAgT3RoZXJ3aXNlIGl0IGZhaWxzLCBhbmQgdGhpcyBhcmd1bWVudCB3aWxsIGJlIGRpc3BsYXllZCBhcyB0aGUgcmVhc29uIHdoeS5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl0gVGhlIHJlYXNvbiB3aHkgd2UgY2FyZSBhYm91dCB0aGUgY2hlY2suXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBwYXNzXG4gKiAgIEBkZXNjIEFsd2F5cyBwYXNzZXMuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBmYWlsXG4gKiAgIEBkZXNjIEFsd2F5cyBmYWlscyB3aXRoIGEgXCJmYWlsZWQgZGVsaWJlcmF0ZWx5XCIgbWVzc2FnZS5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGVxdWFsXG4gKiAgIEBkZXNjIENoZWNrcyBpZiA9PT0gaG9sZHMgYmV0d2VlbiB0d28gdmFsdWVzLlxuICogICBJZiBub3QsIGJvdGggd2lsbCBiZSBzdHJpbmdpZmllZCBhbmQgZGlzcGxheWVkIGFzIGEgZGlmZi5cbiAqICAgU2VlIGRlZXBFcXVhbCB0byBjaGVjayBuZXN0ZWQgZGF0YSBzdHJ1Y3R1cmVzIG90IG9iamVjdHMuXG4gKiAgIEBwYXJhbSB7YW55fSBhY3R1YWxcbiAqICAgQHBhcmFtIHthbnl9IGV4cGVjdGVkXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBtYXRjaFxuICogICBAZGVzYyBDaGVja3MgaWYgYSBzdHJpbmcgbWF0Y2hlcyBhIHJlZ3VsYXIgZXhwcmVzc2lvbi5cbiAqICAgQHBhcmFtIHtzdHJ1bmd9IGFjdHVhbFxuICogICBAcGFyYW0ge1JlZ0V4cH0gZXhwZWN0ZWRcbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIG5lc3RlZFxuICogICBAZGVzYyBWZXJpZnkgYSBuZXN0ZWQgY29udHJhY3QuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBkZXNjcmlwdGlvblxuICogICBAcGFyYW0ge0NvbnRyYWN0fSBjb250cmFjdFxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5cbmFkZENvbmRpdGlvbihcbiAgICAnY2hlY2snLFxuICAgIHthcmdzOjF9LFxuICAgIHg9Pnhcbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ3Bhc3MnLFxuICAgIHthcmdzOjB9LFxuICAgICgpPT4wXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdmYWlsJyxcbiAgICB7YXJnczowfSxcbiAgICAoKT0+J2ZhaWxlZCBkZWxpYmVyYXRlbHknXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdlcXVhbCcsXG4gICAge2FyZ3M6Mn0sXG4gICAgKGEsYikgPT4gYSA9PT0gYiA/IDAgOiBbICctICcrZXhwbGFpbihhKSwgJysgJyArIGV4cGxhaW4oYikgXVxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnbWF0Y2gnLFxuICAgIHthcmdzOjJ9LFxuICAgIChhLHJleCkgPT4gKCcnK2EpLm1hdGNoKHJleCkgPyAwIDogW1xuICAgICAgICAnU3RyaW5nICAgICAgICAgOiAnK2EsXG4gICAgICAgICdEb2VzIG5vdCBtYXRjaCA6ICcrcmV4XG4gICAgXVxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnbmVzdGVkJyxcbiAgICB7ZnVuOjEsbWluQXJnczoxfSxcbiAgICAoLi4uYXJncykgPT4gbmV3IFJlcG9ydCgpLnJ1biguLi5hcmdzKS5kb25lKClcbik7XG5cbm1vZHVsZS5leHBvcnRzID0geyBSZXBvcnQsIGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IEFubm90YXRlZFNldCB9ID0gcmVxdWlyZSggJy4vdXRpbC9hbm5vdGF0ZWQtc2V0LmpzJyApO1xuXG4vKipcbiAqICAgQG5hbWVzcGFjZSB1dGlsaXRpZXNcbiAqICAgQGRlc2MgIFRoZXNlIGZ1bmN0aW9ucyBoYXZlIG5vdGhpbmcgdG8gZG8gd2l0aCByZWZ1dGUgYW5kIHNob3VsZFxuICogICAgICAgICAgaWRlYWxseSBiZSBpbiBzZXBhcmF0ZSBtb2R1bGVzLlxuICovXG5cbi8qIERldGVybWluZSBuLXRoIGNhbGxlciB1cCB0aGUgc3RhY2sgKi9cbi8qIEluc3BpcmVkIGJ5IFBlcmwncyBDYXJwIG1vZHVsZSAqL1xuY29uc3QgaW5TdGFjayA9IC8oW146XFxzKCldKzpcXGQrKD86OlxcZCspPylcXFcqKFxcbnwkKS9nO1xuXG4vKipcbiAqICBAcHVibGljXG4gKiAgQG1lbWJlck9mIHV0aWxpdGllc1xuICogIEBmdW5jdGlvblxuICogIEBkZXNjIFJldHVybnMgc291cmNlIHBvc2l0aW9uIG4gZnJhbWVzIHVwIHRoZSBzdGFja1xuICogIEBleGFtcGxlXG4gKiAgXCIvZm9vL2Jhci5qczoyNToxMVwiXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBkZXB0aCBIb3cgbWFueSBmcmFtZXMgdG8gc2tpcFxuICogIEByZXR1cm5zIHtzdHJpbmd9IHNvdXJjZSBmaWxlLCBsaW5lLCBhbmQgY29sdW1uLCBzZXBhcmF0ZWQgYnkgY29sb24uXG4gKi9cbmZ1bmN0aW9uIGNhbGxlckluZm8obikge1xuICAgIC8qIGEgdGVycmlibGUgcmV4IHRoYXQgYmFzaWNhbGx5IHNlYXJjaGVzIGZvciBmaWxlLmpzOm5ubjpubm4gc2V2ZXJhbCB0aW1lcyovXG4gICAgcmV0dXJuIChuZXcgRXJyb3IoKS5zdGFjay5tYXRjaChpblN0YWNrKVtuKzFdLnJlcGxhY2UoL1xcVypcXG4kLywgJycpIHx8ICcnKVxufVxuXG4vKipcbiAqICBAcHVibGljXG4gKiAgQGluc3RhbmNSXG4gKiAgQG1lbWJlck9mIFJlcG9ydFxuICogIEBkZXNjIFN0cmluZ2lyeSBvYmplY3RzIHJlY3Vyc2l2ZWx5IHdpdGggbGltaXRlZCBkZXB0aFxuICogIGFuZCBjaXJjdWxhciByZWZlcmVuY2UgdHJhY2tpbmcuXG4gKiAgR2VuZXJhbGx5IEpTT04uc3RyaW5naWZ5IGlzIHVzZWQgYXMgcmVmZXJlbmNlOlxuICogIHN0cmluZ3MgYXJlIGVzY2FwZWQgYW5kIGRvdWJsZS1xdW90ZWQ7IG51bWJlcnMsIGJvb2xlYW4sIGFuZCBudWxscyBhcmVcbiAqICBzdHJpbmdpZmllZCBcImFzIGlzXCI7IG9iamVjdHMgYW5kIGFycmF5cyBhcmUgZGVzY2VuZGVkIGludG8uXG4gKiAgVGhlIGRpZmZlcmVuY2VzIGZvbGxvdzpcbiAqICB1bmRlZmluZWQgaXMgcmVwb3J0ZWQgYXMgJzx1bmRlZj4nLlxuICogIE9iamVjdHMgdGhhdCBoYXZlIGNvbnN0cnVjdG9ycyBhcmUgcHJlZml4ZWQgd2l0aCBjbGFzcyBuYW1lcy5cbiAqICBPYmplY3QgYW5kIGFycmF5IGNvbnRlbnQgaXMgYWJicmV2aWF0ZWQgYXMgXCIuLi5cIiBhbmQgXCJDaXJjdWxhclwiXG4gKiAgaW4gY2FzZSBvZiBkZXB0aCBleGhhdXN0aW9uIGFuZCBjaXJjdWxhciByZWZlcmVuY2UsIHJlc3BlY3RpdmVseS5cbiAqICBGdW5jdGlvbnMgYXJlIG5haXZlbHkgc3RyaW5naWZpZWQuXG4gKiAgQHBhcmFtIHtBbnl9IHRhcmdldCBPYmplY3QgdG8gc2VyaWFsaXplLlxuICogIEBwYXJhbSB7aW50ZWdlcn0gZGVwdGg9MyBEZXB0aCBsaW1pdC5cbiAqICBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5mdW5jdGlvbiBleHBsYWluKCBpdGVtLCBvcHRpb25zPXt9LCBwYXRoPSckJywgc2Vlbj1uZXcgQW5ub3RhdGVkU2V0KCkgKSB7XG4gICAgLy8gc2ltcGxlIHR5cGVzXG4gICAgcmV0dXJuIF9leHBsYWluKCBpdGVtLCBvcHRpb25zLmRlcHRoIHx8IDMsIG9wdGlvbnMsIHBhdGgsIHNlZW4gKTtcbn1cblxuZnVuY3Rpb24gX2V4cGxhaW4oaXRlbSwgZGVwdGgsIG9wdGlvbnMsIHBhdGgsIHNlZW4pIHtcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKVxuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoaXRlbSk7IC8vIGRvbid0IHdhbnQgdG8gc3BlbmQgdGltZSBxb3V0aW5nXG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgaXRlbSA9PT0gJ2Jvb2xlYW4nIHx8IGl0ZW0gPT09IG51bGwpXG4gICAgICAgIHJldHVybiAnJytpdGVtO1xuICAgIGlmIChpdGVtID09PSB1bmRlZmluZWQpIHJldHVybiAnPHVuZGVmPic7XG4gICAgaWYgKHR5cGVvZiBpdGVtICE9PSAnb2JqZWN0JykgLy8gbWF5YmUgZnVuY3Rpb25cbiAgICAgICAgcmV0dXJuICcnK2l0ZW07IC8vIFRPRE8gZG9uJ3QgcHJpbnQgb3V0IGEgbG9uZyBmdW5jdGlvbidzIGJvZHlcblxuICAgIC8vIHJlY3Vyc2VcbiAgICBjb25zdCB3aGVyZVNlZW4gPSBzZWVuLmhhcyhpdGVtKTtcbiAgICBpZiAod2hlcmVTZWVuKSB7XG4gICAgICAgIGNvbnN0IG5vdGUgPSAnQ2lyY3VsYXI9Jyt3aGVyZVNlZW47XG4gICAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KGl0ZW0pPydbICcrbm90ZSsnIF0nOid7ICcrbm90ZSsnIH0nO1xuICAgIH07XG4gICAgc2VlbiA9IHNlZW4uYWRkKCBpdGVtLCBwYXRoICk7IC8vIGNsb25lcyBzZWVuXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShpdGVtKSkge1xuICAgICAgICBpZiAoZGVwdGggPCAxKVxuICAgICAgICAgICAgcmV0dXJuICdbLi4uXSc7XG4gICAgICAgIHNlZW4uYWRkKGl0ZW0pO1xuICAgICAgICAvLyBUT0RPIDx4IGVtcHR5IGl0ZW1zPlxuICAgICAgICBjb25zdCBsaXN0ID0gaXRlbS5tYXAoXG4gICAgICAgICAgICAodmFsLCBpbmRleCkgPT4gX2V4cGxhaW4odmFsLCBkZXB0aC0xLCBvcHRpb25zLCBwYXRoKydbJytpbmRleCsnXScsIHNlZW4pXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiAnWycrbGlzdC5qb2luKCcsICcpKyddJzsgLy8gVE9ETyBjb25maWd1cmFibGUgd2hpdGVzcGFjZVxuICAgIH1cblxuICAgIGNvbnN0IHR5cGUgPSBpdGVtLmNvbnN0cnVjdG9yICYmIGl0ZW0uY29uc3RydWN0b3IubmFtZTtcbiAgICBjb25zdCBwcmVmaXggPSB0eXBlICYmIHR5cGUgIT09ICdPYmplY3QnID8gdHlwZSArICcgJyA6ICcnO1xuICAgIGlmIChkZXB0aCA8IDEpXG4gICAgICAgIHJldHVybiBwcmVmaXggKyAney4uLn0nO1xuICAgIGNvbnN0IGxpc3QgPSBPYmplY3Qua2V5cyhpdGVtKS5zb3J0KCkubWFwKCBrZXkgPT4ge1xuICAgICAgICBjb25zdCBpbmRleCA9IEpTT04uc3RyaW5naWZ5KGtleSk7XG4gICAgICAgIHJldHVybiBpbmRleCtcIjpcIitfZXhwbGFpbihpdGVtW2tleV0sIGRlcHRoLTEsIG9wdGlvbnMsIHBhdGgrJ1snK2luZGV4KyddJywgc2Vlbik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByZWZpeCArICd7JyArIGxpc3Quam9pbihcIiwgXCIpICsgJ30nO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgY2FsbGVySW5mbywgZXhwbGFpbiB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBTZWUgYWxzbyBub3RlZC1zZXQuanNcblxuY2xhc3MgQW5ub3RhdGVkU2V0IHtcbiAgICBjb25zdHJ1Y3RvcihhbGw9bmV3IFNldCgpLCBub3Rlcz1bXSkge1xuICAgICAgICB0aGlzLmFsbCAgID0gYWxsO1xuICAgICAgICB0aGlzLm5vdGVzID0gbm90ZXM7XG4gICAgfVxuICAgIGFkZCggaXRlbSwgbm90ZSApIHtcbiAgICAgICAgaWYgKHRoaXMuYWxsLmhhcyhpdGVtKSlcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICByZXR1cm4gbmV3IEFubm90YXRlZFNldChcbiAgICAgICAgICAgIG5ldyBTZXQodGhpcy5hbGwpLmFkZChpdGVtKSxcbiAgICAgICAgICAgIFsgLi4udGhpcy5ub3RlcywgWyBpdGVtLCBub3RlIF0gXVxuICAgICAgICApO1xuICAgIH1cbiAgICBoYXMoIGl0ZW0gKSB7XG4gICAgICAgIGlmICghdGhpcy5hbGwuaGFzKCBpdGVtICkpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIGZvciAobGV0IHBhaXIgb2YgdGhpcy5ub3Rlcykge1xuICAgICAgICAgICAgaWYgKHBhaXJbMF0gPT09IGl0ZW0pXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhaXJbMV07XG4gICAgICAgIH07XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignd3RmLCB1bnJlYWNoYWJsZScpO1xuICAgIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHsgQW5ub3RhdGVkU2V0IH07XG4iXX0=
