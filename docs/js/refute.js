(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

// the core (should explain even be there?)
const { Report, addCondition, explain } = require ('./refute/report.js');

// eiffel-style design-by-contract
const { DBC } = require( './refute/dbc.js' );

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


},{"./refute/cond/array.js":2,"./refute/cond/basic.js":3,"./refute/cond/deep.js":4,"./refute/dbc.js":5,"./refute/report.js":6}],2:[function(require,module,exports){
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

        const ok = new Report();
        list.forEach( (item, index) => ok.nested( "item "+index, item, contract ) );
        return ok.done();
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

        const ok = new Report();
        for (let n = 0; n < list.length-1; n++) {
            ok.nested( "items "+n+", "+(n+1), list[n], list[n+1], contract);
        }
        return ok.done();
    }
);


},{"../report.js":6}],3:[function(require,module,exports){
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
 *   A type is
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


},{"../report.js":6}],4:[function(require,module,exports){
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


},{"../report.js":6,"../util/annotated-set.js":8}],5:[function(require,module,exports){
'use strict';

const { Report } = require ( './report.js' );
const noop = ()=>{};

class DBC {
    constructor() {
        this._pre    = noop;
        this._post   = noop;
        this._onfail = report => report.getThrown();
        this._onpost = undefined;
    }
    post(code) {
        if (code === undefined) {
            return this._post;
        } else {
            if( typeof code !== 'function' )
                throw new Error('post-condition must be a function');
            this._post = code;
            return this;
        }
    }
    pre(code) {
        if (code === undefined) {
            return this._pre;
        } else {
            if( typeof code !== 'function' )
                throw new Error('pre-condition must be a function');
            this._pre = code;
            return this;
        }
    }
    decorate(orig) {
        // close around these vars
        const pre    = this._pre;
        const post   = this._post;
        const onfail = this._onfail;
        const onpost = this._onpost || this._onfail;

        // no arrow function to get correct 'this' object
        const code = function (...args) {
            const rPre = new Report();
            pre.apply( this, [ rPre, undefined, ...args ] );
            if(!rPre.getPass())
                onfail(rPre.setTitle('pre-condition failed'));
            const ret = orig.apply( this, args );
            const rPost = new Report();
            post.apply( this, [ rPost, ret, ...args ] );
            if(!rPost.getPass())
                onpost(rPost.setTitle('post-condition failed'));
            return ret;
        }

        code.orig = orig;
        code.pre  = pre;
        code.post = post;

        return code;
    }
}

module.exports = { DBC };

},{"./report.js":6}],6:[function(require,module,exports){
'use strict';

const { callerInfo, explain, makeError } = require( './util.js' );

/**
 *   @callback Contract
 *   @memberOf utilities
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

    // setup methods - must be chainable

    /**
     *  @desc Set informational message about the overall purpose of this contract
     *  @param {String} title - the message in question
     *  @returns {Report} this
     */
    setTitle(str) {
        this._title = str;
        return this;
    };

    onDone(fn) {
        this._onDone.push(fn);
        return this;
    };

    // running
    // TODO either async() should support additional args, or run() shouldn't
    run(...args) {
        this._lock();
        const block = args.pop();
        if (typeof block !== 'function')
            throw new Error('Last argument of run() must be a function, not '+typeof(block));
        block( this, ...args );
        return this;
    }

    // TODO either async() should support additional args, or run() shouldn't
    async(timeout, block) {
        return new Promise( (resolve, reject) => {
            const timer = setTimeout(
                () => reject(new Error("Contract execution took too long")),
                timeout
            );
            this.onDone(arg => {clearTimeout(timer); resolve(arg)});
            block(this);
        });
    }

    // In theory, having const n=next(); setResult(n. ...)
    // should allow for async conditions in the future
    // if at all possible without great sacrifices.
    next() {
        this._lock();
        return ++this._count;
    }

    setResult (n, evidence, descr, condName, where) {
        if(!this._pending.has(n))
            this._lock();
        this._pending.delete(n);
        if (n > this._count)
            throw new Error ('Attempt to set condition beyond check count');
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
                this.setResult(n, x, descr, condName, where );
                if (this.getDone()) {
                    for (let cb of this._onDone)
                        cb(this);
                }
            });
            return;
        }

        // listify & stringify evidence, so that it doesn't change post-factum
        if (!Array.isArray(evidence))
            evidence = [ evidence ];
        this._evidence[n] = evidence.map( x=>_explain(x, Infinity) );
        this._where[n]    = where || callerInfo(2);
        this._condName[n] = condName;
        this._failCount++;

        return;
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

    done() {
        if (!this._done) {
            this._done = true;
            if (!this._pending.size) {
                for (let cb of this._onDone)
                    cb(this);
            }
        };
        return this;
    }

    // querying
    getTitle() {
        return this._title; //JFYI
    };

    /**
     *   @returns {boolean}
     */
    getDone() {
        return this._done && !this._pending.size; // is it even needed?
    }

    _lock () {
        if (this._done)
            throw new Error('Attempt to modify a finished contract');
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

    getText() {
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
            out.push( indent + (this._evidence[n] ? '!':'')
                +n+(this._descr[n] ? '. '+this._descr[n] : '.') );
            if( this._nested[n]) {
                out.push( ...this._nested[n].getLines(indent) );
            } else if( this._evidence[n] ) {
                out.push( indent + '    ^ Condition '+(this._condName[n] || 'check')
                    +' failed at '+this._where[n] );
                this._evidence[n].forEach( raw => {
                    // Handle multiline evidence
                    // TODO this is perl written in JS, rewrite more clearly
                    let[ _, prefix, s ] = raw.match( /^([-+^] )?(.*?)\n?$/s );
                    if (!prefix) prefix = '^ ';
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
            title: this.getTitle(),
            details,
        };
    }

    toString() {
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
        if (this.getTitle())
            tap.push('# '+this.getTitle());
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
                message:  this.getTitle(),
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

        const n = this.next(); // TODO call it advance() or smth.
        const evidence = impl( ...args );
        return this.setResult( n, evidence, descr, name );
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

},{"./util.js":7}],7:[function(require,module,exports){
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

},{"./util/annotated-set.js":8}],8:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9yZWZ1dGUuanMiLCJsaWIvcmVmdXRlL2NvbmQvYXJyYXkuanMiLCJsaWIvcmVmdXRlL2NvbmQvYmFzaWMuanMiLCJsaWIvcmVmdXRlL2NvbmQvZGVlcC5qcyIsImxpYi9yZWZ1dGUvZGJjLmpzIiwibGliL3JlZnV0ZS9yZXBvcnQuanMiLCJsaWIvcmVmdXRlL3V0aWwuanMiLCJsaWIvcmVmdXRlL3V0aWwvYW5ub3RhdGVkLXNldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5bkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0JztcblxuLy8gdGhlIGNvcmUgKHNob3VsZCBleHBsYWluIGV2ZW4gYmUgdGhlcmU/KVxuY29uc3QgeyBSZXBvcnQsIGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9ID0gcmVxdWlyZSAoJy4vcmVmdXRlL3JlcG9ydC5qcycpO1xuXG4vLyBlaWZmZWwtc3R5bGUgZGVzaWduLWJ5LWNvbnRyYWN0XG5jb25zdCB7IERCQyB9ID0gcmVxdWlyZSggJy4vcmVmdXRlL2RiYy5qcycgKTtcblxuLy8gaW1wb3J0IGRlZmF1bHQgY29uZGl0aW9uIGFyc2VuYWxcbnJlcXVpcmUoICcuL3JlZnV0ZS9jb25kL2Jhc2ljLmpzJyApO1xucmVxdWlyZSggJy4vcmVmdXRlL2NvbmQvYXJyYXkuanMnICk7XG5yZXF1aXJlKCAnLi9yZWZ1dGUvY29uZC9kZWVwLmpzJyApO1xuXG5jb25zdCBnZXRSZXBvcnQgPSAoLi4uYXJncykgPT4gbmV3IFJlcG9ydCgpLnJ1biguLi5hcmdzKS5kb25lKCk7XG5cbi8vIEFsbG93IGNyZWF0aW5nIG11bHRpcGxlIHBhcmFsbGVsIGNvbmZpZ3VyYXRpb25zIG9mIHJlZnV0ZVxuLy8gZS5nLiBvbmUgc3RyaWN0ICh0aHJvd2luZyBlcnJvcnMpIGFuZCBvdGhlciBsYXggKGp1c3QgZGVidWdnaW5nIHRvIGNvbnNvbGUpXG5mdW5jdGlvbiBzZXR1cCggb3B0aW9ucz17fSwgb3JpZyApIHtcbiAgICAvLyBUT0RPIHZhbGlkYXRlIG9wdGlvbnNcbiAgICBjb25zdCBvbkZhaWwgPSBvcHRpb25zLm9uRmFpbCB8fCAocmVwID0+IHsgdGhyb3cgbmV3IEVycm9yKHJlcC5nZXRUYXAoKSkgfSk7XG5cbiAgICBjb25zdCByZWZ1dGUgPSBvcHRpb25zLnNraXBcbiAgICAgICAgPyAoKT0+e31cbiAgICAgICAgOiAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgY29uc3Qgb2sgPSBuZXcgUmVwb3J0KCk7XG4gICAgICAgICAgICBvay5vbkRvbmUoIHggPT4geyBpZiggIXguZ2V0UGFzcygpICkgb25GYWlsKHgsIGFyZ3MpIH0gKTtcbiAgICAgICAgICAgIG9rLnJ1biguLi5hcmdzKTtcbiAgICAgICAgICAgIG9rLmRvbmUoKTtcbiAgICAgICAgfTtcblxuICAgIC8vIHJlZXhwb3J0IGFsbCBmcm9tIHJlcG9ydC5qc1xuICAgIHJlZnV0ZS5SZXBvcnQgPSBSZXBvcnQ7XG4gICAgcmVmdXRlLmV4cGxhaW4gPSBleHBsYWluO1xuICAgIHJlZnV0ZS5hZGRDb25kaXRpb24gPSBhZGRDb25kaXRpb247XG5cbiAgICAvLyBzaG9ydGN1dCB0byB2YWxpZGF0aW5nICYgcmV0dXJuaW5nIGEgZnJlc2ggY29udHJhY3RcbiAgICAvLyBUT0RPIHJlbmFtZSB0byBhdm9pZCBuYW1lIGNsYXNoIHdpdGggdGhlIGNsYXNzXG4gICAgLy8gKGV2YWw/KVxuICAgIHJlZnV0ZS5yZXBvcnQgPSBnZXRSZXBvcnQ7XG5cbiAgICAvLyByZWZ1dGUuY29uZih7Li4ufSkgd2lsbCBnZW5lcmF0ZSBhIF9uZXdfIHJlZnV0ZVxuICAgIHJlZnV0ZS5jb25maWcgPSB1cGRhdGUgPT4gc2V0dXAoIHsgLi4ub3B0aW9ucywgLi4udXBkYXRlIH0sIHJlZnV0ZSApO1xuXG4gICAgLy8gYWRkIGRlc2lnbi1ieS1jb250cmFjdFxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSggcmVmdXRlLCAnZGJjJywgeyBnZXQ6ICgpPT5uZXcgREJDKCkgfSApO1xuXG4gICAgLy8gVE9ETyB0aGlzIGlzIHN0dXBpZCwgY29tZSB1cCB3aXRoIHNtdGggYmV0dGVyXG4gICAgLy8gd2hlbiBpbiBicm93c2VyLCB3aW5kb3cucmVmdXRlLmNvbmZpZygpIHVwZGF0ZXMgd2luZG93LnJlZnV0ZSBpdHNlbGZcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgb3JpZyA9PT0gd2luZG93LnJlZnV0ZSlcbiAgICAgICAgd2luZG93LnJlZnV0ZSA9IHJlZnV0ZTtcblxuICAgIHJldHVybiByZWZ1dGU7XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJylcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHNldHVwKCk7XG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgd2luZG93LnJlZnV0ZSA9IHNldHVwKCk7IC8vIFRPRE8gY2hlY2sgcHJlZXhpc3RpbmdcblxuLyoqXG4gKiAgIEBuYW1lc3BhY2UgcmVmdXRlXG4gKiAgIEBkZXNjICAgRnVuY3Rpb25zIGV4cG9ydGVkIGJ5IHJlZnV0ZSBtYWluIG1vZHVsZS5cbiAqL1xuXG4vKipcbiAqICAgQHB1YmxpY1xuICogICBAbWVtYmVyT2YgcmVmdXRlXG4gKiAgIEBmdW5jdGlvbiByZWZ1dGVcbiAqICAgQHBhcmFtIHtBbnl9IFsuLi5saXN0XSBEYXRhIHRvIGZlZWQgdG8gdGhlIGNhbGxiYWNrXG4gKiAgIEBwYXJhbSB7Q29udHJhY3R9IGNvbnRyYWN0IEEgY29kZSBibG9jayB3aXRoIGNoZWNrcy5cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH0gUmV0dXJuIHZhbHVlIGlzIGlnbm9yZWQuXG4gKiAgIEB0aHJvd3Mge0Vycm9yfSBJZiBvbmUgb3IgbW9yZSBjaGVja3MgYXJlIGZhaWxpbmcsIGFuIGV4Y2VwdGlvbiBpcyB0aHJvd25cbiAqICAgd2l0aCBkZXRhaWxzIGFib3V0IGFsbCBwYXNzaW5nL2ZhaWxpbmcgY2hlY2tzLlxuICogICBUaGlzIGFjdGlvbiBjYW4gYmUgY2hhbmdlZCB2aWEgcmVmdXRlLmNvbmZpZygpIGNhbGwuXG4gKlxuICovXG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIFJlcG9ydCB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcblxuLy8gVE9ETyByZW5hbWUgZm9yRWFjaCBvciBzbXRoLlxuYWRkQ29uZGl0aW9uKFxuICAgICdtYXAnLFxuICAgIHtmdW46MSxhcmdzOjJ9LFxuICAgIChsaXN0LCBjb250cmFjdCkgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpXG4gICAgICAgICAgICByZXR1cm4gJ0V4cGVjdGVkIGEgbGlzdCwgZm91bmQgYSAnLnR5cGVvZihsaXN0KTtcbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBhdXRvLXBhc3NcblxuICAgICAgICBjb25zdCBvayA9IG5ldyBSZXBvcnQoKTtcbiAgICAgICAgbGlzdC5mb3JFYWNoKCAoaXRlbSwgaW5kZXgpID0+IG9rLm5lc3RlZCggXCJpdGVtIFwiK2luZGV4LCBpdGVtLCBjb250cmFjdCApICk7XG4gICAgICAgIHJldHVybiBvay5kb25lKCk7XG4gICAgfVxuKTtcblxuLy8gVE9ETyB0aGlzIGlzIGNhbGxlZCBcImNvbXBsaWFudCBjaGFpblwiIGJ1dCBiZXR0ZXIganVzdCBzYXkgaGVyZVxuLy8gXCJvaCB3ZSdyZSBjaGVja2luZyBlbGVtZW50IG9yZGVyXCJcbmFkZENvbmRpdGlvbihcbiAgICAnb3JkZXJlZCcsIC8vIFRPRE8gYmV0dGVyIG5hbWU/XG4gICAge2Z1bjoxLGFyZ3M6Mn0sXG4gICAgKGxpc3QsIGNvbnRyYWN0KSA9PiB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSlcbiAgICAgICAgICAgIHJldHVybiAnRXhwZWN0ZWQgYSBsaXN0LCBmb3VuZCBhICcudHlwZW9mKGxpc3QpO1xuICAgICAgICBpZiAobGlzdC5sZW5ndGggPCAyKVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGF1dG8tcGFzc1xuXG4gICAgICAgIGNvbnN0IG9rID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IGxpc3QubGVuZ3RoLTE7IG4rKykge1xuICAgICAgICAgICAgb2submVzdGVkKCBcIml0ZW1zIFwiK24rXCIsIFwiKyhuKzEpLCBsaXN0W25dLCBsaXN0W24rMV0sIGNvbnRyYWN0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2suZG9uZSgpO1xuICAgIH1cbik7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIHJlcG9ydCwgZXhwbGFpbiB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcbmNvbnN0IE9LID0gZmFsc2U7XG5cbmNvbnN0IG51bUNtcCA9IHtcbiAgICAnPCcgOiAoeCx5KT0+KHggIDwgeSksXG4gICAgJz4nIDogKHgseSk9Pih4ICA+IHkpLFxuICAgICc8PSc6ICh4LHkpPT4oeCA8PSB5KSxcbiAgICAnPj0nOiAoeCx5KT0+KHggPj0geSksXG4gICAgJz09JzogKHgseSk9Pih4ID09PSB5KSxcbiAgICAnIT0nOiAoeCx5KT0+KHggIT09IHkpLFxufTtcblxuLy8gdXNlICE9IGFuZCBub3QgIT09IGRlbGliZXJhdGVseSB0byBmaWx0ZXIgb3V0IG51bGwgJiB1bmRlZmluZWRcbmNvbnN0IHN0ckNtcCA9IHtcbiAgICAnPCcgOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggIDwgJycreSksXG4gICAgJz4nIDogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ICA+ICcnK3kpLFxuICAgICc8PSc6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCA8PSAnJyt5KSxcbiAgICAnPj0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPj0gJycreSksXG5cbiAgICAnPT0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPT09ICcnK3kpLFxuICAgICchPSc6ICh4LHkpPT4oKHggPT0gdW5kZWZpbmVkKV4oeSA9PSB1bmRlZmluZWQpKSB8fCAoJycreCAhPT0gJycreSksXG59O1xuXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgbnVtQ21wXG4gKiAgIEBkZXNjICBDaGVja3MgaWYgYSByZWxhdGlvbiBpbmRlZWQgaG9sZHMgYmV0d2VlbiBhcmd1bWVudHMuXG4gKiAgICAgICAgICBTZWUgYWxzbyB7QGxpbmsgc3RyQ21wfVxuICogICBAcGFyYW0ge2FueX0gYXJnMSAgICBGaXJzdCBhcmd1bWVudFxuICogICBAcGFyYW0ge3N0cmluZ30gb3BlcmF0aW9uICBPbmUgb2YgJzwnLCAnPD0nLCAnPT0nLCAnIT0nLCAnPj0nLCBvciAnPidcbiAqICAgQHBhcmFtIHthbnl9IGFyZzIgICAgU2Vjb25kIGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBzdHJDbXBcbiAqICAgQGRlc2MgIENoZWNrcyBpZiBhIHJlbGF0aW9uIGluZGVlZCBob2xkcyBiZXR3ZWVuIGFyZ3VtZW50cyxcbiAqICAgICAgICAgIGFzc3VtaW5nIHRoZXkgYXJlIHN0cmluZ3MuXG4gKiAgICAgICAgICBTZWUgYWxzbyB7QGxpbmsgbnVtQ21wfVxuICogICBAcGFyYW0ge2FueX0gYXJnMSAgICBGaXJzdCBhcmd1bWVudFxuICogICBAcGFyYW0ge3N0cmluZ30gb3BlcmF0aW9uICBPbmUgb2YgJzwnLCAnPD0nLCAnPT0nLCAnIT0nLCAnPj0nLCBvciAnPidcbiAqICAgQHBhcmFtIHthbnl9IGFyZzIgICAgU2Vjb25kIGFyZ3VtZW50XG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cblxuYWRkQ29uZGl0aW9uKFxuICAgICdudW1DbXAnLFxuICAgIHthcmdzOjN9LFxuICAgICh4LG9wLHkpID0+IG51bUNtcFtvcF0oeCx5KT8wOlt4LFwiaXMgbm90IFwiK29wLHldXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdzdHJDbXAnLFxuICAgIHthcmdzOjN9LFxuICAgICh4LG9wLHkpID0+IHN0ckNtcFtvcF0oeCx5KT8wOlt4LFwiaXMgbm90IFwiK29wLHldXG4pO1xuXG5jb25zdCB0eXBlQ2hlY2sgPSB7XG4gICAgdW5kZWZpbmVkOiB4ID0+IHggPT09IHVuZGVmaW5lZCxcbiAgICBudWxsOiAgICAgIHggPT4geCA9PT0gbnVsbCxcbiAgICBudW1iZXI6ICAgIHggPT4gdHlwZW9mIHggPT09ICdudW1iZXInICYmICFOdW1iZXIuaXNOYU4oeCksXG4gICAgaW50ZWdlcjogICB4ID0+IE51bWJlci5pc0ludGVnZXIoeCksXG4gICAgbmFuOiAgICAgICB4ID0+IE51bWJlci5pc05hTih4KSxcbiAgICBzdHJpbmc6ICAgIHggPT4gdHlwZW9mIHggPT09ICdzdHJpbmcnLFxuICAgIGZ1bmN0aW9uOiAgeCA9PiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyxcbiAgICBib29sZWFuOiAgIHggPT4gdHlwZW9mIHggPT09ICdib29sZWFuJyxcbiAgICBvYmplY3Q6ICAgIHggPT4geCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoeCksXG4gICAgYXJyYXk6ICAgICB4ID0+IEFycmF5LmlzQXJyYXkoeCksXG59O1xuZnVuY3Rpb24gdHlwZUV4cGxhaW4gKHgpIHtcbiAgICBpZiAodHlwZW9mIHggPT09ICdzdHJpbmcnKVxuICAgICAgICByZXR1cm4geDtcbiAgICBpZiAodHlwZW9mIHggPT09ICdmdW5jdGlvbicpXG4gICAgICAgIHJldHVybiAnaW5zdGFuY2VvZiAnKyh4Lm5hbWUgfHwgeCk7XG59O1xuXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgdHlwZVxuICogICBAZGVzYyAgQ2hlY2tzIHRoYXQgYSB2YWx1ZSBpcyBvZiB0aGUgc3BlY2lmaWVkIHR5cGUuXG4gKiAgIEEgdHlwZSBpc1xuICogICBAcGFyYW0ge2FueX0gdmFsdWUgICAgRmlyc3QgYXJndW1lbnRcbiAqICAgQHBhcmFtIHtzdHJpbmd8ZnVuY3Rpb258QXJyYXl9IHR5cGVcbiAqICAgICAgIE9uZSBvZiAndW5kZWZpbmVkJywgJ251bGwnLCAnbnVtYmVyJywgJ2ludGVnZXInLCAnbmFuJywgJ3N0cmluZycsXG4gKiAgICAgICAnYm9vbGVhbicsICdvYmplY3QnLCAnYXJyYXknLCBhIGNsYXNzLCBvciBhbiBhcnJheSBjb250YWluaW5nIDEgb3IgbW9yZVxuICogICAgICAgb2YgdGhlIGFib3ZlLiAnbnVtYmVyJy8naW50ZWdlcicgZG9uJ3QgaW5jbHVkZSBOYU4sXG4gKiAgICAgICBhbmQgJ29iamVjdCcgZG9lc24ndCBpbmNsdWRlIGFycmF5cy5cbiAqICAgICAgIEEgZnVuY3Rpb24gaW1wbGllcyBhbiBvYmplY3QgYW5kIGFuIGluc3RhbmNlb2YgY2hlY2suXG4gKiAgICAgICBBcnJheSBtZWFucyBhbnkgb2YgdGhlIHNwZWNpZmllZCB0eXBlcyAoYWthIHN1bSBvZiB0eXBlcykuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbmFkZENvbmRpdGlvbihcbiAgICAndHlwZScsXG4gICAge2FyZ3M6IDJ9LFxuICAgIChnb3QsIGV4cCk9PntcbiAgICAgICAgaWYgKCAhQXJyYXkuaXNBcnJheShleHApIClcbiAgICAgICAgICAgIGV4cCA9IFtleHBdO1xuXG4gICAgICAgIGZvciAobGV0IHZhcmlhbnQgb2YgZXhwKSB7XG4gICAgICAgICAgICAvLyBrbm93biB0eXBlXG4gICAgICAgICAgICBpZiggdHlwZW9mIHZhcmlhbnQgPT09ICdzdHJpbmcnICYmIHR5cGVDaGVja1t2YXJpYW50XSApIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZUNoZWNrW3ZhcmlhbnRdKGdvdCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPSztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGluc3RhbmNlb2ZcbiAgICAgICAgICAgIGlmKCB0eXBlb2YgdmFyaWFudCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZ290ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGlmKCBnb3QgaW5zdGFuY2VvZiB2YXJpYW50IClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9LO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gZG9uJ3Qga25vdyB3aGF0IHlvdSdyZSBhc2tpbmcgZm9yXG4gICAgICAgICAgICByZXR1cm4gJ3Vua25vd24gdmFsdWUgdHlwZSBzcGVjOiAnK2V4cGxhaW4odmFyaWFudCwgMSk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAnLSAnK2V4cGxhaW4oZ290LCAxKSxcbiAgICAgICAgICAgICcrICcrZXhwLm1hcCggdHlwZUV4cGxhaW4gKS5qb2luKFwiIG9yIFwiKSxcbiAgICAgICAgXTtcbiAgICB9XG4pO1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCBleHBsYWluIH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuY29uc3QgeyBBbm5vdGF0ZWRTZXQgfSA9IHJlcXVpcmUoICcuLi91dGlsL2Fubm90YXRlZC1zZXQuanMnICk7XG5cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBkZWVwRXF1YWxcbiAqICAgQGRlc2MgQ29tcGFyZXMgdHdvIHN0cnVjdHVyZXMsIG91dHB1dHMgZGlmZiBpZiBkaWZmZXJlbmNlcyBmb3VuZC5cbiAqICAgQHBhcmFtIHthbnl9IGFjdHVhbCAgICBGaXJzdCBzdHJ1Y3R1cmVcbiAqICAgQHBhcmFtIHthbnl9IGV4cGVjdGVkICBTdHJ1Y3R1cmUgdG8gY29tcGFyZSB0b1xuICogICBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiAgIEBwYXJhbSB7bnVtYmVyfSBvcHRpb25zLm1heCBob3cgbWFueSBkaWZmZXJlbmNlcyB0byBvdXRwdXQgKGRlZmF1bHQgNSlcbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuYWRkQ29uZGl0aW9uKCAnZGVlcEVxdWFsJywge1wiYXJnc1wiOjIsaGFzT3B0aW9uczp0cnVlfSwgZGVlcCApO1xuXG5mdW5jdGlvbiBkZWVwKCBnb3QsIGV4cCwgb3B0aW9ucz17fSApIHtcbiAgICBpZiAoIW9wdGlvbnMubWF4KVxuICAgICAgICBvcHRpb25zLm1heCA9IDU7XG4gICAgb3B0aW9ucy5kaWZmID0gW107XG4gICAgX2RlZXAoIGdvdCwgZXhwLCBvcHRpb25zICk7XG4gICAgaWYgKCFvcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICByZXR1cm4gMDtcblxuICAgIGNvbnN0IHJldCA9IFtdO1xuICAgIGZvciAobGV0IGl0ZW0gb2Ygb3B0aW9ucy5kaWZmKSB7XG4gICAgICAgIHJldC5wdXNoKCBcbiAgICAgICAgICAgIFwiYXQgXCIraXRlbVswXSxcbiAgICAgICAgICAgIFwiLSBcIisoaXRlbVszXSA/IGl0ZW1bMV0gOiBleHBsYWluKCBpdGVtWzFdLCAyICkpLFxuICAgICAgICAgICAgXCIrIFwiKyhpdGVtWzNdID8gaXRlbVsyXSA6IGV4cGxhaW4oIGl0ZW1bMl0sIDIgKSksXG4gICAgICAgICk7XG4gICAgfTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuLy8gcmVzdWx0IGlzIHN0b3JlZCBpbiBvcHRpb25zLmRpZmY9W10sIHJldHVybiB2YWx1ZSBpcyBpZ25vcmVkXG4vLyBpZiBzYWlkIGRpZmYgZXhjZWVkcyBtYXgsIHJldHVybiBpbW1lZGlhdGVseSAmIGRvbid0IHdhc3RlIHRpbWVcbmZ1bmN0aW9uIF9kZWVwKCBnb3QsIGV4cCwgb3B0aW9ucz17fSwgcGF0aD0nJCcsIHNlZW5MPW5ldyBBbm5vdGF0ZWRTZXQoKSwgc2VlblI9bmV3IEFubm90YXRlZFNldCgpICkge1xuICAgIGlmIChnb3QgPT09IGV4cCB8fCBvcHRpb25zLm1heCA8PSBvcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICByZXR1cm47XG4gICAgaWYgKHR5cGVvZiBnb3QgIT09IHR5cGVvZiBleHApXG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcblxuICAgIC8vIHJlY3Vyc2UgYnkgZXhwZWN0ZWQgdmFsdWUgLSBjb25zaWRlciBpdCBtb3JlIHByZWRpY3RhYmxlXG4gICAgaWYgKHR5cGVvZiBleHAgIT09ICdvYmplY3QnIHx8IGV4cCA9PT0gbnVsbCApIHtcbiAgICAgICAgLy8gbm9uLW9iamVjdHMgLSBzbyBjYW4ndCBkZXNjZW5kXG4gICAgICAgIC8vIGFuZCBjb21wYXJpc29uIGFscmVhZHkgZG9uZSBhdCB0aGUgYmVnaW5ubmluZ1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG4gICAgfVxuXG4gICAgLy8gbXVzdCBkZXRlY3QgbG9vcHMgYmVmb3JlIGdvaW5nIGRvd25cbiAgICBjb25zdCBwYXRoTCA9IHNlZW5MLmhhcyhnb3QpO1xuICAgIGNvbnN0IHBhdGhSID0gc2VlblIuaGFzKGV4cCk7XG4gICAgaWYgKHBhdGhMIHx8IHBhdGhSKSB7XG4gICAgICAgIC8vIExvb3AgZGV0ZWN0ZWQgPSBvbmx5IGNoZWNrIHRvcG9sb2d5XG4gICAgICAgIGlmIChwYXRoTCA9PT0gcGF0aFIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW1xuICAgICAgICAgICAgcGF0aCArICcgKGNpcmN1bGFyKScsXG4gICAgICAgICAgICBwYXRoTCA/ICdDaXJjdWxhcj0nK3BhdGhMIDogZXhwbGFpbihnb3QsIDIpLFxuICAgICAgICAgICAgcGF0aFIgPyAnQ2lyY3VsYXI9JytwYXRoUiA6IGV4cGxhaW4oZXhwLCAyKSxcbiAgICAgICAgICAgIHRydWUgLy8gZG9uJ3Qgc3RyaW5naWZ5XG4gICAgICAgIF0pO1xuICAgIH07XG4gICAgc2VlbkwgPSBzZWVuTC5hZGQoZ290LCBwYXRoKTtcbiAgICBzZWVuUiA9IHNlZW5SLmFkZChleHAsIHBhdGgpO1xuXG4gICAgLy8gY29tcGFyZSBvYmplY3QgdHlwZXNcbiAgICAvLyAoaWYgYSB1c2VyIGlzIHN0dXBpZCBlbm91Z2ggdG8gb3ZlcnJpZGUgY29uc3RydWN0b3IgZmllbGQsIHdlbGwgdGhlIHRlc3RcbiAgICAvLyB3b3VsZCBmYWlsIGxhdGVyIGFueXdheSlcbiAgICBpZiAoZ290LmNvbnN0cnVjdG9yICE9PSBleHAuY29uc3RydWN0b3IpXG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcblxuICAgIC8vIGFycmF5XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZXhwKSkge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZ290KSB8fCBnb3QubGVuZ3RoICE9PSBleHAubGVuZ3RoKVxuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZXhwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBfZGVlcCggZ290W2ldLCBleHBbaV0sIG9wdGlvbnMsIHBhdGgrJ1snK2krJ10nLCBzZWVuTCwgc2VlblIgKTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLm1heDw9b3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH07XG5cbiAgICAvLyBjb21wYXJlIGtleXMgLSArMSBmb3IgZXhwLCAtMSBmb3IgZ290LCBub256ZXJvIGtleSBhdCBlbmQgbWVhbnMga2V5cyBkaWZmZXJcbiAgICBjb25zdCB1bmlxID0ge307XG4gICAgT2JqZWN0LmtleXMoZXhwKS5mb3JFYWNoKCB4ID0+IHVuaXFbeF0gPSAxICk7XG4gICAgT2JqZWN0LmtleXMoZ290KS5mb3JFYWNoKCB4ID0+IHVuaXFbeF0gPSAodW5pcVt4XSB8fCAwKSAtIDEgKTtcbiAgICBmb3IgKGxldCB4IGluIHVuaXEpIHtcbiAgICAgICAgaWYgKHVuaXFbeF0gIT09IDApXG4gICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG4gICAgfVxuICAgIFxuICAgIC8vIG5vdyB0eXBlb2YsIG9iamVjdCB0eXBlLCBhbmQgb2JqZWN0IGtleXMgYXJlIHRoZSBzYW1lLlxuICAgIC8vIHJlY3Vyc2UuXG4gICAgZm9yIChsZXQgaSBpbiBleHApIHtcbiAgICAgICAgX2RlZXAoIGdvdFtpXSwgZXhwW2ldLCBvcHRpb25zLCBwYXRoKydbJytleHBsYWluKGkpKyddJywgc2VlbkwsIHNlZW5SICk7XG4gICAgICAgIGlmIChvcHRpb25zLm1heDw9b3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH07XG4gICAgcmV0dXJuO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IFJlcG9ydCB9ID0gcmVxdWlyZSAoICcuL3JlcG9ydC5qcycgKTtcbmNvbnN0IG5vb3AgPSAoKT0+e307XG5cbmNsYXNzIERCQyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuX3ByZSAgICA9IG5vb3A7XG4gICAgICAgIHRoaXMuX3Bvc3QgICA9IG5vb3A7XG4gICAgICAgIHRoaXMuX29uZmFpbCA9IHJlcG9ydCA9PiByZXBvcnQuZ2V0VGhyb3duKCk7XG4gICAgICAgIHRoaXMuX29ucG9zdCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcG9zdChjb2RlKSB7XG4gICAgICAgIGlmIChjb2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wb3N0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYoIHR5cGVvZiBjb2RlICE9PSAnZnVuY3Rpb24nIClcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Bvc3QtY29uZGl0aW9uIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICAgICAgdGhpcy5fcG9zdCA9IGNvZGU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbiAgICBwcmUoY29kZSkge1xuICAgICAgICBpZiAoY29kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYoIHR5cGVvZiBjb2RlICE9PSAnZnVuY3Rpb24nIClcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3ByZS1jb25kaXRpb24gbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgICAgICB0aGlzLl9wcmUgPSBjb2RlO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZGVjb3JhdGUob3JpZykge1xuICAgICAgICAvLyBjbG9zZSBhcm91bmQgdGhlc2UgdmFyc1xuICAgICAgICBjb25zdCBwcmUgICAgPSB0aGlzLl9wcmU7XG4gICAgICAgIGNvbnN0IHBvc3QgICA9IHRoaXMuX3Bvc3Q7XG4gICAgICAgIGNvbnN0IG9uZmFpbCA9IHRoaXMuX29uZmFpbDtcbiAgICAgICAgY29uc3Qgb25wb3N0ID0gdGhpcy5fb25wb3N0IHx8IHRoaXMuX29uZmFpbDtcblxuICAgICAgICAvLyBubyBhcnJvdyBmdW5jdGlvbiB0byBnZXQgY29ycmVjdCAndGhpcycgb2JqZWN0XG4gICAgICAgIGNvbnN0IGNvZGUgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICAgICAgY29uc3QgclByZSA9IG5ldyBSZXBvcnQoKTtcbiAgICAgICAgICAgIHByZS5hcHBseSggdGhpcywgWyByUHJlLCB1bmRlZmluZWQsIC4uLmFyZ3MgXSApO1xuICAgICAgICAgICAgaWYoIXJQcmUuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgIG9uZmFpbChyUHJlLnNldFRpdGxlKCdwcmUtY29uZGl0aW9uIGZhaWxlZCcpKTtcbiAgICAgICAgICAgIGNvbnN0IHJldCA9IG9yaWcuYXBwbHkoIHRoaXMsIGFyZ3MgKTtcbiAgICAgICAgICAgIGNvbnN0IHJQb3N0ID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICAgICAgcG9zdC5hcHBseSggdGhpcywgWyByUG9zdCwgcmV0LCAuLi5hcmdzIF0gKTtcbiAgICAgICAgICAgIGlmKCFyUG9zdC5nZXRQYXNzKCkpXG4gICAgICAgICAgICAgICAgb25wb3N0KHJQb3N0LnNldFRpdGxlKCdwb3N0LWNvbmRpdGlvbiBmYWlsZWQnKSk7XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9XG5cbiAgICAgICAgY29kZS5vcmlnID0gb3JpZztcbiAgICAgICAgY29kZS5wcmUgID0gcHJlO1xuICAgICAgICBjb2RlLnBvc3QgPSBwb3N0O1xuXG4gICAgICAgIHJldHVybiBjb2RlO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IERCQyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGNhbGxlckluZm8sIGV4cGxhaW4sIG1ha2VFcnJvciB9ID0gcmVxdWlyZSggJy4vdXRpbC5qcycgKTtcblxuLyoqXG4gKiAgIEBjYWxsYmFjayBDb250cmFjdFxuICogICBAbWVtYmVyT2YgdXRpbGl0aWVzXG4gKiAgIEBkZXNjIEEgY29kZSBibG9jayBjb250YWluaW5nIG9uZSBvciBtb3JlIGNvbmRpdGlvbiBjaGVja3MuXG4gKiAgIEEgY2hlY2sgaXMgcGVyZm9ybWVkIGJ5IGNhbGxpbmcgb25lIG9mIGEgZmV3IHNwZWNpYWwgbWV0aG9kc1xuICogICAoZXF1YWwsIG1hdGNoLCBkZWVwRXF1YWwsIHR5cGUgZXRjKVxuICogICBvbiB0aGUgUmVwb3J0IG9iamVjdC5cbiAqICAgQ29udHJhY3RzIG1heSBiZSBuZXN0ZWQgdXNpbmcgdGhlICduZXN0ZWQnIG1ldGhvZCB3aGljaCBhY2NlcHRzXG4gKiAgIGFub3RoZXIgY29udHJhY3QgYW5kIHJlY29yZHMgYSBwYXNzL2ZhaWx1cmUgaW4gdGhlIHBhcmVudCBhY2NvcmRpbmdseS5xXG4gKiAgIEEgY29udHJhY3QgaXMgYWx3YXlzIGV4ZWN1dGVkIHRvIHRoZSBlbmQuXG4gKiAgIEBwYXJhbSB7UmVwb3J0fSBvayBBbiBvYmplY3QgdGhhdCByZWNvcmRzIGNoZWNrIHJlc3VsdHMuXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzXG4gKiAgIChlLmcuIGRhdGEgc3RydWN0dXJlIHRvIGJlIHZhbGlkYXRlZClcbiAqICAgQHJldHVybnMge3ZvaWR9IFJldHVybmVkIHZhbHVlIGlzIGlnbm9yZWQuXG4gKi9cblxuLyoqXG4gKiBAcHVibGljXG4gKiBAY2xhc3NkZXNjXG4gKiBUaGUgY29yZSBvZiB0aGUgcmVmdXRlIGxpYnJhcnksIHRoZSByZXBvcnQgb2JqZWN0IGNvbnRhaW5zIGluZm9cbiAqIGFib3V0IHBhc3NpbmcgYW5kIGZhaWxpbmcgY29uZGl0aW9ucy5cbiAqL1xuY2xhc3MgUmVwb3J0IHtcbiAgICAvLyBzZXR1cFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9jb3VudCAgICAgPSAwO1xuICAgICAgICB0aGlzLl9mYWlsQ291bnQgPSAwO1xuICAgICAgICB0aGlzLl9kZXNjciAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fZXZpZGVuY2UgID0gW107XG4gICAgICAgIHRoaXMuX3doZXJlICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9jb25kTmFtZSAgPSBbXTtcbiAgICAgICAgdGhpcy5faW5mbyAgICAgID0gW107XG4gICAgICAgIHRoaXMuX25lc3RlZCAgICA9IFtdO1xuICAgICAgICB0aGlzLl9wZW5kaW5nICAgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuX29uRG9uZSAgICA9IFtdO1xuICAgICAgICB0aGlzLl9kb25lICAgICAgPSBmYWxzZTtcbiAgICAgICAgLy8gVE9ETyBhZGQgY2FsbGVyIGluZm8gYWJvdXQgdGhlIHJlcG9ydCBpdHNlbGZcbiAgICB9XG5cbiAgICAvLyBzZXR1cCBtZXRob2RzIC0gbXVzdCBiZSBjaGFpbmFibGVcblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBTZXQgaW5mb3JtYXRpb25hbCBtZXNzYWdlIGFib3V0IHRoZSBvdmVyYWxsIHB1cnBvc2Ugb2YgdGhpcyBjb250cmFjdFxuICAgICAqICBAcGFyYW0ge1N0cmluZ30gdGl0bGUgLSB0aGUgbWVzc2FnZSBpbiBxdWVzdGlvblxuICAgICAqICBAcmV0dXJucyB7UmVwb3J0fSB0aGlzXG4gICAgICovXG4gICAgc2V0VGl0bGUoc3RyKSB7XG4gICAgICAgIHRoaXMuX3RpdGxlID0gc3RyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgb25Eb25lKGZuKSB7XG4gICAgICAgIHRoaXMuX29uRG9uZS5wdXNoKGZuKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8vIHJ1bm5pbmdcbiAgICAvLyBUT0RPIGVpdGhlciBhc3luYygpIHNob3VsZCBzdXBwb3J0IGFkZGl0aW9uYWwgYXJncywgb3IgcnVuKCkgc2hvdWxkbid0XG4gICAgcnVuKC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICBjb25zdCBibG9jayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhc3QgYXJndW1lbnQgb2YgcnVuKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLCBub3QgJyt0eXBlb2YoYmxvY2spKTtcbiAgICAgICAgYmxvY2soIHRoaXMsIC4uLmFyZ3MgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gVE9ETyBlaXRoZXIgYXN5bmMoKSBzaG91bGQgc3VwcG9ydCBhZGRpdGlvbmFsIGFyZ3MsIG9yIHJ1bigpIHNob3VsZG4ndFxuICAgIGFzeW5jKHRpbWVvdXQsIGJsb2NrKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KFxuICAgICAgICAgICAgICAgICgpID0+IHJlamVjdChuZXcgRXJyb3IoXCJDb250cmFjdCBleGVjdXRpb24gdG9vayB0b28gbG9uZ1wiKSksXG4gICAgICAgICAgICAgICAgdGltZW91dFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRoaXMub25Eb25lKGFyZyA9PiB7Y2xlYXJUaW1lb3V0KHRpbWVyKTsgcmVzb2x2ZShhcmcpfSk7XG4gICAgICAgICAgICBibG9jayh0aGlzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSW4gdGhlb3J5LCBoYXZpbmcgY29uc3Qgbj1uZXh0KCk7IHNldFJlc3VsdChuLiAuLi4pXG4gICAgLy8gc2hvdWxkIGFsbG93IGZvciBhc3luYyBjb25kaXRpb25zIGluIHRoZSBmdXR1cmVcbiAgICAvLyBpZiBhdCBhbGwgcG9zc2libGUgd2l0aG91dCBncmVhdCBzYWNyaWZpY2VzLlxuICAgIG5leHQoKSB7XG4gICAgICAgIHRoaXMuX2xvY2soKTtcbiAgICAgICAgcmV0dXJuICsrdGhpcy5fY291bnQ7XG4gICAgfVxuXG4gICAgc2V0UmVzdWx0IChuLCBldmlkZW5jZSwgZGVzY3IsIGNvbmROYW1lLCB3aGVyZSkge1xuICAgICAgICBpZighdGhpcy5fcGVuZGluZy5oYXMobikpXG4gICAgICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIHRoaXMuX3BlbmRpbmcuZGVsZXRlKG4pO1xuICAgICAgICBpZiAobiA+IHRoaXMuX2NvdW50KVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnQXR0ZW1wdCB0byBzZXQgY29uZGl0aW9uIGJleW9uZCBjaGVjayBjb3VudCcpO1xuICAgICAgICBpZiAoZGVzY3IpXG4gICAgICAgICAgICB0aGlzLl9kZXNjcltuXSA9IGRlc2NyO1xuICAgICAgICAvLyBwYXNzIC0gcmV0dXJuIEFTQVBcbiAgICAgICAgaWYgKCFldmlkZW5jZSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBuZXN0ZWQgcmVwb3J0IG5lZWRzIHNwZWNpYWwgaGFuZGxpbmdcbiAgICAgICAgaWYgKGV2aWRlbmNlIGluc3RhbmNlb2YgUmVwb3J0KSB7XG4gICAgICAgICAgICB0aGlzLl9uZXN0ZWRbbl0gPSBldmlkZW5jZTtcbiAgICAgICAgICAgIGlmIChldmlkZW5jZS5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXZpZGVuY2UuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIHNob3J0LWNpcmN1aXQgaWYgcG9zc2libGVcbiAgICAgICAgICAgICAgICBldmlkZW5jZSA9IFtdOyAvLyBoYWNrIC0gZmFpbGluZyB3aXRob3V0IGV4cGxhbmF0aW9uXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5lc3RlZCBjb250cmFjdCBpcyBpbiBhc3luYyBtb2RlIC0gY29lcmNlIGludG8gYSBwcm9taXNlXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycnkgPSBldmlkZW5jZTtcbiAgICAgICAgICAgICAgICBldmlkZW5jZSA9IG5ldyBQcm9taXNlKCBkb25lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY3Vycnkub25Eb25lKCBkb25lICk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwZW5kaW5nIC0gd2UncmUgaW4gYXN5bmMgbW9kZVxuICAgICAgICBpZiAoZXZpZGVuY2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nLmFkZChuKTtcbiAgICAgICAgICAgIHdoZXJlID0gd2hlcmUgfHwgY2FsbGVySW5mbygyKTsgLy8gbXVzdCByZXBvcnQgYWN0dWFsIGNhbGxlciwgbm90IHRoZW5cbiAgICAgICAgICAgIGV2aWRlbmNlLnRoZW4oIHggPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0UmVzdWx0KG4sIHgsIGRlc2NyLCBjb25kTmFtZSwgd2hlcmUgKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgY2Igb2YgdGhpcy5fb25Eb25lKVxuICAgICAgICAgICAgICAgICAgICAgICAgY2IodGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBsaXN0aWZ5ICYgc3RyaW5naWZ5IGV2aWRlbmNlLCBzbyB0aGF0IGl0IGRvZXNuJ3QgY2hhbmdlIHBvc3QtZmFjdHVtXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShldmlkZW5jZSkpXG4gICAgICAgICAgICBldmlkZW5jZSA9IFsgZXZpZGVuY2UgXTtcbiAgICAgICAgdGhpcy5fZXZpZGVuY2Vbbl0gPSBldmlkZW5jZS5tYXAoIHg9Pl9leHBsYWluKHgsIEluZmluaXR5KSApO1xuICAgICAgICB0aGlzLl93aGVyZVtuXSAgICA9IHdoZXJlIHx8IGNhbGxlckluZm8oMik7XG4gICAgICAgIHRoaXMuX2NvbmROYW1lW25dID0gY29uZE5hbWU7XG4gICAgICAgIHRoaXMuX2ZhaWxDb3VudCsrO1xuXG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBBcHBlbmQgYW4gaW5mb3JtYXRpb25hbCBtZXNzYWdlIHRvIHRoZSByZXBvcnQuXG4gICAgICogTm9uLXN0cmluZyB2YWx1ZXMgd2lsbCBiZSBzdHJpbmdpZmllZCB2aWEgZXhwbGFpbigpLlxuICAgICAqIEBwYXJhbSB7QW55fSBtZXNzYWdlXG4gICAgICogQHJldHVybnMge1JlcG9ydH0gY2hhaW5hYmxlXG4gICAgICovXG4gICAgaW5mbyggLi4ubWVzc2FnZSApIHtcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICBpZiAoIXRoaXMuX2luZm9bdGhpcy5fY291bnRdKVxuICAgICAgICAgICAgdGhpcy5faW5mb1t0aGlzLl9jb3VudF0gPSBbXTtcbiAgICAgICAgdGhpcy5faW5mb1t0aGlzLl9jb3VudF0ucHVzaCggbWVzc2FnZS5tYXAoIHM9Pl9leHBsYWluKHMpICkuam9pbihcIiBcIikgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgZG9uZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9kb25lKSB7XG4gICAgICAgICAgICB0aGlzLl9kb25lID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmICghdGhpcy5fcGVuZGluZy5zaXplKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgY2Igb2YgdGhpcy5fb25Eb25lKVxuICAgICAgICAgICAgICAgICAgICBjYih0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gcXVlcnlpbmdcbiAgICBnZXRUaXRsZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RpdGxlOyAvL0pGWUlcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogICBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBnZXREb25lKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZG9uZSAmJiAhdGhpcy5fcGVuZGluZy5zaXplOyAvLyBpcyBpdCBldmVuIG5lZWRlZD9cbiAgICB9XG5cbiAgICBfbG9jayAoKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIGNvbnRyYWN0Jyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBXaXRob3V0IGFyZ3VtZW50IHJldHVybnMgd2hldGhlciB0aGUgY29udHJhY3Qgd2FzIGZ1bGZpbGxlZC5cbiAgICAgKiAgIEFzIGEgc3BlY2lhbCBjYXNlLCBpZiBubyBjaGVja3Mgd2VyZSBydW4gYW5kIHRoZSBjb250cmFjdCBpcyBmaW5pc2hlZCxcbiAgICAgKiAgIHJldHVybnMgZmFsc2UsIGFzIGluIFwic29tZW9uZSBtdXN0IGhhdmUgZm9yZ290dGVuIHRvIGV4ZWN1dGVcbiAgICAgKiAgIHBsYW5uZWQgY2hlY2tzLiBVc2UgcGFzcygpIGlmIG5vIGNoZWNrcyBhcmUgcGxhbm5lZC5cbiAgICAgKlxuICAgICAqICAgSWYgYSBwYXJhbWV0ZXIgaXMgZ2l2ZW4sIHJldHVybiB0aGUgc3RhdHVzIG9mIG4tdGggY2hlY2sgaW5zdGVhZC5cbiAgICAgKiAgIEBwYXJhbSB7aW50ZWdlcn0gblxuICAgICAqICAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0UGFzcyhuKSB7XG4gICAgICAgIGlmIChuID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZmFpbENvdW50ID09PSAwICYmICghdGhpcy5nZXREb25lKCkgfHwgdGhpcy5fY291bnQgPiAwKTtcbiAgICAgICAgcmV0dXJuIChuID4gMCAmJiBuIDw9IHRoaXMuX2NvdW50KSA/ICF0aGlzLl9ldmlkZW5jZVtuXSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgcGVyZm9ybWVkLlxuICAgICAqICAgQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBXaGV0aGVyIHRoZSBsYXN0IGNoZWNrIHdhcyBhIHN1Y2Nlc3MuXG4gICAgICogIFRoaXMgaXMganVzdCBhIHNob3J0Y3V0IGZvciBmb28uZ2V0RGV0YWlscyhmb28uZ2V0Q291bnQpLnBhc3NcbiAgICAgKiAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgbGFzdCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50ID8gIXRoaXMuX2V2aWRlbmNlW3RoaXMuX2NvdW50XSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgZmFpbGluZy5cbiAgICAgKiAgIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0RmFpbENvdW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZmFpbENvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgUmV0dXJuIGEgc3RyaW5nIG9mIGZhaWxpbmcvcGFzc2luZyBjaGVja3MuXG4gICAgICogICBUaGlzIG1heSBiZSB1c2VmdWwgZm9yIHZhbGlkYXRpbmcgY3VzdG9tIGNvbmRpdGlvbnMuXG4gICAgICogICBDb25zZWN1dGl2ZSBwYXNzaW5nIGNoZWNrYSBhcmUgcmVwcmVzZW50ZWQgYnkgbnVtYmVycy5cbiAgICAgKiAgIEEgY2FwaXRhbCBsZXR0ZXIgaW4gdGhlIHN0cmluZyByZXByZXNlbnRzIGZhaWx1cmUuXG4gICAgICogICBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIHBhc3NpbmcgY2hlY2tzXG4gICAgICogICBcInIoMTApXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBjaGVja3Mgd2l0aCAxIGZhaWx1cmUgaW4gdGhlIG1pZGRsZVxuICAgICAqICAgXCJyKDUsTiw0KVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgY2hlY2tzIGluY2x1ZGluZyBhIG5lc3RlZCBjb250cmFjdFxuICAgICAqICAgXCJyKDMscigxLE4pLDYpXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyBubyBjaGVja3Mgd2VyZSBydW4gLSBhdXRvLWZhaWxcbiAgICAgKiAgIFwicihaKVwiXG4gICAgICovXG4gICAgZ2V0R2hvc3QoKSB7XG4gICAgICAgIGNvbnN0IGdob3N0ID0gW107XG4gICAgICAgIGxldCBzdHJlYWsgPSAwO1xuICAgICAgICBmb3IgKGxldCBpPTE7IGkgPD0gdGhpcy5fY291bnQ7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2V2aWRlbmNlW2ldIHx8IHRoaXMuX25lc3RlZFtpXSkge1xuICAgICAgICAgICAgICAgIGlmIChzdHJlYWspIGdob3N0LnB1c2goc3RyZWFrKTtcbiAgICAgICAgICAgICAgICBzdHJlYWsgPSAwO1xuICAgICAgICAgICAgICAgIGdob3N0LnB1c2goIHRoaXMuX25lc3RlZFtpXSA/IHRoaXMuX25lc3RlZFtpXS5nZXRHaG9zdCgpIDogJ04nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RyZWFrKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0cmVhaykgZ2hvc3QucHVzaChzdHJlYWspO1xuICAgICAgICBpZiAoZ2hvc3QubGVuZ3RoID09PSAwICYmICF0aGlzLmdldFBhc3MoKSlcbiAgICAgICAgICAgIGdob3N0LnB1c2goJ1onKTtcbiAgICAgICAgcmV0dXJuICdyKCcrZ2hvc3Quam9pbignLCcpKycpJztcbiAgICB9XG5cbiAgICBnZXRUZXh0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRMaW5lcygpLmpvaW4oJ1xcbicpO1xuICAgIH1cblxuICAgIGdldExpbmVzKGluZGVudD0nJykge1xuICAgICAgICBjb25zdCBvdXQgPSBbaW5kZW50ICsgJ3IoJ107XG4gICAgICAgIGNvbnN0IGxhc3QgPSBpbmRlbnQgKyAnKSc7XG4gICAgICAgIGluZGVudCA9IGluZGVudCArICcgICAgJztcblxuICAgICAgICBjb25zdCBwYWQgPSBwcmVmaXggPT4gcyA9PiBpbmRlbnQgKyBwcmVmaXggKyAnICcgKyBzO1xuXG4gICAgICAgIGlmICh0aGlzLl9pbmZvWzBdKVxuICAgICAgICAgICAgb3V0LnB1c2goIC4uLnRoaXMuX2luZm9bMF0ubWFwKCBwYWQoJzsnKSApICk7XG4gICAgICAgIGZvciAobGV0IG4gPSAxOyBuPD10aGlzLl9jb3VudDsgbisrKSB7XG4gICAgICAgICAgICBvdXQucHVzaCggaW5kZW50ICsgKHRoaXMuX2V2aWRlbmNlW25dID8gJyEnOicnKVxuICAgICAgICAgICAgICAgICtuKyh0aGlzLl9kZXNjcltuXSA/ICcuICcrdGhpcy5fZGVzY3Jbbl0gOiAnLicpICk7XG4gICAgICAgICAgICBpZiggdGhpcy5fbmVzdGVkW25dKSB7XG4gICAgICAgICAgICAgICAgb3V0LnB1c2goIC4uLnRoaXMuX25lc3RlZFtuXS5nZXRMaW5lcyhpbmRlbnQpICk7XG4gICAgICAgICAgICB9IGVsc2UgaWYoIHRoaXMuX2V2aWRlbmNlW25dICkge1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKCBpbmRlbnQgKyAnICAgIF4gQ29uZGl0aW9uICcrKHRoaXMuX2NvbmROYW1lW25dIHx8ICdjaGVjaycpXG4gICAgICAgICAgICAgICAgICAgICsnIGZhaWxlZCBhdCAnK3RoaXMuX3doZXJlW25dICk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXZpZGVuY2Vbbl0uZm9yRWFjaCggcmF3ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIG11bHRpbGluZSBldmlkZW5jZVxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPIHRoaXMgaXMgcGVybCB3cml0dGVuIGluIEpTLCByZXdyaXRlIG1vcmUgY2xlYXJseVxuICAgICAgICAgICAgICAgICAgICBsZXRbIF8sIHByZWZpeCwgcyBdID0gcmF3Lm1hdGNoKCAvXihbLSteXSApPyguKj8pXFxuPyQvcyApO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXByZWZpeCkgcHJlZml4ID0gJ14gJztcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzLm1hdGNoKC9cXG4vKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goIGluZGVudCArICcgICAgJyArIHByZWZpeCArIHMgKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMuc3BsaXQoJ1xcbicpLmZvckVhY2goXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFydCA9PiBvdXQucHVzaCggaW5kZW50ICsgJyAgICAnICsgcHJlZml4ICsgcGFydCApKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBpZiAodGhpcy5faW5mb1tuXSlcbiAgICAgICAgICAgICAgICBvdXQucHVzaCggLi4udGhpcy5faW5mb1tuXS5tYXAoIHBhZCgnOycpICkgKTtcbiAgICAgICAgfTtcbiAgICAgICAgb3V0LnB1c2gobGFzdCk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIHJldHVybnMgYSBwbGFpbiBzZXJpYWxpemFibGUgb2JqZWN0XG4gICAgICogIEByZXR1cm5zIHtPYmplY3R9XG4gICAgICovXG4gICAgdG9KU09OKCkge1xuICAgICAgICBjb25zdCBuID0gdGhpcy5nZXRDb3VudCgpO1xuICAgICAgICBjb25zdCBkZXRhaWxzID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpPD1uOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLmdldERldGFpbHMoaSk7XG4gICAgICAgICAgICAvLyBzdHJpcCBleHRyYSBrZXlzXG4gICAgICAgICAgICBmb3IoIGxldCBrZXkgaW4gbm9kZSApIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZVtrZXldID09PSB1bmRlZmluZWQgfHwgKEFycmF5LmlzQXJyYXkobm9kZVtrZXldKSAmJiBub2RlW2tleV0ubGVuZ3RoID09PSAwKSlcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG5vZGVba2V5XTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBkZXRhaWxzLnB1c2gobm9kZSk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwYXNzOiAgdGhpcy5nZXRQYXNzKCksXG4gICAgICAgICAgICBjb3VudDogdGhpcy5nZXRDb3VudCgpLFxuICAgICAgICAgICAgdGl0bGU6IHRoaXMuZ2V0VGl0bGUoKSxcbiAgICAgICAgICAgIGRldGFpbHMsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFRhcCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBSZXR1cm5zIHJlcG9ydCBzdHJpbmdpZmllZCBhcyBUQVAgZm9ybWF0XG4gICAgICogIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0VGFwKG4pIHtcbiAgICAgICAgY29uc3QgdGFwID0gbiA9PT0gdW5kZWZpbmVkID8gdGhpcy5nZXRUYXBMaW5lcygpIDogdGhpcy5nZXRUYXBFbnRyeShuKTtcbiAgICAgICAgdGFwLnB1c2goJycpO1xuICAgICAgICByZXR1cm4gdGFwLmpvaW4oJ1xcbicpO1xuICAgIH1cblxuICAgIGdldFRhcExpbmVzKG4pIHtcbiAgICAgICAgLy8gVEFQIGZvciBub3csIHVzZSBhbm90aGVyIGZvcm1hdCBsYXRlciBiZWNhdXNlIFwicGVybCBpcyBzY2FyeVwiXG4gICAgICAgIGNvbnN0IHRhcCA9IFsgJzEuLicrdGhpcy5fY291bnQgXTtcbiAgICAgICAgaWYgKHRoaXMuZ2V0VGl0bGUoKSlcbiAgICAgICAgICAgIHRhcC5wdXNoKCcjICcrdGhpcy5nZXRUaXRsZSgpKTtcbiAgICAgICAgLy8gVE9ETyBpbmZvWzBdXG4gICAgICAgIGNvbnN0IHByZWZhY2UgPSB0aGlzLmdldERldGFpbHMoMCk7XG4gICAgICAgIHRhcC5wdXNoKCAuLi5wcmVmYWNlLmluZm8ubWFwKCBzID0+ICcjICcrcyApICk7XG4gICAgICAgIGZvciggbGV0IGkgPSAxOyBpIDw9IHRoaXMuX2NvdW50OyBpKysgKVxuICAgICAgICAgICAgdGFwLnB1c2goIC4uLiB0aGlzLmdldFRhcEVudHJ5KGkpICk7XG4gICAgICAgIGlmICghdGhpcy5nZXRQYXNzKCkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmdldENvdW50KCkgPiAwKVxuICAgICAgICAgICAgICAgIHRhcC5wdXNoKCcjIEZhaWxlZCAnK3RoaXMuZ2V0RmFpbENvdW50KCkrJy8nK3RoaXMuZ2V0Q291bnQoKSsgJyBjb25kaXRpb25zJyk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgdGFwLnB1c2goJyMgTm8gY2hlY2tzIHdlcmUgcnVuLCBjb25zaWRlciB1c2luZyBwYXNzKCkgaWYgdGhhdFxcJ3MgZGVsaWJlcmF0ZScpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdGFwO1xuICAgIH1cblxuICAgIGdldFRhcEVudHJ5KG4pIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHR5cGVvZihuKSA9PT0gJ29iamVjdCcgPyBuIDogdGhpcy5nZXREZXRhaWxzKG4pO1xuICAgICAgICBjb25zdCB0YXAgPSBbXTtcbiAgICAgICAgaWYgKGRhdGEubmVzdGVkKSB7XG4gICAgICAgICAgICB0YXAucHVzaCggJyMgc3ViY29udHJhY3Q6JysoZGF0YS5uYW1lPycgJytkYXRhLm5hbWU6JycpICk7XG4gICAgICAgICAgICB0YXAucHVzaCggLi4uIGRhdGEubmVzdGVkLmdldFRhcExpbmVzKCkubWFwKCBzID0+ICcgICAgJytzICkpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLnBlbmRpbmcpIHtcbiAgICAgICAgICAgIHRhcC5wdXNoKCAncGVuZGluZyAnK2RhdGEubisnIDwuLi4+JyApO1xuICAgICAgICAgICAgcmV0dXJuIHRhcDtcbiAgICAgICAgfVxuICAgICAgICB0YXAucHVzaCgoZGF0YS5wYXNzPycnOidub3QgJykgKyAnb2sgJyArIGRhdGEublxuICAgICAgICAgICAgKyAoZGF0YS5uYW1lID8gJyAtICcrZGF0YS5uYW1lIDogJycpKTtcbiAgICAgICAgaWYgKCFkYXRhLnBhc3MpXG4gICAgICAgICAgICB0YXAucHVzaCgnIyBDb25kaXRpb24nKyhkYXRhLmNvbmQgPyAnICcrZGF0YS5jb25kIDogJycpKycgZmFpbGVkIGF0ICcrZGF0YS53aGVyZSk7XG4gICAgICAgIHRhcC5wdXNoKC4uLmRhdGEuZXZpZGVuY2UubWFwKHM9PicjICcrcykpO1xuICAgICAgICB0YXAucHVzaCguLi5kYXRhLmluZm8ubWFwKHM9PicjICcrcykpO1xuICAgICAgICByZXR1cm4gdGFwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgUmV0dXJucyBkZXRhaWxlZCByZXBvcnQgb24gYSBzcGVjaWZpYyBjaGVja1xuICAgICAqICAgQHBhcmFtIHtpbnRlZ2VyfSBuIC0gY2hlY2sgbnVtYmVyLCBtdXN0IGJlIDw9IGdldENvdW50KClcbiAgICAgKiAgIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICovXG4gICAgZ2V0RGV0YWlscyhuKSB7XG4gICAgICAgIC8vIFRPRE8gdmFsaWRhdGUgblxuXG4gICAgICAgIC8vIHVnbHkgYnV0IHdoYXQgY2FuIEkgZG9cbiAgICAgICAgaWYgKG4gPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbjogICAgMCxcbiAgICAgICAgICAgICAgICBpbmZvOiB0aGlzLl9pbmZvWzBdIHx8IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBldmlkZW5jZSA9IHRoaXMuX2V2aWRlbmNlW25dO1xuICAgICAgICBpZiAoZXZpZGVuY2UgJiYgIUFycmF5LmlzQXJyYXkoZXZpZGVuY2UpKVxuICAgICAgICAgICAgZXZpZGVuY2UgPSBbZXZpZGVuY2VdO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuOiAgICAgICAgbixcbiAgICAgICAgICAgIG5hbWU6ICAgICB0aGlzLl9kZXNjcltuXSB8fCAnJyxcbiAgICAgICAgICAgIHBhc3M6ICAgICAhZXZpZGVuY2UsXG4gICAgICAgICAgICBldmlkZW5jZTogZXZpZGVuY2UgfHwgW10sXG4gICAgICAgICAgICB3aGVyZTogICAgdGhpcy5fd2hlcmVbbl0sXG4gICAgICAgICAgICBjb25kOiAgICAgdGhpcy5fY29uZE5hbWVbbl0sXG4gICAgICAgICAgICBpbmZvOiAgICAgdGhpcy5faW5mb1tuXSB8fCBbXSxcbiAgICAgICAgICAgIG5lc3RlZDogICB0aGlzLl9uZXN0ZWRbbl0sXG4gICAgICAgICAgICBwZW5kaW5nOiAgdGhpcy5fcGVuZGluZy5oYXMobiksXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIENvbnZlcnQgcmVwb3J0IHRvIGFuIEFzc2VydGlvbkVycm9yIChpZiBhdmFpbGFibGUpIG9yIGp1c3QgRXJyb3IuXG4gICAgICogIEBwYXJhbSB7bnVtYmVyfSBbbl0gTnVtYmVyIG9mIGNoZWNrIHRvIGNvbnZlcnQgdG8gZXhjZXB0aW9uLlxuICAgICAqICBDdXJyZW50IGVycm9yIGZvcm1hdCBpcyBUQVAsIHRoaXMgbWF5IGNoYW5nZSBpbiB0aGUgZnV0dXJlLlxuICAgICAqICBJZiAwIG9yIHVuc3BlY2lmaWVkLCBjb252ZXJ0IHRoZSB3aG9sZSByZXBvcnQuXG4gICAgICogIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc11cbiAgICAgKiAgQHBhcmFtIHtib29sZWFufSBvcHRpb25zLnBhc3MgSWYgZmFsc2UgKHRoZSBkZWZhdWx0KSwgcmV0dXJuIG5vdGhpbmdcbiAgICAgKiAgaWYgdGhlIHJlcG9ydCBpcyBwYXNzaW5nLlxuICAgICAqICBAcmV0dXJucyB7RXJyb3J8dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGdldEVycm9yKG4sIG9wdGlvbnM9e30pIHtcbiAgICAgICAgaWYgKCFuKSB7XG4gICAgICAgICAgICAvLyBubyBlbnRyeSBnaXZlblxuICAgICAgICAgICAgaWYgKCFvcHRpb25zLnBhc3MgJiYgdGhpcy5nZXRQYXNzKCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICByZXR1cm4gbWFrZUVycm9yKHtcbiAgICAgICAgICAgICAgICBhY3R1YWw6ICAgdGhpcy5nZXRUYXAoKSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogJycsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogIHRoaXMuZ2V0VGl0bGUoKSxcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ2NvbnRyYWN0JyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGRhdGEgPSB0eXBlb2YgbiA9PT0gJ29iamVjdCcgPyBuIDogdGhpcy5nZXREZXRhaWxzKG4pO1xuXG4gICAgICAgIC8vIG5vIGVycm9yXG4gICAgICAgIGlmICghb3B0aW9ucy5wYXNzICYmIGRhdGEucGFzcylcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICByZXR1cm4gbWFrZUVycm9yKHtcbiAgICAgICAgICAgIGFjdHVhbDogICB0aGlzLmdldFRhcEVudHJ5KGRhdGEpLmpvaW4oJ1xcbicpLFxuICAgICAgICAgICAgZXhwZWN0ZWQ6ICcnLFxuICAgICAgICAgICAgbWVzc2FnZTogIGRhdGEubmFtZSxcbiAgICAgICAgICAgIG9wZXJhdG9yOiBkYXRhLmNvbmQsXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGdldFRocm93bihuLCBvcHRpb25zPXt9KSB7XG4gICAgICAgIC8vIFRPRE8gcmVuYW1lIHRvIGp1c3QgdGhyb3c/XG4gICAgICAgIGNvbnN0IGVyciA9IHRoaXMuZ2V0RXJyb3Iobiwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgfVxufVxuXG4vLyB0aGlzIGlzIGZvciBzdHVmZiBsaWtlIGBvYmplY3QgZm9vID0ge1wiZm9vXCI6NDJ9YFxuLy8gd2UgZG9uJ3Qgd2FudCB0aGUgZXhwbGFuYXRpb24gdG8gYmUgcXVvdGVkIVxuZnVuY3Rpb24gX2V4cGxhaW4oIGl0ZW0sIGRlcHRoICkge1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycgKVxuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICByZXR1cm4gZXhwbGFpbiggaXRlbSwgZGVwdGggKTtcbn07XG5cblJlcG9ydC5wcm90b3R5cGUuZXhwbGFpbiA9IGV4cGxhaW47IC8vIGFsc28gbWFrZSBhdmFpbGFibGUgdmlhIHJlcG9ydFxuXG4vLyBwYXJ0IG9mIGFkZENvbmRpdGlvblxuY29uc3Qga25vd25DaGVja3MgPSBuZXcgU2V0KCk7XG5cbi8qKlxuICogIEBtZW1iZXJPZiByZWZ1dGVcbiAqICBAc3RhdGljXG4gKiAgQGRlc2MgQ3JlYXRlIG5ldyBjaGVjayBtZXRob2QgYXZhaWxhYmxlIHZpYSBhbGwgUmVwb3J0IGluc3RhbmNlc1xuICogIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWUgb2YgdGhlIG5ldyBjb25kaXRpb24uXG4gKiAgTXVzdCBub3QgYmUgcHJlc2VudCBpbiBSZXBvcnQgYWxyZWFkeSwgYW5kIHNob3VsZCBOT1Qgc3RhcnQgd2l0aFxuICogIGdldC4uLiwgc2V0Li4uLCBvciBhZGQuLi4gKHRoZXNlIGFyZSByZXNlcnZlZCBmb3IgUmVwb3J0IGl0c2VsZilcbiAqICBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBDb25maWd1cmluZyB0aGUgY2hlY2sncyBoYW5kbGluZyBvZiBhcmd1bWVudHNcbiAqICBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMuYXJncyBUaGUgcmVxdWlyZWQgbnVtYmVyIG9mIGFyZ3VtZW50c1xuICogIEBwYXJhbSB7aW50ZWdlcn0gW29wdGlvbnMubWluQXJnc10gTWluaW11bSBudW1iZXIgb2YgYXJndW1lbnQgKGRlZmF1bHRzIHRvIGFyZ3MpXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBbb3B0aW9ucy5tYXhBcmdzXSBNYXhpbXVtIG51bWJlciBvZiBhcmd1bWVudCAoZGVmYXVsdHMgdG8gYXJncylcbiAqICBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmhhc09wdGlvbnNdIElmIHRydWUsIGFuIG9wdGlvbmFsIG9iamVjdFxuY2FuIGJlIHN1cHBsaWVkIGFzIGxhc3QgYXJndW1lbnQuIEl0IHdvbid0IGludGVyZmVyZSB3aXRoIGRlc2NyaXB0aW9uLlxuICogIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuZnVuXSBUaGUgbGFzdCBhcmd1bWVudCBpcyBhIGNhbGxiYWNrXG4gKiAgQHBhcmFtIHtGdW5jdGlvbn0gaW1wbGVtZW50YXRpb24gLSBhIGNhbGxiYWNrIHRoYXQgdGFrZXMge2FyZ3N9IGFyZ3VtZW50c1xuICogIGFuZCByZXR1cm5zIGEgZmFsc2V5IHZhbHVlIGlmIGNvbmRpdGlvbiBwYXNzZXNcbiAqICAoXCJub3RoaW5nIHRvIHNlZSBoZXJlLCBtb3ZlIGFsb25nXCIpLFxuICogIG9yIGV2aWRlbmNlIGlmIGl0IGZhaWxzXG4gKiAgKGUuZy4gdHlwaWNhbGx5IGEgZ290L2V4cGVjdGVkIGRpZmYpLlxuICovXG5mdW5jdGlvbiBhZGRDb25kaXRpb24gKG5hbWUsIG9wdGlvbnMsIGltcGwpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiBuYW1lIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXihffGdldFtfQS1aXXxzZXRbX0EtWl0pLykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uIG5hbWUgbXVzdCBub3Qgc3RhcnQgd2l0aCBnZXRfLCBzZXRfLCBvciBfJyk7XG4gICAgLy8gVE9ETyBtdXN0IGRvIHNvbWV0aGluZyBhYm91dCBuYW1lIGNsYXNoZXMsIGJ1dCBsYXRlclxuICAgIC8vIGJlY2F1c2UgZXZhbCBpbiBicm93c2VyIG1heSAoa2luZCBvZiBsZWdpbWl0ZWx5KSBvdmVycmlkZSBjb25kaXRpb25zXG4gICAgaWYgKCFrbm93bkNoZWNrcy5oYXMobmFtZSkgJiYgUmVwb3J0LnByb3RvdHlwZVtuYW1lXSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2QgYWxyZWFkeSBleGlzdHMgaW4gUmVwb3J0OiAnK25hbWUpO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIG9wdGlvbnMnKTtcbiAgICBpZiAodHlwZW9mIGltcGwgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIGltcGxlbWVudGF0aW9uJyk7XG5cbiAgICBjb25zdCBtaW5BcmdzICAgID0gb3B0aW9ucy5taW5BcmdzIHx8IG9wdGlvbnMuYXJncztcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIobWluQXJncykgfHwgbWluQXJncyA8IDApXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYXJncy9taW5BcmdzIG11c3QgYmUgbm9ubmVnYXRpdmUgaW50ZWdlcicpO1xuICAgIGNvbnN0IG1heEFyZ3MgICAgPSBvcHRpb25zLm1heEFyZ3MgfHwgb3B0aW9ucy5hcmdzIHx8IEluZmluaXR5O1xuICAgIGlmIChtYXhBcmdzICE9PSBJbmZpbml0eSAmJiAoIU51bWJlci5pc0ludGVnZXIobWluQXJncykgfHwgbWF4QXJncyA8IG1pbkFyZ3MpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ21heEFyZ3MgbXVzdCBiZSBpbnRlZ2VyIGFuZCBncmVhdGVyIHRoYW4gbWluQXJncywgb3IgSW5maW5pdHknKTtcbiAgICBjb25zdCBkZXNjckZpcnN0ICAgID0gb3B0aW9ucy5kZXNjckZpcnN0IHx8IG9wdGlvbnMuZnVuIHx8IG1heEFyZ3MgPiAxMDtcbiAgICBjb25zdCBoYXNPcHRpb25zICAgID0gISFvcHRpb25zLmhhc09wdGlvbnM7XG4gICAgY29uc3QgbWF4QXJnc1JlYWwgICA9IG1heEFyZ3MgKyAoaGFzT3B0aW9ucyA/IDEgOiAwKTtcblxuICAgIC8vIFRPRE8gYWxlcnQgdW5rbm93biBvcHRpb25zXG5cbiAgICAvLyBUT0RPIHRoaXMgY29kZSBpcyBjbHV0dGVyZWQsIHJld3JpdGVcbiAgICBjb25zdCBjb2RlID0gZnVuY3Rpb24oLi4uYXJncykge1xuICAgICAgICBjb25zdCBkZXNjciA9IGRlc2NyRmlyc3RcbiAgICAgICAgICAgID8gYXJncy5zaGlmdCgpXG4gICAgICAgICAgICA6ICggKGFyZ3MubGVuZ3RoID4gbWF4QXJncyAmJiB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aC0xXSA9PT0gJ3N0cmluZycpID8gYXJncy5wb3AoKSA6IHVuZGVmaW5lZCk7XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IG1heEFyZ3NSZWFsIHx8IGFyZ3MubGVuZ3RoIDwgbWluQXJncylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uICcrbmFtZSsnIG11c3QgaGF2ZSAnK21pbkFyZ3MrJy4uJyttYXhBcmdzUmVhbCsnIGFyZ3VtZW50cyAnKTsgLy8gVE9ET1xuXG4gICAgICAgIGNvbnN0IG4gPSB0aGlzLm5leHQoKTsgLy8gVE9ETyBjYWxsIGl0IGFkdmFuY2UoKSBvciBzbXRoLlxuICAgICAgICBjb25zdCBldmlkZW5jZSA9IGltcGwoIC4uLmFyZ3MgKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0UmVzdWx0KCBuLCBldmlkZW5jZSwgZGVzY3IsIG5hbWUgKTtcbiAgICB9O1xuXG4gICAga25vd25DaGVja3MuYWRkKG5hbWUpO1xuICAgIFJlcG9ydC5wcm90b3R5cGVbbmFtZV0gPSBjb2RlO1xufVxuXG4vLyBUaGUgbW9zdCBiYXNpYyBjb25kaXRpb25zIGFyZSBkZWZpbmVkIHJpZ2h0IGhlcmVcbi8vIGluIG9yZGVyIHRvIGJlIHN1cmUgd2UgY2FuIHZhbGlkYXRlIHRoZSBSZXBvcnQgY2xhc3MgaXRzZWxmLlxuXG4vKipcbiAqICBAbmFtZXNwYWNlIGNvbmRpdGlvbnNcbiAqICBAZGVzYyBDb25kaXRpb24gY2hlY2sgbGlicmFyeS4gVGhlc2UgbWV0aG9kcyBtdXN0IGJlIHJ1biBvbiBhXG4gKiAge0BsaW5rIFJlcG9ydH0gb2JqZWN0LlxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgY2hlY2tcbiAqICAgQGRlc2MgQSBnZW5lcmljIGNoZWNrIG9mIGEgY29uZGl0aW9uLlxuICogICBAcGFyYW0gZXZpZGVuY2UgSWYgZmFsc2UsIDAsICcnLCBvciB1bmRlZmluZWQsIHRoZSBjaGVjayBpcyBhc3N1bWVkIHRvIHBhc3MuXG4gKiAgIE90aGVyd2lzZSBpdCBmYWlscywgYW5kIHRoaXMgYXJndW1lbnQgd2lsbCBiZSBkaXNwbGF5ZWQgYXMgdGhlIHJlYXNvbiB3aHkuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dIFRoZSByZWFzb24gd2h5IHdlIGNhcmUgYWJvdXQgdGhlIGNoZWNrLlxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgcGFzc1xuICogICBAZGVzYyBBbHdheXMgcGFzc2VzLlxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgZmFpbFxuICogICBAZGVzYyBBbHdheXMgZmFpbHMgd2l0aCBhIFwiZmFpbGVkIGRlbGliZXJhdGVseVwiIG1lc3NhZ2UuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBlcXVhbFxuICogICBAZGVzYyBDaGVja3MgaWYgPT09IGhvbGRzIGJldHdlZW4gdHdvIHZhbHVlcy5cbiAqICAgSWYgbm90LCBib3RoIHdpbGwgYmUgc3RyaW5naWZpZWQgYW5kIGRpc3BsYXllZCBhcyBhIGRpZmYuXG4gKiAgIFNlZSBkZWVwRXF1YWwgdG8gY2hlY2sgbmVzdGVkIGRhdGEgc3RydWN0dXJlcyBvdCBvYmplY3RzLlxuICogICBAcGFyYW0ge2FueX0gYWN0dWFsXG4gKiAgIEBwYXJhbSB7YW55fSBleHBlY3RlZFxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgbWF0Y2hcbiAqICAgQGRlc2MgQ2hlY2tzIGlmIGEgc3RyaW5nIG1hdGNoZXMgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKiAgIEBwYXJhbSB7c3RydW5nfSBhY3R1YWxcbiAqICAgQHBhcmFtIHtSZWdFeHB9IGV4cGVjdGVkXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbi8qKlxuICogICBAaW5zdGFuY2VcbiAqICAgQG1lbWJlck9mIGNvbmRpdGlvbnNcbiAqICAgQG1ldGhvZCBuZXN0ZWRcbiAqICAgQGRlc2MgVmVyaWZ5IGEgbmVzdGVkIGNvbnRyYWN0LlxuICogICBAcGFyYW0ge3N0cmluZ30gZGVzY3JpcHRpb25cbiAqICAgQHBhcmFtIHtDb250cmFjdH0gY29udHJhY3RcbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuXG5hZGRDb25kaXRpb24oXG4gICAgJ2NoZWNrJyxcbiAgICB7YXJnczoxfSxcbiAgICB4PT54XG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdwYXNzJyxcbiAgICB7YXJnczowfSxcbiAgICAoKT0+MFxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnZmFpbCcsXG4gICAge2FyZ3M6MH0sXG4gICAgKCk9PidmYWlsZWQgZGVsaWJlcmF0ZWx5J1xuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnZXF1YWwnLFxuICAgIHthcmdzOjJ9LFxuICAgIChhLGIpID0+IGEgPT09IGIgPyAwIDogWyAnLSAnK2V4cGxhaW4oYSksICcrICcgKyBleHBsYWluKGIpIF1cbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ21hdGNoJyxcbiAgICB7YXJnczoyfSxcbiAgICAoYSxyZXgpID0+ICgnJythKS5tYXRjaChyZXgpID8gMCA6IFtcbiAgICAgICAgJ1N0cmluZyAgICAgICAgIDogJythLFxuICAgICAgICAnRG9lcyBub3QgbWF0Y2ggOiAnK3JleFxuICAgIF1cbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ25lc3RlZCcsXG4gICAge2Z1bjoxLG1pbkFyZ3M6MX0sXG4gICAgKC4uLmFyZ3MpID0+IG5ldyBSZXBvcnQoKS5ydW4oLi4uYXJncykuZG9uZSgpXG4pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHsgUmVwb3J0LCBhZGRDb25kaXRpb24sIGV4cGxhaW4gfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBBbm5vdGF0ZWRTZXQgfSA9IHJlcXVpcmUoICcuL3V0aWwvYW5ub3RhdGVkLXNldC5qcycgKTtcblxuLyoqXG4gKiAgIEBuYW1lc3BhY2UgdXRpbGl0aWVzXG4gKiAgIEBkZXNjICBUaGVzZSBmdW5jdGlvbnMgaGF2ZSBub3RoaW5nIHRvIGRvIHdpdGggcmVmdXRlIGFuZCBzaG91bGRcbiAqICAgICAgICAgIGlkZWFsbHkgYmUgaW4gc2VwYXJhdGUgbW9kdWxlcy5cbiAqL1xuXG4vKiBEZXRlcm1pbmUgbi10aCBjYWxsZXIgdXAgdGhlIHN0YWNrICovXG4vKiBJbnNwaXJlZCBieSBQZXJsJ3MgQ2FycCBtb2R1bGUgKi9cbmNvbnN0IGluU3RhY2sgPSAvKFteOlxccygpXSs6XFxkKyg/OjpcXGQrKT8pXFxXKihcXG58JCkvZztcblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBtZW1iZXJPZiB1dGlsaXRpZXNcbiAqICBAZnVuY3Rpb25cbiAqICBAZGVzYyBSZXR1cm5zIHNvdXJjZSBwb3NpdGlvbiBuIGZyYW1lcyB1cCB0aGUgc3RhY2tcbiAqICBAZXhhbXBsZVxuICogIFwiL2Zvby9iYXIuanM6MjU6MTFcIlxuICogIEBwYXJhbSB7aW50ZWdlcn0gZGVwdGggSG93IG1hbnkgZnJhbWVzIHRvIHNraXBcbiAqICBAcmV0dXJucyB7c3RyaW5nfSBzb3VyY2UgZmlsZSwgbGluZSwgYW5kIGNvbHVtbiwgc2VwYXJhdGVkIGJ5IGNvbG9uLlxuICovXG5mdW5jdGlvbiBjYWxsZXJJbmZvKG4pIHtcbiAgICAvKiBhIHRlcnJpYmxlIHJleCB0aGF0IGJhc2ljYWxseSBzZWFyY2hlcyBmb3IgZmlsZS5qczpubm46bm5uIHNldmVyYWwgdGltZXMqL1xuICAgIHJldHVybiAobmV3IEVycm9yKCkuc3RhY2subWF0Y2goaW5TdGFjaylbbisxXS5yZXBsYWNlKC9cXFcqXFxuJC8sICcnKSB8fCAnJylcbn1cblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBpbnN0YW5jUlxuICogIEBtZW1iZXJPZiBSZXBvcnRcbiAqICBAZGVzYyBTdHJpbmdpcnkgb2JqZWN0cyByZWN1cnNpdmVseSB3aXRoIGxpbWl0ZWQgZGVwdGhcbiAqICBhbmQgY2lyY3VsYXIgcmVmZXJlbmNlIHRyYWNraW5nLlxuICogIEdlbmVyYWxseSBKU09OLnN0cmluZ2lmeSBpcyB1c2VkIGFzIHJlZmVyZW5jZTpcbiAqICBzdHJpbmdzIGFyZSBlc2NhcGVkIGFuZCBkb3VibGUtcXVvdGVkOyBudW1iZXJzLCBib29sZWFuLCBhbmQgbnVsbHMgYXJlXG4gKiAgc3RyaW5naWZpZWQgXCJhcyBpc1wiOyBvYmplY3RzIGFuZCBhcnJheXMgYXJlIGRlc2NlbmRlZCBpbnRvLlxuICogIFRoZSBkaWZmZXJlbmNlcyBmb2xsb3c6XG4gKiAgdW5kZWZpbmVkIGlzIHJlcG9ydGVkIGFzICc8dW5kZWY+Jy5cbiAqICBPYmplY3RzIHRoYXQgaGF2ZSBjb25zdHJ1Y3RvcnMgYXJlIHByZWZpeGVkIHdpdGggY2xhc3MgbmFtZXMuXG4gKiAgT2JqZWN0IGFuZCBhcnJheSBjb250ZW50IGlzIGFiYnJldmlhdGVkIGFzIFwiLi4uXCIgYW5kIFwiQ2lyY3VsYXJcIlxuICogIGluIGNhc2Ugb2YgZGVwdGggZXhoYXVzdGlvbiBhbmQgY2lyY3VsYXIgcmVmZXJlbmNlLCByZXNwZWN0aXZlbHkuXG4gKiAgRnVuY3Rpb25zIGFyZSBuYWl2ZWx5IHN0cmluZ2lmaWVkLlxuICogIEBwYXJhbSB7QW55fSB0YXJnZXQgT2JqZWN0IHRvIHNlcmlhbGl6ZS5cbiAqICBAcGFyYW0ge2ludGVnZXJ9IGRlcHRoPTMgRGVwdGggbGltaXQuXG4gKiAgQHJldHVybnMge3N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZXhwbGFpbiggaXRlbSwgZGVwdGg9Mywgb3B0aW9ucz17fSwgcGF0aD0nJCcsIHNlZW49bmV3IEFubm90YXRlZFNldCgpICkge1xuICAgIC8vIHNpbXBsZSB0eXBlc1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpXG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShpdGVtKTsgLy8gZG9uJ3Qgd2FudCB0byBzcGVuZCB0aW1lIHFvdXRpbmdcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdudW1iZXInIHx8IHR5cGVvZiBpdGVtID09PSAnYm9vbGVhbicgfHwgaXRlbSA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuICcnK2l0ZW07XG4gICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCkgcmV0dXJuICc8dW5kZWY+JztcbiAgICBpZiAodHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnKSAvLyBtYXliZSBmdW5jdGlvblxuICAgICAgICByZXR1cm4gJycraXRlbTsgLy8gVE9ETyBkb24ndCBwcmludCBvdXQgYSBsb25nIGZ1bmN0aW9uJ3MgYm9keVxuXG4gICAgLy8gcmVjdXJzZVxuICAgIGNvbnN0IHdoZXJlU2VlbiA9IHNlZW4uaGFzKGl0ZW0pO1xuICAgIGlmICh3aGVyZVNlZW4pIHtcbiAgICAgICAgY29uc3Qgbm90ZSA9ICdDaXJjdWxhcj0nK3doZXJlU2VlbjtcbiAgICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoaXRlbSk/J1sgJytub3RlKycgXSc6J3sgJytub3RlKycgfSc7XG4gICAgfTtcbiAgICBzZWVuID0gc2Vlbi5hZGQoIGl0ZW0sIHBhdGggKTsgLy8gY2xvbmVzIHNlZW5cblxuICAgIGlmIChBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICAgIGlmIChkZXB0aCA8IDEpXG4gICAgICAgICAgICByZXR1cm4gJ1suLi5dJztcbiAgICAgICAgc2Vlbi5hZGQoaXRlbSk7XG4gICAgICAgIC8vIFRPRE8gPHggZW1wdHkgaXRlbXM+XG4gICAgICAgIGNvbnN0IGxpc3QgPSBpdGVtLm1hcChcbiAgICAgICAgICAgICh2YWwsIGluZGV4KSA9PiBleHBsYWluKHZhbCwgZGVwdGgtMSwgb3B0aW9ucywgcGF0aCsnWycraW5kZXgrJ10nLCBzZWVuKVxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gJ1snK2xpc3Quam9pbignLCAnKSsnXSc7IC8vIFRPRE8gY29uZmlndXJhYmxlIHdoaXRlc3BhY2VcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlID0gaXRlbS5jb25zdHJ1Y3RvciAmJiBpdGVtLmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgY29uc3QgcHJlZml4ID0gdHlwZSAmJiB0eXBlICE9PSAnT2JqZWN0JyA/IHR5cGUgKyAnICcgOiAnJztcbiAgICBpZiAoZGVwdGggPCAxKVxuICAgICAgICByZXR1cm4gcHJlZml4ICsgJ3suLi59JztcbiAgICBjb25zdCBsaXN0ID0gT2JqZWN0LmtleXMoaXRlbSkuc29ydCgpLm1hcCgga2V5ID0+IHtcbiAgICAgICAgY29uc3QgaW5kZXggPSBKU09OLnN0cmluZ2lmeShrZXkpO1xuICAgICAgICByZXR1cm4gaW5kZXgrXCI6XCIrZXhwbGFpbihpdGVtW2tleV0sIGRlcHRoLTEsIG9wdGlvbnMsIHBhdGgrJ1snK2luZGV4KyddJywgc2Vlbik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByZWZpeCArICd7JyArIGxpc3Quam9pbihcIiwgXCIpICsgJ30nO1xufVxuXG4vLyBNdXN0IHdvcmsgZXZlbiB3aXRob3V0IGFzc2VydFxuY29uc3QgaGFzQXNzZXJ0ID0gdHlwZW9mIGFzc2VydCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IgPT09ICdmdW5jdGlvbic7XG5cbmNvbnN0IG1ha2VFcnJvciA9IGhhc0Fzc2VydFxuICAgID8gZW50cnkgPT4gbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcihlbnRyeSlcbiAgICA6IGVudHJ5ID0+IG5ldyBFcnJvciggZW50cnkuYWN0dWFsICk7XG5cbm1vZHVsZS5leHBvcnRzID0geyBjYWxsZXJJbmZvLCBleHBsYWluLCBtYWtlRXJyb3IgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gU2VlIGFsc28gbm90ZWQtc2V0LmpzXG5cbmNsYXNzIEFubm90YXRlZFNldCB7XG4gICAgY29uc3RydWN0b3IoYWxsPW5ldyBTZXQoKSwgbm90ZXM9W10pIHtcbiAgICAgICAgdGhpcy5hbGwgICA9IGFsbDtcbiAgICAgICAgdGhpcy5ub3RlcyA9IG5vdGVzO1xuICAgIH1cbiAgICBhZGQoIGl0ZW0sIG5vdGUgKSB7XG4gICAgICAgIGlmICh0aGlzLmFsbC5oYXMoaXRlbSkpXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBBbm5vdGF0ZWRTZXQoXG4gICAgICAgICAgICBuZXcgU2V0KHRoaXMuYWxsKS5hZGQoaXRlbSksXG4gICAgICAgICAgICBbIC4uLnRoaXMubm90ZXMsIFsgaXRlbSwgbm90ZSBdIF1cbiAgICAgICAgKTtcbiAgICB9XG4gICAgaGFzKCBpdGVtICkge1xuICAgICAgICBpZiAoIXRoaXMuYWxsLmhhcyggaXRlbSApKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKGxldCBwYWlyIG9mIHRoaXMubm90ZXMpIHtcbiAgICAgICAgICAgIGlmIChwYWlyWzBdID09PSBpdGVtKVxuICAgICAgICAgICAgICAgIHJldHVybiBwYWlyWzFdO1xuICAgICAgICB9O1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3d0ZiwgdW5yZWFjaGFibGUnKTtcbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7IEFubm90YXRlZFNldCB9O1xuIl19
