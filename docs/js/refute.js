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
            const ok = getReport(...args);
            if (!ok.getPass())
                onFail(ok, args);
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
        this._done      = false;
        // TODO add caller info about the report itself
    }

    // setup - must be chainable
    setTitle(str) {
        this._title = str;
        return this;
    };

    onDone(fn) {
        this._onDone = fn;
        return this;
    };

    // running
    run(...args) {
        if (this._done)
            throw new Error ('Attempt to modify a finished Report');
        const block = args.pop();
        if (typeof block !== 'function')
            throw new Error('Last argument of run() must be a function, not '+typeof(block));
        block( this, ...args );
        return this;
    }

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
        if (this._done)
            throw new Error ('Attempt to modify a finished Report');
        return ++this._count;
    }

    setResult (n, evidence, descr, condName) {
        if (this._done)
            throw new Error ('Attempt to modify a finished Report');
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
            if (evidence.getPass())
                return;
            evidence = [];
        }

        // pending - we're in async mode
        if (evidence instanceof Promise) {
            throw new Error('async conditions not supported (yet)');
            // TODO wait++; promise.then( wait--; if (!wait && done) onDone() );
        }

        // listify & stringify evidence, so that it doesn't change post-factum
        if (!Array.isArray(evidence))
            evidence = [ evidence ];
        this._evidence[n] = evidence.map( x=>_explain(x, Infinity) );
        this._where[n]    = callerInfo(2);
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
        if (this._done)
            throw new Error ('Attempt to modify a finished Report');
        if (!this._info[this._count])
            this._info[this._count] = [];
        this._info[this._count].push( message.map( s=>_explain(s) ).join(" ") );
        return this;
    }

    done() {
        this._done = true;
        const cb = this._onDone;
        if (cb)
            cb(this);
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
        return this._done; // is it even needed?
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
            return this._failCount === 0 && (!this._done || this._count > 0);
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
            n:      n,
            name:   this._descr[n] || '',
            pass:   !evidence,
            evidence: evidence || [],
            where:  this._where[n],
            cond:   this._condName[n],
            info:   this._info[n] || [],
            nested: this._nested[n],
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
    return (new Error().stack.match(inStack)[n+1].replace(/\n$/, '') || '')
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

    // dunno what it is, maybe a function
    return ''+item;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9yZWZ1dGUuanMiLCJsaWIvcmVmdXRlL2NvbmQvYXJyYXkuanMiLCJsaWIvcmVmdXRlL2NvbmQvYmFzaWMuanMiLCJsaWIvcmVmdXRlL2NvbmQvZGVlcC5qcyIsImxpYi9yZWZ1dGUvZGJjLmpzIiwibGliL3JlZnV0ZS9yZXBvcnQuanMiLCJsaWIvcmVmdXRlL3V0aWwuanMiLCJsaWIvcmVmdXRlL3V0aWwvYW5ub3RhdGVkLXNldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3ZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyB0aGUgY29yZSAoc2hvdWxkIGV4cGxhaW4gZXZlbiBiZSB0aGVyZT8pXG5jb25zdCB7IFJlcG9ydCwgYWRkQ29uZGl0aW9uLCBleHBsYWluIH0gPSByZXF1aXJlICgnLi9yZWZ1dGUvcmVwb3J0LmpzJyk7XG5cbi8vIGVpZmZlbC1zdHlsZSBkZXNpZ24tYnktY29udHJhY3RcbmNvbnN0IHsgREJDIH0gPSByZXF1aXJlKCAnLi9yZWZ1dGUvZGJjLmpzJyApO1xuXG4vLyBpbXBvcnQgZGVmYXVsdCBjb25kaXRpb24gYXJzZW5hbFxucmVxdWlyZSggJy4vcmVmdXRlL2NvbmQvYmFzaWMuanMnICk7XG5yZXF1aXJlKCAnLi9yZWZ1dGUvY29uZC9hcnJheS5qcycgKTtcbnJlcXVpcmUoICcuL3JlZnV0ZS9jb25kL2RlZXAuanMnICk7XG5cbmNvbnN0IGdldFJlcG9ydCA9ICguLi5hcmdzKSA9PiBuZXcgUmVwb3J0KCkucnVuKC4uLmFyZ3MpLmRvbmUoKTtcblxuLy8gQWxsb3cgY3JlYXRpbmcgbXVsdGlwbGUgcGFyYWxsZWwgY29uZmlndXJhdGlvbnMgb2YgcmVmdXRlXG4vLyBlLmcuIG9uZSBzdHJpY3QgKHRocm93aW5nIGVycm9ycykgYW5kIG90aGVyIGxheCAoanVzdCBkZWJ1Z2dpbmcgdG8gY29uc29sZSlcbmZ1bmN0aW9uIHNldHVwKCBvcHRpb25zPXt9LCBvcmlnICkge1xuICAgIC8vIFRPRE8gdmFsaWRhdGUgb3B0aW9uc1xuICAgIGNvbnN0IG9uRmFpbCA9IG9wdGlvbnMub25GYWlsIHx8IChyZXAgPT4geyB0aHJvdyBuZXcgRXJyb3IocmVwLmdldFRhcCgpKSB9KTtcblxuICAgIGNvbnN0IHJlZnV0ZSA9IG9wdGlvbnMuc2tpcFxuICAgICAgICA/ICgpPT57fVxuICAgICAgICA6ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBvayA9IGdldFJlcG9ydCguLi5hcmdzKTtcbiAgICAgICAgICAgIGlmICghb2suZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgIG9uRmFpbChvaywgYXJncyk7XG4gICAgICAgIH07XG5cbiAgICAvLyByZWV4cG9ydCBhbGwgZnJvbSByZXBvcnQuanNcbiAgICByZWZ1dGUuUmVwb3J0ID0gUmVwb3J0O1xuICAgIHJlZnV0ZS5leHBsYWluID0gZXhwbGFpbjtcbiAgICByZWZ1dGUuYWRkQ29uZGl0aW9uID0gYWRkQ29uZGl0aW9uO1xuXG4gICAgLy8gc2hvcnRjdXQgdG8gdmFsaWRhdGluZyAmIHJldHVybmluZyBhIGZyZXNoIGNvbnRyYWN0XG4gICAgLy8gVE9ETyByZW5hbWUgdG8gYXZvaWQgbmFtZSBjbGFzaCB3aXRoIHRoZSBjbGFzc1xuICAgIC8vIChldmFsPylcbiAgICByZWZ1dGUucmVwb3J0ID0gZ2V0UmVwb3J0O1xuXG4gICAgLy8gcmVmdXRlLmNvbmYoey4uLn0pIHdpbGwgZ2VuZXJhdGUgYSBfbmV3XyByZWZ1dGVcbiAgICByZWZ1dGUuY29uZmlnID0gdXBkYXRlID0+IHNldHVwKCB7IC4uLm9wdGlvbnMsIC4uLnVwZGF0ZSB9LCByZWZ1dGUgKTtcblxuICAgIC8vIGFkZCBkZXNpZ24tYnktY29udHJhY3RcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoIHJlZnV0ZSwgJ2RiYycsIHsgZ2V0OiAoKT0+bmV3IERCQygpIH0gKTtcblxuICAgIC8vIFRPRE8gdGhpcyBpcyBzdHVwaWQsIGNvbWUgdXAgd2l0aCBzbXRoIGJldHRlclxuICAgIC8vIHdoZW4gaW4gYnJvd3Nlciwgd2luZG93LnJlZnV0ZS5jb25maWcoKSB1cGRhdGVzIHdpbmRvdy5yZWZ1dGUgaXRzZWxmXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIG9yaWcgPT09IHdpbmRvdy5yZWZ1dGUpXG4gICAgICAgIHdpbmRvdy5yZWZ1dGUgPSByZWZ1dGU7XG5cbiAgICByZXR1cm4gcmVmdXRlO1xufVxuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBzZXR1cCgpO1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuICAgIHdpbmRvdy5yZWZ1dGUgPSBzZXR1cCgpOyAvLyBUT0RPIGNoZWNrIHByZWV4aXN0aW5nXG5cbi8qKlxuICogICBAY2FsbGJhY2sgQ29udHJhY3RcbiAqICAgQGRlc2MgQSBjb2RlIGJsb2NrIGNvbnRhaW5pbmcgb25lIG9yIG1vcmUgY29uZGl0aW9uIGNoZWNrcy5cbiAqICAgQSBjaGVjayBpcyBwZXJmb3JtZWQgYnkgY2FsbGluZyBvbmUgb2YgYSBmZXcgc3BlY2lhbCBtZXRob2RzXG4gKiAgIChlcXVhbCwgbWF0Y2gsIGRlZXBFcXVhbCwgdHlwZSBldGMpXG4gKiAgIG9uIHRoZSBSZXBvcnQgb2JqZWN0LlxuICogICBDb250cmFjdHMgbWF5IGJlIG5lc3RlZCB1c2luZyB0aGUgJ25lc3RlZCcgbWV0aG9kIHdoaWNoIGFjY2VwdHNcbiAqICAgYW5vdGhlciBjb250cmFjdCBhbmQgcmVjb3JkcyBhIHBhc3MvZmFpbHVyZSBpbiB0aGUgcGFyZW50IGFjY29yZGluZ2x5LnFcbiAqICAgQSBjb250cmFjdCBpcyBhbHdheXMgZXhlY3V0ZWQgdG8gdGhlIGVuZC5cbiAqICAgQHBhcmFtIHtSZXBvcnR9IG9rIEFuIG9iamVjdCB0aGF0IHJlY29yZHMgY2hlY2sgcmVzdWx0cy5cbiAqICAgQHBhcmFtIHtBbnl9IFsuLi5saXN0XSBBZGRpdGlvbmFsIHBhcmFtZXRlcnNcbiAqICAgKGUuZy4gZGF0YSBzdHJ1Y3R1cmUgdG8gYmUgdmFsaWRhdGVkKVxuICogICBAcmV0dXJucyB7dm9pZH0gUmV0dXJuZWQgdmFsdWUgaXMgaWdub3JlZC5cbiAqL1xuXG4vKipcbiAqICAgQHB1YmxpY1xuICogICBAZnVuY3Rpb24gcmVmdXRlXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gRGF0YSB0byBmZWVkIHRvIHRoZSBjYWxsYmFja1xuICogICBAcGFyYW0ge0NvbnRyYWN0fSBjb250cmFjdCBBIGNvZGUgYmxvY2sgd2l0aCBjaGVja3MuXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9IFJldHVybiB2YWx1ZSBpcyBpZ25vcmVkLlxuICogICBAdGhyb3dzIHtFcnJvcn0gSWYgb25lIG9yIG1vcmUgY2hlY2tzIGFyZSBmYWlsaW5nLCBhbiBleGNlcHRpb24gaXMgdGhyb3duXG4gKiAgIHdpdGggZGV0YWlscyBhYm91dCBhbGwgcGFzc2luZy9mYWlsaW5nIGNoZWNrcy5cbiAqICAgVGhpcyBhY3Rpb24gY2FuIGJlIGNoYW5nZWQgdmlhIHJlZnV0ZS5jb25maWcoKSBjYWxsLlxuICpcbiAqL1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCBSZXBvcnQgfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5cbi8vIFRPRE8gcmVuYW1lIGZvckVhY2ggb3Igc210aC5cbmFkZENvbmRpdGlvbihcbiAgICAnbWFwJyxcbiAgICB7ZnVuOjEsYXJnczoyfSxcbiAgICAobGlzdCwgY29udHJhY3QpID0+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKVxuICAgICAgICAgICAgcmV0dXJuICdFeHBlY3RlZCBhIGxpc3QsIGZvdW5kIGEgJy50eXBlb2YobGlzdCk7XG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA8IDEpXG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gYXV0by1wYXNzXG5cbiAgICAgICAgY29uc3Qgb2sgPSBuZXcgUmVwb3J0KCk7XG4gICAgICAgIGxpc3QuZm9yRWFjaCggKGl0ZW0sIGluZGV4KSA9PiBvay5uZXN0ZWQoIFwiaXRlbSBcIitpbmRleCwgaXRlbSwgY29udHJhY3QgKSApO1xuICAgICAgICByZXR1cm4gb2suZG9uZSgpO1xuICAgIH1cbik7XG5cbi8vIFRPRE8gdGhpcyBpcyBjYWxsZWQgXCJjb21wbGlhbnQgY2hhaW5cIiBidXQgYmV0dGVyIGp1c3Qgc2F5IGhlcmVcbi8vIFwib2ggd2UncmUgY2hlY2tpbmcgZWxlbWVudCBvcmRlclwiXG5hZGRDb25kaXRpb24oXG4gICAgJ29yZGVyZWQnLCAvLyBUT0RPIGJldHRlciBuYW1lP1xuICAgIHtmdW46MSxhcmdzOjJ9LFxuICAgIChsaXN0LCBjb250cmFjdCkgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpXG4gICAgICAgICAgICByZXR1cm4gJ0V4cGVjdGVkIGEgbGlzdCwgZm91bmQgYSAnLnR5cGVvZihsaXN0KTtcbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoIDwgMilcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBhdXRvLXBhc3NcblxuICAgICAgICBjb25zdCBvayA9IG5ldyBSZXBvcnQoKTtcbiAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBsaXN0Lmxlbmd0aC0xOyBuKyspIHtcbiAgICAgICAgICAgIG9rLm5lc3RlZCggXCJpdGVtcyBcIituK1wiLCBcIisobisxKSwgbGlzdFtuXSwgbGlzdFtuKzFdLCBjb250cmFjdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9rLmRvbmUoKTtcbiAgICB9XG4pO1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCByZXBvcnQsIGV4cGxhaW4gfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5jb25zdCBPSyA9IGZhbHNlO1xuXG5jb25zdCBudW1DbXAgPSB7XG4gICAgJzwnIDogKHgseSk9Pih4ICA8IHkpLFxuICAgICc+JyA6ICh4LHkpPT4oeCAgPiB5KSxcbiAgICAnPD0nOiAoeCx5KT0+KHggPD0geSksXG4gICAgJz49JzogKHgseSk9Pih4ID49IHkpLFxuICAgICc9PSc6ICh4LHkpPT4oeCA9PT0geSksXG4gICAgJyE9JzogKHgseSk9Pih4ICE9PSB5KSxcbn07XG5cbi8vIHVzZSAhPSBhbmQgbm90ICE9PSBkZWxpYmVyYXRlbHkgdG8gZmlsdGVyIG91dCBudWxsICYgdW5kZWZpbmVkXG5jb25zdCBzdHJDbXAgPSB7XG4gICAgJzwnIDogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ICA8ICcnK3kpLFxuICAgICc+JyA6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCAgPiAnJyt5KSxcbiAgICAnPD0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPD0gJycreSksXG4gICAgJz49JzogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ID49ICcnK3kpLFxuXG4gICAgJz09JzogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ID09PSAnJyt5KSxcbiAgICAnIT0nOiAoeCx5KT0+KCh4ID09IHVuZGVmaW5lZCleKHkgPT0gdW5kZWZpbmVkKSkgfHwgKCcnK3ggIT09ICcnK3kpLFxufTtcblxuYWRkQ29uZGl0aW9uKFxuICAgICdudW1DbXAnLFxuICAgIHthcmdzOjN9LFxuICAgICh4LG9wLHkpID0+IG51bUNtcFtvcF0oeCx5KT8wOlt4LFwiaXMgbm90IFwiK29wLHldXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdzdHJDbXAnLFxuICAgIHthcmdzOjN9LFxuICAgICh4LG9wLHkpID0+IHN0ckNtcFtvcF0oeCx5KT8wOlt4LFwiaXMgbm90IFwiK29wLHldXG4pO1xuXG5jb25zdCB0eXBlQ2hlY2sgPSB7XG4gICAgdW5kZWZpbmVkOiB4ID0+IHggPT09IHVuZGVmaW5lZCxcbiAgICBudWxsOiAgICAgIHggPT4geCA9PT0gbnVsbCxcbiAgICBudW1iZXI6ICAgIHggPT4gdHlwZW9mIHggPT09ICdudW1iZXInICYmICFOdW1iZXIuaXNOYU4oeCksXG4gICAgaW50ZWdlcjogICB4ID0+IE51bWJlci5pc0ludGVnZXIoeCksXG4gICAgbmFuOiAgICAgICB4ID0+IE51bWJlci5pc05hTih4KSxcbiAgICBzdHJpbmc6ICAgIHggPT4gdHlwZW9mIHggPT09ICdzdHJpbmcnLFxuICAgIGZ1bmN0aW9uOiAgeCA9PiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyxcbiAgICBib29sZWFuOiAgIHggPT4gdHlwZW9mIHggPT09ICdib29sZWFuJyxcbiAgICBvYmplY3Q6ICAgIHggPT4geCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoeCksXG4gICAgYXJyYXk6ICAgICB4ID0+IEFycmF5LmlzQXJyYXkoeCksXG59O1xuZnVuY3Rpb24gdHlwZUV4cGxhaW4gKHgpIHtcbiAgICBpZiAodHlwZW9mIHggPT09ICdzdHJpbmcnKVxuICAgICAgICByZXR1cm4geDtcbiAgICBpZiAodHlwZW9mIHggPT09ICdmdW5jdGlvbicpXG4gICAgICAgIHJldHVybiAnaW5zdGFuY2VvZiAnKyh4Lm5hbWUgfHwgeCk7XG59O1xuXG5hZGRDb25kaXRpb24oXG4gICAgJ3R5cGUnLFxuICAgIHthcmdzOiAyfSxcbiAgICAoZ290LCBleHApPT57XG4gICAgICAgIGlmICggIUFycmF5LmlzQXJyYXkoZXhwKSApXG4gICAgICAgICAgICBleHAgPSBbZXhwXTtcblxuICAgICAgICBmb3IgKGxldCB2YXJpYW50IG9mIGV4cCkge1xuICAgICAgICAgICAgLy8ga25vd24gdHlwZVxuICAgICAgICAgICAgaWYoIHR5cGVvZiB2YXJpYW50ID09PSAnc3RyaW5nJyAmJiB0eXBlQ2hlY2tbdmFyaWFudF0gKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVDaGVja1t2YXJpYW50XShnb3QpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gT0s7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBpbnN0YW5jZW9mXG4gICAgICAgICAgICBpZiggdHlwZW9mIHZhcmlhbnQgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGdvdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBpZiggZ290IGluc3RhbmNlb2YgdmFyaWFudCApXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPSztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGRvbid0IGtub3cgd2hhdCB5b3UncmUgYXNraW5nIGZvclxuICAgICAgICAgICAgcmV0dXJuICd1bmtub3duIHZhbHVlIHR5cGUgc3BlYzogJytleHBsYWluKHZhcmlhbnQsIDEpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgJy0gJytleHBsYWluKGdvdCwgMSksXG4gICAgICAgICAgICAnKyAnK2V4cC5tYXAoIHR5cGVFeHBsYWluICkuam9pbihcIiBvciBcIiksXG4gICAgICAgIF07XG4gICAgfVxuKTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcbmNvbnN0IHsgQW5ub3RhdGVkU2V0IH0gPSByZXF1aXJlKCAnLi4vdXRpbC9hbm5vdGF0ZWQtc2V0LmpzJyApO1xuXG5hZGRDb25kaXRpb24oICdkZWVwRXF1YWwnLCB7XCJhcmdzXCI6MixoYXNPcHRpb25zOnRydWV9LCBkZWVwICk7XG5cbmZ1bmN0aW9uIGRlZXAoIGdvdCwgZXhwLCBvcHRpb25zPXt9ICkge1xuICAgIGlmICghb3B0aW9ucy5tYXgpXG4gICAgICAgIG9wdGlvbnMubWF4ID0gNTtcbiAgICBvcHRpb25zLmRpZmYgPSBbXTtcbiAgICBfZGVlcCggZ290LCBleHAsIG9wdGlvbnMgKTtcbiAgICBpZiAoIW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgIHJldHVybiAwO1xuXG4gICAgY29uc3QgcmV0ID0gW107XG4gICAgZm9yIChsZXQgaXRlbSBvZiBvcHRpb25zLmRpZmYpIHtcbiAgICAgICAgcmV0LnB1c2goIFxuICAgICAgICAgICAgXCJhdCBcIitpdGVtWzBdLFxuICAgICAgICAgICAgXCItIFwiKyhpdGVtWzNdID8gaXRlbVsxXSA6IGV4cGxhaW4oIGl0ZW1bMV0sIDIgKSksXG4gICAgICAgICAgICBcIisgXCIrKGl0ZW1bM10gPyBpdGVtWzJdIDogZXhwbGFpbiggaXRlbVsyXSwgMiApKSxcbiAgICAgICAgKTtcbiAgICB9O1xuICAgIHJldHVybiByZXQ7XG59O1xuXG4vLyByZXN1bHQgaXMgc3RvcmVkIGluIG9wdGlvbnMuZGlmZj1bXSwgcmV0dXJuIHZhbHVlIGlzIGlnbm9yZWRcbi8vIGlmIHNhaWQgZGlmZiBleGNlZWRzIG1heCwgcmV0dXJuIGltbWVkaWF0ZWx5ICYgZG9uJ3Qgd2FzdGUgdGltZVxuZnVuY3Rpb24gX2RlZXAoIGdvdCwgZXhwLCBvcHRpb25zPXt9LCBwYXRoPSckJywgc2Vlbkw9bmV3IEFubm90YXRlZFNldCgpLCBzZWVuUj1uZXcgQW5ub3RhdGVkU2V0KCkgKSB7XG4gICAgaWYgKGdvdCA9PT0gZXhwIHx8IG9wdGlvbnMubWF4IDw9IG9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgIHJldHVybjtcbiAgICBpZiAodHlwZW9mIGdvdCAhPT0gdHlwZW9mIGV4cClcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuXG4gICAgLy8gcmVjdXJzZSBieSBleHBlY3RlZCB2YWx1ZSAtIGNvbnNpZGVyIGl0IG1vcmUgcHJlZGljdGFibGVcbiAgICBpZiAodHlwZW9mIGV4cCAhPT0gJ29iamVjdCcgfHwgZXhwID09PSBudWxsICkge1xuICAgICAgICAvLyBub24tb2JqZWN0cyAtIHNvIGNhbid0IGRlc2NlbmRcbiAgICAgICAgLy8gYW5kIGNvbXBhcmlzb24gYWxyZWFkeSBkb25lIGF0IHRoZSBiZWdpbm5uaW5nXG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcbiAgICB9XG5cbiAgICAvLyBtdXN0IGRldGVjdCBsb29wcyBiZWZvcmUgZ29pbmcgZG93blxuICAgIGNvbnN0IHBhdGhMID0gc2VlbkwuaGFzKGdvdCk7XG4gICAgY29uc3QgcGF0aFIgPSBzZWVuUi5oYXMoZXhwKTtcbiAgICBpZiAocGF0aEwgfHwgcGF0aFIpIHtcbiAgICAgICAgLy8gTG9vcCBkZXRlY3RlZCA9IG9ubHkgY2hlY2sgdG9wb2xvZ3lcbiAgICAgICAgaWYgKHBhdGhMID09PSBwYXRoUilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbXG4gICAgICAgICAgICBwYXRoICsgJyAoY2lyY3VsYXIpJyxcbiAgICAgICAgICAgIHBhdGhMID8gJ0NpcmN1bGFyPScrcGF0aEwgOiBleHBsYWluKGdvdCwgMiksXG4gICAgICAgICAgICBwYXRoUiA/ICdDaXJjdWxhcj0nK3BhdGhSIDogZXhwbGFpbihleHAsIDIpLFxuICAgICAgICAgICAgdHJ1ZSAvLyBkb24ndCBzdHJpbmdpZnlcbiAgICAgICAgXSk7XG4gICAgfTtcbiAgICBzZWVuTCA9IHNlZW5MLmFkZChnb3QsIHBhdGgpO1xuICAgIHNlZW5SID0gc2VlblIuYWRkKGV4cCwgcGF0aCk7XG5cbiAgICAvLyBjb21wYXJlIG9iamVjdCB0eXBlc1xuICAgIC8vIChpZiBhIHVzZXIgaXMgc3R1cGlkIGVub3VnaCB0byBvdmVycmlkZSBjb25zdHJ1Y3RvciBmaWVsZCwgd2VsbCB0aGUgdGVzdFxuICAgIC8vIHdvdWxkIGZhaWwgbGF0ZXIgYW55d2F5KVxuICAgIGlmIChnb3QuY29uc3RydWN0b3IgIT09IGV4cC5jb25zdHJ1Y3RvcilcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuXG4gICAgLy8gYXJyYXlcbiAgICBpZiAoQXJyYXkuaXNBcnJheShleHApKSB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShnb3QpIHx8IGdvdC5sZW5ndGggIT09IGV4cC5sZW5ndGgpXG4gICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBleHAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIF9kZWVwKCBnb3RbaV0sIGV4cFtpXSwgb3B0aW9ucywgcGF0aCsnWycraSsnXScsIHNlZW5MLCBzZWVuUiApO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMubWF4PD1vcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm47XG4gICAgfTtcblxuICAgIC8vIGNvbXBhcmUga2V5cyAtICsxIGZvciBleHAsIC0xIGZvciBnb3QsIG5vbnplcm8ga2V5IGF0IGVuZCBtZWFucyBrZXlzIGRpZmZlclxuICAgIGNvbnN0IHVuaXEgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhleHApLmZvckVhY2goIHggPT4gdW5pcVt4XSA9IDEgKTtcbiAgICBPYmplY3Qua2V5cyhnb3QpLmZvckVhY2goIHggPT4gdW5pcVt4XSA9ICh1bmlxW3hdIHx8IDApIC0gMSApO1xuICAgIGZvciAobGV0IHggaW4gdW5pcSkge1xuICAgICAgICBpZiAodW5pcVt4XSAhPT0gMClcbiAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcbiAgICB9XG4gICAgXG4gICAgLy8gbm93IHR5cGVvZiwgb2JqZWN0IHR5cGUsIGFuZCBvYmplY3Qga2V5cyBhcmUgdGhlIHNhbWUuXG4gICAgLy8gcmVjdXJzZS5cbiAgICBmb3IgKGxldCBpIGluIGV4cCkge1xuICAgICAgICBfZGVlcCggZ290W2ldLCBleHBbaV0sIG9wdGlvbnMsIHBhdGgrJ1snK2V4cGxhaW4oaSkrJ10nLCBzZWVuTCwgc2VlblIgKTtcbiAgICAgICAgaWYgKG9wdGlvbnMubWF4PD1vcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgfTtcbiAgICByZXR1cm47XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgUmVwb3J0IH0gPSByZXF1aXJlICggJy4vcmVwb3J0LmpzJyApO1xuY29uc3Qgbm9vcCA9ICgpPT57fTtcblxuY2xhc3MgREJDIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5fcHJlICAgID0gbm9vcDtcbiAgICAgICAgdGhpcy5fcG9zdCAgID0gbm9vcDtcbiAgICAgICAgdGhpcy5fb25mYWlsID0gcmVwb3J0ID0+IHJlcG9ydC5nZXRUaHJvd24oKTtcbiAgICAgICAgdGhpcy5fb25wb3N0ID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBwb3N0KGNvZGUpIHtcbiAgICAgICAgaWYgKGNvZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Bvc3Q7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiggdHlwZW9mIGNvZGUgIT09ICdmdW5jdGlvbicgKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncG9zdC1jb25kaXRpb24gbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgICAgICB0aGlzLl9wb3N0ID0gY29kZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuICAgIHByZShjb2RlKSB7XG4gICAgICAgIGlmIChjb2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcmU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiggdHlwZW9mIGNvZGUgIT09ICdmdW5jdGlvbicgKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncHJlLWNvbmRpdGlvbiBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICAgIHRoaXMuX3ByZSA9IGNvZGU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbiAgICBkZWNvcmF0ZShvcmlnKSB7XG4gICAgICAgIC8vIGNsb3NlIGFyb3VuZCB0aGVzZSB2YXJzXG4gICAgICAgIGNvbnN0IHByZSAgICA9IHRoaXMuX3ByZTtcbiAgICAgICAgY29uc3QgcG9zdCAgID0gdGhpcy5fcG9zdDtcbiAgICAgICAgY29uc3Qgb25mYWlsID0gdGhpcy5fb25mYWlsO1xuICAgICAgICBjb25zdCBvbnBvc3QgPSB0aGlzLl9vbnBvc3QgfHwgdGhpcy5fb25mYWlsO1xuXG4gICAgICAgIC8vIG5vIGFycm93IGZ1bmN0aW9uIHRvIGdldCBjb3JyZWN0ICd0aGlzJyBvYmplY3RcbiAgICAgICAgY29uc3QgY29kZSA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICAgICAgICBjb25zdCByUHJlID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICAgICAgcHJlLmFwcGx5KCB0aGlzLCBbIHJQcmUsIHVuZGVmaW5lZCwgLi4uYXJncyBdICk7XG4gICAgICAgICAgICBpZighclByZS5nZXRQYXNzKCkpXG4gICAgICAgICAgICAgICAgb25mYWlsKHJQcmUuc2V0VGl0bGUoJ3ByZS1jb25kaXRpb24gZmFpbGVkJykpO1xuICAgICAgICAgICAgY29uc3QgcmV0ID0gb3JpZy5hcHBseSggdGhpcywgYXJncyApO1xuICAgICAgICAgICAgY29uc3QgclBvc3QgPSBuZXcgUmVwb3J0KCk7XG4gICAgICAgICAgICBwb3N0LmFwcGx5KCB0aGlzLCBbIHJQb3N0LCByZXQsIC4uLmFyZ3MgXSApO1xuICAgICAgICAgICAgaWYoIXJQb3N0LmdldFBhc3MoKSlcbiAgICAgICAgICAgICAgICBvbnBvc3QoclBvc3Quc2V0VGl0bGUoJ3Bvc3QtY29uZGl0aW9uIGZhaWxlZCcpKTtcbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb2RlLm9yaWcgPSBvcmlnO1xuICAgICAgICBjb2RlLnByZSAgPSBwcmU7XG4gICAgICAgIGNvZGUucG9zdCA9IHBvc3Q7XG5cbiAgICAgICAgcmV0dXJuIGNvZGU7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgREJDIH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgY2FsbGVySW5mbywgZXhwbGFpbiwgbWFrZUVycm9yIH0gPSByZXF1aXJlKCAnLi91dGlsLmpzJyApO1xuXG4vKipcbiAqIEBwdWJsaWNcbiAqIEBjbGFzc2Rlc2NcbiAqIFRoZSBjb3JlIG9mIHRoZSByZWZ1dGUgbGlicmFyeSwgdGhlIHJlcG9ydCBvYmplY3QgY29udGFpbnMgaW5mb1xuICogYWJvdXQgcGFzc2luZyBhbmQgZmFpbGluZyBjb25kaXRpb25zLlxuICovXG5jbGFzcyBSZXBvcnQge1xuICAgIC8vIHNldHVwXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuX2NvdW50ICAgICA9IDA7XG4gICAgICAgIHRoaXMuX2ZhaWxDb3VudCA9IDA7XG4gICAgICAgIHRoaXMuX2Rlc2NyICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9ldmlkZW5jZSAgPSBbXTtcbiAgICAgICAgdGhpcy5fd2hlcmUgICAgID0gW107XG4gICAgICAgIHRoaXMuX2NvbmROYW1lICA9IFtdO1xuICAgICAgICB0aGlzLl9pbmZvICAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fbmVzdGVkICAgID0gW107XG4gICAgICAgIHRoaXMuX2RvbmUgICAgICA9IGZhbHNlO1xuICAgICAgICAvLyBUT0RPIGFkZCBjYWxsZXIgaW5mbyBhYm91dCB0aGUgcmVwb3J0IGl0c2VsZlxuICAgIH1cblxuICAgIC8vIHNldHVwIC0gbXVzdCBiZSBjaGFpbmFibGVcbiAgICBzZXRUaXRsZShzdHIpIHtcbiAgICAgICAgdGhpcy5fdGl0bGUgPSBzdHI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICBvbkRvbmUoZm4pIHtcbiAgICAgICAgdGhpcy5fb25Eb25lID0gZm47XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvLyBydW5uaW5nXG4gICAgcnVuKC4uLmFyZ3MpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RvbmUpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIFJlcG9ydCcpO1xuICAgICAgICBjb25zdCBibG9jayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhc3QgYXJndW1lbnQgb2YgcnVuKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLCBub3QgJyt0eXBlb2YoYmxvY2spKTtcbiAgICAgICAgYmxvY2soIHRoaXMsIC4uLmFyZ3MgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgYXN5bmModGltZW91dCwgYmxvY2spIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoXG4gICAgICAgICAgICAgICAgKCkgPT4gcmVqZWN0KG5ldyBFcnJvcihcIkNvbnRyYWN0IGV4ZWN1dGlvbiB0b29rIHRvbyBsb25nXCIpKSxcbiAgICAgICAgICAgICAgICB0aW1lb3V0XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgdGhpcy5vbkRvbmUoYXJnID0+IHtjbGVhclRpbWVvdXQodGltZXIpOyByZXNvbHZlKGFyZyl9KTtcbiAgICAgICAgICAgIGJsb2NrKHRoaXMpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBJbiB0aGVvcnksIGhhdmluZyBjb25zdCBuPW5leHQoKTsgc2V0UmVzdWx0KG4uIC4uLilcbiAgICAvLyBzaG91bGQgYWxsb3cgZm9yIGFzeW5jIGNvbmRpdGlvbnMgaW4gdGhlIGZ1dHVyZVxuICAgIC8vIGlmIGF0IGFsbCBwb3NzaWJsZSB3aXRob3V0IGdyZWF0IHNhY3JpZmljZXMuXG4gICAgbmV4dCgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RvbmUpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIFJlcG9ydCcpO1xuICAgICAgICByZXR1cm4gKyt0aGlzLl9jb3VudDtcbiAgICB9XG5cbiAgICBzZXRSZXN1bHQgKG4sIGV2aWRlbmNlLCBkZXNjciwgY29uZE5hbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RvbmUpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIFJlcG9ydCcpO1xuICAgICAgICBpZiAobiA+IHRoaXMuX2NvdW50KVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnQXR0ZW1wdCB0byBzZXQgY29uZGl0aW9uIGJleW9uZCBjaGVjayBjb3VudCcpO1xuICAgICAgICBpZiAoZGVzY3IpXG4gICAgICAgICAgICB0aGlzLl9kZXNjcltuXSA9IGRlc2NyO1xuICAgICAgICAvLyBwYXNzIC0gcmV0dXJuIEFTQVBcbiAgICAgICAgaWYgKCFldmlkZW5jZSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBuZXN0ZWQgcmVwb3J0IG5lZWRzIHNwZWNpYWwgaGFuZGxpbmdcbiAgICAgICAgaWYgKGV2aWRlbmNlIGluc3RhbmNlb2YgUmVwb3J0KSB7XG4gICAgICAgICAgICB0aGlzLl9uZXN0ZWRbbl0gPSBldmlkZW5jZTtcbiAgICAgICAgICAgIGlmIChldmlkZW5jZS5nZXRQYXNzKCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgZXZpZGVuY2UgPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHBlbmRpbmcgLSB3ZSdyZSBpbiBhc3luYyBtb2RlXG4gICAgICAgIGlmIChldmlkZW5jZSBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignYXN5bmMgY29uZGl0aW9ucyBub3Qgc3VwcG9ydGVkICh5ZXQpJyk7XG4gICAgICAgICAgICAvLyBUT0RPIHdhaXQrKzsgcHJvbWlzZS50aGVuKCB3YWl0LS07IGlmICghd2FpdCAmJiBkb25lKSBvbkRvbmUoKSApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbGlzdGlmeSAmIHN0cmluZ2lmeSBldmlkZW5jZSwgc28gdGhhdCBpdCBkb2Vzbid0IGNoYW5nZSBwb3N0LWZhY3R1bVxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZXZpZGVuY2UpKVxuICAgICAgICAgICAgZXZpZGVuY2UgPSBbIGV2aWRlbmNlIF07XG4gICAgICAgIHRoaXMuX2V2aWRlbmNlW25dID0gZXZpZGVuY2UubWFwKCB4PT5fZXhwbGFpbih4LCBJbmZpbml0eSkgKTtcbiAgICAgICAgdGhpcy5fd2hlcmVbbl0gICAgPSBjYWxsZXJJbmZvKDIpO1xuICAgICAgICB0aGlzLl9jb25kTmFtZVtuXSA9IGNvbmROYW1lO1xuICAgICAgICB0aGlzLl9mYWlsQ291bnQrKztcblxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgQXBwZW5kIGFuIGluZm9ybWF0aW9uYWwgbWVzc2FnZSB0byB0aGUgcmVwb3J0LlxuICAgICAqIE5vbi1zdHJpbmcgdmFsdWVzIHdpbGwgYmUgc3RyaW5naWZpZWQgdmlhIGV4cGxhaW4oKS5cbiAgICAgKiBAcGFyYW0ge0FueX0gbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtSZXBvcnR9IGNoYWluYWJsZVxuICAgICAqL1xuICAgIGluZm8oIC4uLm1lc3NhZ2UgKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnQXR0ZW1wdCB0byBtb2RpZnkgYSBmaW5pc2hlZCBSZXBvcnQnKTtcbiAgICAgICAgaWYgKCF0aGlzLl9pbmZvW3RoaXMuX2NvdW50XSlcbiAgICAgICAgICAgIHRoaXMuX2luZm9bdGhpcy5fY291bnRdID0gW107XG4gICAgICAgIHRoaXMuX2luZm9bdGhpcy5fY291bnRdLnB1c2goIG1lc3NhZ2UubWFwKCBzPT5fZXhwbGFpbihzKSApLmpvaW4oXCIgXCIpICk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGRvbmUoKSB7XG4gICAgICAgIHRoaXMuX2RvbmUgPSB0cnVlO1xuICAgICAgICBjb25zdCBjYiA9IHRoaXMuX29uRG9uZTtcbiAgICAgICAgaWYgKGNiKVxuICAgICAgICAgICAgY2IodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIHF1ZXJ5aW5nXG4gICAgZ2V0VGl0bGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90aXRsZTsgLy9KRllJXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqICAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0RG9uZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RvbmU7IC8vIGlzIGl0IGV2ZW4gbmVlZGVkP1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgV2l0aG91dCBhcmd1bWVudCByZXR1cm5zIHdoZXRoZXIgdGhlIGNvbnRyYWN0IHdhcyBmdWxmaWxsZWQuXG4gICAgICogICBBcyBhIHNwZWNpYWwgY2FzZSwgaWYgbm8gY2hlY2tzIHdlcmUgcnVuIGFuZCB0aGUgY29udHJhY3QgaXMgZmluaXNoZWQsXG4gICAgICogICByZXR1cm5zIGZhbHNlLCBhcyBpbiBcInNvbWVvbmUgbXVzdCBoYXZlIGZvcmdvdHRlbiB0byBleGVjdXRlXG4gICAgICogICBwbGFubmVkIGNoZWNrcy4gVXNlIHBhc3MoKSBpZiBubyBjaGVja3MgYXJlIHBsYW5uZWQuXG4gICAgICpcbiAgICAgKiAgIElmIGEgcGFyYW1ldGVyIGlzIGdpdmVuLCByZXR1cm4gdGhlIHN0YXR1cyBvZiBuLXRoIGNoZWNrIGluc3RlYWQuXG4gICAgICogICBAcGFyYW0ge2ludGVnZXJ9IG5cbiAgICAgKiAgIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGdldFBhc3Mobikge1xuICAgICAgICBpZiAobiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ZhaWxDb3VudCA9PT0gMCAmJiAoIXRoaXMuX2RvbmUgfHwgdGhpcy5fY291bnQgPiAwKTtcbiAgICAgICAgcmV0dXJuIChuID4gMCAmJiBuIDw9IHRoaXMuX2NvdW50KSA/ICF0aGlzLl9ldmlkZW5jZVtuXSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgcGVyZm9ybWVkLlxuICAgICAqICAgQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBXaGV0aGVyIHRoZSBsYXN0IGNoZWNrIHdhcyBhIHN1Y2Nlc3MuXG4gICAgICogIFRoaXMgaXMganVzdCBhIHNob3J0Y3V0IGZvciBmb28uZ2V0RGV0YWlscyhmb28uZ2V0Q291bnQpLnBhc3NcbiAgICAgKiAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgbGFzdCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50ID8gIXRoaXMuX2V2aWRlbmNlW3RoaXMuX2NvdW50XSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgZmFpbGluZy5cbiAgICAgKiAgIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0RmFpbENvdW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZmFpbENvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgUmV0dXJuIGEgc3RyaW5nIG9mIGZhaWxpbmcvcGFzc2luZyBjaGVja3MuXG4gICAgICogICBUaGlzIG1heSBiZSB1c2VmdWwgZm9yIHZhbGlkYXRpbmcgY3VzdG9tIGNvbmRpdGlvbnMuXG4gICAgICogICBDb25zZWN1dGl2ZSBwYXNzaW5nIGNoZWNrYSBhcmUgcmVwcmVzZW50ZWQgYnkgbnVtYmVycy5cbiAgICAgKiAgIEEgY2FwaXRhbCBsZXR0ZXIgaW4gdGhlIHN0cmluZyByZXByZXNlbnRzIGZhaWx1cmUuXG4gICAgICogICBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIHBhc3NpbmcgY2hlY2tzXG4gICAgICogICBcInIoMTApXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBjaGVja3Mgd2l0aCAxIGZhaWx1cmUgaW4gdGhlIG1pZGRsZVxuICAgICAqICAgXCJyKDUsTiw0KVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgY2hlY2tzIGluY2x1ZGluZyBhIG5lc3RlZCBjb250cmFjdFxuICAgICAqICAgXCJyKDMscigxLE4pLDYpXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyBubyBjaGVja3Mgd2VyZSBydW4gLSBhdXRvLWZhaWxcbiAgICAgKiAgIFwicihaKVwiXG4gICAgICovXG4gICAgZ2V0R2hvc3QoKSB7XG4gICAgICAgIGNvbnN0IGdob3N0ID0gW107XG4gICAgICAgIGxldCBzdHJlYWsgPSAwO1xuICAgICAgICBmb3IgKGxldCBpPTE7IGkgPD0gdGhpcy5fY291bnQ7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2V2aWRlbmNlW2ldIHx8IHRoaXMuX25lc3RlZFtpXSkge1xuICAgICAgICAgICAgICAgIGlmIChzdHJlYWspIGdob3N0LnB1c2goc3RyZWFrKTtcbiAgICAgICAgICAgICAgICBzdHJlYWsgPSAwO1xuICAgICAgICAgICAgICAgIGdob3N0LnB1c2goIHRoaXMuX25lc3RlZFtpXSA/IHRoaXMuX25lc3RlZFtpXS5nZXRHaG9zdCgpIDogJ04nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RyZWFrKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0cmVhaykgZ2hvc3QucHVzaChzdHJlYWspO1xuICAgICAgICBpZiAoZ2hvc3QubGVuZ3RoID09PSAwICYmICF0aGlzLmdldFBhc3MoKSlcbiAgICAgICAgICAgIGdob3N0LnB1c2goJ1onKTtcbiAgICAgICAgcmV0dXJuICdyKCcrZ2hvc3Quam9pbignLCcpKycpJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgcmV0dXJucyBhIHBsYWluIHNlcmlhbGl6YWJsZSBvYmplY3RcbiAgICAgKiAgQHJldHVybnMge09iamVjdH1cbiAgICAgKi9cbiAgICB0b0pTT04oKSB7XG4gICAgICAgIGNvbnN0IG4gPSB0aGlzLmdldENvdW50KCk7XG4gICAgICAgIGNvbnN0IGRldGFpbHMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGk8PW47IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuZ2V0RGV0YWlscyhpKTtcbiAgICAgICAgICAgIC8vIHN0cmlwIGV4dHJhIGtleXNcbiAgICAgICAgICAgIGZvciggbGV0IGtleSBpbiBub2RlICkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlW2tleV0gPT09IHVuZGVmaW5lZCB8fCAoQXJyYXkuaXNBcnJheShub2RlW2tleV0pICYmIG5vZGVba2V5XS5sZW5ndGggPT09IDApKVxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbm9kZVtrZXldO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChub2RlKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHBhc3M6ICB0aGlzLmdldFBhc3MoKSxcbiAgICAgICAgICAgIGNvdW50OiB0aGlzLmdldENvdW50KCksXG4gICAgICAgICAgICB0aXRsZTogdGhpcy5nZXRUaXRsZSgpLFxuICAgICAgICAgICAgZGV0YWlscyxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VGFwKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIFJldHVybnMgcmVwb3J0IHN0cmluZ2lmaWVkIGFzIFRBUCBmb3JtYXRcbiAgICAgKiAgQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXRUYXAobikge1xuICAgICAgICBjb25zdCB0YXAgPSBuID09PSB1bmRlZmluZWQgPyB0aGlzLmdldFRhcExpbmVzKCkgOiB0aGlzLmdldFRhcEVudHJ5KG4pO1xuICAgICAgICB0YXAucHVzaCgnJyk7XG4gICAgICAgIHJldHVybiB0YXAuam9pbignXFxuJyk7XG4gICAgfVxuXG4gICAgZ2V0VGFwTGluZXMobikge1xuICAgICAgICAvLyBUQVAgZm9yIG5vdywgdXNlIGFub3RoZXIgZm9ybWF0IGxhdGVyIGJlY2F1c2UgXCJwZXJsIGlzIHNjYXJ5XCJcbiAgICAgICAgY29uc3QgdGFwID0gWyAnMS4uJyt0aGlzLl9jb3VudCBdO1xuICAgICAgICBpZiAodGhpcy5nZXRUaXRsZSgpKVxuICAgICAgICAgICAgdGFwLnB1c2goJyMgJyt0aGlzLmdldFRpdGxlKCkpO1xuICAgICAgICAvLyBUT0RPIGluZm9bMF1cbiAgICAgICAgY29uc3QgcHJlZmFjZSA9IHRoaXMuZ2V0RGV0YWlscygwKTtcbiAgICAgICAgdGFwLnB1c2goIC4uLnByZWZhY2UuaW5mby5tYXAoIHMgPT4gJyMgJytzICkgKTtcbiAgICAgICAgZm9yKCBsZXQgaSA9IDE7IGkgPD0gdGhpcy5fY291bnQ7IGkrKyApXG4gICAgICAgICAgICB0YXAucHVzaCggLi4uIHRoaXMuZ2V0VGFwRW50cnkoaSkgKTtcbiAgICAgICAgaWYgKCF0aGlzLmdldFBhc3MoKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0Q291bnQoKSA+IDApXG4gICAgICAgICAgICAgICAgdGFwLnB1c2goJyMgRmFpbGVkICcrdGhpcy5nZXRGYWlsQ291bnQoKSsnLycrdGhpcy5nZXRDb3VudCgpKyAnIGNvbmRpdGlvbnMnKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB0YXAucHVzaCgnIyBObyBjaGVja3Mgd2VyZSBydW4sIGNvbnNpZGVyIHVzaW5nIHBhc3MoKSBpZiB0aGF0XFwncyBkZWxpYmVyYXRlJyk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0YXA7XG4gICAgfVxuXG4gICAgZ2V0VGFwRW50cnkobikge1xuICAgICAgICBjb25zdCBkYXRhID0gdHlwZW9mKG4pID09PSAnb2JqZWN0JyA/IG4gOiB0aGlzLmdldERldGFpbHMobik7XG4gICAgICAgIGNvbnN0IHRhcCA9IFtdO1xuICAgICAgICBpZiAoZGF0YS5uZXN0ZWQpIHtcbiAgICAgICAgICAgIHRhcC5wdXNoKCAnIyBzdWJjb250cmFjdDonKyhkYXRhLm5hbWU/JyAnK2RhdGEubmFtZTonJykgKTtcbiAgICAgICAgICAgIHRhcC5wdXNoKCAuLi4gZGF0YS5uZXN0ZWQuZ2V0VGFwTGluZXMoKS5tYXAoIHMgPT4gJyAgICAnK3MgKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGFwLnB1c2goKGRhdGEucGFzcz8nJzonbm90ICcpICsgJ29rICcgKyBkYXRhLm5cbiAgICAgICAgICAgICsgKGRhdGEubmFtZSA/ICcgLSAnK2RhdGEubmFtZSA6ICcnKSk7XG4gICAgICAgIGlmICghZGF0YS5wYXNzKVxuICAgICAgICAgICAgdGFwLnB1c2goJyMgQ29uZGl0aW9uJysoZGF0YS5jb25kID8gJyAnK2RhdGEuY29uZCA6ICcnKSsnIGZhaWxlZCBhdCAnK2RhdGEud2hlcmUpO1xuICAgICAgICB0YXAucHVzaCguLi5kYXRhLmV2aWRlbmNlLm1hcChzPT4nIyAnK3MpKTtcbiAgICAgICAgdGFwLnB1c2goLi4uZGF0YS5pbmZvLm1hcChzPT4nIyAnK3MpKTtcbiAgICAgICAgcmV0dXJuIHRhcDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIFJldHVybnMgZGV0YWlsZWQgcmVwb3J0IG9uIGEgc3BlY2lmaWMgY2hlY2tcbiAgICAgKiAgIEBwYXJhbSB7aW50ZWdlcn0gbiAtIGNoZWNrIG51bWJlciwgbXVzdCBiZSA8PSBnZXRDb3VudCgpXG4gICAgICogICBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldERldGFpbHMobikge1xuICAgICAgICAvLyBUT0RPIHZhbGlkYXRlIG5cblxuICAgICAgICAvLyB1Z2x5IGJ1dCB3aGF0IGNhbiBJIGRvXG4gICAgICAgIGlmIChuID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG46ICAgIDAsXG4gICAgICAgICAgICAgICAgaW5mbzogdGhpcy5faW5mb1swXSB8fCBbXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZXZpZGVuY2UgPSB0aGlzLl9ldmlkZW5jZVtuXTtcbiAgICAgICAgaWYgKGV2aWRlbmNlICYmICFBcnJheS5pc0FycmF5KGV2aWRlbmNlKSlcbiAgICAgICAgICAgIGV2aWRlbmNlID0gW2V2aWRlbmNlXTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbjogICAgICBuLFxuICAgICAgICAgICAgbmFtZTogICB0aGlzLl9kZXNjcltuXSB8fCAnJyxcbiAgICAgICAgICAgIHBhc3M6ICAgIWV2aWRlbmNlLFxuICAgICAgICAgICAgZXZpZGVuY2U6IGV2aWRlbmNlIHx8IFtdLFxuICAgICAgICAgICAgd2hlcmU6ICB0aGlzLl93aGVyZVtuXSxcbiAgICAgICAgICAgIGNvbmQ6ICAgdGhpcy5fY29uZE5hbWVbbl0sXG4gICAgICAgICAgICBpbmZvOiAgIHRoaXMuX2luZm9bbl0gfHwgW10sXG4gICAgICAgICAgICBuZXN0ZWQ6IHRoaXMuX25lc3RlZFtuXSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgQ29udmVydCByZXBvcnQgdG8gYW4gQXNzZXJ0aW9uRXJyb3IgKGlmIGF2YWlsYWJsZSkgb3IganVzdCBFcnJvci5cbiAgICAgKiAgQHBhcmFtIHtudW1iZXJ9IFtuXSBOdW1iZXIgb2YgY2hlY2sgdG8gY29udmVydCB0byBleGNlcHRpb24uXG4gICAgICogIEN1cnJlbnQgZXJyb3IgZm9ybWF0IGlzIFRBUCwgdGhpcyBtYXkgY2hhbmdlIGluIHRoZSBmdXR1cmUuXG4gICAgICogIElmIDAgb3IgdW5zcGVjaWZpZWQsIGNvbnZlcnQgdGhlIHdob2xlIHJlcG9ydC5cbiAgICAgKiAgQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXVxuICAgICAqICBAcGFyYW0ge2Jvb2xlYW59IG9wdGlvbnMucGFzcyBJZiBmYWxzZSAodGhlIGRlZmF1bHQpLCByZXR1cm4gbm90aGluZ1xuICAgICAqICBpZiB0aGUgcmVwb3J0IGlzIHBhc3NpbmcuXG4gICAgICogIEByZXR1cm5zIHtFcnJvcnx1bmRlZmluZWR9XG4gICAgICovXG4gICAgZ2V0RXJyb3Iobiwgb3B0aW9ucz17fSkge1xuICAgICAgICBpZiAoIW4pIHtcbiAgICAgICAgICAgIC8vIG5vIGVudHJ5IGdpdmVuXG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMucGFzcyAmJiB0aGlzLmdldFBhc3MoKSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgIHJldHVybiBtYWtlRXJyb3Ioe1xuICAgICAgICAgICAgICAgIGFjdHVhbDogICB0aGlzLmdldFRhcCgpLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiAnJyxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAgdGhpcy5nZXRUaXRsZSgpLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnY29udHJhY3QnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgZGF0YSA9IHR5cGVvZiBuID09PSAnb2JqZWN0JyA/IG4gOiB0aGlzLmdldERldGFpbHMobik7XG5cbiAgICAgICAgLy8gbm8gZXJyb3JcbiAgICAgICAgaWYgKCFvcHRpb25zLnBhc3MgJiYgZGF0YS5wYXNzKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHJldHVybiBtYWtlRXJyb3Ioe1xuICAgICAgICAgICAgYWN0dWFsOiAgIHRoaXMuZ2V0VGFwRW50cnkoZGF0YSkuam9pbignXFxuJyksXG4gICAgICAgICAgICBleHBlY3RlZDogJycsXG4gICAgICAgICAgICBtZXNzYWdlOiAgZGF0YS5uYW1lLFxuICAgICAgICAgICAgb3BlcmF0b3I6IGRhdGEuY29uZCxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0VGhyb3duKG4sIG9wdGlvbnM9e30pIHtcbiAgICAgICAgLy8gVE9ETyByZW5hbWUgdG8ganVzdCB0aHJvdz9cbiAgICAgICAgY29uc3QgZXJyID0gdGhpcy5nZXRFcnJvcihuLCBvcHRpb25zKTtcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICB9XG59XG5cbi8vIHRoaXMgaXMgZm9yIHN0dWZmIGxpa2UgYG9iamVjdCBmb28gPSB7XCJmb29cIjo0Mn1gXG4vLyB3ZSBkb24ndCB3YW50IHRoZSBleHBsYW5hdGlvbiB0byBiZSBxdW90ZWQhXG5mdW5jdGlvbiBfZXhwbGFpbiggaXRlbSwgZGVwdGggKSB7XG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJyApXG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgIHJldHVybiBleHBsYWluKCBpdGVtLCBkZXB0aCApO1xufTtcblxuUmVwb3J0LnByb3RvdHlwZS5leHBsYWluID0gZXhwbGFpbjsgLy8gYWxzbyBtYWtlIGF2YWlsYWJsZSB2aWEgcmVwb3J0XG5cbi8qKlxuICogIEBkZXNjIENyZWF0ZSBuZXcgY2hlY2sgbWV0aG9kIGF2YWlsYWJsZSB2aWEgYWxsIFJlcG9ydCBpbnN0YW5jZXNcbiAqICBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lIG9mIHRoZSBuZXcgY29uZGl0aW9uLlxuICogIE11c3Qgbm90IGJlIHByZXNlbnQgaW4gUmVwb3J0IGFscmVhZHksIGFuZCBzaG91bGQgTk9UIHN0YXJ0IHdpdGhcbiAqICBnZXQuLi4sIHNldC4uLiwgb3IgYWRkLi4uICh0aGVzZSBhcmUgcmVzZXJ2ZWQgZm9yIFJlcG9ydCBpdHNlbGYpXG4gKiAgQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgQ29uZmlndXJpbmcgdGhlIGNoZWNrJ3MgaGFuZGxpbmcgb2YgYXJndW1lbnRzXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLmFyZ3MgVGhlIHJlcXVpcmVkIG51bWJlciBvZiBhcmd1bWVudHNcbiAqICBAcGFyYW0ge2ludGVnZXJ9IFtvcHRpb25zLm1pbkFyZ3NdIE1pbmltdW0gbnVtYmVyIG9mIGFyZ3VtZW50IChkZWZhdWx0cyB0byBhcmdzKVxuICogIEBwYXJhbSB7aW50ZWdlcn0gW29wdGlvbnMubWF4QXJnc10gTWF4aW11bSBudW1iZXIgb2YgYXJndW1lbnQgKGRlZmF1bHRzIHRvIGFyZ3MpXG4gKiAgQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5oYXNPcHRpb25zXSBJZiB0cnVlLCBhbiBvcHRpb25hbCBvYmplY3RcbmNhbiBiZSBzdXBwbGllZCBhcyBsYXN0IGFyZ3VtZW50LiBJdCB3b24ndCBpbnRlcmZlcmUgd2l0aCBkZXNjcmlwdGlvbi5cbiAqICBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmZ1bl0gVGhlIGxhc3QgYXJndW1lbnQgaXMgYSBjYWxsYmFja1xuICogIEBwYXJhbSB7RnVuY3Rpb259IGltcGxlbWVudGF0aW9uIC0gYSBjYWxsYmFjayB0aGF0IHRha2VzIHthcmdzfSBhcmd1bWVudHNcbiAqICBhbmQgcmV0dXJucyBhIGZhbHNleSB2YWx1ZSBpZiBjb25kaXRpb24gcGFzc2VzXG4gKiAgKFwibm90aGluZyB0byBzZWUgaGVyZSwgbW92ZSBhbG9uZ1wiKSxcbiAqICBvciBldmlkZW5jZSBpZiBpdCBmYWlsc1xuICogIChlLmcuIHR5cGljYWxseSBhIGdvdC9leHBlY3RlZCBkaWZmKS5cbiAqL1xuY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbmZ1bmN0aW9uIGFkZENvbmRpdGlvbiAobmFtZSwgb3B0aW9ucywgaW1wbCkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uIG5hbWUgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eKF98Z2V0W19BLVpdfHNldFtfQS1aXSkvKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gbmFtZSBtdXN0IG5vdCBzdGFydCB3aXRoIGdldF8sIHNldF8sIG9yIF8nKTtcbiAgICAvLyBUT0RPIG11c3QgZG8gc29tZXRoaW5nIGFib3V0IG5hbWUgY2xhc2hlcywgYnV0IGxhdGVyXG4gICAgLy8gYmVjYXVzZSBldmFsIGluIGJyb3dzZXIgbWF5IChraW5kIG9mIGxlZ2ltaXRlbHkpIG92ZXJyaWRlIGNvbmRpdGlvbnNcbiAgICBpZiAoIXNlZW4uaGFzKG5hbWUpICYmIFJlcG9ydC5wcm90b3R5cGVbbmFtZV0pXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIGFscmVhZHkgZXhpc3RzIGluIFJlcG9ydDogJytuYW1lKTtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBvcHRpb25zJyk7XG4gICAgaWYgKHR5cGVvZiBpbXBsICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBpbXBsZW1lbnRhdGlvbicpO1xuXG4gICAgY29uc3QgbWluQXJncyAgICA9IG9wdGlvbnMubWluQXJncyB8fCBvcHRpb25zLmFyZ3M7XG4gICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFyZ3MpIHx8IG1pbkFyZ3MgPCAwKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FyZ3MvbWluQXJncyBtdXN0IGJlIG5vbm5lZ2F0aXZlIGludGVnZXInKTtcbiAgICBjb25zdCBtYXhBcmdzICAgID0gb3B0aW9ucy5tYXhBcmdzIHx8IG9wdGlvbnMuYXJncyB8fCBJbmZpbml0eTtcbiAgICBpZiAobWF4QXJncyAhPT0gSW5maW5pdHkgJiYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFyZ3MpIHx8IG1heEFyZ3MgPCBtaW5BcmdzKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdtYXhBcmdzIG11c3QgYmUgaW50ZWdlciBhbmQgZ3JlYXRlciB0aGFuIG1pbkFyZ3MsIG9yIEluZmluaXR5Jyk7XG4gICAgY29uc3QgZGVzY3JGaXJzdCAgICA9IG9wdGlvbnMuZGVzY3JGaXJzdCB8fCBvcHRpb25zLmZ1biB8fCBtYXhBcmdzID4gMTA7XG4gICAgY29uc3QgaGFzT3B0aW9ucyAgICA9ICEhb3B0aW9ucy5oYXNPcHRpb25zO1xuICAgIGNvbnN0IG1heEFyZ3NSZWFsICAgPSBtYXhBcmdzICsgKGhhc09wdGlvbnMgPyAxIDogMCk7XG5cbiAgICAvLyBUT0RPIGFsZXJ0IHVua25vd24gb3B0aW9uc1xuXG4gICAgLy8gVE9ETyB0aGlzIGNvZGUgaXMgY2x1dHRlcmVkLCByZXdyaXRlXG4gICAgY29uc3QgY29kZSA9IGZ1bmN0aW9uKC4uLmFyZ3MpIHtcbiAgICAgICAgY29uc3QgZGVzY3IgPSBkZXNjckZpcnN0XG4gICAgICAgICAgICA/IGFyZ3Muc2hpZnQoKVxuICAgICAgICAgICAgOiAoIChhcmdzLmxlbmd0aCA+IG1heEFyZ3MgJiYgdHlwZW9mIGFyZ3NbYXJncy5sZW5ndGgtMV0gPT09ICdzdHJpbmcnKSA/IGFyZ3MucG9wKCkgOiB1bmRlZmluZWQpO1xuICAgICAgICBpZiAoYXJncy5sZW5ndGggPiBtYXhBcmdzUmVhbCB8fCBhcmdzLmxlbmd0aCA8IG1pbkFyZ3MpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiAnK25hbWUrJyBtdXN0IGhhdmUgJyttaW5BcmdzKycuLicrbWF4QXJnc1JlYWwrJyBhcmd1bWVudHMgJyk7IC8vIFRPRE9cblxuICAgICAgICBjb25zdCBuID0gdGhpcy5uZXh0KCk7IC8vIFRPRE8gY2FsbCBpdCBhZHZhbmNlKCkgb3Igc210aC5cbiAgICAgICAgY29uc3QgZXZpZGVuY2UgPSBpbXBsKCAuLi5hcmdzICk7XG4gICAgICAgIHJldHVybiB0aGlzLnNldFJlc3VsdCggbiwgZXZpZGVuY2UsIGRlc2NyLCBuYW1lICk7XG4gICAgfTtcblxuICAgIHNlZW4uYWRkKG5hbWUpO1xuICAgIFJlcG9ydC5wcm90b3R5cGVbbmFtZV0gPSBjb2RlO1xufVxuXG4vKipcbiAqICAgQGZ1bmN0aW9uIGNoZWNrXG4gKiAgIEBtZW1iZXJPZiBSZXBvcnRcbiAqICAgQHBhcmFtIGV2aWRlbmNlIElmIGZhbHNlLCB0aGUgY2hlY2sgaXMgYXNzdW1lZCB0byBwYXNzLlxuICogICBBIHRydWUgdmFsdWUgbWVhbnMgdGhlIGNoZWNrIGZhaWxlZC5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuXG4vLyB0aGVzZSBjb25kaXRpb25zIGNvdWxkIGJlIHVuZGVyIHRoZSBjb25kaXRpb24gbGlicmFyeVxuLy8gYnV0IHdlJ2xsIG5lZWQgdGhlbSB0byB2ZXJpZnkgdGhlIFJlcG9ydCBjbGFzcyBpdHNlbGYuXG5cbmFkZENvbmRpdGlvbihcbiAgICAnY2hlY2snLFxuICAgIHthcmdzOjF9LFxuICAgIHg9Pnhcbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ3Bhc3MnLFxuICAgIHthcmdzOjB9LFxuICAgICgpPT4wXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdmYWlsJyxcbiAgICB7YXJnczowfSxcbiAgICAoKT0+J2ZhaWxlZCBkZWxpYmVyYXRlbHknXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdlcXVhbCcsXG4gICAge2FyZ3M6Mn0sXG4gICAgKGEsYikgPT4gYSA9PT0gYiA/IDAgOiBbICctICcrZXhwbGFpbihhKSwgJysgJyArIGV4cGxhaW4oYikgXVxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnbWF0Y2gnLFxuICAgIHthcmdzOjJ9LFxuICAgIChhLHJleCkgPT4gKCcnK2EpLm1hdGNoKHJleCkgPyAwIDogW1xuICAgICAgICAnU3RyaW5nICAgICAgICAgOiAnK2EsXG4gICAgICAgICdEb2VzIG5vdCBtYXRjaCA6ICcrcmV4XG4gICAgXVxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnbmVzdGVkJyxcbiAgICB7ZnVuOjEsbWluQXJnczoxfSxcbiAgICAoLi4uYXJncykgPT4gbmV3IFJlcG9ydCgpLnJ1biguLi5hcmdzKS5kb25lKClcbik7XG5cbi8qKlxuICogICBAZXhwb3J0cyBSZXBvcnRcbiAqICAgQGV4cG9ydHMgcmVwb3J0XG4gKiAgIEBleHBvcnRzIGFkZENvbmRpdGlvblxuICogICBAZXhwb3J0cyBleHBsYWluXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7IFJlcG9ydCwgYWRkQ29uZGl0aW9uLCBleHBsYWluIH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgQW5ub3RhdGVkU2V0IH0gPSByZXF1aXJlKCAnLi91dGlsL2Fubm90YXRlZC1zZXQuanMnICk7XG5cbi8qIERldGVybWluZSBuLXRoIGNhbGxlciB1cCB0aGUgc3RhY2sgKi9cbi8qIEluc3BpcmVkIGJ5IFBlcmwncyBDYXJwIG1vZHVsZSAqL1xuY29uc3QgaW5TdGFjayA9IC8oW146XFxzKCldKzpcXGQrKD86OlxcZCspPylcXFcqKFxcbnwkKS9nO1xuXG4vKipcbiAqICBAcHVibGljXG4gKiAgQGZ1bmN0aW9uXG4gKiAgQGRlc2MgUmV0dXJucyBzb3VyY2UgcG9zaXRpb24gbiBmcmFtZXMgdXAgdGhlIHN0YWNrXG4gKiAgQGV4YW1wbGVcbiAqICBcIi9mb28vYmFyLmpzOjI1OjExXCJcbiAqICBAcGFyYW0ge2ludGVnZXJ9IGRlcHRoIEhvdyBtYW55IGZyYW1lcyB0byBza2lwXG4gKiAgQHJldHVybnMge3N0cmluZ30gc291cmNlIGZpbGUsIGxpbmUsIGFuZCBjb2x1bW4sIHNlcGFyYXRlZCBieSBjb2xvbi5cbiAqL1xuZnVuY3Rpb24gY2FsbGVySW5mbyhuKSB7XG4gICAgLyogYSB0ZXJyaWJsZSByZXggdGhhdCBiYXNpY2FsbHkgc2VhcmNoZXMgZm9yIGZpbGUuanM6bm5uOm5ubiBzZXZlcmFsIHRpbWVzKi9cbiAgICByZXR1cm4gKG5ldyBFcnJvcigpLnN0YWNrLm1hdGNoKGluU3RhY2spW24rMV0ucmVwbGFjZSgvXFxuJC8sICcnKSB8fCAnJylcbn1cblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBmdW5jdGlvblxuICogIEBkZXNjIFN0cmluZ2lyeSBvYmplY3RzIHJlY3Vyc2l2ZWx5IHdpdGggbGltaXRlZCBkZXB0aFxuICogIGFuZCBjaXJjdWxhciByZWZlcmVuY2UgdHJhY2tpbmcuXG4gKiAgR2VuZXJhbGx5IEpTT04uc3RyaW5naWZ5IGlzIHVzZWQgYXMgcmVmZXJlbmNlOlxuICogIHN0cmluZ3MgYXJlIGVzY2FwZWQgYW5kIGRvdWJsZS1xdW90ZWQ7IG51bWJlcnMsIGJvb2xlYW4sIGFuZCBudWxscyBhcmVcbiAqICBzdHJpbmdpZmllZCBcImFzIGlzXCI7IG9iamVjdHMgYW5kIGFycmF5cyBhcmUgZGVzY2VuZGVkIGludG8uXG4gKiAgVGhlIGRpZmZlcmVuY2VzIGZvbGxvdzpcbiAqICB1bmRlZmluZWQgaXMgcmVwb3J0ZWQgYXMgJzx1bmRlZj4nLlxuICogIE9iamVjdHMgdGhhdCBoYXZlIGNvbnN0cnVjdG9ycyBhcmUgcHJlZml4ZWQgd2l0aCBjbGFzcyBuYW1lcy5cbiAqICBPYmplY3QgYW5kIGFycmF5IGNvbnRlbnQgaXMgYWJicmV2aWF0ZWQgYXMgXCIuLi5cIiBhbmQgXCJDaXJjdWxhclwiXG4gKiAgaW4gY2FzZSBvZiBkZXB0aCBleGhhdXN0aW9uIGFuZCBjaXJjdWxhciByZWZlcmVuY2UsIHJlc3BlY3RpdmVseS5cbiAqICBGdW5jdGlvbnMgYXJlIG5haXZlbHkgc3RyaW5naWZpZWQuXG4gKiAgQHBhcmFtIHtBbnl9IHRhcmdldCBPYmplY3QgdG8gc2VyaWFsaXplLlxuICogIEBwYXJhbSB7aW50ZWdlcn0gZGVwdGg9MyBEZXB0aCBsaW1pdC5cbiAqICBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5mdW5jdGlvbiBleHBsYWluKCBpdGVtLCBkZXB0aD0zLCBvcHRpb25zPXt9LCBwYXRoPSckJywgc2Vlbj1uZXcgQW5ub3RhdGVkU2V0KCkgKSB7XG4gICAgLy8gc2ltcGxlIHR5cGVzXG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJylcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGl0ZW0pOyAvLyBkb24ndCB3YW50IHRvIHNwZW5kIHRpbWUgcW91dGluZ1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ251bWJlcicgfHwgdHlwZW9mIGl0ZW0gPT09ICdib29sZWFuJyB8fCBpdGVtID09PSBudWxsKVxuICAgICAgICByZXR1cm4gJycraXRlbTtcbiAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gJzx1bmRlZj4nO1xuICAgIGlmICh0eXBlb2YgaXRlbSAhPT0gJ29iamVjdCcpIC8vIG1heWJlIGZ1bmN0aW9uXG4gICAgICAgIHJldHVybiAnJytpdGVtOyAvLyBUT0RPIGRvbid0IHByaW50IG91dCBhIGxvbmcgZnVuY3Rpb24ncyBib2R5XG5cbiAgICAvLyByZWN1cnNlXG4gICAgY29uc3Qgd2hlcmVTZWVuID0gc2Vlbi5oYXMoaXRlbSk7XG4gICAgaWYgKHdoZXJlU2Vlbikge1xuICAgICAgICBjb25zdCBub3RlID0gJ0NpcmN1bGFyPScrd2hlcmVTZWVuO1xuICAgICAgICByZXR1cm4gQXJyYXkuaXNBcnJheShpdGVtKT8nWyAnK25vdGUrJyBdJzoneyAnK25vdGUrJyB9JztcbiAgICB9O1xuICAgIHNlZW4gPSBzZWVuLmFkZCggaXRlbSwgcGF0aCApOyAvLyBjbG9uZXMgc2VlblxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoaXRlbSkpIHtcbiAgICAgICAgaWYgKGRlcHRoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiAnWy4uLl0nO1xuICAgICAgICBzZWVuLmFkZChpdGVtKTtcbiAgICAgICAgLy8gVE9ETyA8eCBlbXB0eSBpdGVtcz5cbiAgICAgICAgY29uc3QgbGlzdCA9IGl0ZW0ubWFwKFxuICAgICAgICAgICAgKHZhbCwgaW5kZXgpID0+IGV4cGxhaW4odmFsLCBkZXB0aC0xLCBvcHRpb25zLCBwYXRoKydbJytpbmRleCsnXScsIHNlZW4pXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiAnWycrbGlzdC5qb2luKCcsICcpKyddJzsgLy8gVE9ETyBjb25maWd1cmFibGUgd2hpdGVzcGFjZVxuICAgIH1cblxuICAgIGNvbnN0IHR5cGUgPSBpdGVtLmNvbnN0cnVjdG9yICYmIGl0ZW0uY29uc3RydWN0b3IubmFtZTtcbiAgICBjb25zdCBwcmVmaXggPSB0eXBlICYmIHR5cGUgIT09ICdPYmplY3QnID8gdHlwZSArICcgJyA6ICcnO1xuICAgIGlmIChkZXB0aCA8IDEpXG4gICAgICAgIHJldHVybiBwcmVmaXggKyAney4uLn0nO1xuICAgIGNvbnN0IGxpc3QgPSBPYmplY3Qua2V5cyhpdGVtKS5zb3J0KCkubWFwKCBrZXkgPT4ge1xuICAgICAgICBjb25zdCBpbmRleCA9IEpTT04uc3RyaW5naWZ5KGtleSk7XG4gICAgICAgIHJldHVybiBpbmRleCtcIjpcIitleHBsYWluKGl0ZW1ba2V5XSwgZGVwdGgtMSwgb3B0aW9ucywgcGF0aCsnWycraW5kZXgrJ10nLCBzZWVuKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcHJlZml4ICsgJ3snICsgbGlzdC5qb2luKFwiLCBcIikgKyAnfSc7XG5cbiAgICAvLyBkdW5ubyB3aGF0IGl0IGlzLCBtYXliZSBhIGZ1bmN0aW9uXG4gICAgcmV0dXJuICcnK2l0ZW07XG59XG5cbi8vIE11c3Qgd29yayBldmVuIHdpdGhvdXQgYXNzZXJ0XG5jb25zdCBoYXNBc3NlcnQgPSB0eXBlb2YgYXNzZXJ0ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFzc2VydC5Bc3NlcnRpb25FcnJvciA9PT0gJ2Z1bmN0aW9uJztcblxuY29uc3QgbWFrZUVycm9yID0gaGFzQXNzZXJ0XG4gICAgPyBlbnRyeSA9PiBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKGVudHJ5KVxuICAgIDogZW50cnkgPT4gbmV3IEVycm9yKCBlbnRyeS5hY3R1YWwgKTtcblxuLyoqXG4gKiAgIEBleHBvcnRzIGNhbGxlckluZm9cbiAqICAgQGV4cG9ydHMgZXhwbGFpblxuICovXG5cbm1vZHVsZS5leHBvcnRzID0geyBjYWxsZXJJbmZvLCBleHBsYWluLCBtYWtlRXJyb3IgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gU2VlIGFsc28gbm90ZWQtc2V0LmpzXG5cbmNsYXNzIEFubm90YXRlZFNldCB7XG4gICAgY29uc3RydWN0b3IoYWxsPW5ldyBTZXQoKSwgbm90ZXM9W10pIHtcbiAgICAgICAgdGhpcy5hbGwgICA9IGFsbDtcbiAgICAgICAgdGhpcy5ub3RlcyA9IG5vdGVzO1xuICAgIH1cbiAgICBhZGQoIGl0ZW0sIG5vdGUgKSB7XG4gICAgICAgIGlmICh0aGlzLmFsbC5oYXMoaXRlbSkpXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBBbm5vdGF0ZWRTZXQoXG4gICAgICAgICAgICBuZXcgU2V0KHRoaXMuYWxsKS5hZGQoaXRlbSksXG4gICAgICAgICAgICBbIC4uLnRoaXMubm90ZXMsIFsgaXRlbSwgbm90ZSBdIF1cbiAgICAgICAgKTtcbiAgICB9XG4gICAgaGFzKCBpdGVtICkge1xuICAgICAgICBpZiAoIXRoaXMuYWxsLmhhcyggaXRlbSApKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKGxldCBwYWlyIG9mIHRoaXMubm90ZXMpIHtcbiAgICAgICAgICAgIGlmIChwYWlyWzBdID09PSBpdGVtKVxuICAgICAgICAgICAgICAgIHJldHVybiBwYWlyWzFdO1xuICAgICAgICB9O1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3d0ZiwgdW5yZWFjaGFibGUnKTtcbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7IEFubm90YXRlZFNldCB9O1xuIl19
