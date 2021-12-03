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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9yZWZ1dGUuanMiLCJsaWIvcmVmdXRlL2NvbmQvYXJyYXkuanMiLCJsaWIvcmVmdXRlL2NvbmQvYmFzaWMuanMiLCJsaWIvcmVmdXRlL2NvbmQvZGVlcC5qcyIsImxpYi9yZWZ1dGUvZGJjLmpzIiwibGliL3JlZnV0ZS9yZXBvcnQuanMiLCJsaWIvcmVmdXRlL3V0aWwuanMiLCJsaWIvcmVmdXRlL3V0aWwvYW5ub3RhdGVkLXNldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOW5CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbi8vIHRoZSBjb3JlIChzaG91bGQgZXhwbGFpbiBldmVuIGJlIHRoZXJlPylcbmNvbnN0IHsgUmVwb3J0LCBhZGRDb25kaXRpb24sIGV4cGxhaW4gfSA9IHJlcXVpcmUgKCcuL3JlZnV0ZS9yZXBvcnQuanMnKTtcblxuLy8gZWlmZmVsLXN0eWxlIGRlc2lnbi1ieS1jb250cmFjdFxuY29uc3QgeyBEQkMgfSA9IHJlcXVpcmUoICcuL3JlZnV0ZS9kYmMuanMnICk7XG5cbi8vIGltcG9ydCBkZWZhdWx0IGNvbmRpdGlvbiBhcnNlbmFsXG5yZXF1aXJlKCAnLi9yZWZ1dGUvY29uZC9iYXNpYy5qcycgKTtcbnJlcXVpcmUoICcuL3JlZnV0ZS9jb25kL2FycmF5LmpzJyApO1xucmVxdWlyZSggJy4vcmVmdXRlL2NvbmQvZGVlcC5qcycgKTtcblxuY29uc3QgZ2V0UmVwb3J0ID0gKC4uLmFyZ3MpID0+IG5ldyBSZXBvcnQoKS5ydW4oLi4uYXJncykuZG9uZSgpO1xuXG4vLyBBbGxvdyBjcmVhdGluZyBtdWx0aXBsZSBwYXJhbGxlbCBjb25maWd1cmF0aW9ucyBvZiByZWZ1dGVcbi8vIGUuZy4gb25lIHN0cmljdCAodGhyb3dpbmcgZXJyb3JzKSBhbmQgb3RoZXIgbGF4IChqdXN0IGRlYnVnZ2luZyB0byBjb25zb2xlKVxuZnVuY3Rpb24gc2V0dXAoIG9wdGlvbnM9e30sIG9yaWcgKSB7XG4gICAgLy8gVE9ETyB2YWxpZGF0ZSBvcHRpb25zXG4gICAgY29uc3Qgb25GYWlsID0gb3B0aW9ucy5vbkZhaWwgfHwgKHJlcCA9PiB7IHRocm93IG5ldyBFcnJvcihyZXAuZ2V0VGFwKCkpIH0pO1xuXG4gICAgY29uc3QgcmVmdXRlID0gb3B0aW9ucy5za2lwXG4gICAgICAgID8gKCk9Pnt9XG4gICAgICAgIDogKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG9rID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICAgICAgb2sub25Eb25lKCB4ID0+IHsgaWYoICF4LmdldFBhc3MoKSApIG9uRmFpbCh4LCBhcmdzKSB9ICk7XG4gICAgICAgICAgICBvay5ydW4oLi4uYXJncyk7XG4gICAgICAgICAgICBvay5kb25lKCk7XG4gICAgICAgIH07XG5cbiAgICAvLyByZWV4cG9ydCBhbGwgZnJvbSByZXBvcnQuanNcbiAgICByZWZ1dGUuUmVwb3J0ID0gUmVwb3J0O1xuICAgIHJlZnV0ZS5leHBsYWluID0gZXhwbGFpbjtcbiAgICByZWZ1dGUuYWRkQ29uZGl0aW9uID0gYWRkQ29uZGl0aW9uO1xuXG4gICAgLy8gc2hvcnRjdXQgdG8gdmFsaWRhdGluZyAmIHJldHVybmluZyBhIGZyZXNoIGNvbnRyYWN0XG4gICAgLy8gVE9ETyByZW5hbWUgdG8gYXZvaWQgbmFtZSBjbGFzaCB3aXRoIHRoZSBjbGFzc1xuICAgIC8vIChldmFsPylcbiAgICByZWZ1dGUucmVwb3J0ID0gZ2V0UmVwb3J0O1xuXG4gICAgLy8gcmVmdXRlLmNvbmYoey4uLn0pIHdpbGwgZ2VuZXJhdGUgYSBfbmV3XyByZWZ1dGVcbiAgICByZWZ1dGUuY29uZmlnID0gdXBkYXRlID0+IHNldHVwKCB7IC4uLm9wdGlvbnMsIC4uLnVwZGF0ZSB9LCByZWZ1dGUgKTtcblxuICAgIC8vIGFkZCBkZXNpZ24tYnktY29udHJhY3RcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoIHJlZnV0ZSwgJ2RiYycsIHsgZ2V0OiAoKT0+bmV3IERCQygpIH0gKTtcblxuICAgIC8vIFRPRE8gdGhpcyBpcyBzdHVwaWQsIGNvbWUgdXAgd2l0aCBzbXRoIGJldHRlclxuICAgIC8vIHdoZW4gaW4gYnJvd3Nlciwgd2luZG93LnJlZnV0ZS5jb25maWcoKSB1cGRhdGVzIHdpbmRvdy5yZWZ1dGUgaXRzZWxmXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIG9yaWcgPT09IHdpbmRvdy5yZWZ1dGUpXG4gICAgICAgIHdpbmRvdy5yZWZ1dGUgPSByZWZ1dGU7XG5cbiAgICByZXR1cm4gcmVmdXRlO1xufVxuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBzZXR1cCgpO1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuICAgIHdpbmRvdy5yZWZ1dGUgPSBzZXR1cCgpOyAvLyBUT0RPIGNoZWNrIHByZWV4aXN0aW5nXG5cbi8qKlxuICogICBAbmFtZXNwYWNlIHJlZnV0ZVxuICogICBAZGVzYyAgIEZ1bmN0aW9ucyBleHBvcnRlZCBieSByZWZ1dGUgbWFpbiBtb2R1bGUuXG4gKi9cblxuLyoqXG4gKiAgIEBwdWJsaWNcbiAqICAgQG1lbWJlck9mIHJlZnV0ZVxuICogICBAZnVuY3Rpb24gcmVmdXRlXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gRGF0YSB0byBmZWVkIHRvIHRoZSBjYWxsYmFja1xuICogICBAcGFyYW0ge0NvbnRyYWN0fSBjb250cmFjdCBBIGNvZGUgYmxvY2sgd2l0aCBjaGVja3MuXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9IFJldHVybiB2YWx1ZSBpcyBpZ25vcmVkLlxuICogICBAdGhyb3dzIHtFcnJvcn0gSWYgb25lIG9yIG1vcmUgY2hlY2tzIGFyZSBmYWlsaW5nLCBhbiBleGNlcHRpb24gaXMgdGhyb3duXG4gKiAgIHdpdGggZGV0YWlscyBhYm91dCBhbGwgcGFzc2luZy9mYWlsaW5nIGNoZWNrcy5cbiAqICAgVGhpcyBhY3Rpb24gY2FuIGJlIGNoYW5nZWQgdmlhIHJlZnV0ZS5jb25maWcoKSBjYWxsLlxuICpcbiAqL1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCBSZXBvcnQgfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5cbi8vIFRPRE8gcmVuYW1lIGZvckVhY2ggb3Igc210aC5cbmFkZENvbmRpdGlvbihcbiAgICAnbWFwJyxcbiAgICB7ZnVuOjEsYXJnczoyfSxcbiAgICAobGlzdCwgY29udHJhY3QpID0+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKVxuICAgICAgICAgICAgcmV0dXJuICdFeHBlY3RlZCBhIGxpc3QsIGZvdW5kIGEgJy50eXBlb2YobGlzdCk7XG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA8IDEpXG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gYXV0by1wYXNzXG5cbiAgICAgICAgY29uc3Qgb2sgPSBuZXcgUmVwb3J0KCk7XG4gICAgICAgIGxpc3QuZm9yRWFjaCggKGl0ZW0sIGluZGV4KSA9PiBvay5uZXN0ZWQoIFwiaXRlbSBcIitpbmRleCwgaXRlbSwgY29udHJhY3QgKSApO1xuICAgICAgICByZXR1cm4gb2suZG9uZSgpO1xuICAgIH1cbik7XG5cbi8vIFRPRE8gdGhpcyBpcyBjYWxsZWQgXCJjb21wbGlhbnQgY2hhaW5cIiBidXQgYmV0dGVyIGp1c3Qgc2F5IGhlcmVcbi8vIFwib2ggd2UncmUgY2hlY2tpbmcgZWxlbWVudCBvcmRlclwiXG5hZGRDb25kaXRpb24oXG4gICAgJ29yZGVyZWQnLCAvLyBUT0RPIGJldHRlciBuYW1lP1xuICAgIHtmdW46MSxhcmdzOjJ9LFxuICAgIChsaXN0LCBjb250cmFjdCkgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpXG4gICAgICAgICAgICByZXR1cm4gJ0V4cGVjdGVkIGEgbGlzdCwgZm91bmQgYSAnLnR5cGVvZihsaXN0KTtcbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoIDwgMilcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBhdXRvLXBhc3NcblxuICAgICAgICBjb25zdCBvayA9IG5ldyBSZXBvcnQoKTtcbiAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBsaXN0Lmxlbmd0aC0xOyBuKyspIHtcbiAgICAgICAgICAgIG9rLm5lc3RlZCggXCJpdGVtcyBcIituK1wiLCBcIisobisxKSwgbGlzdFtuXSwgbGlzdFtuKzFdLCBjb250cmFjdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9rLmRvbmUoKTtcbiAgICB9XG4pO1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCByZXBvcnQsIGV4cGxhaW4gfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5jb25zdCBPSyA9IGZhbHNlO1xuXG5jb25zdCBudW1DbXAgPSB7XG4gICAgJzwnIDogKHgseSk9Pih4ICA8IHkpLFxuICAgICc+JyA6ICh4LHkpPT4oeCAgPiB5KSxcbiAgICAnPD0nOiAoeCx5KT0+KHggPD0geSksXG4gICAgJz49JzogKHgseSk9Pih4ID49IHkpLFxuICAgICc9PSc6ICh4LHkpPT4oeCA9PT0geSksXG4gICAgJyE9JzogKHgseSk9Pih4ICE9PSB5KSxcbn07XG5cbi8vIHVzZSAhPSBhbmQgbm90ICE9PSBkZWxpYmVyYXRlbHkgdG8gZmlsdGVyIG91dCBudWxsICYgdW5kZWZpbmVkXG5jb25zdCBzdHJDbXAgPSB7XG4gICAgJzwnIDogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ICA8ICcnK3kpLFxuICAgICc+JyA6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCAgPiAnJyt5KSxcbiAgICAnPD0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPD0gJycreSksXG4gICAgJz49JzogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ID49ICcnK3kpLFxuXG4gICAgJz09JzogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ID09PSAnJyt5KSxcbiAgICAnIT0nOiAoeCx5KT0+KCh4ID09IHVuZGVmaW5lZCleKHkgPT0gdW5kZWZpbmVkKSkgfHwgKCcnK3ggIT09ICcnK3kpLFxufTtcblxuYWRkQ29uZGl0aW9uKFxuICAgICdudW1DbXAnLFxuICAgIHthcmdzOjN9LFxuICAgICh4LG9wLHkpID0+IG51bUNtcFtvcF0oeCx5KT8wOlt4LFwiaXMgbm90IFwiK29wLHldXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdzdHJDbXAnLFxuICAgIHthcmdzOjN9LFxuICAgICh4LG9wLHkpID0+IHN0ckNtcFtvcF0oeCx5KT8wOlt4LFwiaXMgbm90IFwiK29wLHldXG4pO1xuXG5jb25zdCB0eXBlQ2hlY2sgPSB7XG4gICAgdW5kZWZpbmVkOiB4ID0+IHggPT09IHVuZGVmaW5lZCxcbiAgICBudWxsOiAgICAgIHggPT4geCA9PT0gbnVsbCxcbiAgICBudW1iZXI6ICAgIHggPT4gdHlwZW9mIHggPT09ICdudW1iZXInICYmICFOdW1iZXIuaXNOYU4oeCksXG4gICAgaW50ZWdlcjogICB4ID0+IE51bWJlci5pc0ludGVnZXIoeCksXG4gICAgbmFuOiAgICAgICB4ID0+IE51bWJlci5pc05hTih4KSxcbiAgICBzdHJpbmc6ICAgIHggPT4gdHlwZW9mIHggPT09ICdzdHJpbmcnLFxuICAgIGZ1bmN0aW9uOiAgeCA9PiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyxcbiAgICBib29sZWFuOiAgIHggPT4gdHlwZW9mIHggPT09ICdib29sZWFuJyxcbiAgICBvYmplY3Q6ICAgIHggPT4geCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoeCksXG4gICAgYXJyYXk6ICAgICB4ID0+IEFycmF5LmlzQXJyYXkoeCksXG59O1xuZnVuY3Rpb24gdHlwZUV4cGxhaW4gKHgpIHtcbiAgICBpZiAodHlwZW9mIHggPT09ICdzdHJpbmcnKVxuICAgICAgICByZXR1cm4geDtcbiAgICBpZiAodHlwZW9mIHggPT09ICdmdW5jdGlvbicpXG4gICAgICAgIHJldHVybiAnaW5zdGFuY2VvZiAnKyh4Lm5hbWUgfHwgeCk7XG59O1xuXG5hZGRDb25kaXRpb24oXG4gICAgJ3R5cGUnLFxuICAgIHthcmdzOiAyfSxcbiAgICAoZ290LCBleHApPT57XG4gICAgICAgIGlmICggIUFycmF5LmlzQXJyYXkoZXhwKSApXG4gICAgICAgICAgICBleHAgPSBbZXhwXTtcblxuICAgICAgICBmb3IgKGxldCB2YXJpYW50IG9mIGV4cCkge1xuICAgICAgICAgICAgLy8ga25vd24gdHlwZVxuICAgICAgICAgICAgaWYoIHR5cGVvZiB2YXJpYW50ID09PSAnc3RyaW5nJyAmJiB0eXBlQ2hlY2tbdmFyaWFudF0gKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVDaGVja1t2YXJpYW50XShnb3QpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gT0s7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBpbnN0YW5jZW9mXG4gICAgICAgICAgICBpZiggdHlwZW9mIHZhcmlhbnQgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGdvdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBpZiggZ290IGluc3RhbmNlb2YgdmFyaWFudCApXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPSztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGRvbid0IGtub3cgd2hhdCB5b3UncmUgYXNraW5nIGZvclxuICAgICAgICAgICAgcmV0dXJuICd1bmtub3duIHZhbHVlIHR5cGUgc3BlYzogJytleHBsYWluKHZhcmlhbnQsIDEpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgJy0gJytleHBsYWluKGdvdCwgMSksXG4gICAgICAgICAgICAnKyAnK2V4cC5tYXAoIHR5cGVFeHBsYWluICkuam9pbihcIiBvciBcIiksXG4gICAgICAgIF07XG4gICAgfVxuKTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcbmNvbnN0IHsgQW5ub3RhdGVkU2V0IH0gPSByZXF1aXJlKCAnLi4vdXRpbC9hbm5vdGF0ZWQtc2V0LmpzJyApO1xuXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgZGVlcEVxdWFsXG4gKiAgIEBkZXNjIENvbXBhcmVzIHR3byBzdHJ1Y3R1cmVzLCBvdXRwdXRzIGRpZmYgaWYgZGlmZmVyZW5jZXMgZm91bmQuXG4gKiAgIEBwYXJhbSB7YW55fSBhY3R1YWwgICAgRmlyc3Qgc3RydWN0dXJlXG4gKiAgIEBwYXJhbSB7YW55fSBleHBlY3RlZCAgU3RydWN0dXJlIHRvIGNvbXBhcmUgdG9cbiAqICAgQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogICBAcGFyYW0ge251bWJlcn0gb3B0aW9ucy5tYXggaG93IG1hbnkgZGlmZmVyZW5jZXMgdG8gb3V0cHV0IChkZWZhdWx0IDUpXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cbmFkZENvbmRpdGlvbiggJ2RlZXBFcXVhbCcsIHtcImFyZ3NcIjoyLGhhc09wdGlvbnM6dHJ1ZX0sIGRlZXAgKTtcblxuZnVuY3Rpb24gZGVlcCggZ290LCBleHAsIG9wdGlvbnM9e30gKSB7XG4gICAgaWYgKCFvcHRpb25zLm1heClcbiAgICAgICAgb3B0aW9ucy5tYXggPSA1O1xuICAgIG9wdGlvbnMuZGlmZiA9IFtdO1xuICAgIF9kZWVwKCBnb3QsIGV4cCwgb3B0aW9ucyApO1xuICAgIGlmICghb3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgcmV0dXJuIDA7XG5cbiAgICBjb25zdCByZXQgPSBbXTtcbiAgICBmb3IgKGxldCBpdGVtIG9mIG9wdGlvbnMuZGlmZikge1xuICAgICAgICByZXQucHVzaCggXG4gICAgICAgICAgICBcImF0IFwiK2l0ZW1bMF0sXG4gICAgICAgICAgICBcIi0gXCIrKGl0ZW1bM10gPyBpdGVtWzFdIDogZXhwbGFpbiggaXRlbVsxXSwgMiApKSxcbiAgICAgICAgICAgIFwiKyBcIisoaXRlbVszXSA/IGl0ZW1bMl0gOiBleHBsYWluKCBpdGVtWzJdLCAyICkpLFxuICAgICAgICApO1xuICAgIH07XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbi8vIHJlc3VsdCBpcyBzdG9yZWQgaW4gb3B0aW9ucy5kaWZmPVtdLCByZXR1cm4gdmFsdWUgaXMgaWdub3JlZFxuLy8gaWYgc2FpZCBkaWZmIGV4Y2VlZHMgbWF4LCByZXR1cm4gaW1tZWRpYXRlbHkgJiBkb24ndCB3YXN0ZSB0aW1lXG5mdW5jdGlvbiBfZGVlcCggZ290LCBleHAsIG9wdGlvbnM9e30sIHBhdGg9JyQnLCBzZWVuTD1uZXcgQW5ub3RhdGVkU2V0KCksIHNlZW5SPW5ldyBBbm5vdGF0ZWRTZXQoKSApIHtcbiAgICBpZiAoZ290ID09PSBleHAgfHwgb3B0aW9ucy5tYXggPD0gb3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgcmV0dXJuO1xuICAgIGlmICh0eXBlb2YgZ290ICE9PSB0eXBlb2YgZXhwKVxuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG5cbiAgICAvLyByZWN1cnNlIGJ5IGV4cGVjdGVkIHZhbHVlIC0gY29uc2lkZXIgaXQgbW9yZSBwcmVkaWN0YWJsZVxuICAgIGlmICh0eXBlb2YgZXhwICE9PSAnb2JqZWN0JyB8fCBleHAgPT09IG51bGwgKSB7XG4gICAgICAgIC8vIG5vbi1vYmplY3RzIC0gc28gY2FuJ3QgZGVzY2VuZFxuICAgICAgICAvLyBhbmQgY29tcGFyaXNvbiBhbHJlYWR5IGRvbmUgYXQgdGhlIGJlZ2lubm5pbmdcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuICAgIH1cblxuICAgIC8vIG11c3QgZGV0ZWN0IGxvb3BzIGJlZm9yZSBnb2luZyBkb3duXG4gICAgY29uc3QgcGF0aEwgPSBzZWVuTC5oYXMoZ290KTtcbiAgICBjb25zdCBwYXRoUiA9IHNlZW5SLmhhcyhleHApO1xuICAgIGlmIChwYXRoTCB8fCBwYXRoUikge1xuICAgICAgICAvLyBMb29wIGRldGVjdGVkID0gb25seSBjaGVjayB0b3BvbG9neVxuICAgICAgICBpZiAocGF0aEwgPT09IHBhdGhSKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtcbiAgICAgICAgICAgIHBhdGggKyAnIChjaXJjdWxhciknLFxuICAgICAgICAgICAgcGF0aEwgPyAnQ2lyY3VsYXI9JytwYXRoTCA6IGV4cGxhaW4oZ290LCAyKSxcbiAgICAgICAgICAgIHBhdGhSID8gJ0NpcmN1bGFyPScrcGF0aFIgOiBleHBsYWluKGV4cCwgMiksXG4gICAgICAgICAgICB0cnVlIC8vIGRvbid0IHN0cmluZ2lmeVxuICAgICAgICBdKTtcbiAgICB9O1xuICAgIHNlZW5MID0gc2VlbkwuYWRkKGdvdCwgcGF0aCk7XG4gICAgc2VlblIgPSBzZWVuUi5hZGQoZXhwLCBwYXRoKTtcblxuICAgIC8vIGNvbXBhcmUgb2JqZWN0IHR5cGVzXG4gICAgLy8gKGlmIGEgdXNlciBpcyBzdHVwaWQgZW5vdWdoIHRvIG92ZXJyaWRlIGNvbnN0cnVjdG9yIGZpZWxkLCB3ZWxsIHRoZSB0ZXN0XG4gICAgLy8gd291bGQgZmFpbCBsYXRlciBhbnl3YXkpXG4gICAgaWYgKGdvdC5jb25zdHJ1Y3RvciAhPT0gZXhwLmNvbnN0cnVjdG9yKVxuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG5cbiAgICAvLyBhcnJheVxuICAgIGlmIChBcnJheS5pc0FycmF5KGV4cCkpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGdvdCkgfHwgZ290Lmxlbmd0aCAhPT0gZXhwLmxlbmd0aClcbiAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGV4cC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgX2RlZXAoIGdvdFtpXSwgZXhwW2ldLCBvcHRpb25zLCBwYXRoKydbJytpKyddJywgc2VlbkwsIHNlZW5SICk7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5tYXg8PW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybjtcbiAgICB9O1xuXG4gICAgLy8gY29tcGFyZSBrZXlzIC0gKzEgZm9yIGV4cCwgLTEgZm9yIGdvdCwgbm9uemVybyBrZXkgYXQgZW5kIG1lYW5zIGtleXMgZGlmZmVyXG4gICAgY29uc3QgdW5pcSA9IHt9O1xuICAgIE9iamVjdC5rZXlzKGV4cCkuZm9yRWFjaCggeCA9PiB1bmlxW3hdID0gMSApO1xuICAgIE9iamVjdC5rZXlzKGdvdCkuZm9yRWFjaCggeCA9PiB1bmlxW3hdID0gKHVuaXFbeF0gfHwgMCkgLSAxICk7XG4gICAgZm9yIChsZXQgeCBpbiB1bmlxKSB7XG4gICAgICAgIGlmICh1bmlxW3hdICE9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuICAgIH1cbiAgICBcbiAgICAvLyBub3cgdHlwZW9mLCBvYmplY3QgdHlwZSwgYW5kIG9iamVjdCBrZXlzIGFyZSB0aGUgc2FtZS5cbiAgICAvLyByZWN1cnNlLlxuICAgIGZvciAobGV0IGkgaW4gZXhwKSB7XG4gICAgICAgIF9kZWVwKCBnb3RbaV0sIGV4cFtpXSwgb3B0aW9ucywgcGF0aCsnWycrZXhwbGFpbihpKSsnXScsIHNlZW5MLCBzZWVuUiApO1xuICAgICAgICBpZiAob3B0aW9ucy5tYXg8PW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgICAgICBicmVhaztcbiAgICB9O1xuICAgIHJldHVybjtcbn07XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBSZXBvcnQgfSA9IHJlcXVpcmUgKCAnLi9yZXBvcnQuanMnICk7XG5jb25zdCBub29wID0gKCk9Pnt9O1xuXG5jbGFzcyBEQkMge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9wcmUgICAgPSBub29wO1xuICAgICAgICB0aGlzLl9wb3N0ICAgPSBub29wO1xuICAgICAgICB0aGlzLl9vbmZhaWwgPSByZXBvcnQgPT4gcmVwb3J0LmdldFRocm93bigpO1xuICAgICAgICB0aGlzLl9vbnBvc3QgPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHBvc3QoY29kZSkge1xuICAgICAgICBpZiAoY29kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcG9zdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmKCB0eXBlb2YgY29kZSAhPT0gJ2Z1bmN0aW9uJyApXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdwb3N0LWNvbmRpdGlvbiBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICAgIHRoaXMuX3Bvc3QgPSBjb2RlO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcHJlKGNvZGUpIHtcbiAgICAgICAgaWYgKGNvZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3ByZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmKCB0eXBlb2YgY29kZSAhPT0gJ2Z1bmN0aW9uJyApXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdwcmUtY29uZGl0aW9uIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICAgICAgdGhpcy5fcHJlID0gY29kZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuICAgIGRlY29yYXRlKG9yaWcpIHtcbiAgICAgICAgLy8gY2xvc2UgYXJvdW5kIHRoZXNlIHZhcnNcbiAgICAgICAgY29uc3QgcHJlICAgID0gdGhpcy5fcHJlO1xuICAgICAgICBjb25zdCBwb3N0ICAgPSB0aGlzLl9wb3N0O1xuICAgICAgICBjb25zdCBvbmZhaWwgPSB0aGlzLl9vbmZhaWw7XG4gICAgICAgIGNvbnN0IG9ucG9zdCA9IHRoaXMuX29ucG9zdCB8fCB0aGlzLl9vbmZhaWw7XG5cbiAgICAgICAgLy8gbm8gYXJyb3cgZnVuY3Rpb24gdG8gZ2V0IGNvcnJlY3QgJ3RoaXMnIG9iamVjdFxuICAgICAgICBjb25zdCBjb2RlID0gZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgICAgICAgICAgIGNvbnN0IHJQcmUgPSBuZXcgUmVwb3J0KCk7XG4gICAgICAgICAgICBwcmUuYXBwbHkoIHRoaXMsIFsgclByZSwgdW5kZWZpbmVkLCAuLi5hcmdzIF0gKTtcbiAgICAgICAgICAgIGlmKCFyUHJlLmdldFBhc3MoKSlcbiAgICAgICAgICAgICAgICBvbmZhaWwoclByZS5zZXRUaXRsZSgncHJlLWNvbmRpdGlvbiBmYWlsZWQnKSk7XG4gICAgICAgICAgICBjb25zdCByZXQgPSBvcmlnLmFwcGx5KCB0aGlzLCBhcmdzICk7XG4gICAgICAgICAgICBjb25zdCByUG9zdCA9IG5ldyBSZXBvcnQoKTtcbiAgICAgICAgICAgIHBvc3QuYXBwbHkoIHRoaXMsIFsgclBvc3QsIHJldCwgLi4uYXJncyBdICk7XG4gICAgICAgICAgICBpZighclBvc3QuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgIG9ucG9zdChyUG9zdC5zZXRUaXRsZSgncG9zdC1jb25kaXRpb24gZmFpbGVkJykpO1xuICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvZGUub3JpZyA9IG9yaWc7XG4gICAgICAgIGNvZGUucHJlICA9IHByZTtcbiAgICAgICAgY29kZS5wb3N0ID0gcG9zdDtcblxuICAgICAgICByZXR1cm4gY29kZTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0geyBEQkMgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBjYWxsZXJJbmZvLCBleHBsYWluLCBtYWtlRXJyb3IgfSA9IHJlcXVpcmUoICcuL3V0aWwuanMnICk7XG5cbi8qKlxuICogICBAY2FsbGJhY2sgQ29udHJhY3RcbiAqICAgQG1lbWJlck9mIHV0aWxpdGllc1xuICogICBAZGVzYyBBIGNvZGUgYmxvY2sgY29udGFpbmluZyBvbmUgb3IgbW9yZSBjb25kaXRpb24gY2hlY2tzLlxuICogICBBIGNoZWNrIGlzIHBlcmZvcm1lZCBieSBjYWxsaW5nIG9uZSBvZiBhIGZldyBzcGVjaWFsIG1ldGhvZHNcbiAqICAgKGVxdWFsLCBtYXRjaCwgZGVlcEVxdWFsLCB0eXBlIGV0YylcbiAqICAgb24gdGhlIFJlcG9ydCBvYmplY3QuXG4gKiAgIENvbnRyYWN0cyBtYXkgYmUgbmVzdGVkIHVzaW5nIHRoZSAnbmVzdGVkJyBtZXRob2Qgd2hpY2ggYWNjZXB0c1xuICogICBhbm90aGVyIGNvbnRyYWN0IGFuZCByZWNvcmRzIGEgcGFzcy9mYWlsdXJlIGluIHRoZSBwYXJlbnQgYWNjb3JkaW5nbHkucVxuICogICBBIGNvbnRyYWN0IGlzIGFsd2F5cyBleGVjdXRlZCB0byB0aGUgZW5kLlxuICogICBAcGFyYW0ge1JlcG9ydH0gb2sgQW4gb2JqZWN0IHRoYXQgcmVjb3JkcyBjaGVjayByZXN1bHRzLlxuICogICBAcGFyYW0ge0FueX0gWy4uLmxpc3RdIEFkZGl0aW9uYWwgcGFyYW1ldGVyc1xuICogICAoZS5nLiBkYXRhIHN0cnVjdHVyZSB0byBiZSB2YWxpZGF0ZWQpXG4gKiAgIEByZXR1cm5zIHt2b2lkfSBSZXR1cm5lZCB2YWx1ZSBpcyBpZ25vcmVkLlxuICovXG5cbi8qKlxuICogQHB1YmxpY1xuICogQGNsYXNzZGVzY1xuICogVGhlIGNvcmUgb2YgdGhlIHJlZnV0ZSBsaWJyYXJ5LCB0aGUgcmVwb3J0IG9iamVjdCBjb250YWlucyBpbmZvXG4gKiBhYm91dCBwYXNzaW5nIGFuZCBmYWlsaW5nIGNvbmRpdGlvbnMuXG4gKi9cbmNsYXNzIFJlcG9ydCB7XG4gICAgLy8gc2V0dXBcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5fY291bnQgICAgID0gMDtcbiAgICAgICAgdGhpcy5fZmFpbENvdW50ID0gMDtcbiAgICAgICAgdGhpcy5fZGVzY3IgICAgID0gW107XG4gICAgICAgIHRoaXMuX2V2aWRlbmNlICA9IFtdO1xuICAgICAgICB0aGlzLl93aGVyZSAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fY29uZE5hbWUgID0gW107XG4gICAgICAgIHRoaXMuX2luZm8gICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9uZXN0ZWQgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fcGVuZGluZyAgID0gbmV3IFNldCgpO1xuICAgICAgICB0aGlzLl9vbkRvbmUgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fZG9uZSAgICAgID0gZmFsc2U7XG4gICAgICAgIC8vIFRPRE8gYWRkIGNhbGxlciBpbmZvIGFib3V0IHRoZSByZXBvcnQgaXRzZWxmXG4gICAgfVxuXG4gICAgLy8gc2V0dXAgbWV0aG9kcyAtIG11c3QgYmUgY2hhaW5hYmxlXG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgU2V0IGluZm9ybWF0aW9uYWwgbWVzc2FnZSBhYm91dCB0aGUgb3ZlcmFsbCBwdXJwb3NlIG9mIHRoaXMgY29udHJhY3RcbiAgICAgKiAgQHBhcmFtIHtTdHJpbmd9IHRpdGxlIC0gdGhlIG1lc3NhZ2UgaW4gcXVlc3Rpb25cbiAgICAgKiAgQHJldHVybnMge1JlcG9ydH0gdGhpc1xuICAgICAqL1xuICAgIHNldFRpdGxlKHN0cikge1xuICAgICAgICB0aGlzLl90aXRsZSA9IHN0cjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIG9uRG9uZShmbikge1xuICAgICAgICB0aGlzLl9vbkRvbmUucHVzaChmbik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvLyBydW5uaW5nXG4gICAgLy8gVE9ETyBlaXRoZXIgYXN5bmMoKSBzaG91bGQgc3VwcG9ydCBhZGRpdGlvbmFsIGFyZ3MsIG9yIHJ1bigpIHNob3VsZG4ndFxuICAgIHJ1biguLi5hcmdzKSB7XG4gICAgICAgIHRoaXMuX2xvY2soKTtcbiAgICAgICAgY29uc3QgYmxvY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICBpZiAodHlwZW9mIGJsb2NrICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdMYXN0IGFyZ3VtZW50IG9mIHJ1bigpIG11c3QgYmUgYSBmdW5jdGlvbiwgbm90ICcrdHlwZW9mKGJsb2NrKSk7XG4gICAgICAgIGJsb2NrKCB0aGlzLCAuLi5hcmdzICk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIFRPRE8gZWl0aGVyIGFzeW5jKCkgc2hvdWxkIHN1cHBvcnQgYWRkaXRpb25hbCBhcmdzLCBvciBydW4oKSBzaG91bGRuJ3RcbiAgICBhc3luYyh0aW1lb3V0LCBibG9jaykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoIChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dChcbiAgICAgICAgICAgICAgICAoKSA9PiByZWplY3QobmV3IEVycm9yKFwiQ29udHJhY3QgZXhlY3V0aW9uIHRvb2sgdG9vIGxvbmdcIikpLFxuICAgICAgICAgICAgICAgIHRpbWVvdXRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aGlzLm9uRG9uZShhcmcgPT4ge2NsZWFyVGltZW91dCh0aW1lcik7IHJlc29sdmUoYXJnKX0pO1xuICAgICAgICAgICAgYmxvY2sodGhpcyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEluIHRoZW9yeSwgaGF2aW5nIGNvbnN0IG49bmV4dCgpOyBzZXRSZXN1bHQobi4gLi4uKVxuICAgIC8vIHNob3VsZCBhbGxvdyBmb3IgYXN5bmMgY29uZGl0aW9ucyBpbiB0aGUgZnV0dXJlXG4gICAgLy8gaWYgYXQgYWxsIHBvc3NpYmxlIHdpdGhvdXQgZ3JlYXQgc2FjcmlmaWNlcy5cbiAgICBuZXh0KCkge1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIHJldHVybiArK3RoaXMuX2NvdW50O1xuICAgIH1cblxuICAgIHNldFJlc3VsdCAobiwgZXZpZGVuY2UsIGRlc2NyLCBjb25kTmFtZSwgd2hlcmUpIHtcbiAgICAgICAgaWYoIXRoaXMuX3BlbmRpbmcuaGFzKG4pKVxuICAgICAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICB0aGlzLl9wZW5kaW5nLmRlbGV0ZShuKTtcbiAgICAgICAgaWYgKG4gPiB0aGlzLl9jb3VudClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciAoJ0F0dGVtcHQgdG8gc2V0IGNvbmRpdGlvbiBiZXlvbmQgY2hlY2sgY291bnQnKTtcbiAgICAgICAgaWYgKGRlc2NyKVxuICAgICAgICAgICAgdGhpcy5fZGVzY3Jbbl0gPSBkZXNjcjtcbiAgICAgICAgLy8gcGFzcyAtIHJldHVybiBBU0FQXG4gICAgICAgIGlmICghZXZpZGVuY2UpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgLy8gbmVzdGVkIHJlcG9ydCBuZWVkcyBzcGVjaWFsIGhhbmRsaW5nXG4gICAgICAgIGlmIChldmlkZW5jZSBpbnN0YW5jZW9mIFJlcG9ydCkge1xuICAgICAgICAgICAgdGhpcy5fbmVzdGVkW25dID0gZXZpZGVuY2U7XG4gICAgICAgICAgICBpZiAoZXZpZGVuY2UuZ2V0RG9uZSgpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2aWRlbmNlLmdldFBhc3MoKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBzaG9ydC1jaXJjdWl0IGlmIHBvc3NpYmxlXG4gICAgICAgICAgICAgICAgZXZpZGVuY2UgPSBbXTsgLy8gaGFjayAtIGZhaWxpbmcgd2l0aG91dCBleHBsYW5hdGlvblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBuZXN0ZWQgY29udHJhY3QgaXMgaW4gYXN5bmMgbW9kZSAtIGNvZXJjZSBpbnRvIGEgcHJvbWlzZVxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJ5ID0gZXZpZGVuY2U7XG4gICAgICAgICAgICAgICAgZXZpZGVuY2UgPSBuZXcgUHJvbWlzZSggZG9uZSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJ5Lm9uRG9uZSggZG9uZSApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gcGVuZGluZyAtIHdlJ3JlIGluIGFzeW5jIG1vZGVcbiAgICAgICAgaWYgKGV2aWRlbmNlIGluc3RhbmNlb2YgUHJvbWlzZSkge1xuICAgICAgICAgICAgdGhpcy5fcGVuZGluZy5hZGQobik7XG4gICAgICAgICAgICB3aGVyZSA9IHdoZXJlIHx8IGNhbGxlckluZm8oMik7IC8vIG11c3QgcmVwb3J0IGFjdHVhbCBjYWxsZXIsIG5vdCB0aGVuXG4gICAgICAgICAgICBldmlkZW5jZS50aGVuKCB4ID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldFJlc3VsdChuLCB4LCBkZXNjciwgY29uZE5hbWUsIHdoZXJlICk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZ2V0RG9uZSgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGNiIG9mIHRoaXMuX29uRG9uZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNiKHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbGlzdGlmeSAmIHN0cmluZ2lmeSBldmlkZW5jZSwgc28gdGhhdCBpdCBkb2Vzbid0IGNoYW5nZSBwb3N0LWZhY3R1bVxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZXZpZGVuY2UpKVxuICAgICAgICAgICAgZXZpZGVuY2UgPSBbIGV2aWRlbmNlIF07XG4gICAgICAgIHRoaXMuX2V2aWRlbmNlW25dID0gZXZpZGVuY2UubWFwKCB4PT5fZXhwbGFpbih4LCBJbmZpbml0eSkgKTtcbiAgICAgICAgdGhpcy5fd2hlcmVbbl0gICAgPSB3aGVyZSB8fCBjYWxsZXJJbmZvKDIpO1xuICAgICAgICB0aGlzLl9jb25kTmFtZVtuXSA9IGNvbmROYW1lO1xuICAgICAgICB0aGlzLl9mYWlsQ291bnQrKztcblxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgQXBwZW5kIGFuIGluZm9ybWF0aW9uYWwgbWVzc2FnZSB0byB0aGUgcmVwb3J0LlxuICAgICAqIE5vbi1zdHJpbmcgdmFsdWVzIHdpbGwgYmUgc3RyaW5naWZpZWQgdmlhIGV4cGxhaW4oKS5cbiAgICAgKiBAcGFyYW0ge0FueX0gbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtSZXBvcnR9IGNoYWluYWJsZVxuICAgICAqL1xuICAgIGluZm8oIC4uLm1lc3NhZ2UgKSB7XG4gICAgICAgIHRoaXMuX2xvY2soKTtcbiAgICAgICAgaWYgKCF0aGlzLl9pbmZvW3RoaXMuX2NvdW50XSlcbiAgICAgICAgICAgIHRoaXMuX2luZm9bdGhpcy5fY291bnRdID0gW107XG4gICAgICAgIHRoaXMuX2luZm9bdGhpcy5fY291bnRdLnB1c2goIG1lc3NhZ2UubWFwKCBzPT5fZXhwbGFpbihzKSApLmpvaW4oXCIgXCIpICk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGRvbmUoKSB7XG4gICAgICAgIGlmICghdGhpcy5fZG9uZSkge1xuICAgICAgICAgICAgdGhpcy5fZG9uZSA9IHRydWU7XG4gICAgICAgICAgICBpZiAoIXRoaXMuX3BlbmRpbmcuc2l6ZSkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGNiIG9mIHRoaXMuX29uRG9uZSlcbiAgICAgICAgICAgICAgICAgICAgY2IodGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIHF1ZXJ5aW5nXG4gICAgZ2V0VGl0bGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90aXRsZTsgLy9KRllJXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqICAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0RG9uZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RvbmUgJiYgIXRoaXMuX3BlbmRpbmcuc2l6ZTsgLy8gaXMgaXQgZXZlbiBuZWVkZWQ/XG4gICAgfVxuXG4gICAgX2xvY2sgKCkge1xuICAgICAgICBpZiAodGhpcy5fZG9uZSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQXR0ZW1wdCB0byBtb2RpZnkgYSBmaW5pc2hlZCBjb250cmFjdCcpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgV2l0aG91dCBhcmd1bWVudCByZXR1cm5zIHdoZXRoZXIgdGhlIGNvbnRyYWN0IHdhcyBmdWxmaWxsZWQuXG4gICAgICogICBBcyBhIHNwZWNpYWwgY2FzZSwgaWYgbm8gY2hlY2tzIHdlcmUgcnVuIGFuZCB0aGUgY29udHJhY3QgaXMgZmluaXNoZWQsXG4gICAgICogICByZXR1cm5zIGZhbHNlLCBhcyBpbiBcInNvbWVvbmUgbXVzdCBoYXZlIGZvcmdvdHRlbiB0byBleGVjdXRlXG4gICAgICogICBwbGFubmVkIGNoZWNrcy4gVXNlIHBhc3MoKSBpZiBubyBjaGVja3MgYXJlIHBsYW5uZWQuXG4gICAgICpcbiAgICAgKiAgIElmIGEgcGFyYW1ldGVyIGlzIGdpdmVuLCByZXR1cm4gdGhlIHN0YXR1cyBvZiBuLXRoIGNoZWNrIGluc3RlYWQuXG4gICAgICogICBAcGFyYW0ge2ludGVnZXJ9IG5cbiAgICAgKiAgIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGdldFBhc3Mobikge1xuICAgICAgICBpZiAobiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ZhaWxDb3VudCA9PT0gMCAmJiAoIXRoaXMuZ2V0RG9uZSgpIHx8IHRoaXMuX2NvdW50ID4gMCk7XG4gICAgICAgIHJldHVybiAobiA+IDAgJiYgbiA8PSB0aGlzLl9jb3VudCkgPyAhdGhpcy5fZXZpZGVuY2Vbbl0gOiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBOdW1iZXIgb2YgY2hlY2tzIHBlcmZvcm1lZC5cbiAgICAgKiAgIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0Q291bnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb3VudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgV2hldGhlciB0aGUgbGFzdCBjaGVjayB3YXMgYSBzdWNjZXNzLlxuICAgICAqICBUaGlzIGlzIGp1c3QgYSBzaG9ydGN1dCBmb3IgZm9vLmdldERldGFpbHMoZm9vLmdldENvdW50KS5wYXNzXG4gICAgICogIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGxhc3QoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb3VudCA/ICF0aGlzLl9ldmlkZW5jZVt0aGlzLl9jb3VudF0gOiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBOdW1iZXIgb2YgY2hlY2tzIGZhaWxpbmcuXG4gICAgICogICBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldEZhaWxDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZhaWxDb3VudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIFJldHVybiBhIHN0cmluZyBvZiBmYWlsaW5nL3Bhc3NpbmcgY2hlY2tzLlxuICAgICAqICAgVGhpcyBtYXkgYmUgdXNlZnVsIGZvciB2YWxpZGF0aW5nIGN1c3RvbSBjb25kaXRpb25zLlxuICAgICAqICAgQ29uc2VjdXRpdmUgcGFzc2luZyBjaGVja2EgYXJlIHJlcHJlc2VudGVkIGJ5IG51bWJlcnMuXG4gICAgICogICBBIGNhcGl0YWwgbGV0dGVyIGluIHRoZSBzdHJpbmcgcmVwcmVzZW50cyBmYWlsdXJlLlxuICAgICAqICAgQHJldHVybnMge3N0cmluZ31cbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBwYXNzaW5nIGNoZWNrc1xuICAgICAqICAgXCJyKDEwKVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgY2hlY2tzIHdpdGggMSBmYWlsdXJlIGluIHRoZSBtaWRkbGVcbiAgICAgKiAgIFwicig1LE4sNClcIlxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIGNoZWNrcyBpbmNsdWRpbmcgYSBuZXN0ZWQgY29udHJhY3RcbiAgICAgKiAgIFwicigzLHIoMSxOKSw2KVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gbm8gY2hlY2tzIHdlcmUgcnVuIC0gYXV0by1mYWlsXG4gICAgICogICBcInIoWilcIlxuICAgICAqL1xuICAgIGdldEdob3N0KCkge1xuICAgICAgICBjb25zdCBnaG9zdCA9IFtdO1xuICAgICAgICBsZXQgc3RyZWFrID0gMDtcbiAgICAgICAgZm9yIChsZXQgaT0xOyBpIDw9IHRoaXMuX2NvdW50OyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9ldmlkZW5jZVtpXSB8fCB0aGlzLl9uZXN0ZWRbaV0pIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RyZWFrKSBnaG9zdC5wdXNoKHN0cmVhayk7XG4gICAgICAgICAgICAgICAgc3RyZWFrID0gMDtcbiAgICAgICAgICAgICAgICBnaG9zdC5wdXNoKCB0aGlzLl9uZXN0ZWRbaV0gPyB0aGlzLl9uZXN0ZWRbaV0uZ2V0R2hvc3QoKSA6ICdOJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0cmVhaysrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdHJlYWspIGdob3N0LnB1c2goc3RyZWFrKTtcbiAgICAgICAgaWYgKGdob3N0Lmxlbmd0aCA9PT0gMCAmJiAhdGhpcy5nZXRQYXNzKCkpXG4gICAgICAgICAgICBnaG9zdC5wdXNoKCdaJyk7XG4gICAgICAgIHJldHVybiAncignK2dob3N0LmpvaW4oJywnKSsnKSc7XG4gICAgfVxuXG4gICAgZ2V0VGV4dCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0TGluZXMoKS5qb2luKCdcXG4nKTtcbiAgICB9XG5cbiAgICBnZXRMaW5lcyhpbmRlbnQ9JycpIHtcbiAgICAgICAgY29uc3Qgb3V0ID0gW2luZGVudCArICdyKCddO1xuICAgICAgICBjb25zdCBsYXN0ID0gaW5kZW50ICsgJyknO1xuICAgICAgICBpbmRlbnQgPSBpbmRlbnQgKyAnICAgICc7XG5cbiAgICAgICAgY29uc3QgcGFkID0gcHJlZml4ID0+IHMgPT4gaW5kZW50ICsgcHJlZml4ICsgJyAnICsgcztcblxuICAgICAgICBpZiAodGhpcy5faW5mb1swXSlcbiAgICAgICAgICAgIG91dC5wdXNoKCAuLi50aGlzLl9pbmZvWzBdLm1hcCggcGFkKCc7JykgKSApO1xuICAgICAgICBmb3IgKGxldCBuID0gMTsgbjw9dGhpcy5fY291bnQ7IG4rKykge1xuICAgICAgICAgICAgb3V0LnB1c2goIGluZGVudCArICh0aGlzLl9ldmlkZW5jZVtuXSA/ICchJzonJylcbiAgICAgICAgICAgICAgICArbisodGhpcy5fZGVzY3Jbbl0gPyAnLiAnK3RoaXMuX2Rlc2NyW25dIDogJy4nKSApO1xuICAgICAgICAgICAgaWYoIHRoaXMuX25lc3RlZFtuXSkge1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKCAuLi50aGlzLl9uZXN0ZWRbbl0uZ2V0TGluZXMoaW5kZW50KSApO1xuICAgICAgICAgICAgfSBlbHNlIGlmKCB0aGlzLl9ldmlkZW5jZVtuXSApIHtcbiAgICAgICAgICAgICAgICBvdXQucHVzaCggaW5kZW50ICsgJyAgICBeIENvbmRpdGlvbiAnKyh0aGlzLl9jb25kTmFtZVtuXSB8fCAnY2hlY2snKVxuICAgICAgICAgICAgICAgICAgICArJyBmYWlsZWQgYXQgJyt0aGlzLl93aGVyZVtuXSApO1xuICAgICAgICAgICAgICAgIHRoaXMuX2V2aWRlbmNlW25dLmZvckVhY2goIHJhdyA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBtdWx0aWxpbmUgZXZpZGVuY2VcbiAgICAgICAgICAgICAgICAgICAgLy8gVE9ETyB0aGlzIGlzIHBlcmwgd3JpdHRlbiBpbiBKUywgcmV3cml0ZSBtb3JlIGNsZWFybHlcbiAgICAgICAgICAgICAgICAgICAgbGV0WyBfLCBwcmVmaXgsIHMgXSA9IHJhdy5tYXRjaCggL14oWy0rXl0gKT8oLio/KVxcbj8kL3MgKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwcmVmaXgpIHByZWZpeCA9ICdeICc7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcy5tYXRjaCgvXFxuLykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKCBpbmRlbnQgKyAnICAgICcgKyBwcmVmaXggKyBzICk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzLnNwbGl0KCdcXG4nKS5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnQgPT4gb3V0LnB1c2goIGluZGVudCArICcgICAgJyArIHByZWZpeCArIHBhcnQgKSk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHRoaXMuX2luZm9bbl0pXG4gICAgICAgICAgICAgICAgb3V0LnB1c2goIC4uLnRoaXMuX2luZm9bbl0ubWFwKCBwYWQoJzsnKSApICk7XG4gICAgICAgIH07XG4gICAgICAgIG91dC5wdXNoKGxhc3QpO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyByZXR1cm5zIGEgcGxhaW4gc2VyaWFsaXphYmxlIG9iamVjdFxuICAgICAqICBAcmV0dXJucyB7T2JqZWN0fVxuICAgICAqL1xuICAgIHRvSlNPTigpIHtcbiAgICAgICAgY29uc3QgbiA9IHRoaXMuZ2V0Q291bnQoKTtcbiAgICAgICAgY29uc3QgZGV0YWlscyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaTw9bjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBub2RlID0gdGhpcy5nZXREZXRhaWxzKGkpO1xuICAgICAgICAgICAgLy8gc3RyaXAgZXh0cmEga2V5c1xuICAgICAgICAgICAgZm9yKCBsZXQga2V5IGluIG5vZGUgKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGVba2V5XSA9PT0gdW5kZWZpbmVkIHx8IChBcnJheS5pc0FycmF5KG5vZGVba2V5XSkgJiYgbm9kZVtrZXldLmxlbmd0aCA9PT0gMCkpXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBub2RlW2tleV07XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZGV0YWlscy5wdXNoKG5vZGUpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcGFzczogIHRoaXMuZ2V0UGFzcygpLFxuICAgICAgICAgICAgY291bnQ6IHRoaXMuZ2V0Q291bnQoKSxcbiAgICAgICAgICAgIHRpdGxlOiB0aGlzLmdldFRpdGxlKCksXG4gICAgICAgICAgICBkZXRhaWxzLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRUYXAoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgUmV0dXJucyByZXBvcnQgc3RyaW5naWZpZWQgYXMgVEFQIGZvcm1hdFxuICAgICAqICBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldFRhcChuKSB7XG4gICAgICAgIGNvbnN0IHRhcCA9IG4gPT09IHVuZGVmaW5lZCA/IHRoaXMuZ2V0VGFwTGluZXMoKSA6IHRoaXMuZ2V0VGFwRW50cnkobik7XG4gICAgICAgIHRhcC5wdXNoKCcnKTtcbiAgICAgICAgcmV0dXJuIHRhcC5qb2luKCdcXG4nKTtcbiAgICB9XG5cbiAgICBnZXRUYXBMaW5lcyhuKSB7XG4gICAgICAgIC8vIFRBUCBmb3Igbm93LCB1c2UgYW5vdGhlciBmb3JtYXQgbGF0ZXIgYmVjYXVzZSBcInBlcmwgaXMgc2NhcnlcIlxuICAgICAgICBjb25zdCB0YXAgPSBbICcxLi4nK3RoaXMuX2NvdW50IF07XG4gICAgICAgIGlmICh0aGlzLmdldFRpdGxlKCkpXG4gICAgICAgICAgICB0YXAucHVzaCgnIyAnK3RoaXMuZ2V0VGl0bGUoKSk7XG4gICAgICAgIC8vIFRPRE8gaW5mb1swXVxuICAgICAgICBjb25zdCBwcmVmYWNlID0gdGhpcy5nZXREZXRhaWxzKDApO1xuICAgICAgICB0YXAucHVzaCggLi4ucHJlZmFjZS5pbmZvLm1hcCggcyA9PiAnIyAnK3MgKSApO1xuICAgICAgICBmb3IoIGxldCBpID0gMTsgaSA8PSB0aGlzLl9jb3VudDsgaSsrIClcbiAgICAgICAgICAgIHRhcC5wdXNoKCAuLi4gdGhpcy5nZXRUYXBFbnRyeShpKSApO1xuICAgICAgICBpZiAoIXRoaXMuZ2V0UGFzcygpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5nZXRDb3VudCgpID4gMClcbiAgICAgICAgICAgICAgICB0YXAucHVzaCgnIyBGYWlsZWQgJyt0aGlzLmdldEZhaWxDb3VudCgpKycvJyt0aGlzLmdldENvdW50KCkrICcgY29uZGl0aW9ucycpO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHRhcC5wdXNoKCcjIE5vIGNoZWNrcyB3ZXJlIHJ1biwgY29uc2lkZXIgdXNpbmcgcGFzcygpIGlmIHRoYXRcXCdzIGRlbGliZXJhdGUnKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRhcDtcbiAgICB9XG5cbiAgICBnZXRUYXBFbnRyeShuKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB0eXBlb2YobikgPT09ICdvYmplY3QnID8gbiA6IHRoaXMuZ2V0RGV0YWlscyhuKTtcbiAgICAgICAgY29uc3QgdGFwID0gW107XG4gICAgICAgIGlmIChkYXRhLm5lc3RlZCkge1xuICAgICAgICAgICAgdGFwLnB1c2goICcjIHN1YmNvbnRyYWN0OicrKGRhdGEubmFtZT8nICcrZGF0YS5uYW1lOicnKSApO1xuICAgICAgICAgICAgdGFwLnB1c2goIC4uLiBkYXRhLm5lc3RlZC5nZXRUYXBMaW5lcygpLm1hcCggcyA9PiAnICAgICcrcyApKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5wZW5kaW5nKSB7XG4gICAgICAgICAgICB0YXAucHVzaCggJ3BlbmRpbmcgJytkYXRhLm4rJyA8Li4uPicgKTtcbiAgICAgICAgICAgIHJldHVybiB0YXA7XG4gICAgICAgIH1cbiAgICAgICAgdGFwLnB1c2goKGRhdGEucGFzcz8nJzonbm90ICcpICsgJ29rICcgKyBkYXRhLm5cbiAgICAgICAgICAgICsgKGRhdGEubmFtZSA/ICcgLSAnK2RhdGEubmFtZSA6ICcnKSk7XG4gICAgICAgIGlmICghZGF0YS5wYXNzKVxuICAgICAgICAgICAgdGFwLnB1c2goJyMgQ29uZGl0aW9uJysoZGF0YS5jb25kID8gJyAnK2RhdGEuY29uZCA6ICcnKSsnIGZhaWxlZCBhdCAnK2RhdGEud2hlcmUpO1xuICAgICAgICB0YXAucHVzaCguLi5kYXRhLmV2aWRlbmNlLm1hcChzPT4nIyAnK3MpKTtcbiAgICAgICAgdGFwLnB1c2goLi4uZGF0YS5pbmZvLm1hcChzPT4nIyAnK3MpKTtcbiAgICAgICAgcmV0dXJuIHRhcDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIFJldHVybnMgZGV0YWlsZWQgcmVwb3J0IG9uIGEgc3BlY2lmaWMgY2hlY2tcbiAgICAgKiAgIEBwYXJhbSB7aW50ZWdlcn0gbiAtIGNoZWNrIG51bWJlciwgbXVzdCBiZSA8PSBnZXRDb3VudCgpXG4gICAgICogICBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldERldGFpbHMobikge1xuICAgICAgICAvLyBUT0RPIHZhbGlkYXRlIG5cblxuICAgICAgICAvLyB1Z2x5IGJ1dCB3aGF0IGNhbiBJIGRvXG4gICAgICAgIGlmIChuID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG46ICAgIDAsXG4gICAgICAgICAgICAgICAgaW5mbzogdGhpcy5faW5mb1swXSB8fCBbXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZXZpZGVuY2UgPSB0aGlzLl9ldmlkZW5jZVtuXTtcbiAgICAgICAgaWYgKGV2aWRlbmNlICYmICFBcnJheS5pc0FycmF5KGV2aWRlbmNlKSlcbiAgICAgICAgICAgIGV2aWRlbmNlID0gW2V2aWRlbmNlXTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbjogICAgICAgIG4sXG4gICAgICAgICAgICBuYW1lOiAgICAgdGhpcy5fZGVzY3Jbbl0gfHwgJycsXG4gICAgICAgICAgICBwYXNzOiAgICAgIWV2aWRlbmNlLFxuICAgICAgICAgICAgZXZpZGVuY2U6IGV2aWRlbmNlIHx8IFtdLFxuICAgICAgICAgICAgd2hlcmU6ICAgIHRoaXMuX3doZXJlW25dLFxuICAgICAgICAgICAgY29uZDogICAgIHRoaXMuX2NvbmROYW1lW25dLFxuICAgICAgICAgICAgaW5mbzogICAgIHRoaXMuX2luZm9bbl0gfHwgW10sXG4gICAgICAgICAgICBuZXN0ZWQ6ICAgdGhpcy5fbmVzdGVkW25dLFxuICAgICAgICAgICAgcGVuZGluZzogIHRoaXMuX3BlbmRpbmcuaGFzKG4pLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBDb252ZXJ0IHJlcG9ydCB0byBhbiBBc3NlcnRpb25FcnJvciAoaWYgYXZhaWxhYmxlKSBvciBqdXN0IEVycm9yLlxuICAgICAqICBAcGFyYW0ge251bWJlcn0gW25dIE51bWJlciBvZiBjaGVjayB0byBjb252ZXJ0IHRvIGV4Y2VwdGlvbi5cbiAgICAgKiAgQ3VycmVudCBlcnJvciBmb3JtYXQgaXMgVEFQLCB0aGlzIG1heSBjaGFuZ2UgaW4gdGhlIGZ1dHVyZS5cbiAgICAgKiAgSWYgMCBvciB1bnNwZWNpZmllZCwgY29udmVydCB0aGUgd2hvbGUgcmVwb3J0LlxuICAgICAqICBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXG4gICAgICogIEBwYXJhbSB7Ym9vbGVhbn0gb3B0aW9ucy5wYXNzIElmIGZhbHNlICh0aGUgZGVmYXVsdCksIHJldHVybiBub3RoaW5nXG4gICAgICogIGlmIHRoZSByZXBvcnQgaXMgcGFzc2luZy5cbiAgICAgKiAgQHJldHVybnMge0Vycm9yfHVuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBnZXRFcnJvcihuLCBvcHRpb25zPXt9KSB7XG4gICAgICAgIGlmICghbikge1xuICAgICAgICAgICAgLy8gbm8gZW50cnkgZ2l2ZW5cbiAgICAgICAgICAgIGlmICghb3B0aW9ucy5wYXNzICYmIHRoaXMuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgcmV0dXJuIG1ha2VFcnJvcih7XG4gICAgICAgICAgICAgICAgYWN0dWFsOiAgIHRoaXMuZ2V0VGFwKCksXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6ICcnLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICB0aGlzLmdldFRpdGxlKCksXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICdjb250cmFjdCcsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBkYXRhID0gdHlwZW9mIG4gPT09ICdvYmplY3QnID8gbiA6IHRoaXMuZ2V0RGV0YWlscyhuKTtcblxuICAgICAgICAvLyBubyBlcnJvclxuICAgICAgICBpZiAoIW9wdGlvbnMucGFzcyAmJiBkYXRhLnBhc3MpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgcmV0dXJuIG1ha2VFcnJvcih7XG4gICAgICAgICAgICBhY3R1YWw6ICAgdGhpcy5nZXRUYXBFbnRyeShkYXRhKS5qb2luKCdcXG4nKSxcbiAgICAgICAgICAgIGV4cGVjdGVkOiAnJyxcbiAgICAgICAgICAgIG1lc3NhZ2U6ICBkYXRhLm5hbWUsXG4gICAgICAgICAgICBvcGVyYXRvcjogZGF0YS5jb25kLFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXRUaHJvd24obiwgb3B0aW9ucz17fSkge1xuICAgICAgICAvLyBUT0RPIHJlbmFtZSB0byBqdXN0IHRocm93P1xuICAgICAgICBjb25zdCBlcnIgPSB0aGlzLmdldEVycm9yKG4sIG9wdGlvbnMpO1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbn1cblxuLy8gdGhpcyBpcyBmb3Igc3R1ZmYgbGlrZSBgb2JqZWN0IGZvbyA9IHtcImZvb1wiOjQyfWBcbi8vIHdlIGRvbid0IHdhbnQgdGhlIGV4cGxhbmF0aW9uIHRvIGJlIHF1b3RlZCFcbmZ1bmN0aW9uIF9leHBsYWluKCBpdGVtLCBkZXB0aCApIHtcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnIClcbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgcmV0dXJuIGV4cGxhaW4oIGl0ZW0sIGRlcHRoICk7XG59O1xuXG5SZXBvcnQucHJvdG90eXBlLmV4cGxhaW4gPSBleHBsYWluOyAvLyBhbHNvIG1ha2UgYXZhaWxhYmxlIHZpYSByZXBvcnRcblxuLy8gcGFydCBvZiBhZGRDb25kaXRpb25cbmNvbnN0IGtub3duQ2hlY2tzID0gbmV3IFNldCgpO1xuXG4vKipcbiAqICBAbWVtYmVyT2YgcmVmdXRlXG4gKiAgQHN0YXRpY1xuICogIEBkZXNjIENyZWF0ZSBuZXcgY2hlY2sgbWV0aG9kIGF2YWlsYWJsZSB2aWEgYWxsIFJlcG9ydCBpbnN0YW5jZXNcbiAqICBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lIG9mIHRoZSBuZXcgY29uZGl0aW9uLlxuICogIE11c3Qgbm90IGJlIHByZXNlbnQgaW4gUmVwb3J0IGFscmVhZHksIGFuZCBzaG91bGQgTk9UIHN0YXJ0IHdpdGhcbiAqICBnZXQuLi4sIHNldC4uLiwgb3IgYWRkLi4uICh0aGVzZSBhcmUgcmVzZXJ2ZWQgZm9yIFJlcG9ydCBpdHNlbGYpXG4gKiAgQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgQ29uZmlndXJpbmcgdGhlIGNoZWNrJ3MgaGFuZGxpbmcgb2YgYXJndW1lbnRzXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLmFyZ3MgVGhlIHJlcXVpcmVkIG51bWJlciBvZiBhcmd1bWVudHNcbiAqICBAcGFyYW0ge2ludGVnZXJ9IFtvcHRpb25zLm1pbkFyZ3NdIE1pbmltdW0gbnVtYmVyIG9mIGFyZ3VtZW50IChkZWZhdWx0cyB0byBhcmdzKVxuICogIEBwYXJhbSB7aW50ZWdlcn0gW29wdGlvbnMubWF4QXJnc10gTWF4aW11bSBudW1iZXIgb2YgYXJndW1lbnQgKGRlZmF1bHRzIHRvIGFyZ3MpXG4gKiAgQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5oYXNPcHRpb25zXSBJZiB0cnVlLCBhbiBvcHRpb25hbCBvYmplY3RcbmNhbiBiZSBzdXBwbGllZCBhcyBsYXN0IGFyZ3VtZW50LiBJdCB3b24ndCBpbnRlcmZlcmUgd2l0aCBkZXNjcmlwdGlvbi5cbiAqICBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmZ1bl0gVGhlIGxhc3QgYXJndW1lbnQgaXMgYSBjYWxsYmFja1xuICogIEBwYXJhbSB7RnVuY3Rpb259IGltcGxlbWVudGF0aW9uIC0gYSBjYWxsYmFjayB0aGF0IHRha2VzIHthcmdzfSBhcmd1bWVudHNcbiAqICBhbmQgcmV0dXJucyBhIGZhbHNleSB2YWx1ZSBpZiBjb25kaXRpb24gcGFzc2VzXG4gKiAgKFwibm90aGluZyB0byBzZWUgaGVyZSwgbW92ZSBhbG9uZ1wiKSxcbiAqICBvciBldmlkZW5jZSBpZiBpdCBmYWlsc1xuICogIChlLmcuIHR5cGljYWxseSBhIGdvdC9leHBlY3RlZCBkaWZmKS5cbiAqL1xuZnVuY3Rpb24gYWRkQ29uZGl0aW9uIChuYW1lLCBvcHRpb25zLCBpbXBsKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gbmFtZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgaWYgKG5hbWUubWF0Y2goL14oX3xnZXRbX0EtWl18c2V0W19BLVpdKS8pKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiBuYW1lIG11c3Qgbm90IHN0YXJ0IHdpdGggZ2V0Xywgc2V0Xywgb3IgXycpO1xuICAgIC8vIFRPRE8gbXVzdCBkbyBzb21ldGhpbmcgYWJvdXQgbmFtZSBjbGFzaGVzLCBidXQgbGF0ZXJcbiAgICAvLyBiZWNhdXNlIGV2YWwgaW4gYnJvd3NlciBtYXkgKGtpbmQgb2YgbGVnaW1pdGVseSkgb3ZlcnJpZGUgY29uZGl0aW9uc1xuICAgIGlmICgha25vd25DaGVja3MuaGFzKG5hbWUpICYmIFJlcG9ydC5wcm90b3R5cGVbbmFtZV0pXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIGFscmVhZHkgZXhpc3RzIGluIFJlcG9ydDogJytuYW1lKTtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBvcHRpb25zJyk7XG4gICAgaWYgKHR5cGVvZiBpbXBsICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBpbXBsZW1lbnRhdGlvbicpO1xuXG4gICAgY29uc3QgbWluQXJncyAgICA9IG9wdGlvbnMubWluQXJncyB8fCBvcHRpb25zLmFyZ3M7XG4gICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFyZ3MpIHx8IG1pbkFyZ3MgPCAwKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FyZ3MvbWluQXJncyBtdXN0IGJlIG5vbm5lZ2F0aXZlIGludGVnZXInKTtcbiAgICBjb25zdCBtYXhBcmdzICAgID0gb3B0aW9ucy5tYXhBcmdzIHx8IG9wdGlvbnMuYXJncyB8fCBJbmZpbml0eTtcbiAgICBpZiAobWF4QXJncyAhPT0gSW5maW5pdHkgJiYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFyZ3MpIHx8IG1heEFyZ3MgPCBtaW5BcmdzKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdtYXhBcmdzIG11c3QgYmUgaW50ZWdlciBhbmQgZ3JlYXRlciB0aGFuIG1pbkFyZ3MsIG9yIEluZmluaXR5Jyk7XG4gICAgY29uc3QgZGVzY3JGaXJzdCAgICA9IG9wdGlvbnMuZGVzY3JGaXJzdCB8fCBvcHRpb25zLmZ1biB8fCBtYXhBcmdzID4gMTA7XG4gICAgY29uc3QgaGFzT3B0aW9ucyAgICA9ICEhb3B0aW9ucy5oYXNPcHRpb25zO1xuICAgIGNvbnN0IG1heEFyZ3NSZWFsICAgPSBtYXhBcmdzICsgKGhhc09wdGlvbnMgPyAxIDogMCk7XG5cbiAgICAvLyBUT0RPIGFsZXJ0IHVua25vd24gb3B0aW9uc1xuXG4gICAgLy8gVE9ETyB0aGlzIGNvZGUgaXMgY2x1dHRlcmVkLCByZXdyaXRlXG4gICAgY29uc3QgY29kZSA9IGZ1bmN0aW9uKC4uLmFyZ3MpIHtcbiAgICAgICAgY29uc3QgZGVzY3IgPSBkZXNjckZpcnN0XG4gICAgICAgICAgICA/IGFyZ3Muc2hpZnQoKVxuICAgICAgICAgICAgOiAoIChhcmdzLmxlbmd0aCA+IG1heEFyZ3MgJiYgdHlwZW9mIGFyZ3NbYXJncy5sZW5ndGgtMV0gPT09ICdzdHJpbmcnKSA/IGFyZ3MucG9wKCkgOiB1bmRlZmluZWQpO1xuICAgICAgICBpZiAoYXJncy5sZW5ndGggPiBtYXhBcmdzUmVhbCB8fCBhcmdzLmxlbmd0aCA8IG1pbkFyZ3MpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiAnK25hbWUrJyBtdXN0IGhhdmUgJyttaW5BcmdzKycuLicrbWF4QXJnc1JlYWwrJyBhcmd1bWVudHMgJyk7IC8vIFRPRE9cblxuICAgICAgICBjb25zdCBuID0gdGhpcy5uZXh0KCk7IC8vIFRPRE8gY2FsbCBpdCBhZHZhbmNlKCkgb3Igc210aC5cbiAgICAgICAgY29uc3QgZXZpZGVuY2UgPSBpbXBsKCAuLi5hcmdzICk7XG4gICAgICAgIHJldHVybiB0aGlzLnNldFJlc3VsdCggbiwgZXZpZGVuY2UsIGRlc2NyLCBuYW1lICk7XG4gICAgfTtcblxuICAgIGtub3duQ2hlY2tzLmFkZChuYW1lKTtcbiAgICBSZXBvcnQucHJvdG90eXBlW25hbWVdID0gY29kZTtcbn1cblxuLy8gVGhlIG1vc3QgYmFzaWMgY29uZGl0aW9ucyBhcmUgZGVmaW5lZCByaWdodCBoZXJlXG4vLyBpbiBvcmRlciB0byBiZSBzdXJlIHdlIGNhbiB2YWxpZGF0ZSB0aGUgUmVwb3J0IGNsYXNzIGl0c2VsZi5cblxuLyoqXG4gKiAgQG5hbWVzcGFjZSBjb25kaXRpb25zXG4gKiAgQGRlc2MgQ29uZGl0aW9uIGNoZWNrIGxpYnJhcnkuIFRoZXNlIG1ldGhvZHMgbXVzdCBiZSBydW4gb24gYVxuICogIHtAbGluayBSZXBvcnR9IG9iamVjdC5cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGNoZWNrXG4gKiAgIEBkZXNjIEEgZ2VuZXJpYyBjaGVjayBvZiBhIGNvbmRpdGlvbi5cbiAqICAgQHBhcmFtIGV2aWRlbmNlIElmIGZhbHNlLCAwLCAnJywgb3IgdW5kZWZpbmVkLCB0aGUgY2hlY2sgaXMgYXNzdW1lZCB0byBwYXNzLlxuICogICBPdGhlcndpc2UgaXQgZmFpbHMsIGFuZCB0aGlzIGFyZ3VtZW50IHdpbGwgYmUgZGlzcGxheWVkIGFzIHRoZSByZWFzb24gd2h5LlxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXSBUaGUgcmVhc29uIHdoeSB3ZSBjYXJlIGFib3V0IHRoZSBjaGVjay5cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIHBhc3NcbiAqICAgQGRlc2MgQWx3YXlzIHBhc3Nlcy5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIGZhaWxcbiAqICAgQGRlc2MgQWx3YXlzIGZhaWxzIHdpdGggYSBcImZhaWxlZCBkZWxpYmVyYXRlbHlcIiBtZXNzYWdlLlxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgZXF1YWxcbiAqICAgQGRlc2MgQ2hlY2tzIGlmID09PSBob2xkcyBiZXR3ZWVuIHR3byB2YWx1ZXMuXG4gKiAgIElmIG5vdCwgYm90aCB3aWxsIGJlIHN0cmluZ2lmaWVkIGFuZCBkaXNwbGF5ZWQgYXMgYSBkaWZmLlxuICogICBTZWUgZGVlcEVxdWFsIHRvIGNoZWNrIG5lc3RlZCBkYXRhIHN0cnVjdHVyZXMgb3Qgb2JqZWN0cy5cbiAqICAgQHBhcmFtIHthbnl9IGFjdHVhbFxuICogICBAcGFyYW0ge2FueX0gZXhwZWN0ZWRcbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuLyoqXG4gKiAgIEBpbnN0YW5jZVxuICogICBAbWVtYmVyT2YgY29uZGl0aW9uc1xuICogICBAbWV0aG9kIG1hdGNoXG4gKiAgIEBkZXNjIENoZWNrcyBpZiBhIHN0cmluZyBtYXRjaGVzIGEgcmVndWxhciBleHByZXNzaW9uLlxuICogICBAcGFyYW0ge3N0cnVuZ30gYWN0dWFsXG4gKiAgIEBwYXJhbSB7UmVnRXhwfSBleHBlY3RlZFxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG4vKipcbiAqICAgQGluc3RhbmNlXG4gKiAgIEBtZW1iZXJPZiBjb25kaXRpb25zXG4gKiAgIEBtZXRob2QgbmVzdGVkXG4gKiAgIEBkZXNjIFZlcmlmeSBhIG5lc3RlZCBjb250cmFjdC5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IGRlc2NyaXB0aW9uXG4gKiAgIEBwYXJhbSB7Q29udHJhY3R9IGNvbnRyYWN0XG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9XG4gKi9cblxuYWRkQ29uZGl0aW9uKFxuICAgICdjaGVjaycsXG4gICAge2FyZ3M6MX0sXG4gICAgeD0+eFxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAncGFzcycsXG4gICAge2FyZ3M6MH0sXG4gICAgKCk9PjBcbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ2ZhaWwnLFxuICAgIHthcmdzOjB9LFxuICAgICgpPT4nZmFpbGVkIGRlbGliZXJhdGVseSdcbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ2VxdWFsJyxcbiAgICB7YXJnczoyfSxcbiAgICAoYSxiKSA9PiBhID09PSBiID8gMCA6IFsgJy0gJytleHBsYWluKGEpLCAnKyAnICsgZXhwbGFpbihiKSBdXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdtYXRjaCcsXG4gICAge2FyZ3M6Mn0sXG4gICAgKGEscmV4KSA9PiAoJycrYSkubWF0Y2gocmV4KSA/IDAgOiBbXG4gICAgICAgICdTdHJpbmcgICAgICAgICA6ICcrYSxcbiAgICAgICAgJ0RvZXMgbm90IG1hdGNoIDogJytyZXhcbiAgICBdXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICduZXN0ZWQnLFxuICAgIHtmdW46MSxtaW5BcmdzOjF9LFxuICAgICguLi5hcmdzKSA9PiBuZXcgUmVwb3J0KCkucnVuKC4uLmFyZ3MpLmRvbmUoKVxuKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7IFJlcG9ydCwgYWRkQ29uZGl0aW9uLCBleHBsYWluIH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgQW5ub3RhdGVkU2V0IH0gPSByZXF1aXJlKCAnLi91dGlsL2Fubm90YXRlZC1zZXQuanMnICk7XG5cbi8qKlxuICogICBAbmFtZXNwYWNlIHV0aWxpdGllc1xuICogICBAZGVzYyAgVGhlc2UgZnVuY3Rpb25zIGhhdmUgbm90aGluZyB0byBkbyB3aXRoIHJlZnV0ZSBhbmQgc2hvdWxkXG4gKiAgICAgICAgICBpZGVhbGx5IGJlIGluIHNlcGFyYXRlIG1vZHVsZXMuXG4gKi9cblxuLyogRGV0ZXJtaW5lIG4tdGggY2FsbGVyIHVwIHRoZSBzdGFjayAqL1xuLyogSW5zcGlyZWQgYnkgUGVybCdzIENhcnAgbW9kdWxlICovXG5jb25zdCBpblN0YWNrID0gLyhbXjpcXHMoKV0rOlxcZCsoPzo6XFxkKyk/KVxcVyooXFxufCQpL2c7XG5cbi8qKlxuICogIEBwdWJsaWNcbiAqICBAbWVtYmVyT2YgdXRpbGl0aWVzXG4gKiAgQGZ1bmN0aW9uXG4gKiAgQGRlc2MgUmV0dXJucyBzb3VyY2UgcG9zaXRpb24gbiBmcmFtZXMgdXAgdGhlIHN0YWNrXG4gKiAgQGV4YW1wbGVcbiAqICBcIi9mb28vYmFyLmpzOjI1OjExXCJcbiAqICBAcGFyYW0ge2ludGVnZXJ9IGRlcHRoIEhvdyBtYW55IGZyYW1lcyB0byBza2lwXG4gKiAgQHJldHVybnMge3N0cmluZ30gc291cmNlIGZpbGUsIGxpbmUsIGFuZCBjb2x1bW4sIHNlcGFyYXRlZCBieSBjb2xvbi5cbiAqL1xuZnVuY3Rpb24gY2FsbGVySW5mbyhuKSB7XG4gICAgLyogYSB0ZXJyaWJsZSByZXggdGhhdCBiYXNpY2FsbHkgc2VhcmNoZXMgZm9yIGZpbGUuanM6bm5uOm5ubiBzZXZlcmFsIHRpbWVzKi9cbiAgICByZXR1cm4gKG5ldyBFcnJvcigpLnN0YWNrLm1hdGNoKGluU3RhY2spW24rMV0ucmVwbGFjZSgvXFxXKlxcbiQvLCAnJykgfHwgJycpXG59XG5cbi8qKlxuICogIEBwdWJsaWNcbiAqICBAaW5zdGFuY1JcbiAqICBAbWVtYmVyT2YgUmVwb3J0XG4gKiAgQGRlc2MgU3RyaW5naXJ5IG9iamVjdHMgcmVjdXJzaXZlbHkgd2l0aCBsaW1pdGVkIGRlcHRoXG4gKiAgYW5kIGNpcmN1bGFyIHJlZmVyZW5jZSB0cmFja2luZy5cbiAqICBHZW5lcmFsbHkgSlNPTi5zdHJpbmdpZnkgaXMgdXNlZCBhcyByZWZlcmVuY2U6XG4gKiAgc3RyaW5ncyBhcmUgZXNjYXBlZCBhbmQgZG91YmxlLXF1b3RlZDsgbnVtYmVycywgYm9vbGVhbiwgYW5kIG51bGxzIGFyZVxuICogIHN0cmluZ2lmaWVkIFwiYXMgaXNcIjsgb2JqZWN0cyBhbmQgYXJyYXlzIGFyZSBkZXNjZW5kZWQgaW50by5cbiAqICBUaGUgZGlmZmVyZW5jZXMgZm9sbG93OlxuICogIHVuZGVmaW5lZCBpcyByZXBvcnRlZCBhcyAnPHVuZGVmPicuXG4gKiAgT2JqZWN0cyB0aGF0IGhhdmUgY29uc3RydWN0b3JzIGFyZSBwcmVmaXhlZCB3aXRoIGNsYXNzIG5hbWVzLlxuICogIE9iamVjdCBhbmQgYXJyYXkgY29udGVudCBpcyBhYmJyZXZpYXRlZCBhcyBcIi4uLlwiIGFuZCBcIkNpcmN1bGFyXCJcbiAqICBpbiBjYXNlIG9mIGRlcHRoIGV4aGF1c3Rpb24gYW5kIGNpcmN1bGFyIHJlZmVyZW5jZSwgcmVzcGVjdGl2ZWx5LlxuICogIEZ1bmN0aW9ucyBhcmUgbmFpdmVseSBzdHJpbmdpZmllZC5cbiAqICBAcGFyYW0ge0FueX0gdGFyZ2V0IE9iamVjdCB0byBzZXJpYWxpemUuXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBkZXB0aD0zIERlcHRoIGxpbWl0LlxuICogIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGV4cGxhaW4oIGl0ZW0sIGRlcHRoPTMsIG9wdGlvbnM9e30sIHBhdGg9JyQnLCBzZWVuPW5ldyBBbm5vdGF0ZWRTZXQoKSApIHtcbiAgICAvLyBzaW1wbGUgdHlwZXNcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKVxuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoaXRlbSk7IC8vIGRvbid0IHdhbnQgdG8gc3BlbmQgdGltZSBxb3V0aW5nXG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgaXRlbSA9PT0gJ2Jvb2xlYW4nIHx8IGl0ZW0gPT09IG51bGwpXG4gICAgICAgIHJldHVybiAnJytpdGVtO1xuICAgIGlmIChpdGVtID09PSB1bmRlZmluZWQpIHJldHVybiAnPHVuZGVmPic7XG4gICAgaWYgKHR5cGVvZiBpdGVtICE9PSAnb2JqZWN0JykgLy8gbWF5YmUgZnVuY3Rpb25cbiAgICAgICAgcmV0dXJuICcnK2l0ZW07IC8vIFRPRE8gZG9uJ3QgcHJpbnQgb3V0IGEgbG9uZyBmdW5jdGlvbidzIGJvZHlcblxuICAgIC8vIHJlY3Vyc2VcbiAgICBjb25zdCB3aGVyZVNlZW4gPSBzZWVuLmhhcyhpdGVtKTtcbiAgICBpZiAod2hlcmVTZWVuKSB7XG4gICAgICAgIGNvbnN0IG5vdGUgPSAnQ2lyY3VsYXI9Jyt3aGVyZVNlZW47XG4gICAgICAgIHJldHVybiBBcnJheS5pc0FycmF5KGl0ZW0pPydbICcrbm90ZSsnIF0nOid7ICcrbm90ZSsnIH0nO1xuICAgIH07XG4gICAgc2VlbiA9IHNlZW4uYWRkKCBpdGVtLCBwYXRoICk7IC8vIGNsb25lcyBzZWVuXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShpdGVtKSkge1xuICAgICAgICBpZiAoZGVwdGggPCAxKVxuICAgICAgICAgICAgcmV0dXJuICdbLi4uXSc7XG4gICAgICAgIHNlZW4uYWRkKGl0ZW0pO1xuICAgICAgICAvLyBUT0RPIDx4IGVtcHR5IGl0ZW1zPlxuICAgICAgICBjb25zdCBsaXN0ID0gaXRlbS5tYXAoXG4gICAgICAgICAgICAodmFsLCBpbmRleCkgPT4gZXhwbGFpbih2YWwsIGRlcHRoLTEsIG9wdGlvbnMsIHBhdGgrJ1snK2luZGV4KyddJywgc2VlbilcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuICdbJytsaXN0LmpvaW4oJywgJykrJ10nOyAvLyBUT0RPIGNvbmZpZ3VyYWJsZSB3aGl0ZXNwYWNlXG4gICAgfVxuXG4gICAgY29uc3QgdHlwZSA9IGl0ZW0uY29uc3RydWN0b3IgJiYgaXRlbS5jb25zdHJ1Y3Rvci5uYW1lO1xuICAgIGNvbnN0IHByZWZpeCA9IHR5cGUgJiYgdHlwZSAhPT0gJ09iamVjdCcgPyB0eXBlICsgJyAnIDogJyc7XG4gICAgaWYgKGRlcHRoIDwgMSlcbiAgICAgICAgcmV0dXJuIHByZWZpeCArICd7Li4ufSc7XG4gICAgY29uc3QgbGlzdCA9IE9iamVjdC5rZXlzKGl0ZW0pLnNvcnQoKS5tYXAoIGtleSA9PiB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gSlNPTi5zdHJpbmdpZnkoa2V5KTtcbiAgICAgICAgcmV0dXJuIGluZGV4K1wiOlwiK2V4cGxhaW4oaXRlbVtrZXldLCBkZXB0aC0xLCBvcHRpb25zLCBwYXRoKydbJytpbmRleCsnXScsIHNlZW4pO1xuICAgIH0pO1xuICAgIHJldHVybiBwcmVmaXggKyAneycgKyBsaXN0LmpvaW4oXCIsIFwiKSArICd9Jztcbn1cblxuLy8gTXVzdCB3b3JrIGV2ZW4gd2l0aG91dCBhc3NlcnRcbmNvbnN0IGhhc0Fzc2VydCA9IHR5cGVvZiBhc3NlcnQgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXNzZXJ0LkFzc2VydGlvbkVycm9yID09PSAnZnVuY3Rpb24nO1xuXG5jb25zdCBtYWtlRXJyb3IgPSBoYXNBc3NlcnRcbiAgICA/IGVudHJ5ID0+IG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IoZW50cnkpXG4gICAgOiBlbnRyeSA9PiBuZXcgRXJyb3IoIGVudHJ5LmFjdHVhbCApO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHsgY2FsbGVySW5mbywgZXhwbGFpbiwgbWFrZUVycm9yIH07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFNlZSBhbHNvIG5vdGVkLXNldC5qc1xuXG5jbGFzcyBBbm5vdGF0ZWRTZXQge1xuICAgIGNvbnN0cnVjdG9yKGFsbD1uZXcgU2V0KCksIG5vdGVzPVtdKSB7XG4gICAgICAgIHRoaXMuYWxsICAgPSBhbGw7XG4gICAgICAgIHRoaXMubm90ZXMgPSBub3RlcztcbiAgICB9XG4gICAgYWRkKCBpdGVtLCBub3RlICkge1xuICAgICAgICBpZiAodGhpcy5hbGwuaGFzKGl0ZW0pKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgQW5ub3RhdGVkU2V0KFxuICAgICAgICAgICAgbmV3IFNldCh0aGlzLmFsbCkuYWRkKGl0ZW0pLFxuICAgICAgICAgICAgWyAuLi50aGlzLm5vdGVzLCBbIGl0ZW0sIG5vdGUgXSBdXG4gICAgICAgICk7XG4gICAgfVxuICAgIGhhcyggaXRlbSApIHtcbiAgICAgICAgaWYgKCF0aGlzLmFsbC5oYXMoIGl0ZW0gKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgZm9yIChsZXQgcGFpciBvZiB0aGlzLm5vdGVzKSB7XG4gICAgICAgICAgICBpZiAocGFpclswXSA9PT0gaXRlbSlcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFpclsxXTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd3dGYsIHVucmVhY2hhYmxlJyk7XG4gICAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0geyBBbm5vdGF0ZWRTZXQgfTtcbiJdfQ==
