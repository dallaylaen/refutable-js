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
 *   @public
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

    // setup - must be chainable
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
                    // TODO this is perl written in JS, rewrite more clear
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

/**
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
const seen = new Set();
function addCondition (name, options, impl) {
    if (typeof name !== 'string')
        throw new Error('Condition name must be a string');
    if (name.match(/^(_|get[_A-Z]|set[_A-Z])/))
        throw new Error('Condition name must not start with get_, set_, or _');
    // TODO must do something about name clashes, but later
    // because eval in browser may (kind of legimitely) override conditions
    if (!seen.has(name) && Report.prototype[name])
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

    seen.add(name);
    Report.prototype[name] = code;
}

/**
 *   @function check
 *   @memberOf Report
 *   @param evidence If false, the check is assumed to pass.
 *   A true value means the check failed.
 *   @param {string} [description]
 *   @returns {undefined}
 */

// these conditions could be under the condition library
// but we'll need them to verify the Report class itself.

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

/**
 *   @exports Report
 *   @exports report
 *   @exports addCondition
 *   @exports explain
 */

module.exports = { Report, addCondition, explain };

},{"./util.js":7}],7:[function(require,module,exports){
'use strict';

const { AnnotatedSet } = require( './util/annotated-set.js' );

/* Determine n-th caller up the stack */
/* Inspired by Perl's Carp module */
const inStack = /([^:\s()]+:\d+(?::\d+)?)\W*(\n|$)/g;

/**
 *  @public
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
 *  @function
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

/**
 *   @exports callerInfo
 *   @exports explain
 */

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9yZWZ1dGUuanMiLCJsaWIvcmVmdXRlL2NvbmQvYXJyYXkuanMiLCJsaWIvcmVmdXRlL2NvbmQvYmFzaWMuanMiLCJsaWIvcmVmdXRlL2NvbmQvZGVlcC5qcyIsImxpYi9yZWZ1dGUvZGJjLmpzIiwibGliL3JlZnV0ZS9yZXBvcnQuanMiLCJsaWIvcmVmdXRlL3V0aWwuanMiLCJsaWIvcmVmdXRlL3V0aWwvYW5ub3RhdGVkLXNldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyB0aGUgY29yZSAoc2hvdWxkIGV4cGxhaW4gZXZlbiBiZSB0aGVyZT8pXG5jb25zdCB7IFJlcG9ydCwgYWRkQ29uZGl0aW9uLCBleHBsYWluIH0gPSByZXF1aXJlICgnLi9yZWZ1dGUvcmVwb3J0LmpzJyk7XG5cbi8vIGVpZmZlbC1zdHlsZSBkZXNpZ24tYnktY29udHJhY3RcbmNvbnN0IHsgREJDIH0gPSByZXF1aXJlKCAnLi9yZWZ1dGUvZGJjLmpzJyApO1xuXG4vLyBpbXBvcnQgZGVmYXVsdCBjb25kaXRpb24gYXJzZW5hbFxucmVxdWlyZSggJy4vcmVmdXRlL2NvbmQvYmFzaWMuanMnICk7XG5yZXF1aXJlKCAnLi9yZWZ1dGUvY29uZC9hcnJheS5qcycgKTtcbnJlcXVpcmUoICcuL3JlZnV0ZS9jb25kL2RlZXAuanMnICk7XG5cbmNvbnN0IGdldFJlcG9ydCA9ICguLi5hcmdzKSA9PiBuZXcgUmVwb3J0KCkucnVuKC4uLmFyZ3MpLmRvbmUoKTtcblxuLy8gQWxsb3cgY3JlYXRpbmcgbXVsdGlwbGUgcGFyYWxsZWwgY29uZmlndXJhdGlvbnMgb2YgcmVmdXRlXG4vLyBlLmcuIG9uZSBzdHJpY3QgKHRocm93aW5nIGVycm9ycykgYW5kIG90aGVyIGxheCAoanVzdCBkZWJ1Z2dpbmcgdG8gY29uc29sZSlcbmZ1bmN0aW9uIHNldHVwKCBvcHRpb25zPXt9LCBvcmlnICkge1xuICAgIC8vIFRPRE8gdmFsaWRhdGUgb3B0aW9uc1xuICAgIGNvbnN0IG9uRmFpbCA9IG9wdGlvbnMub25GYWlsIHx8IChyZXAgPT4geyB0aHJvdyBuZXcgRXJyb3IocmVwLmdldFRhcCgpKSB9KTtcblxuICAgIGNvbnN0IHJlZnV0ZSA9IG9wdGlvbnMuc2tpcFxuICAgICAgICA/ICgpPT57fVxuICAgICAgICA6ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBvayA9IG5ldyBSZXBvcnQoKTtcbiAgICAgICAgICAgIG9rLm9uRG9uZSggeCA9PiB7IGlmKCAheC5nZXRQYXNzKCkgKSBvbkZhaWwoeCwgYXJncykgfSApO1xuICAgICAgICAgICAgb2sucnVuKC4uLmFyZ3MpO1xuICAgICAgICAgICAgb2suZG9uZSgpO1xuICAgICAgICB9O1xuXG4gICAgLy8gcmVleHBvcnQgYWxsIGZyb20gcmVwb3J0LmpzXG4gICAgcmVmdXRlLlJlcG9ydCA9IFJlcG9ydDtcbiAgICByZWZ1dGUuZXhwbGFpbiA9IGV4cGxhaW47XG4gICAgcmVmdXRlLmFkZENvbmRpdGlvbiA9IGFkZENvbmRpdGlvbjtcblxuICAgIC8vIHNob3J0Y3V0IHRvIHZhbGlkYXRpbmcgJiByZXR1cm5pbmcgYSBmcmVzaCBjb250cmFjdFxuICAgIC8vIFRPRE8gcmVuYW1lIHRvIGF2b2lkIG5hbWUgY2xhc2ggd2l0aCB0aGUgY2xhc3NcbiAgICAvLyAoZXZhbD8pXG4gICAgcmVmdXRlLnJlcG9ydCA9IGdldFJlcG9ydDtcblxuICAgIC8vIHJlZnV0ZS5jb25mKHsuLi59KSB3aWxsIGdlbmVyYXRlIGEgX25ld18gcmVmdXRlXG4gICAgcmVmdXRlLmNvbmZpZyA9IHVwZGF0ZSA9PiBzZXR1cCggeyAuLi5vcHRpb25zLCAuLi51cGRhdGUgfSwgcmVmdXRlICk7XG5cbiAgICAvLyBhZGQgZGVzaWduLWJ5LWNvbnRyYWN0XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCByZWZ1dGUsICdkYmMnLCB7IGdldDogKCk9Pm5ldyBEQkMoKSB9ICk7XG5cbiAgICAvLyBUT0RPIHRoaXMgaXMgc3R1cGlkLCBjb21lIHVwIHdpdGggc210aCBiZXR0ZXJcbiAgICAvLyB3aGVuIGluIGJyb3dzZXIsIHdpbmRvdy5yZWZ1dGUuY29uZmlnKCkgdXBkYXRlcyB3aW5kb3cucmVmdXRlIGl0c2VsZlxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiBvcmlnID09PSB3aW5kb3cucmVmdXRlKVxuICAgICAgICB3aW5kb3cucmVmdXRlID0gcmVmdXRlO1xuXG4gICAgcmV0dXJuIHJlZnV0ZTtcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKVxuICAgIG1vZHVsZS5leHBvcnRzID0gc2V0dXAoKTtcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJylcbiAgICB3aW5kb3cucmVmdXRlID0gc2V0dXAoKTsgLy8gVE9ETyBjaGVjayBwcmVleGlzdGluZ1xuXG4vKipcbiAqICAgQGNhbGxiYWNrIENvbnRyYWN0XG4gKiAgIEBkZXNjIEEgY29kZSBibG9jayBjb250YWluaW5nIG9uZSBvciBtb3JlIGNvbmRpdGlvbiBjaGVja3MuXG4gKiAgIEEgY2hlY2sgaXMgcGVyZm9ybWVkIGJ5IGNhbGxpbmcgb25lIG9mIGEgZmV3IHNwZWNpYWwgbWV0aG9kc1xuICogICAoZXF1YWwsIG1hdGNoLCBkZWVwRXF1YWwsIHR5cGUgZXRjKVxuICogICBvbiB0aGUgUmVwb3J0IG9iamVjdC5cbiAqICAgQ29udHJhY3RzIG1heSBiZSBuZXN0ZWQgdXNpbmcgdGhlICduZXN0ZWQnIG1ldGhvZCB3aGljaCBhY2NlcHRzXG4gKiAgIGFub3RoZXIgY29udHJhY3QgYW5kIHJlY29yZHMgYSBwYXNzL2ZhaWx1cmUgaW4gdGhlIHBhcmVudCBhY2NvcmRpbmdseS5xXG4gKiAgIEEgY29udHJhY3QgaXMgYWx3YXlzIGV4ZWN1dGVkIHRvIHRoZSBlbmQuXG4gKiAgIEBwYXJhbSB7UmVwb3J0fSBvayBBbiBvYmplY3QgdGhhdCByZWNvcmRzIGNoZWNrIHJlc3VsdHMuXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzXG4gKiAgIChlLmcuIGRhdGEgc3RydWN0dXJlIHRvIGJlIHZhbGlkYXRlZClcbiAqICAgQHJldHVybnMge3ZvaWR9IFJldHVybmVkIHZhbHVlIGlzIGlnbm9yZWQuXG4gKi9cblxuLyoqXG4gKiAgIEBwdWJsaWNcbiAqICAgQGZ1bmN0aW9uIHJlZnV0ZVxuICogICBAcGFyYW0ge0FueX0gWy4uLmxpc3RdIERhdGEgdG8gZmVlZCB0byB0aGUgY2FsbGJhY2tcbiAqICAgQHBhcmFtIHtDb250cmFjdH0gY29udHJhY3QgQSBjb2RlIGJsb2NrIHdpdGggY2hlY2tzLlxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfSBSZXR1cm4gdmFsdWUgaXMgaWdub3JlZC5cbiAqICAgQHRocm93cyB7RXJyb3J9IElmIG9uZSBvciBtb3JlIGNoZWNrcyBhcmUgZmFpbGluZywgYW4gZXhjZXB0aW9uIGlzIHRocm93blxuICogICB3aXRoIGRldGFpbHMgYWJvdXQgYWxsIHBhc3NpbmcvZmFpbGluZyBjaGVja3MuXG4gKiAgIFRoaXMgYWN0aW9uIGNhbiBiZSBjaGFuZ2VkIHZpYSByZWZ1dGUuY29uZmlnKCkgY2FsbC5cbiAqXG4gKi9cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgUmVwb3J0IH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuXG4vLyBUT0RPIHJlbmFtZSBmb3JFYWNoIG9yIHNtdGguXG5hZGRDb25kaXRpb24oXG4gICAgJ21hcCcsXG4gICAge2Z1bjoxLGFyZ3M6Mn0sXG4gICAgKGxpc3QsIGNvbnRyYWN0KSA9PiB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSlcbiAgICAgICAgICAgIHJldHVybiAnRXhwZWN0ZWQgYSBsaXN0LCBmb3VuZCBhICcudHlwZW9mKGxpc3QpO1xuICAgICAgICBpZiAobGlzdC5sZW5ndGggPCAxKVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGF1dG8tcGFzc1xuXG4gICAgICAgIGNvbnN0IG9rID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICBsaXN0LmZvckVhY2goIChpdGVtLCBpbmRleCkgPT4gb2submVzdGVkKCBcIml0ZW0gXCIraW5kZXgsIGl0ZW0sIGNvbnRyYWN0ICkgKTtcbiAgICAgICAgcmV0dXJuIG9rLmRvbmUoKTtcbiAgICB9XG4pO1xuXG4vLyBUT0RPIHRoaXMgaXMgY2FsbGVkIFwiY29tcGxpYW50IGNoYWluXCIgYnV0IGJldHRlciBqdXN0IHNheSBoZXJlXG4vLyBcIm9oIHdlJ3JlIGNoZWNraW5nIGVsZW1lbnQgb3JkZXJcIlxuYWRkQ29uZGl0aW9uKFxuICAgICdvcmRlcmVkJywgLy8gVE9ETyBiZXR0ZXIgbmFtZT9cbiAgICB7ZnVuOjEsYXJnczoyfSxcbiAgICAobGlzdCwgY29udHJhY3QpID0+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKVxuICAgICAgICAgICAgcmV0dXJuICdFeHBlY3RlZCBhIGxpc3QsIGZvdW5kIGEgJy50eXBlb2YobGlzdCk7XG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA8IDIpXG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gYXV0by1wYXNzXG5cbiAgICAgICAgY29uc3Qgb2sgPSBuZXcgUmVwb3J0KCk7XG4gICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgbGlzdC5sZW5ndGgtMTsgbisrKSB7XG4gICAgICAgICAgICBvay5uZXN0ZWQoIFwiaXRlbXMgXCIrbitcIiwgXCIrKG4rMSksIGxpc3Rbbl0sIGxpc3RbbisxXSwgY29udHJhY3QpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvay5kb25lKCk7XG4gICAgfVxuKTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgcmVwb3J0LCBleHBsYWluIH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuY29uc3QgT0sgPSBmYWxzZTtcblxuY29uc3QgbnVtQ21wID0ge1xuICAgICc8JyA6ICh4LHkpPT4oeCAgPCB5KSxcbiAgICAnPicgOiAoeCx5KT0+KHggID4geSksXG4gICAgJzw9JzogKHgseSk9Pih4IDw9IHkpLFxuICAgICc+PSc6ICh4LHkpPT4oeCA+PSB5KSxcbiAgICAnPT0nOiAoeCx5KT0+KHggPT09IHkpLFxuICAgICchPSc6ICh4LHkpPT4oeCAhPT0geSksXG59O1xuXG4vLyB1c2UgIT0gYW5kIG5vdCAhPT0gZGVsaWJlcmF0ZWx5IHRvIGZpbHRlciBvdXQgbnVsbCAmIHVuZGVmaW5lZFxuY29uc3Qgc3RyQ21wID0ge1xuICAgICc8JyA6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCAgPCAnJyt5KSxcbiAgICAnPicgOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggID4gJycreSksXG4gICAgJzw9JzogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4IDw9ICcnK3kpLFxuICAgICc+PSc6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCA+PSAnJyt5KSxcblxuICAgICc9PSc6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCA9PT0gJycreSksXG4gICAgJyE9JzogKHgseSk9PigoeCA9PSB1bmRlZmluZWQpXih5ID09IHVuZGVmaW5lZCkpIHx8ICgnJyt4ICE9PSAnJyt5KSxcbn07XG5cbmFkZENvbmRpdGlvbihcbiAgICAnbnVtQ21wJyxcbiAgICB7YXJnczozfSxcbiAgICAoeCxvcCx5KSA9PiBudW1DbXBbb3BdKHgseSk/MDpbeCxcImlzIG5vdCBcIitvcCx5XVxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnc3RyQ21wJyxcbiAgICB7YXJnczozfSxcbiAgICAoeCxvcCx5KSA9PiBzdHJDbXBbb3BdKHgseSk/MDpbeCxcImlzIG5vdCBcIitvcCx5XVxuKTtcblxuY29uc3QgdHlwZUNoZWNrID0ge1xuICAgIHVuZGVmaW5lZDogeCA9PiB4ID09PSB1bmRlZmluZWQsXG4gICAgbnVsbDogICAgICB4ID0+IHggPT09IG51bGwsXG4gICAgbnVtYmVyOiAgICB4ID0+IHR5cGVvZiB4ID09PSAnbnVtYmVyJyAmJiAhTnVtYmVyLmlzTmFOKHgpLFxuICAgIGludGVnZXI6ICAgeCA9PiBOdW1iZXIuaXNJbnRlZ2VyKHgpLFxuICAgIG5hbjogICAgICAgeCA9PiBOdW1iZXIuaXNOYU4oeCksXG4gICAgc3RyaW5nOiAgICB4ID0+IHR5cGVvZiB4ID09PSAnc3RyaW5nJyxcbiAgICBmdW5jdGlvbjogIHggPT4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicsXG4gICAgYm9vbGVhbjogICB4ID0+IHR5cGVvZiB4ID09PSAnYm9vbGVhbicsXG4gICAgb2JqZWN0OiAgICB4ID0+IHggJiYgdHlwZW9mIHggPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KHgpLFxuICAgIGFycmF5OiAgICAgeCA9PiBBcnJheS5pc0FycmF5KHgpLFxufTtcbmZ1bmN0aW9uIHR5cGVFeHBsYWluICh4KSB7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnc3RyaW5nJylcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKVxuICAgICAgICByZXR1cm4gJ2luc3RhbmNlb2YgJysoeC5uYW1lIHx8IHgpO1xufTtcblxuYWRkQ29uZGl0aW9uKFxuICAgICd0eXBlJyxcbiAgICB7YXJnczogMn0sXG4gICAgKGdvdCwgZXhwKT0+e1xuICAgICAgICBpZiAoICFBcnJheS5pc0FycmF5KGV4cCkgKVxuICAgICAgICAgICAgZXhwID0gW2V4cF07XG5cbiAgICAgICAgZm9yIChsZXQgdmFyaWFudCBvZiBleHApIHtcbiAgICAgICAgICAgIC8vIGtub3duIHR5cGVcbiAgICAgICAgICAgIGlmKCB0eXBlb2YgdmFyaWFudCA9PT0gJ3N0cmluZycgJiYgdHlwZUNoZWNrW3ZhcmlhbnRdICkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlQ2hlY2tbdmFyaWFudF0oZ290KSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9LO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gaW5zdGFuY2VvZlxuICAgICAgICAgICAgaWYoIHR5cGVvZiB2YXJpYW50ID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBnb3QgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgaWYoIGdvdCBpbnN0YW5jZW9mIHZhcmlhbnQgKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gT0s7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBkb24ndCBrbm93IHdoYXQgeW91J3JlIGFza2luZyBmb3JcbiAgICAgICAgICAgIHJldHVybiAndW5rbm93biB2YWx1ZSB0eXBlIHNwZWM6ICcrZXhwbGFpbih2YXJpYW50LCAxKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICctICcrZXhwbGFpbihnb3QsIDEpLFxuICAgICAgICAgICAgJysgJytleHAubWFwKCB0eXBlRXhwbGFpbiApLmpvaW4oXCIgb3IgXCIpLFxuICAgICAgICBdO1xuICAgIH1cbik7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIGV4cGxhaW4gfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5jb25zdCB7IEFubm90YXRlZFNldCB9ID0gcmVxdWlyZSggJy4uL3V0aWwvYW5ub3RhdGVkLXNldC5qcycgKTtcblxuYWRkQ29uZGl0aW9uKCAnZGVlcEVxdWFsJywge1wiYXJnc1wiOjIsaGFzT3B0aW9uczp0cnVlfSwgZGVlcCApO1xuXG5mdW5jdGlvbiBkZWVwKCBnb3QsIGV4cCwgb3B0aW9ucz17fSApIHtcbiAgICBpZiAoIW9wdGlvbnMubWF4KVxuICAgICAgICBvcHRpb25zLm1heCA9IDU7XG4gICAgb3B0aW9ucy5kaWZmID0gW107XG4gICAgX2RlZXAoIGdvdCwgZXhwLCBvcHRpb25zICk7XG4gICAgaWYgKCFvcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICByZXR1cm4gMDtcblxuICAgIGNvbnN0IHJldCA9IFtdO1xuICAgIGZvciAobGV0IGl0ZW0gb2Ygb3B0aW9ucy5kaWZmKSB7XG4gICAgICAgIHJldC5wdXNoKCBcbiAgICAgICAgICAgIFwiYXQgXCIraXRlbVswXSxcbiAgICAgICAgICAgIFwiLSBcIisoaXRlbVszXSA/IGl0ZW1bMV0gOiBleHBsYWluKCBpdGVtWzFdLCAyICkpLFxuICAgICAgICAgICAgXCIrIFwiKyhpdGVtWzNdID8gaXRlbVsyXSA6IGV4cGxhaW4oIGl0ZW1bMl0sIDIgKSksXG4gICAgICAgICk7XG4gICAgfTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuLy8gcmVzdWx0IGlzIHN0b3JlZCBpbiBvcHRpb25zLmRpZmY9W10sIHJldHVybiB2YWx1ZSBpcyBpZ25vcmVkXG4vLyBpZiBzYWlkIGRpZmYgZXhjZWVkcyBtYXgsIHJldHVybiBpbW1lZGlhdGVseSAmIGRvbid0IHdhc3RlIHRpbWVcbmZ1bmN0aW9uIF9kZWVwKCBnb3QsIGV4cCwgb3B0aW9ucz17fSwgcGF0aD0nJCcsIHNlZW5MPW5ldyBBbm5vdGF0ZWRTZXQoKSwgc2VlblI9bmV3IEFubm90YXRlZFNldCgpICkge1xuICAgIGlmIChnb3QgPT09IGV4cCB8fCBvcHRpb25zLm1heCA8PSBvcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICByZXR1cm47XG4gICAgaWYgKHR5cGVvZiBnb3QgIT09IHR5cGVvZiBleHApXG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcblxuICAgIC8vIHJlY3Vyc2UgYnkgZXhwZWN0ZWQgdmFsdWUgLSBjb25zaWRlciBpdCBtb3JlIHByZWRpY3RhYmxlXG4gICAgaWYgKHR5cGVvZiBleHAgIT09ICdvYmplY3QnIHx8IGV4cCA9PT0gbnVsbCApIHtcbiAgICAgICAgLy8gbm9uLW9iamVjdHMgLSBzbyBjYW4ndCBkZXNjZW5kXG4gICAgICAgIC8vIGFuZCBjb21wYXJpc29uIGFscmVhZHkgZG9uZSBhdCB0aGUgYmVnaW5ubmluZ1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG4gICAgfVxuXG4gICAgLy8gbXVzdCBkZXRlY3QgbG9vcHMgYmVmb3JlIGdvaW5nIGRvd25cbiAgICBjb25zdCBwYXRoTCA9IHNlZW5MLmhhcyhnb3QpO1xuICAgIGNvbnN0IHBhdGhSID0gc2VlblIuaGFzKGV4cCk7XG4gICAgaWYgKHBhdGhMIHx8IHBhdGhSKSB7XG4gICAgICAgIC8vIExvb3AgZGV0ZWN0ZWQgPSBvbmx5IGNoZWNrIHRvcG9sb2d5XG4gICAgICAgIGlmIChwYXRoTCA9PT0gcGF0aFIpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW1xuICAgICAgICAgICAgcGF0aCArICcgKGNpcmN1bGFyKScsXG4gICAgICAgICAgICBwYXRoTCA/ICdDaXJjdWxhcj0nK3BhdGhMIDogZXhwbGFpbihnb3QsIDIpLFxuICAgICAgICAgICAgcGF0aFIgPyAnQ2lyY3VsYXI9JytwYXRoUiA6IGV4cGxhaW4oZXhwLCAyKSxcbiAgICAgICAgICAgIHRydWUgLy8gZG9uJ3Qgc3RyaW5naWZ5XG4gICAgICAgIF0pO1xuICAgIH07XG4gICAgc2VlbkwgPSBzZWVuTC5hZGQoZ290LCBwYXRoKTtcbiAgICBzZWVuUiA9IHNlZW5SLmFkZChleHAsIHBhdGgpO1xuXG4gICAgLy8gY29tcGFyZSBvYmplY3QgdHlwZXNcbiAgICAvLyAoaWYgYSB1c2VyIGlzIHN0dXBpZCBlbm91Z2ggdG8gb3ZlcnJpZGUgY29uc3RydWN0b3IgZmllbGQsIHdlbGwgdGhlIHRlc3RcbiAgICAvLyB3b3VsZCBmYWlsIGxhdGVyIGFueXdheSlcbiAgICBpZiAoZ290LmNvbnN0cnVjdG9yICE9PSBleHAuY29uc3RydWN0b3IpXG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcblxuICAgIC8vIGFycmF5XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZXhwKSkge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZ290KSB8fCBnb3QubGVuZ3RoICE9PSBleHAubGVuZ3RoKVxuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZXhwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBfZGVlcCggZ290W2ldLCBleHBbaV0sIG9wdGlvbnMsIHBhdGgrJ1snK2krJ10nLCBzZWVuTCwgc2VlblIgKTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLm1heDw9b3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH07XG5cbiAgICAvLyBjb21wYXJlIGtleXMgLSArMSBmb3IgZXhwLCAtMSBmb3IgZ290LCBub256ZXJvIGtleSBhdCBlbmQgbWVhbnMga2V5cyBkaWZmZXJcbiAgICBjb25zdCB1bmlxID0ge307XG4gICAgT2JqZWN0LmtleXMoZXhwKS5mb3JFYWNoKCB4ID0+IHVuaXFbeF0gPSAxICk7XG4gICAgT2JqZWN0LmtleXMoZ290KS5mb3JFYWNoKCB4ID0+IHVuaXFbeF0gPSAodW5pcVt4XSB8fCAwKSAtIDEgKTtcbiAgICBmb3IgKGxldCB4IGluIHVuaXEpIHtcbiAgICAgICAgaWYgKHVuaXFbeF0gIT09IDApXG4gICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG4gICAgfVxuICAgIFxuICAgIC8vIG5vdyB0eXBlb2YsIG9iamVjdCB0eXBlLCBhbmQgb2JqZWN0IGtleXMgYXJlIHRoZSBzYW1lLlxuICAgIC8vIHJlY3Vyc2UuXG4gICAgZm9yIChsZXQgaSBpbiBleHApIHtcbiAgICAgICAgX2RlZXAoIGdvdFtpXSwgZXhwW2ldLCBvcHRpb25zLCBwYXRoKydbJytleHBsYWluKGkpKyddJywgc2VlbkwsIHNlZW5SICk7XG4gICAgICAgIGlmIChvcHRpb25zLm1heDw9b3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH07XG4gICAgcmV0dXJuO1xufTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IFJlcG9ydCB9ID0gcmVxdWlyZSAoICcuL3JlcG9ydC5qcycgKTtcbmNvbnN0IG5vb3AgPSAoKT0+e307XG5cbmNsYXNzIERCQyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuX3ByZSAgICA9IG5vb3A7XG4gICAgICAgIHRoaXMuX3Bvc3QgICA9IG5vb3A7XG4gICAgICAgIHRoaXMuX29uZmFpbCA9IHJlcG9ydCA9PiByZXBvcnQuZ2V0VGhyb3duKCk7XG4gICAgICAgIHRoaXMuX29ucG9zdCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcG9zdChjb2RlKSB7XG4gICAgICAgIGlmIChjb2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wb3N0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYoIHR5cGVvZiBjb2RlICE9PSAnZnVuY3Rpb24nIClcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Bvc3QtY29uZGl0aW9uIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICAgICAgdGhpcy5fcG9zdCA9IGNvZGU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbiAgICBwcmUoY29kZSkge1xuICAgICAgICBpZiAoY29kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYoIHR5cGVvZiBjb2RlICE9PSAnZnVuY3Rpb24nIClcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3ByZS1jb25kaXRpb24gbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgICAgICB0aGlzLl9wcmUgPSBjb2RlO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZGVjb3JhdGUob3JpZykge1xuICAgICAgICAvLyBjbG9zZSBhcm91bmQgdGhlc2UgdmFyc1xuICAgICAgICBjb25zdCBwcmUgICAgPSB0aGlzLl9wcmU7XG4gICAgICAgIGNvbnN0IHBvc3QgICA9IHRoaXMuX3Bvc3Q7XG4gICAgICAgIGNvbnN0IG9uZmFpbCA9IHRoaXMuX29uZmFpbDtcbiAgICAgICAgY29uc3Qgb25wb3N0ID0gdGhpcy5fb25wb3N0IHx8IHRoaXMuX29uZmFpbDtcblxuICAgICAgICAvLyBubyBhcnJvdyBmdW5jdGlvbiB0byBnZXQgY29ycmVjdCAndGhpcycgb2JqZWN0XG4gICAgICAgIGNvbnN0IGNvZGUgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICAgICAgY29uc3QgclByZSA9IG5ldyBSZXBvcnQoKTtcbiAgICAgICAgICAgIHByZS5hcHBseSggdGhpcywgWyByUHJlLCB1bmRlZmluZWQsIC4uLmFyZ3MgXSApO1xuICAgICAgICAgICAgaWYoIXJQcmUuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgIG9uZmFpbChyUHJlLnNldFRpdGxlKCdwcmUtY29uZGl0aW9uIGZhaWxlZCcpKTtcbiAgICAgICAgICAgIGNvbnN0IHJldCA9IG9yaWcuYXBwbHkoIHRoaXMsIGFyZ3MgKTtcbiAgICAgICAgICAgIGNvbnN0IHJQb3N0ID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICAgICAgcG9zdC5hcHBseSggdGhpcywgWyByUG9zdCwgcmV0LCAuLi5hcmdzIF0gKTtcbiAgICAgICAgICAgIGlmKCFyUG9zdC5nZXRQYXNzKCkpXG4gICAgICAgICAgICAgICAgb25wb3N0KHJQb3N0LnNldFRpdGxlKCdwb3N0LWNvbmRpdGlvbiBmYWlsZWQnKSk7XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9XG5cbiAgICAgICAgY29kZS5vcmlnID0gb3JpZztcbiAgICAgICAgY29kZS5wcmUgID0gcHJlO1xuICAgICAgICBjb2RlLnBvc3QgPSBwb3N0O1xuXG4gICAgICAgIHJldHVybiBjb2RlO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IERCQyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGNhbGxlckluZm8sIGV4cGxhaW4sIG1ha2VFcnJvciB9ID0gcmVxdWlyZSggJy4vdXRpbC5qcycgKTtcblxuLyoqXG4gKiBAcHVibGljXG4gKiBAY2xhc3NkZXNjXG4gKiBUaGUgY29yZSBvZiB0aGUgcmVmdXRlIGxpYnJhcnksIHRoZSByZXBvcnQgb2JqZWN0IGNvbnRhaW5zIGluZm9cbiAqIGFib3V0IHBhc3NpbmcgYW5kIGZhaWxpbmcgY29uZGl0aW9ucy5cbiAqL1xuY2xhc3MgUmVwb3J0IHtcbiAgICAvLyBzZXR1cFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9jb3VudCAgICAgPSAwO1xuICAgICAgICB0aGlzLl9mYWlsQ291bnQgPSAwO1xuICAgICAgICB0aGlzLl9kZXNjciAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fZXZpZGVuY2UgID0gW107XG4gICAgICAgIHRoaXMuX3doZXJlICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9jb25kTmFtZSAgPSBbXTtcbiAgICAgICAgdGhpcy5faW5mbyAgICAgID0gW107XG4gICAgICAgIHRoaXMuX25lc3RlZCAgICA9IFtdO1xuICAgICAgICB0aGlzLl9wZW5kaW5nICAgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuX29uRG9uZSAgICA9IFtdO1xuICAgICAgICB0aGlzLl9kb25lICAgICAgPSBmYWxzZTtcbiAgICAgICAgLy8gVE9ETyBhZGQgY2FsbGVyIGluZm8gYWJvdXQgdGhlIHJlcG9ydCBpdHNlbGZcbiAgICB9XG5cbiAgICAvLyBzZXR1cCAtIG11c3QgYmUgY2hhaW5hYmxlXG4gICAgc2V0VGl0bGUoc3RyKSB7XG4gICAgICAgIHRoaXMuX3RpdGxlID0gc3RyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgb25Eb25lKGZuKSB7XG4gICAgICAgIHRoaXMuX29uRG9uZS5wdXNoKGZuKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8vIHJ1bm5pbmdcbiAgICAvLyBUT0RPIGVpdGhlciBhc3luYygpIHNob3VsZCBzdXBwb3J0IGFkZGl0aW9uYWwgYXJncywgb3IgcnVuKCkgc2hvdWxkbid0XG4gICAgcnVuKC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICBjb25zdCBibG9jayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhc3QgYXJndW1lbnQgb2YgcnVuKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLCBub3QgJyt0eXBlb2YoYmxvY2spKTtcbiAgICAgICAgYmxvY2soIHRoaXMsIC4uLmFyZ3MgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gVE9ETyBlaXRoZXIgYXN5bmMoKSBzaG91bGQgc3VwcG9ydCBhZGRpdGlvbmFsIGFyZ3MsIG9yIHJ1bigpIHNob3VsZG4ndFxuICAgIGFzeW5jKHRpbWVvdXQsIGJsb2NrKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KFxuICAgICAgICAgICAgICAgICgpID0+IHJlamVjdChuZXcgRXJyb3IoXCJDb250cmFjdCBleGVjdXRpb24gdG9vayB0b28gbG9uZ1wiKSksXG4gICAgICAgICAgICAgICAgdGltZW91dFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRoaXMub25Eb25lKGFyZyA9PiB7Y2xlYXJUaW1lb3V0KHRpbWVyKTsgcmVzb2x2ZShhcmcpfSk7XG4gICAgICAgICAgICBibG9jayh0aGlzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSW4gdGhlb3J5LCBoYXZpbmcgY29uc3Qgbj1uZXh0KCk7IHNldFJlc3VsdChuLiAuLi4pXG4gICAgLy8gc2hvdWxkIGFsbG93IGZvciBhc3luYyBjb25kaXRpb25zIGluIHRoZSBmdXR1cmVcbiAgICAvLyBpZiBhdCBhbGwgcG9zc2libGUgd2l0aG91dCBncmVhdCBzYWNyaWZpY2VzLlxuICAgIG5leHQoKSB7XG4gICAgICAgIHRoaXMuX2xvY2soKTtcbiAgICAgICAgcmV0dXJuICsrdGhpcy5fY291bnQ7XG4gICAgfVxuXG4gICAgc2V0UmVzdWx0IChuLCBldmlkZW5jZSwgZGVzY3IsIGNvbmROYW1lLCB3aGVyZSkge1xuICAgICAgICBpZighdGhpcy5fcGVuZGluZy5oYXMobikpXG4gICAgICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIHRoaXMuX3BlbmRpbmcuZGVsZXRlKG4pO1xuICAgICAgICBpZiAobiA+IHRoaXMuX2NvdW50KVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnQXR0ZW1wdCB0byBzZXQgY29uZGl0aW9uIGJleW9uZCBjaGVjayBjb3VudCcpO1xuICAgICAgICBpZiAoZGVzY3IpXG4gICAgICAgICAgICB0aGlzLl9kZXNjcltuXSA9IGRlc2NyO1xuICAgICAgICAvLyBwYXNzIC0gcmV0dXJuIEFTQVBcbiAgICAgICAgaWYgKCFldmlkZW5jZSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBuZXN0ZWQgcmVwb3J0IG5lZWRzIHNwZWNpYWwgaGFuZGxpbmdcbiAgICAgICAgaWYgKGV2aWRlbmNlIGluc3RhbmNlb2YgUmVwb3J0KSB7XG4gICAgICAgICAgICB0aGlzLl9uZXN0ZWRbbl0gPSBldmlkZW5jZTtcbiAgICAgICAgICAgIGlmIChldmlkZW5jZS5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXZpZGVuY2UuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIHNob3J0LWNpcmN1aXQgaWYgcG9zc2libGVcbiAgICAgICAgICAgICAgICBldmlkZW5jZSA9IFtdOyAvLyBoYWNrIC0gZmFpbGluZyB3aXRob3V0IGV4cGxhbmF0aW9uXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5lc3RlZCBjb250cmFjdCBpcyBpbiBhc3luYyBtb2RlIC0gY29lcmNlIGludG8gYSBwcm9taXNlXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycnkgPSBldmlkZW5jZTtcbiAgICAgICAgICAgICAgICBldmlkZW5jZSA9IG5ldyBQcm9taXNlKCBkb25lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY3Vycnkub25Eb25lKCBkb25lICk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwZW5kaW5nIC0gd2UncmUgaW4gYXN5bmMgbW9kZVxuICAgICAgICBpZiAoZXZpZGVuY2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nLmFkZChuKTtcbiAgICAgICAgICAgIHdoZXJlID0gd2hlcmUgfHwgY2FsbGVySW5mbygyKTsgLy8gbXVzdCByZXBvcnQgYWN0dWFsIGNhbGxlciwgbm90IHRoZW5cbiAgICAgICAgICAgIGV2aWRlbmNlLnRoZW4oIHggPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0UmVzdWx0KG4sIHgsIGRlc2NyLCBjb25kTmFtZSwgd2hlcmUgKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgY2Igb2YgdGhpcy5fb25Eb25lKVxuICAgICAgICAgICAgICAgICAgICAgICAgY2IodGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBsaXN0aWZ5ICYgc3RyaW5naWZ5IGV2aWRlbmNlLCBzbyB0aGF0IGl0IGRvZXNuJ3QgY2hhbmdlIHBvc3QtZmFjdHVtXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShldmlkZW5jZSkpXG4gICAgICAgICAgICBldmlkZW5jZSA9IFsgZXZpZGVuY2UgXTtcbiAgICAgICAgdGhpcy5fZXZpZGVuY2Vbbl0gPSBldmlkZW5jZS5tYXAoIHg9Pl9leHBsYWluKHgsIEluZmluaXR5KSApO1xuICAgICAgICB0aGlzLl93aGVyZVtuXSAgICA9IHdoZXJlIHx8IGNhbGxlckluZm8oMik7XG4gICAgICAgIHRoaXMuX2NvbmROYW1lW25dID0gY29uZE5hbWU7XG4gICAgICAgIHRoaXMuX2ZhaWxDb3VudCsrO1xuXG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBBcHBlbmQgYW4gaW5mb3JtYXRpb25hbCBtZXNzYWdlIHRvIHRoZSByZXBvcnQuXG4gICAgICogTm9uLXN0cmluZyB2YWx1ZXMgd2lsbCBiZSBzdHJpbmdpZmllZCB2aWEgZXhwbGFpbigpLlxuICAgICAqIEBwYXJhbSB7QW55fSBtZXNzYWdlXG4gICAgICogQHJldHVybnMge1JlcG9ydH0gY2hhaW5hYmxlXG4gICAgICovXG4gICAgaW5mbyggLi4ubWVzc2FnZSApIHtcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICBpZiAoIXRoaXMuX2luZm9bdGhpcy5fY291bnRdKVxuICAgICAgICAgICAgdGhpcy5faW5mb1t0aGlzLl9jb3VudF0gPSBbXTtcbiAgICAgICAgdGhpcy5faW5mb1t0aGlzLl9jb3VudF0ucHVzaCggbWVzc2FnZS5tYXAoIHM9Pl9leHBsYWluKHMpICkuam9pbihcIiBcIikgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgZG9uZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9kb25lKSB7XG4gICAgICAgICAgICB0aGlzLl9kb25lID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmICghdGhpcy5fcGVuZGluZy5zaXplKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgY2Igb2YgdGhpcy5fb25Eb25lKVxuICAgICAgICAgICAgICAgICAgICBjYih0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gcXVlcnlpbmdcbiAgICBnZXRUaXRsZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RpdGxlOyAvL0pGWUlcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogICBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBnZXREb25lKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZG9uZSAmJiAhdGhpcy5fcGVuZGluZy5zaXplOyAvLyBpcyBpdCBldmVuIG5lZWRlZD9cbiAgICB9XG5cbiAgICBfbG9jayAoKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIGNvbnRyYWN0Jyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBXaXRob3V0IGFyZ3VtZW50IHJldHVybnMgd2hldGhlciB0aGUgY29udHJhY3Qgd2FzIGZ1bGZpbGxlZC5cbiAgICAgKiAgIEFzIGEgc3BlY2lhbCBjYXNlLCBpZiBubyBjaGVja3Mgd2VyZSBydW4gYW5kIHRoZSBjb250cmFjdCBpcyBmaW5pc2hlZCxcbiAgICAgKiAgIHJldHVybnMgZmFsc2UsIGFzIGluIFwic29tZW9uZSBtdXN0IGhhdmUgZm9yZ290dGVuIHRvIGV4ZWN1dGVcbiAgICAgKiAgIHBsYW5uZWQgY2hlY2tzLiBVc2UgcGFzcygpIGlmIG5vIGNoZWNrcyBhcmUgcGxhbm5lZC5cbiAgICAgKlxuICAgICAqICAgSWYgYSBwYXJhbWV0ZXIgaXMgZ2l2ZW4sIHJldHVybiB0aGUgc3RhdHVzIG9mIG4tdGggY2hlY2sgaW5zdGVhZC5cbiAgICAgKiAgIEBwYXJhbSB7aW50ZWdlcn0gblxuICAgICAqICAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0UGFzcyhuKSB7XG4gICAgICAgIGlmIChuID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZmFpbENvdW50ID09PSAwICYmICghdGhpcy5nZXREb25lKCkgfHwgdGhpcy5fY291bnQgPiAwKTtcbiAgICAgICAgcmV0dXJuIChuID4gMCAmJiBuIDw9IHRoaXMuX2NvdW50KSA/ICF0aGlzLl9ldmlkZW5jZVtuXSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgcGVyZm9ybWVkLlxuICAgICAqICAgQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBXaGV0aGVyIHRoZSBsYXN0IGNoZWNrIHdhcyBhIHN1Y2Nlc3MuXG4gICAgICogIFRoaXMgaXMganVzdCBhIHNob3J0Y3V0IGZvciBmb28uZ2V0RGV0YWlscyhmb28uZ2V0Q291bnQpLnBhc3NcbiAgICAgKiAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgbGFzdCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50ID8gIXRoaXMuX2V2aWRlbmNlW3RoaXMuX2NvdW50XSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgZmFpbGluZy5cbiAgICAgKiAgIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0RmFpbENvdW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZmFpbENvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgUmV0dXJuIGEgc3RyaW5nIG9mIGZhaWxpbmcvcGFzc2luZyBjaGVja3MuXG4gICAgICogICBUaGlzIG1heSBiZSB1c2VmdWwgZm9yIHZhbGlkYXRpbmcgY3VzdG9tIGNvbmRpdGlvbnMuXG4gICAgICogICBDb25zZWN1dGl2ZSBwYXNzaW5nIGNoZWNrYSBhcmUgcmVwcmVzZW50ZWQgYnkgbnVtYmVycy5cbiAgICAgKiAgIEEgY2FwaXRhbCBsZXR0ZXIgaW4gdGhlIHN0cmluZyByZXByZXNlbnRzIGZhaWx1cmUuXG4gICAgICogICBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIHBhc3NpbmcgY2hlY2tzXG4gICAgICogICBcInIoMTApXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBjaGVja3Mgd2l0aCAxIGZhaWx1cmUgaW4gdGhlIG1pZGRsZVxuICAgICAqICAgXCJyKDUsTiw0KVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgY2hlY2tzIGluY2x1ZGluZyBhIG5lc3RlZCBjb250cmFjdFxuICAgICAqICAgXCJyKDMscigxLE4pLDYpXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyBubyBjaGVja3Mgd2VyZSBydW4gLSBhdXRvLWZhaWxcbiAgICAgKiAgIFwicihaKVwiXG4gICAgICovXG4gICAgZ2V0R2hvc3QoKSB7XG4gICAgICAgIGNvbnN0IGdob3N0ID0gW107XG4gICAgICAgIGxldCBzdHJlYWsgPSAwO1xuICAgICAgICBmb3IgKGxldCBpPTE7IGkgPD0gdGhpcy5fY291bnQ7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2V2aWRlbmNlW2ldIHx8IHRoaXMuX25lc3RlZFtpXSkge1xuICAgICAgICAgICAgICAgIGlmIChzdHJlYWspIGdob3N0LnB1c2goc3RyZWFrKTtcbiAgICAgICAgICAgICAgICBzdHJlYWsgPSAwO1xuICAgICAgICAgICAgICAgIGdob3N0LnB1c2goIHRoaXMuX25lc3RlZFtpXSA/IHRoaXMuX25lc3RlZFtpXS5nZXRHaG9zdCgpIDogJ04nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RyZWFrKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0cmVhaykgZ2hvc3QucHVzaChzdHJlYWspO1xuICAgICAgICBpZiAoZ2hvc3QubGVuZ3RoID09PSAwICYmICF0aGlzLmdldFBhc3MoKSlcbiAgICAgICAgICAgIGdob3N0LnB1c2goJ1onKTtcbiAgICAgICAgcmV0dXJuICdyKCcrZ2hvc3Quam9pbignLCcpKycpJztcbiAgICB9XG5cbiAgICBnZXRUZXh0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRMaW5lcygpLmpvaW4oJ1xcbicpO1xuICAgIH1cblxuICAgIGdldExpbmVzKGluZGVudD0nJykge1xuICAgICAgICBjb25zdCBvdXQgPSBbaW5kZW50ICsgJ3IoJ107XG4gICAgICAgIGNvbnN0IGxhc3QgPSBpbmRlbnQgKyAnKSc7XG4gICAgICAgIGluZGVudCA9IGluZGVudCArICcgICAgJztcblxuICAgICAgICBjb25zdCBwYWQgPSBwcmVmaXggPT4gcyA9PiBpbmRlbnQgKyBwcmVmaXggKyAnICcgKyBzO1xuXG4gICAgICAgIGlmICh0aGlzLl9pbmZvWzBdKVxuICAgICAgICAgICAgb3V0LnB1c2goIC4uLnRoaXMuX2luZm9bMF0ubWFwKCBwYWQoJzsnKSApICk7XG4gICAgICAgIGZvciAobGV0IG4gPSAxOyBuPD10aGlzLl9jb3VudDsgbisrKSB7XG4gICAgICAgICAgICBvdXQucHVzaCggaW5kZW50ICsgKHRoaXMuX2V2aWRlbmNlW25dID8gJyEnOicnKVxuICAgICAgICAgICAgICAgICtuKyh0aGlzLl9kZXNjcltuXSA/ICcuICcrdGhpcy5fZGVzY3Jbbl0gOiAnLicpICk7XG4gICAgICAgICAgICBpZiggdGhpcy5fbmVzdGVkW25dKSB7XG4gICAgICAgICAgICAgICAgb3V0LnB1c2goIC4uLnRoaXMuX25lc3RlZFtuXS5nZXRMaW5lcyhpbmRlbnQpICk7XG4gICAgICAgICAgICB9IGVsc2UgaWYoIHRoaXMuX2V2aWRlbmNlW25dICkge1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKCBpbmRlbnQgKyAnICAgIF4gQ29uZGl0aW9uICcrKHRoaXMuX2NvbmROYW1lW25dIHx8ICdjaGVjaycpXG4gICAgICAgICAgICAgICAgICAgICsnIGZhaWxlZCBhdCAnK3RoaXMuX3doZXJlW25dICk7XG4gICAgICAgICAgICAgICAgdGhpcy5fZXZpZGVuY2Vbbl0uZm9yRWFjaCggcmF3ID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIG11bHRpbGluZSBldmlkZW5jZVxuICAgICAgICAgICAgICAgICAgICAvLyBUT0RPIHRoaXMgaXMgcGVybCB3cml0dGVuIGluIEpTLCByZXdyaXRlIG1vcmUgY2xlYXJcbiAgICAgICAgICAgICAgICAgICAgbGV0WyBfLCBwcmVmaXgsIHMgXSA9IHJhdy5tYXRjaCggL14oWy0rXl0gKT8oLio/KVxcbj8kL3MgKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwcmVmaXgpIHByZWZpeCA9ICdeICc7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcy5tYXRjaCgvXFxuLykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKCBpbmRlbnQgKyAnICAgICcgKyBwcmVmaXggKyBzICk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzLnNwbGl0KCdcXG4nKS5mb3JFYWNoKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnQgPT4gb3V0LnB1c2goIGluZGVudCArICcgICAgJyArIHByZWZpeCArIHBhcnQgKSk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHRoaXMuX2luZm9bbl0pXG4gICAgICAgICAgICAgICAgb3V0LnB1c2goIC4uLnRoaXMuX2luZm9bbl0ubWFwKCBwYWQoJzsnKSApICk7XG4gICAgICAgIH07XG4gICAgICAgIG91dC5wdXNoKGxhc3QpO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyByZXR1cm5zIGEgcGxhaW4gc2VyaWFsaXphYmxlIG9iamVjdFxuICAgICAqICBAcmV0dXJucyB7T2JqZWN0fVxuICAgICAqL1xuICAgIHRvSlNPTigpIHtcbiAgICAgICAgY29uc3QgbiA9IHRoaXMuZ2V0Q291bnQoKTtcbiAgICAgICAgY29uc3QgZGV0YWlscyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaTw9bjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBub2RlID0gdGhpcy5nZXREZXRhaWxzKGkpO1xuICAgICAgICAgICAgLy8gc3RyaXAgZXh0cmEga2V5c1xuICAgICAgICAgICAgZm9yKCBsZXQga2V5IGluIG5vZGUgKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGVba2V5XSA9PT0gdW5kZWZpbmVkIHx8IChBcnJheS5pc0FycmF5KG5vZGVba2V5XSkgJiYgbm9kZVtrZXldLmxlbmd0aCA9PT0gMCkpXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBub2RlW2tleV07XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZGV0YWlscy5wdXNoKG5vZGUpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcGFzczogIHRoaXMuZ2V0UGFzcygpLFxuICAgICAgICAgICAgY291bnQ6IHRoaXMuZ2V0Q291bnQoKSxcbiAgICAgICAgICAgIHRpdGxlOiB0aGlzLmdldFRpdGxlKCksXG4gICAgICAgICAgICBkZXRhaWxzLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRUYXAoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgUmV0dXJucyByZXBvcnQgc3RyaW5naWZpZWQgYXMgVEFQIGZvcm1hdFxuICAgICAqICBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldFRhcChuKSB7XG4gICAgICAgIGNvbnN0IHRhcCA9IG4gPT09IHVuZGVmaW5lZCA/IHRoaXMuZ2V0VGFwTGluZXMoKSA6IHRoaXMuZ2V0VGFwRW50cnkobik7XG4gICAgICAgIHRhcC5wdXNoKCcnKTtcbiAgICAgICAgcmV0dXJuIHRhcC5qb2luKCdcXG4nKTtcbiAgICB9XG5cbiAgICBnZXRUYXBMaW5lcyhuKSB7XG4gICAgICAgIC8vIFRBUCBmb3Igbm93LCB1c2UgYW5vdGhlciBmb3JtYXQgbGF0ZXIgYmVjYXVzZSBcInBlcmwgaXMgc2NhcnlcIlxuICAgICAgICBjb25zdCB0YXAgPSBbICcxLi4nK3RoaXMuX2NvdW50IF07XG4gICAgICAgIGlmICh0aGlzLmdldFRpdGxlKCkpXG4gICAgICAgICAgICB0YXAucHVzaCgnIyAnK3RoaXMuZ2V0VGl0bGUoKSk7XG4gICAgICAgIC8vIFRPRE8gaW5mb1swXVxuICAgICAgICBjb25zdCBwcmVmYWNlID0gdGhpcy5nZXREZXRhaWxzKDApO1xuICAgICAgICB0YXAucHVzaCggLi4ucHJlZmFjZS5pbmZvLm1hcCggcyA9PiAnIyAnK3MgKSApO1xuICAgICAgICBmb3IoIGxldCBpID0gMTsgaSA8PSB0aGlzLl9jb3VudDsgaSsrIClcbiAgICAgICAgICAgIHRhcC5wdXNoKCAuLi4gdGhpcy5nZXRUYXBFbnRyeShpKSApO1xuICAgICAgICBpZiAoIXRoaXMuZ2V0UGFzcygpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5nZXRDb3VudCgpID4gMClcbiAgICAgICAgICAgICAgICB0YXAucHVzaCgnIyBGYWlsZWQgJyt0aGlzLmdldEZhaWxDb3VudCgpKycvJyt0aGlzLmdldENvdW50KCkrICcgY29uZGl0aW9ucycpO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHRhcC5wdXNoKCcjIE5vIGNoZWNrcyB3ZXJlIHJ1biwgY29uc2lkZXIgdXNpbmcgcGFzcygpIGlmIHRoYXRcXCdzIGRlbGliZXJhdGUnKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRhcDtcbiAgICB9XG5cbiAgICBnZXRUYXBFbnRyeShuKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB0eXBlb2YobikgPT09ICdvYmplY3QnID8gbiA6IHRoaXMuZ2V0RGV0YWlscyhuKTtcbiAgICAgICAgY29uc3QgdGFwID0gW107XG4gICAgICAgIGlmIChkYXRhLm5lc3RlZCkge1xuICAgICAgICAgICAgdGFwLnB1c2goICcjIHN1YmNvbnRyYWN0OicrKGRhdGEubmFtZT8nICcrZGF0YS5uYW1lOicnKSApO1xuICAgICAgICAgICAgdGFwLnB1c2goIC4uLiBkYXRhLm5lc3RlZC5nZXRUYXBMaW5lcygpLm1hcCggcyA9PiAnICAgICcrcyApKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5wZW5kaW5nKSB7XG4gICAgICAgICAgICB0YXAucHVzaCggJ3BlbmRpbmcgJytkYXRhLm4rJyA8Li4uPicgKTtcbiAgICAgICAgICAgIHJldHVybiB0YXA7XG4gICAgICAgIH1cbiAgICAgICAgdGFwLnB1c2goKGRhdGEucGFzcz8nJzonbm90ICcpICsgJ29rICcgKyBkYXRhLm5cbiAgICAgICAgICAgICsgKGRhdGEubmFtZSA/ICcgLSAnK2RhdGEubmFtZSA6ICcnKSk7XG4gICAgICAgIGlmICghZGF0YS5wYXNzKVxuICAgICAgICAgICAgdGFwLnB1c2goJyMgQ29uZGl0aW9uJysoZGF0YS5jb25kID8gJyAnK2RhdGEuY29uZCA6ICcnKSsnIGZhaWxlZCBhdCAnK2RhdGEud2hlcmUpO1xuICAgICAgICB0YXAucHVzaCguLi5kYXRhLmV2aWRlbmNlLm1hcChzPT4nIyAnK3MpKTtcbiAgICAgICAgdGFwLnB1c2goLi4uZGF0YS5pbmZvLm1hcChzPT4nIyAnK3MpKTtcbiAgICAgICAgcmV0dXJuIHRhcDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIFJldHVybnMgZGV0YWlsZWQgcmVwb3J0IG9uIGEgc3BlY2lmaWMgY2hlY2tcbiAgICAgKiAgIEBwYXJhbSB7aW50ZWdlcn0gbiAtIGNoZWNrIG51bWJlciwgbXVzdCBiZSA8PSBnZXRDb3VudCgpXG4gICAgICogICBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldERldGFpbHMobikge1xuICAgICAgICAvLyBUT0RPIHZhbGlkYXRlIG5cblxuICAgICAgICAvLyB1Z2x5IGJ1dCB3aGF0IGNhbiBJIGRvXG4gICAgICAgIGlmIChuID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG46ICAgIDAsXG4gICAgICAgICAgICAgICAgaW5mbzogdGhpcy5faW5mb1swXSB8fCBbXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZXZpZGVuY2UgPSB0aGlzLl9ldmlkZW5jZVtuXTtcbiAgICAgICAgaWYgKGV2aWRlbmNlICYmICFBcnJheS5pc0FycmF5KGV2aWRlbmNlKSlcbiAgICAgICAgICAgIGV2aWRlbmNlID0gW2V2aWRlbmNlXTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbjogICAgICAgIG4sXG4gICAgICAgICAgICBuYW1lOiAgICAgdGhpcy5fZGVzY3Jbbl0gfHwgJycsXG4gICAgICAgICAgICBwYXNzOiAgICAgIWV2aWRlbmNlLFxuICAgICAgICAgICAgZXZpZGVuY2U6IGV2aWRlbmNlIHx8IFtdLFxuICAgICAgICAgICAgd2hlcmU6ICAgIHRoaXMuX3doZXJlW25dLFxuICAgICAgICAgICAgY29uZDogICAgIHRoaXMuX2NvbmROYW1lW25dLFxuICAgICAgICAgICAgaW5mbzogICAgIHRoaXMuX2luZm9bbl0gfHwgW10sXG4gICAgICAgICAgICBuZXN0ZWQ6ICAgdGhpcy5fbmVzdGVkW25dLFxuICAgICAgICAgICAgcGVuZGluZzogIHRoaXMuX3BlbmRpbmcuaGFzKG4pLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBDb252ZXJ0IHJlcG9ydCB0byBhbiBBc3NlcnRpb25FcnJvciAoaWYgYXZhaWxhYmxlKSBvciBqdXN0IEVycm9yLlxuICAgICAqICBAcGFyYW0ge251bWJlcn0gW25dIE51bWJlciBvZiBjaGVjayB0byBjb252ZXJ0IHRvIGV4Y2VwdGlvbi5cbiAgICAgKiAgQ3VycmVudCBlcnJvciBmb3JtYXQgaXMgVEFQLCB0aGlzIG1heSBjaGFuZ2UgaW4gdGhlIGZ1dHVyZS5cbiAgICAgKiAgSWYgMCBvciB1bnNwZWNpZmllZCwgY29udmVydCB0aGUgd2hvbGUgcmVwb3J0LlxuICAgICAqICBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXG4gICAgICogIEBwYXJhbSB7Ym9vbGVhbn0gb3B0aW9ucy5wYXNzIElmIGZhbHNlICh0aGUgZGVmYXVsdCksIHJldHVybiBub3RoaW5nXG4gICAgICogIGlmIHRoZSByZXBvcnQgaXMgcGFzc2luZy5cbiAgICAgKiAgQHJldHVybnMge0Vycm9yfHVuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBnZXRFcnJvcihuLCBvcHRpb25zPXt9KSB7XG4gICAgICAgIGlmICghbikge1xuICAgICAgICAgICAgLy8gbm8gZW50cnkgZ2l2ZW5cbiAgICAgICAgICAgIGlmICghb3B0aW9ucy5wYXNzICYmIHRoaXMuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgcmV0dXJuIG1ha2VFcnJvcih7XG4gICAgICAgICAgICAgICAgYWN0dWFsOiAgIHRoaXMuZ2V0VGFwKCksXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6ICcnLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICB0aGlzLmdldFRpdGxlKCksXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICdjb250cmFjdCcsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBkYXRhID0gdHlwZW9mIG4gPT09ICdvYmplY3QnID8gbiA6IHRoaXMuZ2V0RGV0YWlscyhuKTtcblxuICAgICAgICAvLyBubyBlcnJvclxuICAgICAgICBpZiAoIW9wdGlvbnMucGFzcyAmJiBkYXRhLnBhc3MpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgcmV0dXJuIG1ha2VFcnJvcih7XG4gICAgICAgICAgICBhY3R1YWw6ICAgdGhpcy5nZXRUYXBFbnRyeShkYXRhKS5qb2luKCdcXG4nKSxcbiAgICAgICAgICAgIGV4cGVjdGVkOiAnJyxcbiAgICAgICAgICAgIG1lc3NhZ2U6ICBkYXRhLm5hbWUsXG4gICAgICAgICAgICBvcGVyYXRvcjogZGF0YS5jb25kLFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXRUaHJvd24obiwgb3B0aW9ucz17fSkge1xuICAgICAgICAvLyBUT0RPIHJlbmFtZSB0byBqdXN0IHRocm93P1xuICAgICAgICBjb25zdCBlcnIgPSB0aGlzLmdldEVycm9yKG4sIG9wdGlvbnMpO1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbn1cblxuLy8gdGhpcyBpcyBmb3Igc3R1ZmYgbGlrZSBgb2JqZWN0IGZvbyA9IHtcImZvb1wiOjQyfWBcbi8vIHdlIGRvbid0IHdhbnQgdGhlIGV4cGxhbmF0aW9uIHRvIGJlIHF1b3RlZCFcbmZ1bmN0aW9uIF9leHBsYWluKCBpdGVtLCBkZXB0aCApIHtcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnIClcbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgcmV0dXJuIGV4cGxhaW4oIGl0ZW0sIGRlcHRoICk7XG59O1xuXG5SZXBvcnQucHJvdG90eXBlLmV4cGxhaW4gPSBleHBsYWluOyAvLyBhbHNvIG1ha2UgYXZhaWxhYmxlIHZpYSByZXBvcnRcblxuLyoqXG4gKiAgQGRlc2MgQ3JlYXRlIG5ldyBjaGVjayBtZXRob2QgYXZhaWxhYmxlIHZpYSBhbGwgUmVwb3J0IGluc3RhbmNlc1xuICogIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWUgb2YgdGhlIG5ldyBjb25kaXRpb24uXG4gKiAgTXVzdCBub3QgYmUgcHJlc2VudCBpbiBSZXBvcnQgYWxyZWFkeSwgYW5kIHNob3VsZCBOT1Qgc3RhcnQgd2l0aFxuICogIGdldC4uLiwgc2V0Li4uLCBvciBhZGQuLi4gKHRoZXNlIGFyZSByZXNlcnZlZCBmb3IgUmVwb3J0IGl0c2VsZilcbiAqICBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBDb25maWd1cmluZyB0aGUgY2hlY2sncyBoYW5kbGluZyBvZiBhcmd1bWVudHNcbiAqICBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMuYXJncyBUaGUgcmVxdWlyZWQgbnVtYmVyIG9mIGFyZ3VtZW50c1xuICogIEBwYXJhbSB7aW50ZWdlcn0gW29wdGlvbnMubWluQXJnc10gTWluaW11bSBudW1iZXIgb2YgYXJndW1lbnQgKGRlZmF1bHRzIHRvIGFyZ3MpXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBbb3B0aW9ucy5tYXhBcmdzXSBNYXhpbXVtIG51bWJlciBvZiBhcmd1bWVudCAoZGVmYXVsdHMgdG8gYXJncylcbiAqICBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmhhc09wdGlvbnNdIElmIHRydWUsIGFuIG9wdGlvbmFsIG9iamVjdFxuY2FuIGJlIHN1cHBsaWVkIGFzIGxhc3QgYXJndW1lbnQuIEl0IHdvbid0IGludGVyZmVyZSB3aXRoIGRlc2NyaXB0aW9uLlxuICogIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuZnVuXSBUaGUgbGFzdCBhcmd1bWVudCBpcyBhIGNhbGxiYWNrXG4gKiAgQHBhcmFtIHtGdW5jdGlvbn0gaW1wbGVtZW50YXRpb24gLSBhIGNhbGxiYWNrIHRoYXQgdGFrZXMge2FyZ3N9IGFyZ3VtZW50c1xuICogIGFuZCByZXR1cm5zIGEgZmFsc2V5IHZhbHVlIGlmIGNvbmRpdGlvbiBwYXNzZXNcbiAqICAoXCJub3RoaW5nIHRvIHNlZSBoZXJlLCBtb3ZlIGFsb25nXCIpLFxuICogIG9yIGV2aWRlbmNlIGlmIGl0IGZhaWxzXG4gKiAgKGUuZy4gdHlwaWNhbGx5IGEgZ290L2V4cGVjdGVkIGRpZmYpLlxuICovXG5jb25zdCBzZWVuID0gbmV3IFNldCgpO1xuZnVuY3Rpb24gYWRkQ29uZGl0aW9uIChuYW1lLCBvcHRpb25zLCBpbXBsKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gbmFtZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgaWYgKG5hbWUubWF0Y2goL14oX3xnZXRbX0EtWl18c2V0W19BLVpdKS8pKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiBuYW1lIG11c3Qgbm90IHN0YXJ0IHdpdGggZ2V0Xywgc2V0Xywgb3IgXycpO1xuICAgIC8vIFRPRE8gbXVzdCBkbyBzb21ldGhpbmcgYWJvdXQgbmFtZSBjbGFzaGVzLCBidXQgbGF0ZXJcbiAgICAvLyBiZWNhdXNlIGV2YWwgaW4gYnJvd3NlciBtYXkgKGtpbmQgb2YgbGVnaW1pdGVseSkgb3ZlcnJpZGUgY29uZGl0aW9uc1xuICAgIGlmICghc2Vlbi5oYXMobmFtZSkgJiYgUmVwb3J0LnByb3RvdHlwZVtuYW1lXSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2QgYWxyZWFkeSBleGlzdHMgaW4gUmVwb3J0OiAnK25hbWUpO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIG9wdGlvbnMnKTtcbiAgICBpZiAodHlwZW9mIGltcGwgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIGltcGxlbWVudGF0aW9uJyk7XG5cbiAgICBjb25zdCBtaW5BcmdzICAgID0gb3B0aW9ucy5taW5BcmdzIHx8IG9wdGlvbnMuYXJncztcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIobWluQXJncykgfHwgbWluQXJncyA8IDApXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYXJncy9taW5BcmdzIG11c3QgYmUgbm9ubmVnYXRpdmUgaW50ZWdlcicpO1xuICAgIGNvbnN0IG1heEFyZ3MgICAgPSBvcHRpb25zLm1heEFyZ3MgfHwgb3B0aW9ucy5hcmdzIHx8IEluZmluaXR5O1xuICAgIGlmIChtYXhBcmdzICE9PSBJbmZpbml0eSAmJiAoIU51bWJlci5pc0ludGVnZXIobWluQXJncykgfHwgbWF4QXJncyA8IG1pbkFyZ3MpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ21heEFyZ3MgbXVzdCBiZSBpbnRlZ2VyIGFuZCBncmVhdGVyIHRoYW4gbWluQXJncywgb3IgSW5maW5pdHknKTtcbiAgICBjb25zdCBkZXNjckZpcnN0ICAgID0gb3B0aW9ucy5kZXNjckZpcnN0IHx8IG9wdGlvbnMuZnVuIHx8IG1heEFyZ3MgPiAxMDtcbiAgICBjb25zdCBoYXNPcHRpb25zICAgID0gISFvcHRpb25zLmhhc09wdGlvbnM7XG4gICAgY29uc3QgbWF4QXJnc1JlYWwgICA9IG1heEFyZ3MgKyAoaGFzT3B0aW9ucyA/IDEgOiAwKTtcblxuICAgIC8vIFRPRE8gYWxlcnQgdW5rbm93biBvcHRpb25zXG5cbiAgICAvLyBUT0RPIHRoaXMgY29kZSBpcyBjbHV0dGVyZWQsIHJld3JpdGVcbiAgICBjb25zdCBjb2RlID0gZnVuY3Rpb24oLi4uYXJncykge1xuICAgICAgICBjb25zdCBkZXNjciA9IGRlc2NyRmlyc3RcbiAgICAgICAgICAgID8gYXJncy5zaGlmdCgpXG4gICAgICAgICAgICA6ICggKGFyZ3MubGVuZ3RoID4gbWF4QXJncyAmJiB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aC0xXSA9PT0gJ3N0cmluZycpID8gYXJncy5wb3AoKSA6IHVuZGVmaW5lZCk7XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IG1heEFyZ3NSZWFsIHx8IGFyZ3MubGVuZ3RoIDwgbWluQXJncylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uICcrbmFtZSsnIG11c3QgaGF2ZSAnK21pbkFyZ3MrJy4uJyttYXhBcmdzUmVhbCsnIGFyZ3VtZW50cyAnKTsgLy8gVE9ET1xuXG4gICAgICAgIGNvbnN0IG4gPSB0aGlzLm5leHQoKTsgLy8gVE9ETyBjYWxsIGl0IGFkdmFuY2UoKSBvciBzbXRoLlxuICAgICAgICBjb25zdCBldmlkZW5jZSA9IGltcGwoIC4uLmFyZ3MgKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0UmVzdWx0KCBuLCBldmlkZW5jZSwgZGVzY3IsIG5hbWUgKTtcbiAgICB9O1xuXG4gICAgc2Vlbi5hZGQobmFtZSk7XG4gICAgUmVwb3J0LnByb3RvdHlwZVtuYW1lXSA9IGNvZGU7XG59XG5cbi8qKlxuICogICBAZnVuY3Rpb24gY2hlY2tcbiAqICAgQG1lbWJlck9mIFJlcG9ydFxuICogICBAcGFyYW0gZXZpZGVuY2UgSWYgZmFsc2UsIHRoZSBjaGVjayBpcyBhc3N1bWVkIHRvIHBhc3MuXG4gKiAgIEEgdHJ1ZSB2YWx1ZSBtZWFucyB0aGUgY2hlY2sgZmFpbGVkLlxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfVxuICovXG5cbi8vIHRoZXNlIGNvbmRpdGlvbnMgY291bGQgYmUgdW5kZXIgdGhlIGNvbmRpdGlvbiBsaWJyYXJ5XG4vLyBidXQgd2UnbGwgbmVlZCB0aGVtIHRvIHZlcmlmeSB0aGUgUmVwb3J0IGNsYXNzIGl0c2VsZi5cblxuYWRkQ29uZGl0aW9uKFxuICAgICdjaGVjaycsXG4gICAge2FyZ3M6MX0sXG4gICAgeD0+eFxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAncGFzcycsXG4gICAge2FyZ3M6MH0sXG4gICAgKCk9PjBcbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ2ZhaWwnLFxuICAgIHthcmdzOjB9LFxuICAgICgpPT4nZmFpbGVkIGRlbGliZXJhdGVseSdcbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ2VxdWFsJyxcbiAgICB7YXJnczoyfSxcbiAgICAoYSxiKSA9PiBhID09PSBiID8gMCA6IFsgJy0gJytleHBsYWluKGEpLCAnKyAnICsgZXhwbGFpbihiKSBdXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdtYXRjaCcsXG4gICAge2FyZ3M6Mn0sXG4gICAgKGEscmV4KSA9PiAoJycrYSkubWF0Y2gocmV4KSA/IDAgOiBbXG4gICAgICAgICdTdHJpbmcgICAgICAgICA6ICcrYSxcbiAgICAgICAgJ0RvZXMgbm90IG1hdGNoIDogJytyZXhcbiAgICBdXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICduZXN0ZWQnLFxuICAgIHtmdW46MSxtaW5BcmdzOjF9LFxuICAgICguLi5hcmdzKSA9PiBuZXcgUmVwb3J0KCkucnVuKC4uLmFyZ3MpLmRvbmUoKVxuKTtcblxuLyoqXG4gKiAgIEBleHBvcnRzIFJlcG9ydFxuICogICBAZXhwb3J0cyByZXBvcnRcbiAqICAgQGV4cG9ydHMgYWRkQ29uZGl0aW9uXG4gKiAgIEBleHBvcnRzIGV4cGxhaW5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHsgUmVwb3J0LCBhZGRDb25kaXRpb24sIGV4cGxhaW4gfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBBbm5vdGF0ZWRTZXQgfSA9IHJlcXVpcmUoICcuL3V0aWwvYW5ub3RhdGVkLXNldC5qcycgKTtcblxuLyogRGV0ZXJtaW5lIG4tdGggY2FsbGVyIHVwIHRoZSBzdGFjayAqL1xuLyogSW5zcGlyZWQgYnkgUGVybCdzIENhcnAgbW9kdWxlICovXG5jb25zdCBpblN0YWNrID0gLyhbXjpcXHMoKV0rOlxcZCsoPzo6XFxkKyk/KVxcVyooXFxufCQpL2c7XG5cbi8qKlxuICogIEBwdWJsaWNcbiAqICBAZnVuY3Rpb25cbiAqICBAZGVzYyBSZXR1cm5zIHNvdXJjZSBwb3NpdGlvbiBuIGZyYW1lcyB1cCB0aGUgc3RhY2tcbiAqICBAZXhhbXBsZVxuICogIFwiL2Zvby9iYXIuanM6MjU6MTFcIlxuICogIEBwYXJhbSB7aW50ZWdlcn0gZGVwdGggSG93IG1hbnkgZnJhbWVzIHRvIHNraXBcbiAqICBAcmV0dXJucyB7c3RyaW5nfSBzb3VyY2UgZmlsZSwgbGluZSwgYW5kIGNvbHVtbiwgc2VwYXJhdGVkIGJ5IGNvbG9uLlxuICovXG5mdW5jdGlvbiBjYWxsZXJJbmZvKG4pIHtcbiAgICAvKiBhIHRlcnJpYmxlIHJleCB0aGF0IGJhc2ljYWxseSBzZWFyY2hlcyBmb3IgZmlsZS5qczpubm46bm5uIHNldmVyYWwgdGltZXMqL1xuICAgIHJldHVybiAobmV3IEVycm9yKCkuc3RhY2subWF0Y2goaW5TdGFjaylbbisxXS5yZXBsYWNlKC9cXFcqXFxuJC8sICcnKSB8fCAnJylcbn1cblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBmdW5jdGlvblxuICogIEBkZXNjIFN0cmluZ2lyeSBvYmplY3RzIHJlY3Vyc2l2ZWx5IHdpdGggbGltaXRlZCBkZXB0aFxuICogIGFuZCBjaXJjdWxhciByZWZlcmVuY2UgdHJhY2tpbmcuXG4gKiAgR2VuZXJhbGx5IEpTT04uc3RyaW5naWZ5IGlzIHVzZWQgYXMgcmVmZXJlbmNlOlxuICogIHN0cmluZ3MgYXJlIGVzY2FwZWQgYW5kIGRvdWJsZS1xdW90ZWQ7IG51bWJlcnMsIGJvb2xlYW4sIGFuZCBudWxscyBhcmVcbiAqICBzdHJpbmdpZmllZCBcImFzIGlzXCI7IG9iamVjdHMgYW5kIGFycmF5cyBhcmUgZGVzY2VuZGVkIGludG8uXG4gKiAgVGhlIGRpZmZlcmVuY2VzIGZvbGxvdzpcbiAqICB1bmRlZmluZWQgaXMgcmVwb3J0ZWQgYXMgJzx1bmRlZj4nLlxuICogIE9iamVjdHMgdGhhdCBoYXZlIGNvbnN0cnVjdG9ycyBhcmUgcHJlZml4ZWQgd2l0aCBjbGFzcyBuYW1lcy5cbiAqICBPYmplY3QgYW5kIGFycmF5IGNvbnRlbnQgaXMgYWJicmV2aWF0ZWQgYXMgXCIuLi5cIiBhbmQgXCJDaXJjdWxhclwiXG4gKiAgaW4gY2FzZSBvZiBkZXB0aCBleGhhdXN0aW9uIGFuZCBjaXJjdWxhciByZWZlcmVuY2UsIHJlc3BlY3RpdmVseS5cbiAqICBGdW5jdGlvbnMgYXJlIG5haXZlbHkgc3RyaW5naWZpZWQuXG4gKiAgQHBhcmFtIHtBbnl9IHRhcmdldCBPYmplY3QgdG8gc2VyaWFsaXplLlxuICogIEBwYXJhbSB7aW50ZWdlcn0gZGVwdGg9MyBEZXB0aCBsaW1pdC5cbiAqICBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5mdW5jdGlvbiBleHBsYWluKCBpdGVtLCBkZXB0aD0zLCBvcHRpb25zPXt9LCBwYXRoPSckJywgc2Vlbj1uZXcgQW5ub3RhdGVkU2V0KCkgKSB7XG4gICAgLy8gc2ltcGxlIHR5cGVzXG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJylcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGl0ZW0pOyAvLyBkb24ndCB3YW50IHRvIHNwZW5kIHRpbWUgcW91dGluZ1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ251bWJlcicgfHwgdHlwZW9mIGl0ZW0gPT09ICdib29sZWFuJyB8fCBpdGVtID09PSBudWxsKVxuICAgICAgICByZXR1cm4gJycraXRlbTtcbiAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gJzx1bmRlZj4nO1xuICAgIGlmICh0eXBlb2YgaXRlbSAhPT0gJ29iamVjdCcpIC8vIG1heWJlIGZ1bmN0aW9uXG4gICAgICAgIHJldHVybiAnJytpdGVtOyAvLyBUT0RPIGRvbid0IHByaW50IG91dCBhIGxvbmcgZnVuY3Rpb24ncyBib2R5XG5cbiAgICAvLyByZWN1cnNlXG4gICAgY29uc3Qgd2hlcmVTZWVuID0gc2Vlbi5oYXMoaXRlbSk7XG4gICAgaWYgKHdoZXJlU2Vlbikge1xuICAgICAgICBjb25zdCBub3RlID0gJ0NpcmN1bGFyPScrd2hlcmVTZWVuO1xuICAgICAgICByZXR1cm4gQXJyYXkuaXNBcnJheShpdGVtKT8nWyAnK25vdGUrJyBdJzoneyAnK25vdGUrJyB9JztcbiAgICB9O1xuICAgIHNlZW4gPSBzZWVuLmFkZCggaXRlbSwgcGF0aCApOyAvLyBjbG9uZXMgc2VlblxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoaXRlbSkpIHtcbiAgICAgICAgaWYgKGRlcHRoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiAnWy4uLl0nO1xuICAgICAgICBzZWVuLmFkZChpdGVtKTtcbiAgICAgICAgLy8gVE9ETyA8eCBlbXB0eSBpdGVtcz5cbiAgICAgICAgY29uc3QgbGlzdCA9IGl0ZW0ubWFwKFxuICAgICAgICAgICAgKHZhbCwgaW5kZXgpID0+IGV4cGxhaW4odmFsLCBkZXB0aC0xLCBvcHRpb25zLCBwYXRoKydbJytpbmRleCsnXScsIHNlZW4pXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiAnWycrbGlzdC5qb2luKCcsICcpKyddJzsgLy8gVE9ETyBjb25maWd1cmFibGUgd2hpdGVzcGFjZVxuICAgIH1cblxuICAgIGNvbnN0IHR5cGUgPSBpdGVtLmNvbnN0cnVjdG9yICYmIGl0ZW0uY29uc3RydWN0b3IubmFtZTtcbiAgICBjb25zdCBwcmVmaXggPSB0eXBlICYmIHR5cGUgIT09ICdPYmplY3QnID8gdHlwZSArICcgJyA6ICcnO1xuICAgIGlmIChkZXB0aCA8IDEpXG4gICAgICAgIHJldHVybiBwcmVmaXggKyAney4uLn0nO1xuICAgIGNvbnN0IGxpc3QgPSBPYmplY3Qua2V5cyhpdGVtKS5zb3J0KCkubWFwKCBrZXkgPT4ge1xuICAgICAgICBjb25zdCBpbmRleCA9IEpTT04uc3RyaW5naWZ5KGtleSk7XG4gICAgICAgIHJldHVybiBpbmRleCtcIjpcIitleHBsYWluKGl0ZW1ba2V5XSwgZGVwdGgtMSwgb3B0aW9ucywgcGF0aCsnWycraW5kZXgrJ10nLCBzZWVuKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcHJlZml4ICsgJ3snICsgbGlzdC5qb2luKFwiLCBcIikgKyAnfSc7XG59XG5cbi8vIE11c3Qgd29yayBldmVuIHdpdGhvdXQgYXNzZXJ0XG5jb25zdCBoYXNBc3NlcnQgPSB0eXBlb2YgYXNzZXJ0ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFzc2VydC5Bc3NlcnRpb25FcnJvciA9PT0gJ2Z1bmN0aW9uJztcblxuY29uc3QgbWFrZUVycm9yID0gaGFzQXNzZXJ0XG4gICAgPyBlbnRyeSA9PiBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKGVudHJ5KVxuICAgIDogZW50cnkgPT4gbmV3IEVycm9yKCBlbnRyeS5hY3R1YWwgKTtcblxuLyoqXG4gKiAgIEBleHBvcnRzIGNhbGxlckluZm9cbiAqICAgQGV4cG9ydHMgZXhwbGFpblxuICovXG5cbm1vZHVsZS5leHBvcnRzID0geyBjYWxsZXJJbmZvLCBleHBsYWluLCBtYWtlRXJyb3IgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gU2VlIGFsc28gbm90ZWQtc2V0LmpzXG5cbmNsYXNzIEFubm90YXRlZFNldCB7XG4gICAgY29uc3RydWN0b3IoYWxsPW5ldyBTZXQoKSwgbm90ZXM9W10pIHtcbiAgICAgICAgdGhpcy5hbGwgICA9IGFsbDtcbiAgICAgICAgdGhpcy5ub3RlcyA9IG5vdGVzO1xuICAgIH1cbiAgICBhZGQoIGl0ZW0sIG5vdGUgKSB7XG4gICAgICAgIGlmICh0aGlzLmFsbC5oYXMoaXRlbSkpXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBBbm5vdGF0ZWRTZXQoXG4gICAgICAgICAgICBuZXcgU2V0KHRoaXMuYWxsKS5hZGQoaXRlbSksXG4gICAgICAgICAgICBbIC4uLnRoaXMubm90ZXMsIFsgaXRlbSwgbm90ZSBdIF1cbiAgICAgICAgKTtcbiAgICB9XG4gICAgaGFzKCBpdGVtICkge1xuICAgICAgICBpZiAoIXRoaXMuYWxsLmhhcyggaXRlbSApKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKGxldCBwYWlyIG9mIHRoaXMubm90ZXMpIHtcbiAgICAgICAgICAgIGlmIChwYWlyWzBdID09PSBpdGVtKVxuICAgICAgICAgICAgICAgIHJldHVybiBwYWlyWzFdO1xuICAgICAgICB9O1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3d0ZiwgdW5yZWFjaGFibGUnKTtcbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7IEFubm90YXRlZFNldCB9O1xuIl19
