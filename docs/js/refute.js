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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9yZWZ1dGUuanMiLCJsaWIvcmVmdXRlL2NvbmQvYXJyYXkuanMiLCJsaWIvcmVmdXRlL2NvbmQvYmFzaWMuanMiLCJsaWIvcmVmdXRlL2NvbmQvZGVlcC5qcyIsImxpYi9yZWZ1dGUvcmVwb3J0LmpzIiwibGliL3JlZnV0ZS91dGlsLmpzIiwibGliL3JlZnV0ZS91dGlsL2Fubm90YXRlZC1zZXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3b0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0JztcblxuLy8gdGhlIGNvcmUgKHNob3VsZCBleHBsYWluIGV2ZW4gYmUgdGhlcmU/KVxuY29uc3QgeyBSZXBvcnQsIGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9ID0gcmVxdWlyZSAoJy4vcmVmdXRlL3JlcG9ydC5qcycpO1xuXG4vLyBUT0RPIGFkZCBlaWZmZWwtc3R5bGUgZGVzaWduLWJ5LWNvbnRyYWN0XG5cbi8vIGltcG9ydCBkZWZhdWx0IGNvbmRpdGlvbiBhcnNlbmFsXG5yZXF1aXJlKCAnLi9yZWZ1dGUvY29uZC9iYXNpYy5qcycgKTtcbnJlcXVpcmUoICcuL3JlZnV0ZS9jb25kL2FycmF5LmpzJyApO1xucmVxdWlyZSggJy4vcmVmdXRlL2NvbmQvZGVlcC5qcycgKTtcblxuY29uc3QgZ2V0UmVwb3J0ID0gKC4uLmFyZ3MpID0+IG5ldyBSZXBvcnQoKS5ydW4oLi4uYXJncykuZG9uZSgpO1xuXG4vLyBBbGxvdyBjcmVhdGluZyBtdWx0aXBsZSBwYXJhbGxlbCBjb25maWd1cmF0aW9ucyBvZiByZWZ1dGVcbi8vIGUuZy4gb25lIHN0cmljdCAodGhyb3dpbmcgZXJyb3JzKSBhbmQgb3RoZXIgbGF4IChqdXN0IGRlYnVnZ2luZyB0byBjb25zb2xlKVxuZnVuY3Rpb24gc2V0dXAoIG9wdGlvbnM9e30sIG9yaWcgKSB7XG4gICAgLy8gVE9ETyB2YWxpZGF0ZSBvcHRpb25zXG4gICAgY29uc3Qgb25GYWlsID0gb3B0aW9ucy5vbkZhaWwgfHwgKHJlcCA9PiB7IHRocm93IG5ldyBFcnJvcihyZXAudG9TdHJpbmcoKSkgfSk7XG5cbiAgICBjb25zdCByZWZ1dGUgPSBvcHRpb25zLnNraXBcbiAgICAgICAgPyAoKT0+e31cbiAgICAgICAgOiAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgY29uc3Qgb2sgPSBuZXcgUmVwb3J0KCk7XG4gICAgICAgICAgICBvay5vbkRvbmUoIHggPT4geyBpZiggIXguZ2V0UGFzcygpICkgb25GYWlsKHgsIGFyZ3MpIH0gKTtcbiAgICAgICAgICAgIG9rLnJ1biguLi5hcmdzKTtcbiAgICAgICAgICAgIG9rLmRvbmUoKTtcbiAgICAgICAgfTtcblxuICAgIC8vIHJlZXhwb3J0IGFsbCBmcm9tIHJlcG9ydC5qc1xuICAgIHJlZnV0ZS5SZXBvcnQgPSBSZXBvcnQ7XG4gICAgcmVmdXRlLmV4cGxhaW4gPSBleHBsYWluO1xuICAgIHJlZnV0ZS5hZGRDb25kaXRpb24gPSBhZGRDb25kaXRpb247XG5cbiAgICAvLyBzaG9ydGN1dCB0byB2YWxpZGF0aW5nICYgcmV0dXJuaW5nIGEgZnJlc2ggY29udHJhY3RcbiAgICAvLyBUT0RPIHJlbmFtZSB0byBhdm9pZCBuYW1lIGNsYXNoIHdpdGggdGhlIGNsYXNzXG4gICAgLy8gKGV2YWw/KVxuICAgIHJlZnV0ZS5yZXBvcnQgPSBnZXRSZXBvcnQ7XG5cbiAgICAvLyByZWZ1dGUuY29uZih7Li4ufSkgd2lsbCBnZW5lcmF0ZSBhIF9uZXdfIHJlZnV0ZVxuICAgIHJlZnV0ZS5jb25maWcgPSB1cGRhdGUgPT4gc2V0dXAoIHsgLi4ub3B0aW9ucywgLi4udXBkYXRlIH0sIHJlZnV0ZSApO1xuXG4gICAgLy8gYWRkIGRlc2lnbi1ieS1jb250cmFjdFxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSggcmVmdXRlLCAnZGJjJywgeyBnZXQ6ICgpPT5uZXcgREJDKCkgfSApO1xuXG4gICAgLy8gVE9ETyB0aGlzIGlzIHN0dXBpZCwgY29tZSB1cCB3aXRoIHNtdGggYmV0dGVyXG4gICAgLy8gd2hlbiBpbiBicm93c2VyLCB3aW5kb3cucmVmdXRlLmNvbmZpZygpIHVwZGF0ZXMgd2luZG93LnJlZnV0ZSBpdHNlbGZcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgb3JpZyA9PT0gd2luZG93LnJlZnV0ZSlcbiAgICAgICAgd2luZG93LnJlZnV0ZSA9IHJlZnV0ZTtcblxuICAgIHJldHVybiByZWZ1dGU7XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJylcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHNldHVwKCk7XG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgd2luZG93LnJlZnV0ZSA9IHNldHVwKCk7IC8vIFRPRE8gY2hlY2sgcHJlZXhpc3RpbmdcblxuLyoqXG4gKiAgIEBuYW1lc3BhY2UgcmVmdXRlXG4gKiAgIEBkZXNjICAgRnVuY3Rpb25zIGV4cG9ydGVkIGJ5IHJlZnV0ZSBtYWluIG1vZHVsZS5cbiAqL1xuXG4vKipcbiAqICAgQHB1YmxpY1xuICogICBAbWVtYmVyT2YgcmVmdXRlXG4gKiAgIEBmdW5jdGlvbiByZWZ1dGVcbiAqICAgQHBhcmFtIHtBbnl9IFsuLi5saXN0XSBEYXRhIHRvIGZlZWQgdG8gdGhlIGNhbGxiYWNrXG4gKiAgIEBwYXJhbSB7Q29udHJhY3R9IGNvbnRyYWN0IEEgY29kZSBibG9jayB3aXRoIGNoZWNrcy5cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH0gUmV0dXJuIHZhbHVlIGlzIGlnbm9yZWQuXG4gKiAgIEB0aHJvd3Mge0Vycm9yfSBJZiBvbmUgb3IgbW9yZSBjaGVja3MgYXJlIGZhaWxpbmcsIGFuIGV4Y2VwdGlvbiBpcyB0aHJvd25cbiAqICAgd2l0aCBkZXRhaWxzIGFib3V0IGFsbCBwYXNzaW5nL2ZhaWxpbmcgY2hlY2tzLlxuICogICBUaGlzIGFjdGlvbiBjYW4gYmUgY2hhbmdlZCB2aWEgcmVmdXRlLmNvbmZpZygpIGNhbGwuXG4gKlxuICovXG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIFJlcG9ydCB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcblxuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGZvckVhY2hcbiAqICAgQGRlc2MgIENoZWNrcyB0aGF0IGEgbmVzdGVkIGNvbnRyYWN0IGhvbGRzIGZvciBlYWNoIGVsZW1lbnQgb2YgYW4gYXJyYXkuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBkZXNjcmlwdGlvblxuICogICBAcGFyYW0ge0FycmF5fSBhcnJheSBMaXN0IG9mIGl0ZW1zLlxuICogICBAcGFyYW0ge0NvbnRyYWN0fSBuZXN0ZWQgRmlyc3QgYXJndW1lbnQgZ2l2ZW4gdG8gdGhlIGNhbGxiYWNrXG4gKiAgIGlzIGEgUmVwb3J0IG9iamVjdCwgYW5kIHRoZSBzZWNvbmQgb25lIGlzIHRoZSBhcnJheSBpdGVtIGluIHF1ZXN0aW9uLlxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5cbmFkZENvbmRpdGlvbihcbiAgICAnZm9yRWFjaCcsXG4gICAge2Z1bjoxLGFyZ3M6Mn0sXG4gICAgKGxpc3QsIGNvbnRyYWN0KSA9PiB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSlcbiAgICAgICAgICAgIHJldHVybiAnRXhwZWN0ZWQgYSBsaXN0LCBmb3VuZCBhICcudHlwZW9mKGxpc3QpO1xuICAgICAgICBpZiAobGlzdC5sZW5ndGggPCAxKVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGF1dG8tcGFzc1xuXG4gICAgICAgIGNvbnN0IG9rID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICBsaXN0LmZvckVhY2goIChpdGVtLCBpbmRleCkgPT4gb2submVzdGVkKCBcIml0ZW0gXCIraW5kZXgsIGl0ZW0sIGNvbnRyYWN0ICkgKTtcbiAgICAgICAgcmV0dXJuIG9rLmRvbmUoKTtcbiAgICB9XG4pO1xuXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2Qgb3JkZXJlZFxuICogICBAZGVzYyAgQ2hlY2tzIHRoYXQgYSBuZXN0ZWQgY29udHJhY3QgaG9sZHMgZm9yIGVhY2ggcGFpclxuICogICBvZiBhZGphY2VudCBlbGVtZW50IG9mIGFuIGFycmF5IChpLmUuIDEmMiwgMiYzLCAzJjQsIC4uLikuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBkZXNjcmlwdGlvblxuICogICBAcGFyYW0ge0FycmF5fSBhcnJheSBMaXN0IG9mIGl0ZW1zLlxuICogICBAcGFyYW0ge0NvbnRyYWN0fSBuZXN0ZWQgRmlyc3QgYXJndW1lbnQgZ2l2ZW4gdG8gdGhlIGNhbGxiYWNrXG4gKiAgIGlzIGEgUmVwb3J0IG9iamVjdCwgYW5kIHRoZSBzZWNvbmQgYW5kIHRoaXJkIG9uZXNcbiAqICAgYXJlIHRoZSBhcnJheSBpdGVtcyBpbiBxdWVzdGlvbi5cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuXG4vLyBUT0RPIHRoaXMgaXMgY2FsbGVkIFwiY29tcGxpYW50IGNoYWluXCIgYnV0IGJldHRlciBqdXN0IHNheSBoZXJlXG4vLyBcIm9oIHdlJ3JlIGNoZWNraW5nIGVsZW1lbnQgb3JkZXJcIlxuYWRkQ29uZGl0aW9uKFxuICAgICdvcmRlcmVkJywgLy8gVE9ETyBiZXR0ZXIgbmFtZT8gcGFpcndpc2U/IHJlZHVjZT9cbiAgICB7ZnVuOjEsYXJnczoyfSxcbiAgICAobGlzdCwgY29udHJhY3QpID0+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKVxuICAgICAgICAgICAgcmV0dXJuICdFeHBlY3RlZCBhIGxpc3QsIGZvdW5kIGEgJy50eXBlb2YobGlzdCk7XG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA8IDIpXG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gYXV0by1wYXNzXG5cbiAgICAgICAgY29uc3Qgb2sgPSBuZXcgUmVwb3J0KCk7XG4gICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgbGlzdC5sZW5ndGgtMTsgbisrKSB7XG4gICAgICAgICAgICBvay5uZXN0ZWQoIFwiaXRlbXMgXCIrbitcIiwgXCIrKG4rMSksIGxpc3Rbbl0sIGxpc3RbbisxXSwgY29udHJhY3QpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvay5kb25lKCk7XG4gICAgfVxuKTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgcmVwb3J0LCBleHBsYWluIH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuY29uc3QgT0sgPSBmYWxzZTtcblxuY29uc3QgY21wTnVtID0ge1xuICAgICc8JyA6ICh4LHkpPT4oeCAgPCB5KSxcbiAgICAnPicgOiAoeCx5KT0+KHggID4geSksXG4gICAgJzw9JzogKHgseSk9Pih4IDw9IHkpLFxuICAgICc+PSc6ICh4LHkpPT4oeCA+PSB5KSxcbiAgICAnPT0nOiAoeCx5KT0+KHggPT09IHkpLFxuICAgICchPSc6ICh4LHkpPT4oeCAhPT0geSksXG59O1xuXG4vLyB1c2UgIT0gYW5kIG5vdCAhPT0gZGVsaWJlcmF0ZWx5IHRvIGZpbHRlciBvdXQgbnVsbCAmIHVuZGVmaW5lZFxuY29uc3QgY21wU3RyID0ge1xuICAgICc8JyA6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCAgPCAnJyt5KSxcbiAgICAnPicgOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggID4gJycreSksXG4gICAgJzw9JzogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4IDw9ICcnK3kpLFxuICAgICc+PSc6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCA+PSAnJyt5KSxcblxuICAgICc9PSc6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCA9PT0gJycreSksXG4gICAgJyE9JzogKHgseSk9PigoeCA9PSB1bmRlZmluZWQpXih5ID09IHVuZGVmaW5lZCkpIHx8ICgnJyt4ICE9PSAnJyt5KSxcbn07XG5cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBjbXBOdW1cbiAqICAgQGRlc2MgIENoZWNrcyBpZiBhIHJlbGF0aW9uIGluZGVlZCBob2xkcyBiZXR3ZWVuIGFyZ3VtZW50cy5cbiAqICAgICAgICAgIFNlZSBhbHNvIHtAbGluayBjbXBTdHJ9XG4gKiAgIEBwYXJhbSB7YW55fSBhcmcxICAgIEZpcnN0IGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBvcGVyYXRpb24gIE9uZSBvZiAnPCcsICc8PScsICc9PScsICchPScsICc+PScsIG9yICc+J1xuICogICBAcGFyYW0ge2FueX0gYXJnMiAgICBTZWNvbmQgYXJndW1lbnRcbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGNtcFN0clxuICogICBAZGVzYyAgQ2hlY2tzIGlmIGEgcmVsYXRpb24gaW5kZWVkIGhvbGRzIGJldHdlZW4gYXJndW1lbnRzLFxuICogICAgICAgICAgYXNzdW1pbmcgdGhleSBhcmUgc3RyaW5ncy5cbiAqICAgICAgICAgIFNlZSBhbHNvIHtAbGluayBjbXBOdW19XG4gKiAgIEBwYXJhbSB7YW55fSBhcmcxICAgIEZpcnN0IGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBvcGVyYXRpb24gIE9uZSBvZiAnPCcsICc8PScsICc9PScsICchPScsICc+PScsIG9yICc+J1xuICogICBAcGFyYW0ge2FueX0gYXJnMiAgICBTZWNvbmQgYXJndW1lbnRcbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuXG5hZGRDb25kaXRpb24oXG4gICAgJ2NtcE51bScsXG4gICAge2FyZ3M6M30sXG4gICAgKHgsb3AseSkgPT4gY21wTnVtW29wXSh4LHkpPzA6W3gsXCJpcyBub3QgXCIrb3AseV1cbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ2NtcFN0cicsXG4gICAge2FyZ3M6M30sXG4gICAgKHgsb3AseSkgPT4gY21wU3RyW29wXSh4LHkpPzA6W3gsXCJpcyBub3QgXCIrb3AseV1cbik7XG5cbmNvbnN0IHR5cGVDaGVjayA9IHtcbiAgICB1bmRlZmluZWQ6IHggPT4geCA9PT0gdW5kZWZpbmVkLFxuICAgIG51bGw6ICAgICAgeCA9PiB4ID09PSBudWxsLFxuICAgIG51bWJlcjogICAgeCA9PiB0eXBlb2YgeCA9PT0gJ251bWJlcicgJiYgIU51bWJlci5pc05hTih4KSxcbiAgICBpbnRlZ2VyOiAgIHggPT4gTnVtYmVyLmlzSW50ZWdlcih4KSxcbiAgICBuYW46ICAgICAgIHggPT4gTnVtYmVyLmlzTmFOKHgpLFxuICAgIHN0cmluZzogICAgeCA9PiB0eXBlb2YgeCA9PT0gJ3N0cmluZycsXG4gICAgZnVuY3Rpb246ICB4ID0+IHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nLFxuICAgIGJvb2xlYW46ICAgeCA9PiB0eXBlb2YgeCA9PT0gJ2Jvb2xlYW4nLFxuICAgIG9iamVjdDogICAgeCA9PiB4ICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh4KSxcbiAgICBhcnJheTogICAgIHggPT4gQXJyYXkuaXNBcnJheSh4KSxcbn07XG5mdW5jdGlvbiB0eXBlRXhwbGFpbiAoeCkge1xuICAgIGlmICh0eXBlb2YgeCA9PT0gJ3N0cmluZycpXG4gICAgICAgIHJldHVybiB4O1xuICAgIGlmICh0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgcmV0dXJuICdpbnN0YW5jZW9mICcrKHgubmFtZSB8fCB4KTtcbn07XG5cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCB0eXBlXG4gKiAgIEBkZXNjICBDaGVja3MgdGhhdCBhIHZhbHVlIGlzIG9mIHRoZSBzcGVjaWZpZWQgdHlwZS5cbiAqICAgQHBhcmFtIHthbnl9IHZhbHVlICAgIEZpcnN0IGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfGZ1bmN0aW9ufEFycmF5fSB0eXBlXG4gKiAgICAgICBPbmUgb2YgJ3VuZGVmaW5lZCcsICdudWxsJywgJ251bWJlcicsICdpbnRlZ2VyJywgJ25hbicsICdzdHJpbmcnLFxuICogICAgICAgJ2Jvb2xlYW4nLCAnb2JqZWN0JywgJ2FycmF5JywgYSBjbGFzcywgb3IgYW4gYXJyYXkgY29udGFpbmluZyAxIG9yIG1vcmVcbiAqICAgICAgIG9mIHRoZSBhYm92ZS4gJ251bWJlcicvJ2ludGVnZXInIGRvbid0IGluY2x1ZGUgTmFOLFxuICogICAgICAgYW5kICdvYmplY3QnIGRvZXNuJ3QgaW5jbHVkZSBhcnJheXMuXG4gKiAgICAgICBBIGZ1bmN0aW9uIGltcGxpZXMgYW4gb2JqZWN0IGFuZCBhbiBpbnN0YW5jZW9mIGNoZWNrLlxuICogICAgICAgQXJyYXkgbWVhbnMgYW55IG9mIHRoZSBzcGVjaWZpZWQgdHlwZXMgKGFrYSBzdW0gb2YgdHlwZXMpLlxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5hZGRDb25kaXRpb24oXG4gICAgJ3R5cGUnLFxuICAgIHthcmdzOiAyfSxcbiAgICAoZ290LCBleHApPT57XG4gICAgICAgIGlmICggIUFycmF5LmlzQXJyYXkoZXhwKSApXG4gICAgICAgICAgICBleHAgPSBbZXhwXTtcblxuICAgICAgICBmb3IgKGxldCB2YXJpYW50IG9mIGV4cCkge1xuICAgICAgICAgICAgLy8ga25vd24gdHlwZVxuICAgICAgICAgICAgaWYoIHR5cGVvZiB2YXJpYW50ID09PSAnc3RyaW5nJyAmJiB0eXBlQ2hlY2tbdmFyaWFudF0gKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVDaGVja1t2YXJpYW50XShnb3QpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gT0s7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBpbnN0YW5jZW9mXG4gICAgICAgICAgICBpZiggdHlwZW9mIHZhcmlhbnQgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGdvdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBpZiggZ290IGluc3RhbmNlb2YgdmFyaWFudCApXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPSztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGRvbid0IGtub3cgd2hhdCB5b3UncmUgYXNraW5nIGZvclxuICAgICAgICAgICAgcmV0dXJuICd1bmtub3duIHZhbHVlIHR5cGUgc3BlYzogJytleHBsYWluKHZhcmlhbnQsIDEpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgJy0gJytleHBsYWluKGdvdCwgMSksXG4gICAgICAgICAgICAnKyAnK2V4cC5tYXAoIHR5cGVFeHBsYWluICkuam9pbihcIiBvciBcIiksXG4gICAgICAgIF07XG4gICAgfVxuKTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcbmNvbnN0IHsgQW5ub3RhdGVkU2V0IH0gPSByZXF1aXJlKCAnLi4vdXRpbC9hbm5vdGF0ZWQtc2V0LmpzJyApO1xuXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgZGVlcEVxdWFsXG4gKiAgIEBkZXNjIENvbXBhcmVzIHR3byBzdHJ1Y3R1cmVzLCBvdXRwdXRzIGRpZmYgaWYgZGlmZmVyZW5jZXMgZm91bmQuXG4gKiAgIEBwYXJhbSB7YW55fSBhY3R1YWwgICAgRmlyc3Qgc3RydWN0dXJlXG4gKiAgIEBwYXJhbSB7YW55fSBleHBlY3RlZCAgU3RydWN0dXJlIHRvIGNvbXBhcmUgdG9cbiAqICAgQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogICBAcGFyYW0ge251bWJlcn0gb3B0aW9ucy5tYXggaG93IG1hbnkgZGlmZmVyZW5jZXMgdG8gb3V0cHV0IChkZWZhdWx0IDUpXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbmFkZENvbmRpdGlvbiggJ2RlZXBFcXVhbCcsIHtcImFyZ3NcIjoyLGhhc09wdGlvbnM6dHJ1ZX0sIGRlZXAgKTtcblxuZnVuY3Rpb24gZGVlcCggZ290LCBleHAsIG9wdGlvbnM9e30gKSB7XG4gICAgaWYgKCFvcHRpb25zLm1heClcbiAgICAgICAgb3B0aW9ucy5tYXggPSA1O1xuICAgIG9wdGlvbnMuZGlmZiA9IFtdO1xuICAgIF9kZWVwKCBnb3QsIGV4cCwgb3B0aW9ucyApO1xuICAgIGlmICghb3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgcmV0dXJuIDA7XG5cbiAgICBjb25zdCByZXQgPSBbXTtcbiAgICBmb3IgKGxldCBpdGVtIG9mIG9wdGlvbnMuZGlmZikge1xuICAgICAgICByZXQucHVzaCggXG4gICAgICAgICAgICBcImF0IFwiK2l0ZW1bMF0sXG4gICAgICAgICAgICBcIi0gXCIrKGl0ZW1bM10gPyBpdGVtWzFdIDogZXhwbGFpbiggaXRlbVsxXSwgMiApKSxcbiAgICAgICAgICAgIFwiKyBcIisoaXRlbVszXSA/IGl0ZW1bMl0gOiBleHBsYWluKCBpdGVtWzJdLCAyICkpLFxuICAgICAgICApO1xuICAgIH07XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbi8vIHJlc3VsdCBpcyBzdG9yZWQgaW4gb3B0aW9ucy5kaWZmPVtdLCByZXR1cm4gdmFsdWUgaXMgaWdub3JlZFxuLy8gaWYgc2FpZCBkaWZmIGV4Y2VlZHMgbWF4LCByZXR1cm4gaW1tZWRpYXRlbHkgJiBkb24ndCB3YXN0ZSB0aW1lXG5mdW5jdGlvbiBfZGVlcCggZ290LCBleHAsIG9wdGlvbnM9e30sIHBhdGg9JyQnLCBzZWVuTD1uZXcgQW5ub3RhdGVkU2V0KCksIHNlZW5SPW5ldyBBbm5vdGF0ZWRTZXQoKSApIHtcbiAgICBpZiAoZ290ID09PSBleHAgfHwgb3B0aW9ucy5tYXggPD0gb3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgcmV0dXJuO1xuICAgIGlmICh0eXBlb2YgZ290ICE9PSB0eXBlb2YgZXhwKVxuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG5cbiAgICAvLyByZWN1cnNlIGJ5IGV4cGVjdGVkIHZhbHVlIC0gY29uc2lkZXIgaXQgbW9yZSBwcmVkaWN0YWJsZVxuICAgIGlmICh0eXBlb2YgZXhwICE9PSAnb2JqZWN0JyB8fCBleHAgPT09IG51bGwgKSB7XG4gICAgICAgIC8vIG5vbi1vYmplY3RzIC0gc28gY2FuJ3QgZGVzY2VuZFxuICAgICAgICAvLyBhbmQgY29tcGFyaXNvbiBhbHJlYWR5IGRvbmUgYXQgdGhlIGJlZ2lubm5pbmdcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuICAgIH1cblxuICAgIC8vIG11c3QgZGV0ZWN0IGxvb3BzIGJlZm9yZSBnb2luZyBkb3duXG4gICAgY29uc3QgcGF0aEwgPSBzZWVuTC5oYXMoZ290KTtcbiAgICBjb25zdCBwYXRoUiA9IHNlZW5SLmhhcyhleHApO1xuICAgIGlmIChwYXRoTCB8fCBwYXRoUikge1xuICAgICAgICAvLyBMb29wIGRldGVjdGVkID0gb25seSBjaGVjayB0b3BvbG9neVxuICAgICAgICBpZiAocGF0aEwgPT09IHBhdGhSKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtcbiAgICAgICAgICAgIHBhdGggKyAnIChjaXJjdWxhciknLFxuICAgICAgICAgICAgcGF0aEwgPyAnQ2lyY3VsYXI9JytwYXRoTCA6IGV4cGxhaW4oZ290LCAyKSxcbiAgICAgICAgICAgIHBhdGhSID8gJ0NpcmN1bGFyPScrcGF0aFIgOiBleHBsYWluKGV4cCwgMiksXG4gICAgICAgICAgICB0cnVlIC8vIGRvbid0IHN0cmluZ2lmeVxuICAgICAgICBdKTtcbiAgICB9O1xuICAgIHNlZW5MID0gc2VlbkwuYWRkKGdvdCwgcGF0aCk7XG4gICAgc2VlblIgPSBzZWVuUi5hZGQoZXhwLCBwYXRoKTtcblxuICAgIC8vIGNvbXBhcmUgb2JqZWN0IHR5cGVzXG4gICAgLy8gKGlmIGEgdXNlciBpcyBzdHVwaWQgZW5vdWdoIHRvIG92ZXJyaWRlIGNvbnN0cnVjdG9yIGZpZWxkLCB3ZWxsIHRoZSB0ZXN0XG4gICAgLy8gd291bGQgZmFpbCBsYXRlciBhbnl3YXkpXG4gICAgaWYgKGdvdC5jb25zdHJ1Y3RvciAhPT0gZXhwLmNvbnN0cnVjdG9yKVxuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG5cbiAgICAvLyBhcnJheVxuICAgIGlmIChBcnJheS5pc0FycmF5KGV4cCkpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGdvdCkgfHwgZ290Lmxlbmd0aCAhPT0gZXhwLmxlbmd0aClcbiAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGV4cC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgX2RlZXAoIGdvdFtpXSwgZXhwW2ldLCBvcHRpb25zLCBwYXRoKydbJytpKyddJywgc2VlbkwsIHNlZW5SICk7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5tYXg8PW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybjtcbiAgICB9O1xuXG4gICAgLy8gY29tcGFyZSBrZXlzIC0gKzEgZm9yIGV4cCwgLTEgZm9yIGdvdCwgbm9uemVybyBrZXkgYXQgZW5kIG1lYW5zIGtleXMgZGlmZmVyXG4gICAgY29uc3QgdW5pcSA9IHt9O1xuICAgIE9iamVjdC5rZXlzKGV4cCkuZm9yRWFjaCggeCA9PiB1bmlxW3hdID0gMSApO1xuICAgIE9iamVjdC5rZXlzKGdvdCkuZm9yRWFjaCggeCA9PiB1bmlxW3hdID0gKHVuaXFbeF0gfHwgMCkgLSAxICk7XG4gICAgZm9yIChsZXQgeCBpbiB1bmlxKSB7XG4gICAgICAgIGlmICh1bmlxW3hdICE9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuICAgIH1cbiAgICBcbiAgICAvLyBub3cgdHlwZW9mLCBvYmplY3QgdHlwZSwgYW5kIG9iamVjdCBrZXlzIGFyZSB0aGUgc2FtZS5cbiAgICAvLyByZWN1cnNlLlxuICAgIGZvciAobGV0IGkgaW4gZXhwKSB7XG4gICAgICAgIF9kZWVwKCBnb3RbaV0sIGV4cFtpXSwgb3B0aW9ucywgcGF0aCsnWycrZXhwbGFpbihpKSsnXScsIHNlZW5MLCBzZWVuUiApO1xuICAgICAgICBpZiAob3B0aW9ucy5tYXg8PW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgICAgICBicmVhaztcbiAgICB9O1xuICAgIHJldHVybjtcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBjYWxsZXJJbmZvLCBleHBsYWluLCBtYWtlRXJyb3IgfSA9IHJlcXVpcmUoICcuL3V0aWwuanMnICk7XG5cbi8qKlxuICogICBAY2FsbGJhY2sgQ29udHJhY3RcbiAqICAgQGRlc2MgQSBjb2RlIGJsb2NrIGNvbnRhaW5pbmcgb25lIG9yIG1vcmUgY29uZGl0aW9uIGNoZWNrcy5cbiAqICAgQSBjaGVjayBpcyBwZXJmb3JtZWQgYnkgY2FsbGluZyBvbmUgb2YgYSBmZXcgc3BlY2lhbCBtZXRob2RzXG4gKiAgIChlcXVhbCwgbWF0Y2gsIGRlZXBFcXVhbCwgdHlwZSBldGMpXG4gKiAgIG9uIHRoZSBSZXBvcnQgb2JqZWN0LlxuICogICBDb250cmFjdHMgbWF5IGJlIG5lc3RlZCB1c2luZyB0aGUgJ25lc3RlZCcgbWV0aG9kIHdoaWNoIGFjY2VwdHNcbiAqICAgYW5vdGhlciBjb250cmFjdCBhbmQgcmVjb3JkcyBhIHBhc3MvZmFpbHVyZSBpbiB0aGUgcGFyZW50IGFjY29yZGluZ2x5LnFcbiAqICAgQSBjb250cmFjdCBpcyBhbHdheXMgZXhlY3V0ZWQgdG8gdGhlIGVuZC5cbiAqICAgQHBhcmFtIHtSZXBvcnR9IG9rIEFuIG9iamVjdCB0aGF0IHJlY29yZHMgY2hlY2sgcmVzdWx0cy5cbiAqICAgQHBhcmFtIHtBbnl9IFsuLi5saXN0XSBBZGRpdGlvbmFsIHBhcmFtZXRlcnNcbiAqICAgKGUuZy4gZGF0YSBzdHJ1Y3R1cmUgdG8gYmUgdmFsaWRhdGVkKVxuICogICBAcmV0dXJucyB7dm9pZH0gUmV0dXJuZWQgdmFsdWUgaXMgaWdub3JlZC5cbiAqL1xuXG4vKipcbiAqIEBwdWJsaWNcbiAqIEBjbGFzc2Rlc2NcbiAqIFRoZSBjb3JlIG9mIHRoZSByZWZ1dGUgbGlicmFyeSwgdGhlIHJlcG9ydCBvYmplY3QgY29udGFpbnMgaW5mb1xuICogYWJvdXQgcGFzc2luZyBhbmQgZmFpbGluZyBjb25kaXRpb25zLlxuICovXG5jbGFzcyBSZXBvcnQge1xuICAgIC8vIHNldHVwXG4gICAgLyoqXG4gICAgICogIEBkZXNjIE5vIGNvbnN0cnVjdG9yIGFyZ3VtZW50cyBzdXBwb3J0ZWQuXG4gICAgICogIENvbnRyYWN0cyBtYXkgbmVlZCB0byBiZSBzZXQgdXAgaW5zaWRlIGNhbGxiYWNrcyBfYWZ0ZXJfIGNyZWF0aW9uLFxuICAgICAqICBoZW5jZSB0aGlzIGNvbnZlbnRpb24uXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuX2NvdW50ICAgICA9IDA7XG4gICAgICAgIHRoaXMuX2ZhaWxDb3VudCA9IDA7XG4gICAgICAgIHRoaXMuX2Rlc2NyICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9ldmlkZW5jZSAgPSBbXTtcbiAgICAgICAgdGhpcy5fd2hlcmUgICAgID0gW107XG4gICAgICAgIHRoaXMuX2NvbmROYW1lICA9IFtdO1xuICAgICAgICB0aGlzLl9pbmZvICAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fbmVzdGVkICAgID0gW107XG4gICAgICAgIHRoaXMuX3BlbmRpbmcgICA9IG5ldyBTZXQoKTtcbiAgICAgICAgdGhpcy5fb25Eb25lICAgID0gW107XG4gICAgICAgIHRoaXMuX2RvbmUgICAgICA9IGZhbHNlO1xuICAgICAgICAvLyBUT0RPIGFkZCBjYWxsZXIgaW5mbyBhYm91dCB0aGUgcmVwb3J0IGl0c2VsZlxuICAgIH1cblxuICAgIC8vIFNldHVwIG1ldGhvZHMgZm9sbG93LiBUaGV5IG11c3QgYmUgY2hhaW5hYmxlLCBpLmUuIHJldHVybiB0aGlzLlxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBFeGVjdXRlIGNvZGUgd2hlbiBjb250cmFjdCBleGVjdXRpb24gZmluaXNoZXMuXG4gICAgICogICBSZXBvcnQgb2JqZWN0IGNhbm5vdCBiZSBtb2RpZmllZCBhdCB0aGlzIHBvaW50LFxuICAgICAqICAgYW5kIG5vIGFkZGl0aW9uYWwgY2hlY2tzIG15IGJlIHByZXNlbnQuXG4gICAgICogICBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIGZpcnN0IGFyZ3VtZW50IGlzIHJlcG9ydCBpbiBxdWVzdGlvblxuICAgICAqICAgQHJldHVybnMge1JlcG9ydH0gdGhpcyAoY2hhaW5hYmxlKVxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIHJlcG9ydC5vbkRvbmUoIHIgPT4geyBpZiAoIXIuZ2V0UGFzcygpKSBjb25zb2xlLmxvZyhyLnRvU3RyaW5nKCkpIH0gKVxuICAgICAqL1xuICAgIG9uRG9uZShmbikge1xuICAgICAgICBpZiggdHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nIClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignb25Eb25lKCk6IGNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIHRoaXMuX29uRG9uZS5wdXNoKGZuKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBFeGVjdXRlIGNvZGUgd2hlbiBjb250cmFjdCBleGVjdXRpb24gZmluaXNoZXMsIGlmIGl0IGZhaWxlZC5cbiAgICAgKiAgIFJlcG9ydCBvYmplY3QgY2Fubm90IGJlIG1vZGlmaWVkIGF0IHRoaXMgcG9pbnQsXG4gICAgICogICBhbmQgbm8gYWRkaXRpb25hbCBjaGVja3MgbXkgYmUgcHJlc2VudC5cbiAgICAgKiAgIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gZmlyc3QgYXJndW1lbnQgaXMgcmVwb3J0IGluIHF1ZXN0aW9uXG4gICAgICogICBAcmV0dXJucyB7UmVwb3J0fSB0aGlzIChjaGFpbmFibGUpXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgcmVwb3J0Lm9uRmFpbCggciA9PiBjb25zb2xlLmxvZyhyLnRvU3RyaW5nKCkpICk7XG4gICAgICovXG4gICAgb25GYWlsKGZuKSB7XG4gICAgICAgIGlmKCB0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicgKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdvbkRvbmUoKTogY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgIHRoaXMuX2xvY2soKTtcbiAgICAgICAgdGhpcy5fb25Eb25lLnB1c2gociA9PiByLmdldFBhc3MoKSB8fCBmbihyKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIFJ1bm5pbmcgdGhlIGNvbnRyYWN0XG4gICAgLyoqXG4gICAgICogICBAZGVzYyBhcHBseSBnaXZlbiBmdW5jdGlvbiB0byBhIFJlcG9ydCBvYmplY3QsIGxvY2sgcmVwb3J0IGFmdGVyd2FyZHMuXG4gICAgICogICBJZiBmdW5jdGlvbiBpcyBhc3luYyAoaS5lLiByZXR1cm5zIGEge0BsaW5rIFByb21pc2V9KSxcbiAgICAgKiAgIHRoZSByZXBvcnQgd2lsbCBvbmx5IGJlIGRvbmUoKSBhZnRlciB0aGUgcHJvbWlzZSByZXNvbHZlcy5cbiAgICAgKiAgIFRoaXMgaXMgZG9uZSBzbyB0byBlbnN1cmUgdGhhdCBhbGwgY2hlY2tzIHRoYXQgYXdhaXQgb24gYSB2YWx1ZVxuICAgICAqICAgYXJlIHJlc29sdmVkLlxuICAgICAqICAgQHBhcmFtIHtDb250cmFjdH0gY29udHJhY3QgVGhlIGZ1bmN0aW9uIHRvIGV4ZWN1dGVcbiAgICAgKiAgIEFkZGl0aW9uYWwgcGFyYW1ldGVycyBtYXkgYmUgX3ByZXBlbmRlZF8gdG8gY29udHJhY3RcbiAgICAgKiAgIGFuZCB3aWxsIGJlIHBhc3NlZCB0byBpdCBfYWZ0ZXJfIHRoZSBSZXBvcnQgb2JqZWN0IGluIHF1ZXN0aW9uLlxuICAgICAqICAgQHJldHVybnMge1JlcG9ydH0gdGhpcyAoY2hhaW5hYmxlKVxuICAgICAqICAgQGV4YW1wbGUgQmFzaWMgdXNhZ2VcbiAgICAgKiAgIGNvbnN0IHIgPSBuZXcgUmVwb3J0KCkucnVuKCBvayA9PiBvay5lcXVhbCggJ3dhcicsICdwZWFjZScsICcxOTg0JyApICk7XG4gICAgICogICByLmdldFBhc3MoKTsgLy8gZmFsc2VcbiAgICAgKiAgIHIuZ2V0RG9uZSgpOyAvLyB0cnVlXG4gICAgICogICByLnRvU3RyaW5nKCk7XG4gICAgICogICByKFxuICAgICAqICAgICAgITEuIDE5ODRcbiAgICAgKiAgICAgIC0gd2FyXG4gICAgICogICAgICArIHBlYWNlXG4gICAgICogICApXG4gICAgICpcbiAgICAgKiAgIEBleGFtcGxlIFBhc3NpbmcgYWRkaXRpb25hbCBhcmd1bWVudHMgdG8gY2FsbGJhY2suXG4gICAgICogICAvLyBUaGUgY29udHJhY3QgYm9keSBpcyB0aGUgbGFzdCBhcmd1bWVudC5cbiAgICAgKiAgIG5ldyBSZXBvcnQoKS5ydW4oIHsgdjogNC4yLCBjb2xvcnM6IFsgJ2JsdWUnIF0gfSwgKHIsIGFyZykgPT4ge1xuICAgICAqICAgICAgIHIudHlwZSggYXJnLCAnb2JqZWN0JyApO1xuICAgICAqICAgICAgIHIudHlwZSggYXJnLnYsICdudW1iZXInICk7XG4gICAgICogICAgICAgci5jbXBOdW0oIGFyZy52LCAnPj0nLCAzLjE0ICk7XG4gICAgICogICAgICAgci50eXBlKCBhcmcuY29sb3JzLCAnYXJyYXknICk7XG4gICAgICogICB9KTtcbiAgICAgKiAgIEBleGFtcGxlIEFzeW5jIGZ1bmN0aW9uXG4gICAgICogICBjb25zdCByID0gbmV3IFJlcG9ydCgpLnJ1bihcbiAgICAgKiAgICAgICBhc3luYyBvayA9PiBvay5lcXVhbCggYXdhaXQgNio5LCA0MiwgJ2ZhaWxzIGJ1dCBsYXRlcicgKSApO1xuICAgICAqICAgci5nZXRQYXNzKCk7IC8vIHRydWVcbiAgICAgKiAgIHIuZ2V0RG9uZSgpOyAvLyBmYWxzZVxuICAgICAqICAgLy8gLi4ud2FpdCBmb3IgZXZlbnQgbG9vcCB0byB0aWNrXG4gICAgICogICByLmdldFBhc3MoKTsgLy8gZmFsc2VcbiAgICAgKiAgIHIuZ2V0RG9uZSgpOyAvLyB0cnVlXG4gICAgICovXG4gICAgcnVuKC4uLmFyZ3MpIHtcbiAgICAgICAgLy8gVE9ETyBlaXRoZXIgYXN5bmMoKSBzaG91bGQgc3VwcG9ydCBhZGRpdGlvbmFsIGFyZ3MsIG9yIHJ1bigpIHNob3VsZG4ndFxuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIGNvbnN0IGJsb2NrID0gYXJncy5wb3AoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBibG9jayAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTGFzdCBhcmd1bWVudCBvZiBydW4oKSBtdXN0IGJlIGEgZnVuY3Rpb24sIG5vdCAnK3R5cGVvZihibG9jaykpO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBibG9jayggdGhpcywgLi4uYXJncyApO1xuICAgICAgICBpZiAocmVzdWx0IGluc3RhbmNlb2YgUHJvbWlzZSlcbiAgICAgICAgICAgIHJlc3VsdC50aGVuKCAoKSA9PiB0aGlzLmRvbmUoKSApO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICB0aGlzLmRvbmUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBhcHBseSBnaXZlbiBmdW5jdGlvbiAoY29udHJhY3QpIHRvIGEgUmVwb3J0IG9iamVjdC5cbiAgICAgKiAgIE11bHRpcGxlIHN1Y2ggY29udHJhdHMgbWF5IGJlIGFwcGxpZWQsIGFuZCB0aGUgcmVwb3J0IGlzIG5vdCBsb2NrZWQuXG4gICAgICogICBBc3luYyBmdW5jdGlvbiBhcmUgcGVybWl0dGVkIGJ1dCBtYXkgbm90IGJlaGF2ZSBhcyBleHBlY3RlZC5cbiAgICAgKiAgIEBwYXJhbSB7Q29udHJhY3R9IGNvbnRyYWN0IFRoZSBmdW5jdGlvbiB0byBleGVjdXRlXG4gICAgICogICBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgbWF5IGJlIF9wcmVwZW5kZWRfIHRvIGNvbnRyYWN0XG4gICAgICogICBhbmQgd2lsbCBiZSBwYXNzZWQgdG8gaXQgX2FmdGVyXyB0aGUgUmVwb3J0IG9iamVjdCBpbiBxdWVzdGlvbi5cbiAgICAgKiAgIEByZXR1cm5zIHtSZXBvcnR9IHRoaXMgKGNoYWluYWJsZSlcbiAgICAgKiAgIEBleGFtcGxlIEJhc2ljIHVzYWdlXG4gICAgICogICBjb25zdCByID0gbmV3IFJlcG9ydCgpXG4gICAgICogICAgICAgLnJ1blN5bmMoIG9rID0+IG9rLmVxdWFsKCAnd2FyJywgJ3BlYWNlJywgJzE5ODQnICkgKVxuICAgICAqICAgICAgIC5ydW5TeW5jKCBvayA9PiBvay50eXBlICggW10sICdhcnJheScsICdzb21lIG1vcmUgY2hlY2tzJyApIClcbiAgICAgKiAgICAgICAuZG9uZSgpO1xuICAgICAqL1xuICAgIHJ1blN5bmMoLi4uYXJncykge1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIGNvbnN0IGJsb2NrID0gYXJncy5wb3AoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBibG9jayAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTGFzdCBhcmd1bWVudCBvZiBydW4oKSBtdXN0IGJlIGEgZnVuY3Rpb24sIG5vdCAnK3R5cGVvZihibG9jaykpO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBibG9jayggdGhpcywgLi4uYXJncyApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBzZXRSZXN1bHQgKGV2aWRlbmNlLCBkZXNjciwgY29uZE5hbWUsIHdoZXJlKSB7XG4gICAgICAgIHRoaXMuX2xvY2soKTtcbiAgICAgICAgY29uc3QgbiA9ICsrdGhpcy5fY291bnQ7XG4gICAgICAgIGlmIChkZXNjcilcbiAgICAgICAgICAgIHRoaXMuX2Rlc2NyW25dID0gZGVzY3I7XG4gICAgICAgIC8vIHBhc3MgLSByZXR1cm4gQVNBUFxuICAgICAgICBpZiAoIWV2aWRlbmNlKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIC8vIG5lc3RlZCByZXBvcnQgbmVlZHMgc3BlY2lhbCBoYW5kbGluZ1xuICAgICAgICBpZiAoZXZpZGVuY2UgaW5zdGFuY2VvZiBSZXBvcnQpIHtcbiAgICAgICAgICAgIHRoaXMuX25lc3RlZFtuXSA9IGV2aWRlbmNlO1xuICAgICAgICAgICAgaWYgKGV2aWRlbmNlLmdldERvbmUoKSkge1xuICAgICAgICAgICAgICAgIGlmIChldmlkZW5jZS5nZXRQYXNzKCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjsgLy8gc2hvcnQtY2lyY3VpdCBpZiBwb3NzaWJsZVxuICAgICAgICAgICAgICAgIGV2aWRlbmNlID0gW107IC8vIGhhY2sgLSBmYWlsaW5nIHdpdGhvdXQgZXhwbGFuYXRpb25cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gbmVzdGVkIGNvbnRyYWN0IGlzIGluIGFzeW5jIG1vZGUgLSBjb2VyY2UgaW50byBhIHByb21pc2VcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyeSA9IGV2aWRlbmNlO1xuICAgICAgICAgICAgICAgIGV2aWRlbmNlID0gbmV3IFByb21pc2UoIGRvbmUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjdXJyeS5vbkRvbmUoIGRvbmUgKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHBlbmRpbmcgLSB3ZSdyZSBpbiBhc3luYyBtb2RlXG4gICAgICAgIGlmIChldmlkZW5jZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgIHRoaXMuX3BlbmRpbmcuYWRkKG4pO1xuICAgICAgICAgICAgd2hlcmUgPSB3aGVyZSB8fCBjYWxsZXJJbmZvKDIpOyAvLyBtdXN0IHJlcG9ydCBhY3R1YWwgY2FsbGVyLCBub3QgdGhlblxuICAgICAgICAgICAgZXZpZGVuY2UudGhlbiggeCA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5fcGVuZGluZy5kZWxldGUobik7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2V0UmVzdWx0KG4sIHgsIGNvbmROYW1lLCB3aGVyZSApO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmdldERvbmUoKSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5fb25Eb25lLmxlbmd0aDsgaS0tPjA7IClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX29uRG9uZVtpXSh0aGlzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0aGlzLl9zZXRSZXN1bHQobiwgZXZpZGVuY2UsIGNvbmROYW1lLCB3aGVyZSB8fCBjYWxsZXJJbmZvKDIpKTtcbiAgICB9XG5cbiAgICBfc2V0UmVzdWx0KG4sIGV2aWRlbmNlLCBjb25kTmFtZSwgd2hlcmUpIHtcbiAgICAgICAgaWYgKCFldmlkZW5jZSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBsaXN0aWZ5ICYgc3RyaW5naWZ5IGV2aWRlbmNlLCBzbyB0aGF0IGl0IGRvZXNuJ3QgY2hhbmdlIHBvc3QtZmFjdHVtXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShldmlkZW5jZSkpXG4gICAgICAgICAgICBldmlkZW5jZSA9IFsgZXZpZGVuY2UgXTtcbiAgICAgICAgdGhpcy5fZXZpZGVuY2Vbbl0gPSBldmlkZW5jZS5tYXAoIHg9Pl9leHBsYWluKHgsIEluZmluaXR5KSApO1xuICAgICAgICB0aGlzLl93aGVyZVtuXSAgICA9IHdoZXJlO1xuICAgICAgICB0aGlzLl9jb25kTmFtZVtuXSA9IGNvbmROYW1lO1xuICAgICAgICB0aGlzLl9mYWlsQ291bnQrKztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBBcHBlbmQgYW4gaW5mb3JtYXRpb25hbCBtZXNzYWdlIHRvIHRoZSByZXBvcnQuXG4gICAgICogTm9uLXN0cmluZyB2YWx1ZXMgd2lsbCBiZSBzdHJpbmdpZmllZCB2aWEgZXhwbGFpbigpLlxuICAgICAqIEBwYXJhbSB7QW55fSBtZXNzYWdlXG4gICAgICogQHJldHVybnMge1JlcG9ydH0gY2hhaW5hYmxlXG4gICAgICovXG4gICAgaW5mbyggLi4ubWVzc2FnZSApIHtcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICBpZiAoIXRoaXMuX2luZm9bdGhpcy5fY291bnRdKVxuICAgICAgICAgICAgdGhpcy5faW5mb1t0aGlzLl9jb3VudF0gPSBbXTtcbiAgICAgICAgdGhpcy5faW5mb1t0aGlzLl9jb3VudF0ucHVzaCggbWVzc2FnZS5tYXAoIHM9Pl9leHBsYWluKHMpICkuam9pbihcIiBcIikgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBMb2NrcyB0aGUgcmVwb3J0IG9iamVjdCwgc28gbm8gbW9kaWZpY2F0aW9ucyBtYXkgYmUgbWFkZSBsYXRlci5cbiAgICAgKiAgIEFsc28gaWYgb25Eb25lIGNhbGxiYWNrKHMpIGFyZSBwcmVzZW50LCB0aGV5IGFyZSBleGVjdXRlZFxuICAgICAqICAgdW5sZXNzIHRoZXJlIGFyZSBwZW5kaW5nIGFzeW5jIGNoZWNrcy5cbiAgICAgKiAgIEByZXR1cm5zIHtSZXBvcnR9IHRoaXMgKGNoYWluYWJsZSlcbiAgICAgKi9cbiAgICBkb25lKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2RvbmUpIHtcbiAgICAgICAgICAgIHRoaXMuX2RvbmUgPSB0cnVlO1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9wZW5kaW5nLnNpemUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5fb25Eb25lLmxlbmd0aDsgaS0tPjA7IClcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25Eb25lW2ldKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvLyBjaGVjayBpZiB0aGUgUmVwb3J0IG9iamVjdCBpcyBzdGlsbCBtb2RpZmlhYmxlLCB0aHJvd3Mgb3RoZXJ3aXNlLlxuICAgIF9sb2NrICgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RvbmUpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0F0dGVtcHQgdG8gbW9kaWZ5IGEgZmluaXNoZWQgY29udHJhY3QnKTtcbiAgICB9XG5cbiAgICAvLyBRdWVyeWluZyBtZXRob2RzXG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjICBUZWxscyB3aGV0aGVyIHRoZSByZXBvcnQgaXMgZmluaXNoZWQsXG4gICAgICogICAgICAgICAgaS5lLiBkb25lKCkgd2FzIGNhbGxlZCAmIG5vIHBlbmRpbmcgYXN5bmMgY2hlY2tzLlxuICAgICAqICAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0RG9uZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RvbmUgJiYgIXRoaXMuX3BlbmRpbmcuc2l6ZTsgLy8gaXMgaXQgZXZlbiBuZWVkZWQ/XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBXaXRob3V0IGFyZ3VtZW50IHJldHVybnMgd2hldGhlciB0aGUgY29udHJhY3Qgd2FzIGZ1bGZpbGxlZC5cbiAgICAgKiAgIEFzIGEgc3BlY2lhbCBjYXNlLCBpZiBubyBjaGVja3Mgd2VyZSBydW4gYW5kIHRoZSBjb250cmFjdCBpcyBmaW5pc2hlZCxcbiAgICAgKiAgIHJldHVybnMgZmFsc2UsIGFzIGluIFwic29tZW9uZSBtdXN0IGhhdmUgZm9yZ290dGVuIHRvIGV4ZWN1dGVcbiAgICAgKiAgIHBsYW5uZWQgY2hlY2tzLiBVc2UgcGFzcygpIGlmIG5vIGNoZWNrcyBhcmUgcGxhbm5lZC5cbiAgICAgKlxuICAgICAqICAgSWYgYSBwYXJhbWV0ZXIgaXMgZ2l2ZW4sIHJldHVybiB0aGUgc3RhdHVzIG9mIG4tdGggY2hlY2sgaW5zdGVhZC5cbiAgICAgKiAgIEBwYXJhbSB7aW50ZWdlcn0gblxuICAgICAqICAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0UGFzcyhuKSB7XG4gICAgICAgIGlmIChuID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZmFpbENvdW50ID09PSAwO1xuICAgICAgICByZXR1cm4gKG4gPiAwICYmIG4gPD0gdGhpcy5fY291bnQpID8gIXRoaXMuX2V2aWRlbmNlW25dIDogdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgTnVtYmVyIG9mIGNoZWNrcyBwZXJmb3JtZWQuXG4gICAgICogICBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldENvdW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY291bnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIFdoZXRoZXIgdGhlIGxhc3QgY2hlY2sgd2FzIGEgc3VjY2Vzcy5cbiAgICAgKiAgVGhpcyBpcyBqdXN0IGEgc2hvcnRjdXQgZm9yIGZvby5nZXREZXRhaWxzKGZvby5nZXRDb3VudCkucGFzc1xuICAgICAqICBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBsYXN0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY291bnQgPyAhdGhpcy5fZXZpZGVuY2VbdGhpcy5fY291bnRdIDogdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgTnVtYmVyIG9mIGNoZWNrcyBmYWlsaW5nLlxuICAgICAqICAgQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRGYWlsQ291bnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9mYWlsQ291bnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBSZXR1cm4gYSBzdHJpbmcgb2YgZmFpbGluZy9wYXNzaW5nIGNoZWNrcy5cbiAgICAgKiAgIFRoaXMgbWF5IGJlIHVzZWZ1bCBmb3IgdmFsaWRhdGluZyBjdXN0b20gY29uZGl0aW9ucy5cbiAgICAgKiAgIENvbnNlY3V0aXZlIHBhc3NpbmcgY2hlY2thIGFyZSByZXByZXNlbnRlZCBieSBudW1iZXJzLlxuICAgICAqICAgQSBjYXBpdGFsIGxldHRlciBpbiB0aGUgc3RyaW5nIHJlcHJlc2VudHMgZmFpbHVyZS5cbiAgICAgKiAgIFNlZSBhbHNvIHtAbGluayBSZXBvcnQjdG9TdHJpbmcgdG9TdHJpbmcoKX1cbiAgICAgKiAgIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgcGFzc2luZyBjaGVja3NcbiAgICAgKiAgIFwicigxMClcIlxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIGNoZWNrcyB3aXRoIDEgZmFpbHVyZSBpbiB0aGUgbWlkZGxlXG4gICAgICogICBcInIoNSxOLDQpXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBjaGVja3MgaW5jbHVkaW5nIGEgbmVzdGVkIGNvbnRyYWN0XG4gICAgICogICBcInIoMyxyKDEsTiksNilcIlxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIG5vIGNoZWNrcyB3ZXJlIHJ1biAtIGF1dG8tZmFpbFxuICAgICAqICAgXCJyKFopXCJcbiAgICAgKi9cbiAgICBnZXRHaG9zdCgpIHtcbiAgICAgICAgY29uc3QgZ2hvc3QgPSBbXTtcbiAgICAgICAgbGV0IHN0cmVhayA9IDA7XG4gICAgICAgIGZvciAobGV0IGk9MTsgaSA8PSB0aGlzLl9jb3VudDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fZXZpZGVuY2VbaV0gfHwgdGhpcy5fbmVzdGVkW2ldKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmVhaykgZ2hvc3QucHVzaChzdHJlYWspO1xuICAgICAgICAgICAgICAgIHN0cmVhayA9IDA7XG4gICAgICAgICAgICAgICAgZ2hvc3QucHVzaCggdGhpcy5fbmVzdGVkW2ldID8gdGhpcy5fbmVzdGVkW2ldLmdldEdob3N0KCkgOiAnTicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdHJlYWsrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RyZWFrKSBnaG9zdC5wdXNoKHN0cmVhayk7XG4gICAgICAgIHJldHVybiAncignK2dob3N0LmpvaW4oJywnKSsnKSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIFJldHVybnMgc2VyaWFsaXplZCBkaWZmLWxpa2UgcmVwb3J0IHdpdGggbmVzdGluZyBhbmQgaW5kZW50YXRpb24uXG4gICAgICogIFBhc3NpbmcgY29uZGl0aW9ucyBhcmUgbWVya2VkIHdpdGggbnVtYmVycywgZmFpbGluZyBhcmUgcHJlZml4ZWRcbiAgICAgKiAgd2l0aCBhIGJhbmcgKCEpLlxuICAgICAqXG4gICAgICogIFNlZSBhbHNvIHtAbGluayBSZXBvcnQjZ2V0R2hvc3QgZ2V0R2hvc3QoKX1cbiAgICAgKiAgQHJldHVybnMge3N0cmluZ31cbiAgICAgKiAgQGV4YW1wbGUgLy8gbm8gY2hlY2tzIHJ1blxuICAgICAqICBjb25zdCByID0gbmV3IFJlcG9ydCgpO1xuICAgICAqICByLnRvU3RyaW5nKCk7XG4gICAgICogIHIoXG4gICAgICogIClcbiAgICAgKiAgQGV4YW1wbGUgLy8gcGFzc1xuICAgICAqICBjb25zdCByID0gbmV3IFJlcG9ydCgpO1xuICAgICAqICByLnBhc3MoJ2ZvbyBiYXJlZCcpO1xuICAgICAqICByLnRvU3RyaW5nKCk7XG4gICAgICogIHIoXG4gICAgICogICAgICAxLiBmb28gYmFyZWRcbiAgICAgKiAgKVxuICAgICAqICBAZXhhbXBsZSAvLyBmYWlsXG4gICAgICogIGNvbnN0IHIgPSBuZXcgUmVwb3J0KCk7XG4gICAgICogIHIuZXF1YWwoJ3dhcicsICdwZWFjZScpO1xuICAgICAqICByLnRvU3RyaW5nKCk7XG4gICAgICogIHIoXG4gICAgICogICAgICAhMS5cbiAgICAgKiAgICAgIF4gQ29uZGl0aW9uIGVxdWFsIGZhaWxlZCBhdCA8ZmlsZT46PGxpbmU+OjxjaGFyPlxuICAgICAqICAgICAgLSB3YXJcbiAgICAgKiAgICAgICsgcGVhY2VcbiAgICAgKiAgKVxuICAgICAqL1xuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICAvLyBUT0RPIHByZXBlbmQgd2l0aCAncmVmdXRlL3Yvbi5ubidcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0TGluZXMoKS5qb2luKCdcXG4nKTtcbiAgICB9XG5cbiAgICBnZXRMaW5lcyhpbmRlbnQ9JycpIHtcbiAgICAgICAgY29uc3Qgb3V0ID0gW2luZGVudCArICdyKCddO1xuICAgICAgICBjb25zdCBsYXN0ID0gaW5kZW50ICsgJyknO1xuICAgICAgICBpbmRlbnQgPSBpbmRlbnQgKyAnICAgICc7XG5cbiAgICAgICAgY29uc3QgcGFkID0gcHJlZml4ID0+IHMgPT4gaW5kZW50ICsgcHJlZml4ICsgJyAnICsgcztcblxuICAgICAgICBpZiAodGhpcy5faW5mb1swXSlcbiAgICAgICAgICAgIG91dC5wdXNoKCAuLi50aGlzLl9pbmZvWzBdLm1hcCggcGFkKCc7JykgKSApO1xuICAgICAgICBmb3IgKGxldCBuID0gMTsgbjw9dGhpcy5fY291bnQ7IG4rKykge1xuICAgICAgICAgICAgb3V0LnB1c2goIC4uLnRoaXMuZ2V0TGluZXNQYXJ0aWFsKCBuLCBpbmRlbnQgKSApO1xuICAgICAgICAgICAgaWYgKHRoaXMuX2luZm9bbl0pXG4gICAgICAgICAgICAgICAgb3V0LnB1c2goIC4uLnRoaXMuX2luZm9bbl0ubWFwKCBwYWQoJzsnKSApICk7XG4gICAgICAgIH07XG4gICAgICAgIG91dC5wdXNoKGxhc3QpO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cblxuICAgIGdldExpbmVzUGFydGlhbChuLCBpbmRlbnQ9JycpIHtcbiAgICAgICAgY29uc3Qgb3V0ID0gW107XG4gICAgICAgIG91dC5wdXNoKFxuICAgICAgICAgICAgaW5kZW50XG4gICAgICAgICAgICArKHRoaXMuX3BlbmRpbmcuaGFzKG4pID8gJy4uLicgOiAodGhpcy5fZXZpZGVuY2Vbbl0gPyAnISc6JycpIClcbiAgICAgICAgICAgICtuKyh0aGlzLl9kZXNjcltuXSA/ICcuICcrdGhpcy5fZGVzY3Jbbl0gOiAnLicpXG4gICAgICAgICk7XG4gICAgICAgIGlmKCB0aGlzLl9uZXN0ZWRbbl0pIHtcbiAgICAgICAgICAgIG91dC5wdXNoKCAuLi50aGlzLl9uZXN0ZWRbbl0uZ2V0TGluZXMoaW5kZW50KSApO1xuICAgICAgICB9IGVsc2UgaWYoIHRoaXMuX2V2aWRlbmNlW25dICkge1xuICAgICAgICAgICAgb3V0LnB1c2goIGluZGVudCArICcgICAgXiBDb25kaXRpb24gYCcrKHRoaXMuX2NvbmROYW1lW25dIHx8ICdjaGVjaycpXG4gICAgICAgICAgICAgICAgKydgIGZhaWxlZCBhdCAnK3RoaXMuX3doZXJlW25dICk7XG4gICAgICAgICAgICB0aGlzLl9ldmlkZW5jZVtuXS5mb3JFYWNoKCByYXcgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBtdWx0aWxpbmUgZXZpZGVuY2VcbiAgICAgICAgICAgICAgICAvLyBUT0RPIHRoaXMgaXMgcGVybCB3cml0dGVuIGluIEpTLCByZXdyaXRlIG1vcmUgY2xlYXJseVxuICAgICAgICAgICAgICAgIGxldFsgXywgcHJlZml4LCBzIF0gPSByYXcubWF0Y2goIC9eKFstK3xdICk/KC4qPylcXG4/JC9zICk7XG4gICAgICAgICAgICAgICAgaWYgKCFwcmVmaXgpIHByZWZpeCA9ICd8ICc7XG4gICAgICAgICAgICAgICAgaWYgKCFzLm1hdGNoKC9cXG4vKSkge1xuICAgICAgICAgICAgICAgICAgICBvdXQucHVzaCggaW5kZW50ICsgJyAgICAnICsgcHJlZml4ICsgcyApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHMuc3BsaXQoJ1xcbicpLmZvckVhY2goXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0ID0+IG91dC5wdXNoKCBpbmRlbnQgKyAnICAgICcgKyBwcmVmaXggKyBwYXJ0ICkpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgcmV0dXJucyBhIHBsYWluIHNlcmlhbGl6YWJsZSBvYmplY3RcbiAgICAgKiAgQHJldHVybnMge09iamVjdH1cbiAgICAgKi9cbiAgICB0b0pTT04oKSB7XG4gICAgICAgIGNvbnN0IG4gPSB0aGlzLmdldENvdW50KCk7XG4gICAgICAgIGNvbnN0IGRldGFpbHMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGk8PW47IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuZ2V0RGV0YWlscyhpKTtcbiAgICAgICAgICAgIC8vIHN0cmlwIGV4dHJhIGtleXNcbiAgICAgICAgICAgIGZvciggbGV0IGtleSBpbiBub2RlICkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlW2tleV0gPT09IHVuZGVmaW5lZCB8fCAoQXJyYXkuaXNBcnJheShub2RlW2tleV0pICYmIG5vZGVba2V5XS5sZW5ndGggPT09IDApKVxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbm9kZVtrZXldO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChub2RlKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHBhc3M6ICB0aGlzLmdldFBhc3MoKSxcbiAgICAgICAgICAgIGNvdW50OiB0aGlzLmdldENvdW50KCksXG4gICAgICAgICAgICBkZXRhaWxzLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgUmV0dXJucyBkZXRhaWxlZCByZXBvcnQgb24gYSBzcGVjaWZpYyBjaGVja1xuICAgICAqICAgQHBhcmFtIHtpbnRlZ2VyfSBuIC0gY2hlY2sgbnVtYmVyLCBtdXN0IGJlIDw9IGdldENvdW50KClcbiAgICAgKiAgIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICovXG4gICAgZ2V0RGV0YWlscyhuKSB7XG4gICAgICAgIC8vIFRPRE8gdmFsaWRhdGUgblxuXG4gICAgICAgIC8vIHVnbHkgYnV0IHdoYXQgY2FuIEkgZG9cbiAgICAgICAgaWYgKG4gPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbjogICAgMCxcbiAgICAgICAgICAgICAgICBpbmZvOiB0aGlzLl9pbmZvWzBdIHx8IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBldmlkZW5jZSA9IHRoaXMuX2V2aWRlbmNlW25dO1xuICAgICAgICBpZiAoZXZpZGVuY2UgJiYgIUFycmF5LmlzQXJyYXkoZXZpZGVuY2UpKVxuICAgICAgICAgICAgZXZpZGVuY2UgPSBbZXZpZGVuY2VdO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuOiAgICAgICAgbixcbiAgICAgICAgICAgIG5hbWU6ICAgICB0aGlzLl9kZXNjcltuXSB8fCAnJyxcbiAgICAgICAgICAgIHBhc3M6ICAgICAhZXZpZGVuY2UsXG4gICAgICAgICAgICBldmlkZW5jZTogZXZpZGVuY2UgfHwgW10sXG4gICAgICAgICAgICB3aGVyZTogICAgdGhpcy5fd2hlcmVbbl0sXG4gICAgICAgICAgICBjb25kOiAgICAgdGhpcy5fY29uZE5hbWVbbl0sXG4gICAgICAgICAgICBpbmZvOiAgICAgdGhpcy5faW5mb1tuXSB8fCBbXSxcbiAgICAgICAgICAgIG5lc3RlZDogICB0aGlzLl9uZXN0ZWRbbl0sXG4gICAgICAgICAgICBwZW5kaW5nOiAgdGhpcy5fcGVuZGluZy5oYXMobiksXG4gICAgICAgIH07XG4gICAgfVxufVxuXG4vLyB0aGlzIGlzIGZvciBzdHVmZiBsaWtlIGBvYmplY3QgZm9vID0ge1wiZm9vXCI6NDJ9YFxuLy8gd2UgZG9uJ3Qgd2FudCB0aGUgZXhwbGFuYXRpb24gdG8gYmUgcXVvdGVkIVxuZnVuY3Rpb24gX2V4cGxhaW4oIGl0ZW0sIGRlcHRoICkge1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycgKVxuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICByZXR1cm4gZXhwbGFpbiggaXRlbSwgZGVwdGggKTtcbn07XG5cblJlcG9ydC5wcm90b3R5cGUuZXhwbGFpbiA9IGV4cGxhaW47IC8vIGFsc28gbWFrZSBhdmFpbGFibGUgdmlhIHJlcG9ydFxuXG4vLyBwYXJ0IG9mIGFkZENvbmRpdGlvblxuY29uc3Qga25vd25DaGVja3MgPSBuZXcgU2V0KCk7XG5cbi8qKlxuICogIEBtZW1iZXJPZiByZWZ1dGVcbiAqICBAc3RhdGljXG4gKiAgQGRlc2MgQ3JlYXRlIG5ldyBjaGVjayBtZXRob2QgYXZhaWxhYmxlIHZpYSBhbGwgUmVwb3J0IGluc3RhbmNlc1xuICogIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWUgb2YgdGhlIG5ldyBjb25kaXRpb24uXG4gKiAgTXVzdCBub3QgYmUgcHJlc2VudCBpbiBSZXBvcnQgYWxyZWFkeSwgYW5kIHNob3VsZCBOT1Qgc3RhcnQgd2l0aFxuICogIGdldC4uLiwgc2V0Li4uLCBvciBhZGQuLi4gKHRoZXNlIGFyZSByZXNlcnZlZCBmb3IgUmVwb3J0IGl0c2VsZilcbiAqICBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBDb25maWd1cmluZyB0aGUgY2hlY2sncyBoYW5kbGluZyBvZiBhcmd1bWVudHNcbiAqICBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMuYXJncyBUaGUgcmVxdWlyZWQgbnVtYmVyIG9mIGFyZ3VtZW50c1xuICogIEBwYXJhbSB7aW50ZWdlcn0gW29wdGlvbnMubWluQXJnc10gTWluaW11bSBudW1iZXIgb2YgYXJndW1lbnQgKGRlZmF1bHRzIHRvIGFyZ3MpXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBbb3B0aW9ucy5tYXhBcmdzXSBNYXhpbXVtIG51bWJlciBvZiBhcmd1bWVudCAoZGVmYXVsdHMgdG8gYXJncylcbiAqICBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmhhc09wdGlvbnNdIElmIHRydWUsIGFuIG9wdGlvbmFsIG9iamVjdFxuY2FuIGJlIHN1cHBsaWVkIGFzIGxhc3QgYXJndW1lbnQuIEl0IHdvbid0IGludGVyZmVyZSB3aXRoIGRlc2NyaXB0aW9uLlxuICogIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuZnVuXSBUaGUgbGFzdCBhcmd1bWVudCBpcyBhIGNhbGxiYWNrXG4gKiAgQHBhcmFtIHtGdW5jdGlvbn0gaW1wbGVtZW50YXRpb24gLSBhIGNhbGxiYWNrIHRoYXQgdGFrZXMge2FyZ3N9IGFyZ3VtZW50c1xuICogIGFuZCByZXR1cm5zIGEgZmFsc2V5IHZhbHVlIGlmIGNvbmRpdGlvbiBwYXNzZXNcbiAqICAoXCJub3RoaW5nIHRvIHNlZSBoZXJlLCBtb3ZlIGFsb25nXCIpLFxuICogIG9yIGV2aWRlbmNlIGlmIGl0IGZhaWxzXG4gKiAgKGUuZy4gdHlwaWNhbGx5IGEgZ290L2V4cGVjdGVkIGRpZmYpLlxuICovXG5mdW5jdGlvbiBhZGRDb25kaXRpb24gKG5hbWUsIG9wdGlvbnMsIGltcGwpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiBuYW1lIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXihffGdldFtfQS1aXXxzZXRbX0EtWl0pLykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uIG5hbWUgbXVzdCBub3Qgc3RhcnQgd2l0aCBnZXRfLCBzZXRfLCBvciBfJyk7XG4gICAgLy8gVE9ETyBtdXN0IGRvIHNvbWV0aGluZyBhYm91dCBuYW1lIGNsYXNoZXMsIGJ1dCBsYXRlclxuICAgIC8vIGJlY2F1c2UgZXZhbCBpbiBicm93c2VyIG1heSAoa2luZCBvZiBsZWdpbWl0ZWx5KSBvdmVycmlkZSBjb25kaXRpb25zXG4gICAgaWYgKCFrbm93bkNoZWNrcy5oYXMobmFtZSkgJiYgUmVwb3J0LnByb3RvdHlwZVtuYW1lXSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2QgYWxyZWFkeSBleGlzdHMgaW4gUmVwb3J0OiAnK25hbWUpO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIG9wdGlvbnMnKTtcbiAgICBpZiAodHlwZW9mIGltcGwgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIGltcGxlbWVudGF0aW9uJyk7XG5cbiAgICBjb25zdCBtaW5BcmdzICAgID0gb3B0aW9ucy5taW5BcmdzIHx8IG9wdGlvbnMuYXJncztcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIobWluQXJncykgfHwgbWluQXJncyA8IDApXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYXJncy9taW5BcmdzIG11c3QgYmUgbm9ubmVnYXRpdmUgaW50ZWdlcicpO1xuICAgIGNvbnN0IG1heEFyZ3MgICAgPSBvcHRpb25zLm1heEFyZ3MgfHwgb3B0aW9ucy5hcmdzIHx8IEluZmluaXR5O1xuICAgIGlmIChtYXhBcmdzICE9PSBJbmZpbml0eSAmJiAoIU51bWJlci5pc0ludGVnZXIobWluQXJncykgfHwgbWF4QXJncyA8IG1pbkFyZ3MpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ21heEFyZ3MgbXVzdCBiZSBpbnRlZ2VyIGFuZCBncmVhdGVyIHRoYW4gbWluQXJncywgb3IgSW5maW5pdHknKTtcbiAgICBjb25zdCBkZXNjckZpcnN0ICAgID0gb3B0aW9ucy5kZXNjckZpcnN0IHx8IG9wdGlvbnMuZnVuIHx8IG1heEFyZ3MgPiAxMDtcbiAgICBjb25zdCBoYXNPcHRpb25zICAgID0gISFvcHRpb25zLmhhc09wdGlvbnM7XG4gICAgY29uc3QgbWF4QXJnc1JlYWwgICA9IG1heEFyZ3MgKyAoaGFzT3B0aW9ucyA/IDEgOiAwKTtcblxuICAgIC8vIFRPRE8gYWxlcnQgdW5rbm93biBvcHRpb25zXG5cbiAgICAvLyBUT0RPIHRoaXMgY29kZSBpcyBjbHV0dGVyZWQsIHJld3JpdGVcbiAgICBjb25zdCBjb2RlID0gZnVuY3Rpb24oLi4uYXJncykge1xuICAgICAgICBjb25zdCBkZXNjciA9IGRlc2NyRmlyc3RcbiAgICAgICAgICAgID8gYXJncy5zaGlmdCgpXG4gICAgICAgICAgICA6ICggKGFyZ3MubGVuZ3RoID4gbWF4QXJncyAmJiB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aC0xXSA9PT0gJ3N0cmluZycpID8gYXJncy5wb3AoKSA6IHVuZGVmaW5lZCk7XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IG1heEFyZ3NSZWFsIHx8IGFyZ3MubGVuZ3RoIDwgbWluQXJncylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uICcrbmFtZSsnIG11c3QgaGF2ZSAnK21pbkFyZ3MrJy4uJyttYXhBcmdzUmVhbCsnIGFyZ3VtZW50cyAnKTsgLy8gVE9ET1xuXG4gICAgICAgIHJldHVybiB0aGlzLnNldFJlc3VsdCggaW1wbCguLi5hcmdzKSwgZGVzY3IsIG5hbWUgKTtcbiAgICB9O1xuXG4gICAga25vd25DaGVja3MuYWRkKG5hbWUpO1xuICAgIFJlcG9ydC5wcm90b3R5cGVbbmFtZV0gPSBjb2RlO1xufVxuXG4vLyBUaGUgbW9zdCBiYXNpYyBjb25kaXRpb25zIGFyZSBkZWZpbmVkIHJpZ2h0IGhlcmVcbi8vIGluIG9yZGVyIHRvIGJlIHN1cmUgd2UgY2FuIHZhbGlkYXRlIHRoZSBSZXBvcnQgY2xhc3MgaXRzZWxmLlxuXG4vKipcbiAqICBAbmFtZXNwYWNlIGNvbmRpdGlvbnNcbiAqICBAZGVzYyBDb25kaXRpb24gY2hlY2sgbGlicmFyeS4gVGhlc2UgbWV0aG9kcyBtdXN0IGJlIHJ1biBvbiBhXG4gKiAge0BsaW5rIFJlcG9ydH0gb2JqZWN0LlxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgY2hlY2tcbiAqICAgQGRlc2MgQSBnZW5lcmljIGNoZWNrIG9mIGEgY29uZGl0aW9uLlxuICogICBAcGFyYW0gZXZpZGVuY2UgSWYgZmFsc2UsIDAsICcnLCBvciB1bmRlZmluZWQsIHRoZSBjaGVjayBpcyBhc3N1bWVkIHRvIHBhc3MuXG4gKiAgIE90aGVyd2lzZSBpdCBmYWlscywgYW5kIHRoaXMgYXJndW1lbnQgd2lsbCBiZSBkaXNwbGF5ZWQgYXMgdGhlIHJlYXNvbiB3aHkuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dIFRoZSByZWFzb24gd2h5IHdlIGNhcmUgYWJvdXQgdGhlIGNoZWNrLlxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgcGFzc1xuICogICBAZGVzYyBBbHdheXMgcGFzc2VzLlxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgZmFpbFxuICogICBAZGVzYyBBbHdheXMgZmFpbHMgd2l0aCBhIFwiZmFpbGVkIGRlbGliZXJhdGVseVwiIG1lc3NhZ2UuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBlcXVhbFxuICogICBAZGVzYyBDaGVja3MgaWYgPT09IGhvbGRzIGJldHdlZW4gdHdvIHZhbHVlcy5cbiAqICAgSWYgbm90LCBib3RoIHdpbGwgYmUgc3RyaW5naWZpZWQgYW5kIGRpc3BsYXllZCBhcyBhIGRpZmYuXG4gKiAgIFNlZSBkZWVwRXF1YWwgdG8gY2hlY2sgbmVzdGVkIGRhdGEgc3RydWN0dXJlcyBvdCBvYmplY3RzLlxuICogICBAcGFyYW0ge2FueX0gYWN0dWFsXG4gKiAgIEBwYXJhbSB7YW55fSBleHBlY3RlZFxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgbWF0Y2hcbiAqICAgQGRlc2MgQ2hlY2tzIGlmIGEgc3RyaW5nIG1hdGNoZXMgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKiAgIEBwYXJhbSB7c3RydW5nfSBhY3R1YWxcbiAqICAgQHBhcmFtIHtSZWdFeHB9IGV4cGVjdGVkXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBuZXN0ZWRcbiAqICAgQGRlc2MgVmVyaWZ5IGEgbmVzdGVkIGNvbnRyYWN0LlxuICogICBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRpb25cbiAqICAgQHBhcmFtIHtDb250cmFjdH0gY29udHJhY3RcbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuXG5hZGRDb25kaXRpb24oXG4gICAgJ2NoZWNrJyxcbiAgICB7YXJnczoxfSxcbiAgICB4PT54XG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdwYXNzJyxcbiAgICB7YXJnczowfSxcbiAgICAoKT0+MFxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnZmFpbCcsXG4gICAge2FyZ3M6MH0sXG4gICAgKCk9PidmYWlsZWQgZGVsaWJlcmF0ZWx5J1xuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnZXF1YWwnLFxuICAgIHthcmdzOjJ9LFxuICAgIChhLGIpID0+IGEgPT09IGIgPyAwIDogWyAnLSAnK2V4cGxhaW4oYSksICcrICcgKyBleHBsYWluKGIpIF1cbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ21hdGNoJyxcbiAgICB7YXJnczoyfSxcbiAgICAoYSxyZXgpID0+ICgnJythKS5tYXRjaChyZXgpID8gMCA6IFtcbiAgICAgICAgJ1N0cmluZyAgICAgICAgIDogJythLFxuICAgICAgICAnRG9lcyBub3QgbWF0Y2ggOiAnK3JleFxuICAgIF1cbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ25lc3RlZCcsXG4gICAge2Z1bjoxLG1pbkFyZ3M6MX0sXG4gICAgKC4uLmFyZ3MpID0+IG5ldyBSZXBvcnQoKS5ydW4oLi4uYXJncykuZG9uZSgpXG4pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHsgUmVwb3J0LCBhZGRDb25kaXRpb24sIGV4cGxhaW4gfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBBbm5vdGF0ZWRTZXQgfSA9IHJlcXVpcmUoICcuL3V0aWwvYW5ub3RhdGVkLXNldC5qcycgKTtcblxuLyoqXG4gKiAgIEBuYW1lc3BhY2UgdXRpbGl0aWVzXG4gKiAgIEBkZXNjICBUaGVzZSBmdW5jdGlvbnMgaGF2ZSBub3RoaW5nIHRvIGRvIHdpdGggcmVmdXRlIGFuZCBzaG91bGRcbiAqICAgICAgICAgIGlkZWFsbHkgYmUgaW4gc2VwYXJhdGUgbW9kdWxlcy5cbiAqL1xuXG4vKiBEZXRlcm1pbmUgbi10aCBjYWxsZXIgdXAgdGhlIHN0YWNrICovXG4vKiBJbnNwaXJlZCBieSBQZXJsJ3MgQ2FycCBtb2R1bGUgKi9cbmNvbnN0IGluU3RhY2sgPSAvKFteOlxccygpXSs6XFxkKyg/OjpcXGQrKT8pXFxXKihcXG58JCkvZztcblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBtZW1iZXJPZiB1dGlsaXRpZXNcbiAqICBAZnVuY3Rpb25cbiAqICBAZGVzYyBSZXR1cm5zIHNvdXJjZSBwb3NpdGlvbiBuIGZyYW1lcyB1cCB0aGUgc3RhY2tcbiAqICBAZXhhbXBsZVxuICogIFwiL2Zvby9iYXIuanM6MjU6MTFcIlxuICogIEBwYXJhbSB7aW50ZWdlcn0gZGVwdGggSG93IG1hbnkgZnJhbWVzIHRvIHNraXBcbiAqICBAcmV0dXJucyB7c3RyaW5nfSBzb3VyY2UgZmlsZSwgbGluZSwgYW5kIGNvbHVtbiwgc2VwYXJhdGVkIGJ5IGNvbG9uLlxuICovXG5mdW5jdGlvbiBjYWxsZXJJbmZvKG4pIHtcbiAgICAvKiBhIHRlcnJpYmxlIHJleCB0aGF0IGJhc2ljYWxseSBzZWFyY2hlcyBmb3IgZmlsZS5qczpubm46bm5uIHNldmVyYWwgdGltZXMqL1xuICAgIHJldHVybiAobmV3IEVycm9yKCkuc3RhY2subWF0Y2goaW5TdGFjaylbbisxXS5yZXBsYWNlKC9cXFcqXFxuJC8sICcnKSB8fCAnJylcbn1cblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBpbnN0YW5jUlxuICogIEBtZW1iZXJPZiBSZXBvcnRcbiAqICBAZGVzYyBTdHJpbmdpcnkgb2JqZWN0cyByZWN1cnNpdmVseSB3aXRoIGxpbWl0ZWQgZGVwdGhcbiAqICBhbmQgY2lyY3VsYXIgcmVmZXJlbmNlIHRyYWNraW5nLlxuICogIEdlbmVyYWxseSBKU09OLnN0cmluZ2lmeSBpcyB1c2VkIGFzIHJlZmVyZW5jZTpcbiAqICBzdHJpbmdzIGFyZSBlc2NhcGVkIGFuZCBkb3VibGUtcXVvdGVkOyBudW1iZXJzLCBib29sZWFuLCBhbmQgbnVsbHMgYXJlXG4gKiAgc3RyaW5naWZpZWQgXCJhcyBpc1wiOyBvYmplY3RzIGFuZCBhcnJheXMgYXJlIGRlc2NlbmRlZCBpbnRvLlxuICogIFRoZSBkaWZmZXJlbmNlcyBmb2xsb3c6XG4gKiAgdW5kZWZpbmVkIGlzIHJlcG9ydGVkIGFzICc8dW5kZWY+Jy5cbiAqICBPYmplY3RzIHRoYXQgaGF2ZSBjb25zdHJ1Y3RvcnMgYXJlIHByZWZpeGVkIHdpdGggY2xhc3MgbmFtZXMuXG4gKiAgT2JqZWN0IGFuZCBhcnJheSBjb250ZW50IGlzIGFiYnJldmlhdGVkIGFzIFwiLi4uXCIgYW5kIFwiQ2lyY3VsYXJcIlxuICogIGluIGNhc2Ugb2YgZGVwdGggZXhoYXVzdGlvbiBhbmQgY2lyY3VsYXIgcmVmZXJlbmNlLCByZXNwZWN0aXZlbHkuXG4gKiAgRnVuY3Rpb25zIGFyZSBuYWl2ZWx5IHN0cmluZ2lmaWVkLlxuICogIEBwYXJhbSB7QW55fSB0YXJnZXQgT2JqZWN0IHRvIHNlcmlhbGl6ZS5cbiAqICBAcGFyYW0ge2ludGVnZXJ9IGRlcHRoPTMgRGVwdGggbGltaXQuXG4gKiAgQHJldHVybnMge3N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZXhwbGFpbiggaXRlbSwgZGVwdGg9Mywgb3B0aW9ucz17fSwgcGF0aD0nJCcsIHNlZW49bmV3IEFubm90YXRlZFNldCgpICkge1xuICAgIC8vIHNpbXBsZSB0eXBlc1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpXG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShpdGVtKTsgLy8gZG9uJ3Qgd2FudCB0byBzcGVuZCB0aW1lIHFvdXRpbmdcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdudW1iZXInIHx8IHR5cGVvZiBpdGVtID09PSAnYm9vbGVhbicgfHwgaXRlbSA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuICcnK2l0ZW07XG4gICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCkgcmV0dXJuICc8dW5kZWY+JztcbiAgICBpZiAodHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnKSAvLyBtYXliZSBmdW5jdGlvblxuICAgICAgICByZXR1cm4gJycraXRlbTsgLy8gVE9ETyBkb24ndCBwcmludCBvdXQgYSBsb25nIGZ1bmN0aW9uJ3MgYm9keVxuXG4gICAgLy8gcmVjdXJzZVxuICAgIGNvbnN0IHdoZXJlU2VlbiA9IHNlZW4uaGFzKGl0ZW0pO1xuICAgIGlmICh3aGVyZVNlZW4pIHtcbiAgICAgICAgY29uc3Qgbm90ZSA9ICdDaXJjdWxhcj0nK3doZXJlU2VlbjtcbiAgICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoaXRlbSk/J1sgJytub3RlKycgXSc6J3sgJytub3RlKycgfSc7XG4gICAgfTtcbiAgICBzZWVuID0gc2Vlbi5hZGQoIGl0ZW0sIHBhdGggKTsgLy8gY2xvbmVzIHNlZW5cblxuICAgIGlmIChBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICAgIGlmIChkZXB0aCA8IDEpXG4gICAgICAgICAgICByZXR1cm4gJ1suLi5dJztcbiAgICAgICAgc2Vlbi5hZGQoaXRlbSk7XG4gICAgICAgIC8vIFRPRE8gPHggZW1wdHkgaXRlbXM+XG4gICAgICAgIGNvbnN0IGxpc3QgPSBpdGVtLm1hcChcbiAgICAgICAgICAgICh2YWwsIGluZGV4KSA9PiBleHBsYWluKHZhbCwgZGVwdGgtMSwgb3B0aW9ucywgcGF0aCsnWycraW5kZXgrJ10nLCBzZWVuKVxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gJ1snK2xpc3Quam9pbignLCAnKSsnXSc7IC8vIFRPRE8gY29uZmlndXJhYmxlIHdoaXRlc3BhY2VcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlID0gaXRlbS5jb25zdHJ1Y3RvciAmJiBpdGVtLmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgY29uc3QgcHJlZml4ID0gdHlwZSAmJiB0eXBlICE9PSAnT2JqZWN0JyA/IHR5cGUgKyAnICcgOiAnJztcbiAgICBpZiAoZGVwdGggPCAxKVxuICAgICAgICByZXR1cm4gcHJlZml4ICsgJ3suLi59JztcbiAgICBjb25zdCBsaXN0ID0gT2JqZWN0LmtleXMoaXRlbSkuc29ydCgpLm1hcCgga2V5ID0+IHtcbiAgICAgICAgY29uc3QgaW5kZXggPSBKU09OLnN0cmluZ2lmeShrZXkpO1xuICAgICAgICByZXR1cm4gaW5kZXgrXCI6XCIrZXhwbGFpbihpdGVtW2tleV0sIGRlcHRoLTEsIG9wdGlvbnMsIHBhdGgrJ1snK2luZGV4KyddJywgc2Vlbik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByZWZpeCArICd7JyArIGxpc3Quam9pbihcIiwgXCIpICsgJ30nO1xufVxuXG4vLyBNdXN0IHdvcmsgZXZlbiB3aXRob3V0IGFzc2VydFxuY29uc3QgaGFzQXNzZXJ0ID0gdHlwZW9mIGFzc2VydCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IgPT09ICdmdW5jdGlvbic7XG5cbmNvbnN0IG1ha2VFcnJvciA9IGhhc0Fzc2VydFxuICAgID8gZW50cnkgPT4gbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcihlbnRyeSlcbiAgICA6IGVudHJ5ID0+IG5ldyBFcnJvciggZW50cnkuYWN0dWFsICk7XG5cbm1vZHVsZS5leHBvcnRzID0geyBjYWxsZXJJbmZvLCBleHBsYWluLCBtYWtlRXJyb3IgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gU2VlIGFsc28gbm90ZWQtc2V0LmpzXG5cbmNsYXNzIEFubm90YXRlZFNldCB7XG4gICAgY29uc3RydWN0b3IoYWxsPW5ldyBTZXQoKSwgbm90ZXM9W10pIHtcbiAgICAgICAgdGhpcy5hbGwgICA9IGFsbDtcbiAgICAgICAgdGhpcy5ub3RlcyA9IG5vdGVzO1xuICAgIH1cbiAgICBhZGQoIGl0ZW0sIG5vdGUgKSB7XG4gICAgICAgIGlmICh0aGlzLmFsbC5oYXMoaXRlbSkpXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBBbm5vdGF0ZWRTZXQoXG4gICAgICAgICAgICBuZXcgU2V0KHRoaXMuYWxsKS5hZGQoaXRlbSksXG4gICAgICAgICAgICBbIC4uLnRoaXMubm90ZXMsIFsgaXRlbSwgbm90ZSBdIF1cbiAgICAgICAgKTtcbiAgICB9XG4gICAgaGFzKCBpdGVtICkge1xuICAgICAgICBpZiAoIXRoaXMuYWxsLmhhcyggaXRlbSApKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKGxldCBwYWlyIG9mIHRoaXMubm90ZXMpIHtcbiAgICAgICAgICAgIGlmIChwYWlyWzBdID09PSBpdGVtKVxuICAgICAgICAgICAgICAgIHJldHVybiBwYWlyWzFdO1xuICAgICAgICB9O1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3d0ZiwgdW5yZWFjaGFibGUnKTtcbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7IEFubm90YXRlZFNldCB9O1xuIl19
