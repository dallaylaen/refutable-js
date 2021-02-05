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

const getReport = (...args) => new Report().run(...args).stop();

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

        return new Report().run( ok => {
            list.forEach( (item, index) => ok.nested( "item "+index, item, contract ) );
        }).stop();
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

        return new Report().run( ok => {
            for (let n = 0; n < list.length-1; n++) {
                ok.nested( "items "+n+", "+(n+1), list[n], list[n+1], contract);
            }
        }).stop();
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
            "- "+explain( item[1], 2 ),
            "+ "+explain( item[2], 2 )
        );
    };
    return ret;
};

// result is stored in options.diff=[], return value is ignored
// if said diff exceeds max, return immediately & don't waste time
function _deep( got, exp, options={}, path='$', seen=new Set() ) {
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
    if (seen.has(exp)) {
        options.max = 0;
        return options.diff.push( 
            [path + ' (Expecting circular reference, auto-fail)', got, exp ] );
    };
    seen.add(exp);

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
            _deep( got[i], exp[i], options, path+'['+i+']', new Set(seen));
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
        _deep( got[i], exp[i], options, path+'['+explain(i)+']', new Set(seen));
        if (options.max<=options.diff.length)
            break;
    };
    return;
};

},{"../report.js":6}],5:[function(require,module,exports){
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

    stop() {
        this._done = true;
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
    (...args) => new Report().run(...args).stop()
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
    if (seen.has(item)) {
        // TODO determine path
        return Array.isArray(item) ? '[Circular]' : '{Circular}';
    };
    seen = seen.add( item, path ); // clones object

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9yZWZ1dGUuanMiLCJsaWIvcmVmdXRlL2NvbmQvYXJyYXkuanMiLCJsaWIvcmVmdXRlL2NvbmQvYmFzaWMuanMiLCJsaWIvcmVmdXRlL2NvbmQvZGVlcC5qcyIsImxpYi9yZWZ1dGUvZGJjLmpzIiwibGliL3JlZnV0ZS9yZXBvcnQuanMiLCJsaWIvcmVmdXRlL3V0aWwuanMiLCJsaWIvcmVmdXRlL3V0aWwvYW5ub3RhdGVkLXNldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0JztcblxuLy8gdGhlIGNvcmUgKHNob3VsZCBleHBsYWluIGV2ZW4gYmUgdGhlcmU/KVxuY29uc3QgeyBSZXBvcnQsIGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9ID0gcmVxdWlyZSAoJy4vcmVmdXRlL3JlcG9ydC5qcycpO1xuXG4vLyBlaWZmZWwtc3R5bGUgZGVzaWduLWJ5LWNvbnRyYWN0XG5jb25zdCB7IERCQyB9ID0gcmVxdWlyZSggJy4vcmVmdXRlL2RiYy5qcycgKTtcblxuLy8gaW1wb3J0IGRlZmF1bHQgY29uZGl0aW9uIGFyc2VuYWxcbnJlcXVpcmUoICcuL3JlZnV0ZS9jb25kL2Jhc2ljLmpzJyApO1xucmVxdWlyZSggJy4vcmVmdXRlL2NvbmQvYXJyYXkuanMnICk7XG5yZXF1aXJlKCAnLi9yZWZ1dGUvY29uZC9kZWVwLmpzJyApO1xuXG5jb25zdCBnZXRSZXBvcnQgPSAoLi4uYXJncykgPT4gbmV3IFJlcG9ydCgpLnJ1biguLi5hcmdzKS5zdG9wKCk7XG5cbi8vIEFsbG93IGNyZWF0aW5nIG11bHRpcGxlIHBhcmFsbGVsIGNvbmZpZ3VyYXRpb25zIG9mIHJlZnV0ZVxuLy8gZS5nLiBvbmUgc3RyaWN0ICh0aHJvd2luZyBlcnJvcnMpIGFuZCBvdGhlciBsYXggKGp1c3QgZGVidWdnaW5nIHRvIGNvbnNvbGUpXG5mdW5jdGlvbiBzZXR1cCggb3B0aW9ucz17fSwgb3JpZyApIHtcbiAgICAvLyBUT0RPIHZhbGlkYXRlIG9wdGlvbnNcbiAgICBjb25zdCBvbkZhaWwgPSBvcHRpb25zLm9uRmFpbCB8fCAocmVwID0+IHsgdGhyb3cgbmV3IEVycm9yKHJlcC5nZXRUYXAoKSkgfSk7XG5cbiAgICBjb25zdCByZWZ1dGUgPSBvcHRpb25zLnNraXBcbiAgICAgICAgPyAoKT0+e31cbiAgICAgICAgOiAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgY29uc3Qgb2sgPSBnZXRSZXBvcnQoLi4uYXJncyk7XG4gICAgICAgICAgICBpZiAoIW9rLmdldFBhc3MoKSlcbiAgICAgICAgICAgICAgICBvbkZhaWwob2ssIGFyZ3MpO1xuICAgICAgICB9O1xuXG4gICAgLy8gcmVleHBvcnQgYWxsIGZyb20gcmVwb3J0LmpzXG4gICAgcmVmdXRlLlJlcG9ydCA9IFJlcG9ydDtcbiAgICByZWZ1dGUuZXhwbGFpbiA9IGV4cGxhaW47XG4gICAgcmVmdXRlLmFkZENvbmRpdGlvbiA9IGFkZENvbmRpdGlvbjtcblxuICAgIC8vIHNob3J0Y3V0IHRvIHZhbGlkYXRpbmcgJiByZXR1cm5pbmcgYSBmcmVzaCBjb250cmFjdFxuICAgIC8vIFRPRE8gcmVuYW1lIHRvIGF2b2lkIG5hbWUgY2xhc2ggd2l0aCB0aGUgY2xhc3NcbiAgICAvLyAoZXZhbD8pXG4gICAgcmVmdXRlLnJlcG9ydCA9IGdldFJlcG9ydDtcblxuICAgIC8vIHJlZnV0ZS5jb25mKHsuLi59KSB3aWxsIGdlbmVyYXRlIGEgX25ld18gcmVmdXRlXG4gICAgcmVmdXRlLmNvbmZpZyA9IHVwZGF0ZSA9PiBzZXR1cCggeyAuLi5vcHRpb25zLCAuLi51cGRhdGUgfSwgcmVmdXRlICk7XG5cbiAgICAvLyBhZGQgZGVzaWduLWJ5LWNvbnRyYWN0XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCByZWZ1dGUsICdkYmMnLCB7IGdldDogKCk9Pm5ldyBEQkMoKSB9ICk7XG5cbiAgICAvLyBUT0RPIHRoaXMgaXMgc3R1cGlkLCBjb21lIHVwIHdpdGggc210aCBiZXR0ZXJcbiAgICAvLyB3aGVuIGluIGJyb3dzZXIsIHdpbmRvdy5yZWZ1dGUuY29uZmlnKCkgdXBkYXRlcyB3aW5kb3cucmVmdXRlIGl0c2VsZlxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiBvcmlnID09PSB3aW5kb3cucmVmdXRlKVxuICAgICAgICB3aW5kb3cucmVmdXRlID0gcmVmdXRlO1xuXG4gICAgcmV0dXJuIHJlZnV0ZTtcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKVxuICAgIG1vZHVsZS5leHBvcnRzID0gc2V0dXAoKTtcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJylcbiAgICB3aW5kb3cucmVmdXRlID0gc2V0dXAoKTsgLy8gVE9ETyBjaGVjayBwcmVleGlzdGluZ1xuXG4vKipcbiAqICAgQGNhbGxiYWNrIENvbnRyYWN0XG4gKiAgIEBkZXNjIEEgY29kZSBibG9jayBjb250YWluaW5nIG9uZSBvciBtb3JlIGNvbmRpdGlvbiBjaGVja3MuXG4gKiAgIEEgY2hlY2sgaXMgcGVyZm9ybWVkIGJ5IGNhbGxpbmcgb25lIG9mIGEgZmV3IHNwZWNpYWwgbWV0aG9kc1xuICogICAoZXF1YWwsIG1hdGNoLCBkZWVwRXF1YWwsIHR5cGUgZXRjKVxuICogICBvbiB0aGUgUmVwb3J0IG9iamVjdC5cbiAqICAgQ29udHJhY3RzIG1heSBiZSBuZXN0ZWQgdXNpbmcgdGhlICduZXN0ZWQnIG1ldGhvZCB3aGljaCBhY2NlcHRzXG4gKiAgIGFub3RoZXIgY29udHJhY3QgYW5kIHJlY29yZHMgYSBwYXNzL2ZhaWx1cmUgaW4gdGhlIHBhcmVudCBhY2NvcmRpbmdseS5xXG4gKiAgIEEgY29udHJhY3QgaXMgYWx3YXlzIGV4ZWN1dGVkIHRvIHRoZSBlbmQuXG4gKiAgIEBwYXJhbSB7UmVwb3J0fSBvayBBbiBvYmplY3QgdGhhdCByZWNvcmRzIGNoZWNrIHJlc3VsdHMuXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzXG4gKiAgIChlLmcuIGRhdGEgc3RydWN0dXJlIHRvIGJlIHZhbGlkYXRlZClcbiAqICAgQHJldHVybnMge3ZvaWR9IFJldHVybmVkIHZhbHVlIGlzIGlnbm9yZWQuXG4gKi9cblxuLyoqXG4gKiAgIEBwdWJsaWNcbiAqICAgQGZ1bmN0aW9uIHJlZnV0ZVxuICogICBAcGFyYW0ge0FueX0gWy4uLmxpc3RdIERhdGEgdG8gZmVlZCB0byB0aGUgY2FsbGJhY2tcbiAqICAgQHBhcmFtIHtDb250cmFjdH0gY29udHJhY3QgQSBjb2RlIGJsb2NrIHdpdGggY2hlY2tzLlxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfSBSZXR1cm4gdmFsdWUgaXMgaWdub3JlZC5cbiAqICAgQHRocm93cyB7RXJyb3J9IElmIG9uZSBvciBtb3JlIGNoZWNrcyBhcmUgZmFpbGluZywgYW4gZXhjZXB0aW9uIGlzIHRocm93blxuICogICB3aXRoIGRldGFpbHMgYWJvdXQgYWxsIHBhc3NpbmcvZmFpbGluZyBjaGVja3MuXG4gKiAgIFRoaXMgYWN0aW9uIGNhbiBiZSBjaGFuZ2VkIHZpYSByZWZ1dGUuY29uZmlnKCkgY2FsbC5cbiAqXG4gKi9cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgUmVwb3J0IH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuXG4vLyBUT0RPIHJlbmFtZSBmb3JFYWNoIG9yIHNtdGguXG5hZGRDb25kaXRpb24oXG4gICAgJ21hcCcsXG4gICAge2Z1bjoxLGFyZ3M6Mn0sXG4gICAgKGxpc3QsIGNvbnRyYWN0KSA9PiB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSlcbiAgICAgICAgICAgIHJldHVybiAnRXhwZWN0ZWQgYSBsaXN0LCBmb3VuZCBhICcudHlwZW9mKGxpc3QpO1xuICAgICAgICBpZiAobGlzdC5sZW5ndGggPCAxKVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGF1dG8tcGFzc1xuXG4gICAgICAgIHJldHVybiBuZXcgUmVwb3J0KCkucnVuKCBvayA9PiB7XG4gICAgICAgICAgICBsaXN0LmZvckVhY2goIChpdGVtLCBpbmRleCkgPT4gb2submVzdGVkKCBcIml0ZW0gXCIraW5kZXgsIGl0ZW0sIGNvbnRyYWN0ICkgKTtcbiAgICAgICAgfSkuc3RvcCgpO1xuICAgIH1cbik7XG5cbi8vIFRPRE8gdGhpcyBpcyBjYWxsZWQgXCJjb21wbGlhbnQgY2hhaW5cIiBidXQgYmV0dGVyIGp1c3Qgc2F5IGhlcmVcbi8vIFwib2ggd2UncmUgY2hlY2tpbmcgZWxlbWVudCBvcmRlclwiXG5hZGRDb25kaXRpb24oXG4gICAgJ29yZGVyZWQnLCAvLyBUT0RPIGJldHRlciBuYW1lP1xuICAgIHtmdW46MSxhcmdzOjJ9LFxuICAgIChsaXN0LCBjb250cmFjdCkgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpXG4gICAgICAgICAgICByZXR1cm4gJ0V4cGVjdGVkIGEgbGlzdCwgZm91bmQgYSAnLnR5cGVvZihsaXN0KTtcbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoIDwgMilcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBhdXRvLXBhc3NcblxuICAgICAgICByZXR1cm4gbmV3IFJlcG9ydCgpLnJ1biggb2sgPT4ge1xuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBsaXN0Lmxlbmd0aC0xOyBuKyspIHtcbiAgICAgICAgICAgICAgICBvay5uZXN0ZWQoIFwiaXRlbXMgXCIrbitcIiwgXCIrKG4rMSksIGxpc3Rbbl0sIGxpc3RbbisxXSwgY29udHJhY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5zdG9wKCk7XG4gICAgfVxuKTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgcmVwb3J0LCBleHBsYWluIH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuY29uc3QgT0sgPSBmYWxzZTtcblxuY29uc3QgbnVtQ21wID0ge1xuICAgICc8JyA6ICh4LHkpPT4oeCAgPCB5KSxcbiAgICAnPicgOiAoeCx5KT0+KHggID4geSksXG4gICAgJzw9JzogKHgseSk9Pih4IDw9IHkpLFxuICAgICc+PSc6ICh4LHkpPT4oeCA+PSB5KSxcbiAgICAnPT0nOiAoeCx5KT0+KHggPT09IHkpLFxuICAgICchPSc6ICh4LHkpPT4oeCAhPT0geSksXG59O1xuXG4vLyB1c2UgIT0gYW5kIG5vdCAhPT0gZGVsaWJlcmF0ZWx5IHRvIGZpbHRlciBvdXQgbnVsbCAmIHVuZGVmaW5lZFxuY29uc3Qgc3RyQ21wID0ge1xuICAgICc8JyA6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCAgPCAnJyt5KSxcbiAgICAnPicgOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggID4gJycreSksXG4gICAgJzw9JzogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4IDw9ICcnK3kpLFxuICAgICc+PSc6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCA+PSAnJyt5KSxcblxuICAgICc9PSc6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCA9PT0gJycreSksXG4gICAgJyE9JzogKHgseSk9PigoeCA9PSB1bmRlZmluZWQpXih5ID09IHVuZGVmaW5lZCkpIHx8ICgnJyt4ICE9PSAnJyt5KSxcbn07XG5cbmFkZENvbmRpdGlvbihcbiAgICAnbnVtQ21wJyxcbiAgICB7YXJnczozfSxcbiAgICAoeCxvcCx5KSA9PiBudW1DbXBbb3BdKHgseSk/MDpbeCxcImlzIG5vdCBcIitvcCx5XVxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnc3RyQ21wJyxcbiAgICB7YXJnczozfSxcbiAgICAoeCxvcCx5KSA9PiBzdHJDbXBbb3BdKHgseSk/MDpbeCxcImlzIG5vdCBcIitvcCx5XVxuKTtcblxuY29uc3QgdHlwZUNoZWNrID0ge1xuICAgIHVuZGVmaW5lZDogeCA9PiB4ID09PSB1bmRlZmluZWQsXG4gICAgbnVsbDogICAgICB4ID0+IHggPT09IG51bGwsXG4gICAgbnVtYmVyOiAgICB4ID0+IHR5cGVvZiB4ID09PSAnbnVtYmVyJyAmJiAhTnVtYmVyLmlzTmFOKHgpLFxuICAgIGludGVnZXI6ICAgeCA9PiBOdW1iZXIuaXNJbnRlZ2VyKHgpLFxuICAgIG5hbjogICAgICAgeCA9PiBOdW1iZXIuaXNOYU4oeCksXG4gICAgc3RyaW5nOiAgICB4ID0+IHR5cGVvZiB4ID09PSAnc3RyaW5nJyxcbiAgICBmdW5jdGlvbjogIHggPT4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicsXG4gICAgYm9vbGVhbjogICB4ID0+IHR5cGVvZiB4ID09PSAnYm9vbGVhbicsXG4gICAgb2JqZWN0OiAgICB4ID0+IHggJiYgdHlwZW9mIHggPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KHgpLFxuICAgIGFycmF5OiAgICAgeCA9PiBBcnJheS5pc0FycmF5KHgpLFxufTtcbmZ1bmN0aW9uIHR5cGVFeHBsYWluICh4KSB7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnc3RyaW5nJylcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKVxuICAgICAgICByZXR1cm4gJ2luc3RhbmNlb2YgJysoeC5uYW1lIHx8IHgpO1xufTtcblxuYWRkQ29uZGl0aW9uKFxuICAgICd0eXBlJyxcbiAgICB7YXJnczogMn0sXG4gICAgKGdvdCwgZXhwKT0+e1xuICAgICAgICBpZiAoICFBcnJheS5pc0FycmF5KGV4cCkgKVxuICAgICAgICAgICAgZXhwID0gW2V4cF07XG5cbiAgICAgICAgZm9yIChsZXQgdmFyaWFudCBvZiBleHApIHtcbiAgICAgICAgICAgIC8vIGtub3duIHR5cGVcbiAgICAgICAgICAgIGlmKCB0eXBlb2YgdmFyaWFudCA9PT0gJ3N0cmluZycgJiYgdHlwZUNoZWNrW3ZhcmlhbnRdICkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlQ2hlY2tbdmFyaWFudF0oZ290KSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9LO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gaW5zdGFuY2VvZlxuICAgICAgICAgICAgaWYoIHR5cGVvZiB2YXJpYW50ID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBnb3QgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgaWYoIGdvdCBpbnN0YW5jZW9mIHZhcmlhbnQgKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gT0s7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBkb24ndCBrbm93IHdoYXQgeW91J3JlIGFza2luZyBmb3JcbiAgICAgICAgICAgIHJldHVybiAndW5rbm93biB2YWx1ZSB0eXBlIHNwZWM6ICcrZXhwbGFpbih2YXJpYW50LCAxKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICctICcrZXhwbGFpbihnb3QsIDEpLFxuICAgICAgICAgICAgJysgJytleHAubWFwKCB0eXBlRXhwbGFpbiApLmpvaW4oXCIgb3IgXCIpLFxuICAgICAgICBdO1xuICAgIH1cbik7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIGV4cGxhaW4gfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5cbmFkZENvbmRpdGlvbiggJ2RlZXBFcXVhbCcsIHtcImFyZ3NcIjoyLGhhc09wdGlvbnM6dHJ1ZX0sIGRlZXAgKTtcblxuZnVuY3Rpb24gZGVlcCggZ290LCBleHAsIG9wdGlvbnM9e30gKSB7XG4gICAgaWYgKCFvcHRpb25zLm1heClcbiAgICAgICAgb3B0aW9ucy5tYXggPSA1O1xuICAgIG9wdGlvbnMuZGlmZiA9IFtdO1xuICAgIF9kZWVwKCBnb3QsIGV4cCwgb3B0aW9ucyApO1xuICAgIGlmICghb3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgcmV0dXJuIDA7XG5cbiAgICBjb25zdCByZXQgPSBbXTtcbiAgICBmb3IgKGxldCBpdGVtIG9mIG9wdGlvbnMuZGlmZikge1xuICAgICAgICByZXQucHVzaCggXG4gICAgICAgICAgICBcImF0IFwiK2l0ZW1bMF0sXG4gICAgICAgICAgICBcIi0gXCIrZXhwbGFpbiggaXRlbVsxXSwgMiApLFxuICAgICAgICAgICAgXCIrIFwiK2V4cGxhaW4oIGl0ZW1bMl0sIDIgKVxuICAgICAgICApO1xuICAgIH07XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbi8vIHJlc3VsdCBpcyBzdG9yZWQgaW4gb3B0aW9ucy5kaWZmPVtdLCByZXR1cm4gdmFsdWUgaXMgaWdub3JlZFxuLy8gaWYgc2FpZCBkaWZmIGV4Y2VlZHMgbWF4LCByZXR1cm4gaW1tZWRpYXRlbHkgJiBkb24ndCB3YXN0ZSB0aW1lXG5mdW5jdGlvbiBfZGVlcCggZ290LCBleHAsIG9wdGlvbnM9e30sIHBhdGg9JyQnLCBzZWVuPW5ldyBTZXQoKSApIHtcbiAgICBpZiAoZ290ID09PSBleHAgfHwgb3B0aW9ucy5tYXggPD0gb3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgcmV0dXJuO1xuICAgIGlmICh0eXBlb2YgZ290ICE9PSB0eXBlb2YgZXhwKVxuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG5cbiAgICAvLyByZWN1cnNlIGJ5IGV4cGVjdGVkIHZhbHVlIC0gY29uc2lkZXIgaXQgbW9yZSBwcmVkaWN0YWJsZVxuICAgIGlmICh0eXBlb2YgZXhwICE9PSAnb2JqZWN0JyB8fCBleHAgPT09IG51bGwgKSB7XG4gICAgICAgIC8vIG5vbi1vYmplY3RzIC0gc28gY2FuJ3QgZGVzY2VuZFxuICAgICAgICAvLyBhbmQgY29tcGFyaXNvbiBhbHJlYWR5IGRvbmUgYXQgdGhlIGJlZ2lubm5pbmdcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuICAgIH1cblxuICAgIC8vIG11c3QgZGV0ZWN0IGxvb3BzIGJlZm9yZSBnb2luZyBkb3duXG4gICAgaWYgKHNlZW4uaGFzKGV4cCkpIHtcbiAgICAgICAgb3B0aW9ucy5tYXggPSAwO1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFxuICAgICAgICAgICAgW3BhdGggKyAnIChFeHBlY3RpbmcgY2lyY3VsYXIgcmVmZXJlbmNlLCBhdXRvLWZhaWwpJywgZ290LCBleHAgXSApO1xuICAgIH07XG4gICAgc2Vlbi5hZGQoZXhwKTtcblxuICAgIC8vIGNvbXBhcmUgb2JqZWN0IHR5cGVzXG4gICAgLy8gKGlmIGEgdXNlciBpcyBzdHVwaWQgZW5vdWdoIHRvIG92ZXJyaWRlIGNvbnN0cnVjdG9yIGZpZWxkLCB3ZWxsIHRoZSB0ZXN0XG4gICAgLy8gd291bGQgZmFpbCBsYXRlciBhbnl3YXkpXG4gICAgaWYgKGdvdC5jb25zdHJ1Y3RvciAhPT0gZXhwLmNvbnN0cnVjdG9yKVxuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG5cbiAgICAvLyBhcnJheVxuICAgIGlmIChBcnJheS5pc0FycmF5KGV4cCkpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGdvdCkgfHwgZ290Lmxlbmd0aCAhPT0gZXhwLmxlbmd0aClcbiAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGV4cC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgX2RlZXAoIGdvdFtpXSwgZXhwW2ldLCBvcHRpb25zLCBwYXRoKydbJytpKyddJywgbmV3IFNldChzZWVuKSk7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5tYXg8PW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybjtcbiAgICB9O1xuXG4gICAgLy8gY29tcGFyZSBrZXlzIC0gKzEgZm9yIGV4cCwgLTEgZm9yIGdvdCwgbm9uemVybyBrZXkgYXQgZW5kIG1lYW5zIGtleXMgZGlmZmVyXG4gICAgY29uc3QgdW5pcSA9IHt9O1xuICAgIE9iamVjdC5rZXlzKGV4cCkuZm9yRWFjaCggeCA9PiB1bmlxW3hdID0gMSApO1xuICAgIE9iamVjdC5rZXlzKGdvdCkuZm9yRWFjaCggeCA9PiB1bmlxW3hdID0gKHVuaXFbeF0gfHwgMCkgLSAxICk7XG4gICAgZm9yIChsZXQgeCBpbiB1bmlxKSB7XG4gICAgICAgIGlmICh1bmlxW3hdICE9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuICAgIH1cbiAgICBcbiAgICAvLyBub3cgdHlwZW9mLCBvYmplY3QgdHlwZSwgYW5kIG9iamVjdCBrZXlzIGFyZSB0aGUgc2FtZS5cbiAgICAvLyByZWN1cnNlLlxuICAgIGZvciAobGV0IGkgaW4gZXhwKSB7XG4gICAgICAgIF9kZWVwKCBnb3RbaV0sIGV4cFtpXSwgb3B0aW9ucywgcGF0aCsnWycrZXhwbGFpbihpKSsnXScsIG5ldyBTZXQoc2VlbikpO1xuICAgICAgICBpZiAob3B0aW9ucy5tYXg8PW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgICAgICBicmVhaztcbiAgICB9O1xuICAgIHJldHVybjtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgUmVwb3J0IH0gPSByZXF1aXJlICggJy4vcmVwb3J0LmpzJyApO1xuY29uc3Qgbm9vcCA9ICgpPT57fTtcblxuY2xhc3MgREJDIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5fcHJlICAgID0gbm9vcDtcbiAgICAgICAgdGhpcy5fcG9zdCAgID0gbm9vcDtcbiAgICAgICAgdGhpcy5fb25mYWlsID0gcmVwb3J0ID0+IHJlcG9ydC5nZXRUaHJvd24oKTtcbiAgICAgICAgdGhpcy5fb25wb3N0ID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBwb3N0KGNvZGUpIHtcbiAgICAgICAgaWYgKGNvZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Bvc3Q7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiggdHlwZW9mIGNvZGUgIT09ICdmdW5jdGlvbicgKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncG9zdC1jb25kaXRpb24gbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgICAgICB0aGlzLl9wb3N0ID0gY29kZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuICAgIHByZShjb2RlKSB7XG4gICAgICAgIGlmIChjb2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcmU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiggdHlwZW9mIGNvZGUgIT09ICdmdW5jdGlvbicgKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncHJlLWNvbmRpdGlvbiBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICAgIHRoaXMuX3ByZSA9IGNvZGU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbiAgICBkZWNvcmF0ZShvcmlnKSB7XG4gICAgICAgIC8vIGNsb3NlIGFyb3VuZCB0aGVzZSB2YXJzXG4gICAgICAgIGNvbnN0IHByZSAgICA9IHRoaXMuX3ByZTtcbiAgICAgICAgY29uc3QgcG9zdCAgID0gdGhpcy5fcG9zdDtcbiAgICAgICAgY29uc3Qgb25mYWlsID0gdGhpcy5fb25mYWlsO1xuICAgICAgICBjb25zdCBvbnBvc3QgPSB0aGlzLl9vbnBvc3QgfHwgdGhpcy5fb25mYWlsO1xuXG4gICAgICAgIC8vIG5vIGFycm93IGZ1bmN0aW9uIHRvIGdldCBjb3JyZWN0ICd0aGlzJyBvYmplY3RcbiAgICAgICAgY29uc3QgY29kZSA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICAgICAgICBjb25zdCByUHJlID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICAgICAgcHJlLmFwcGx5KCB0aGlzLCBbIHJQcmUsIHVuZGVmaW5lZCwgLi4uYXJncyBdICk7XG4gICAgICAgICAgICBpZighclByZS5nZXRQYXNzKCkpXG4gICAgICAgICAgICAgICAgb25mYWlsKHJQcmUuc2V0VGl0bGUoJ3ByZS1jb25kaXRpb24gZmFpbGVkJykpO1xuICAgICAgICAgICAgY29uc3QgcmV0ID0gb3JpZy5hcHBseSggdGhpcywgYXJncyApO1xuICAgICAgICAgICAgY29uc3QgclBvc3QgPSBuZXcgUmVwb3J0KCk7XG4gICAgICAgICAgICBwb3N0LmFwcGx5KCB0aGlzLCBbIHJQb3N0LCByZXQsIC4uLmFyZ3MgXSApO1xuICAgICAgICAgICAgaWYoIXJQb3N0LmdldFBhc3MoKSlcbiAgICAgICAgICAgICAgICBvbnBvc3QoclBvc3Quc2V0VGl0bGUoJ3Bvc3QtY29uZGl0aW9uIGZhaWxlZCcpKTtcbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb2RlLm9yaWcgPSBvcmlnO1xuICAgICAgICBjb2RlLnByZSAgPSBwcmU7XG4gICAgICAgIGNvZGUucG9zdCA9IHBvc3Q7XG5cbiAgICAgICAgcmV0dXJuIGNvZGU7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgREJDIH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgY2FsbGVySW5mbywgZXhwbGFpbiwgbWFrZUVycm9yIH0gPSByZXF1aXJlKCAnLi91dGlsLmpzJyApO1xuXG4vKipcbiAqIEBwdWJsaWNcbiAqIEBjbGFzc2Rlc2NcbiAqIFRoZSBjb3JlIG9mIHRoZSByZWZ1dGUgbGlicmFyeSwgdGhlIHJlcG9ydCBvYmplY3QgY29udGFpbnMgaW5mb1xuICogYWJvdXQgcGFzc2luZyBhbmQgZmFpbGluZyBjb25kaXRpb25zLlxuICovXG5jbGFzcyBSZXBvcnQge1xuICAgIC8vIHNldHVwXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuX2NvdW50ICAgICA9IDA7XG4gICAgICAgIHRoaXMuX2ZhaWxDb3VudCA9IDA7XG4gICAgICAgIHRoaXMuX2Rlc2NyICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9ldmlkZW5jZSAgPSBbXTtcbiAgICAgICAgdGhpcy5fd2hlcmUgICAgID0gW107XG4gICAgICAgIHRoaXMuX2NvbmROYW1lICA9IFtdO1xuICAgICAgICB0aGlzLl9pbmZvICAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fbmVzdGVkICAgID0gW107XG4gICAgICAgIHRoaXMuX2RvbmUgICAgICA9IGZhbHNlO1xuICAgICAgICAvLyBUT0RPIGFkZCBjYWxsZXIgaW5mbyBhYm91dCB0aGUgcmVwb3J0IGl0c2VsZlxuICAgIH1cblxuICAgIC8vIHNldHVwIC0gbXVzdCBiZSBjaGFpbmFibGVcbiAgICBzZXRUaXRsZShzdHIpIHtcbiAgICAgICAgdGhpcy5fdGl0bGUgPSBzdHI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvLyBydW5uaW5nXG4gICAgcnVuKC4uLmFyZ3MpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RvbmUpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIFJlcG9ydCcpO1xuICAgICAgICBjb25zdCBibG9jayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhc3QgYXJndW1lbnQgb2YgcnVuKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLCBub3QgJyt0eXBlb2YoYmxvY2spKTtcbiAgICAgICAgYmxvY2soIHRoaXMsIC4uLmFyZ3MgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gSW4gdGhlb3J5LCBoYXZpbmcgY29uc3Qgbj1uZXh0KCk7IHNldFJlc3VsdChuLiAuLi4pXG4gICAgLy8gc2hvdWxkIGFsbG93IGZvciBhc3luYyBjb25kaXRpb25zIGluIHRoZSBmdXR1cmVcbiAgICAvLyBpZiBhdCBhbGwgcG9zc2libGUgd2l0aG91dCBncmVhdCBzYWNyaWZpY2VzLlxuICAgIG5leHQoKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnQXR0ZW1wdCB0byBtb2RpZnkgYSBmaW5pc2hlZCBSZXBvcnQnKTtcbiAgICAgICAgcmV0dXJuICsrdGhpcy5fY291bnQ7XG4gICAgfVxuXG4gICAgc2V0UmVzdWx0IChuLCBldmlkZW5jZSwgZGVzY3IsIGNvbmROYW1lKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnQXR0ZW1wdCB0byBtb2RpZnkgYSBmaW5pc2hlZCBSZXBvcnQnKTtcbiAgICAgICAgaWYgKG4gPiB0aGlzLl9jb3VudClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciAoJ0F0dGVtcHQgdG8gc2V0IGNvbmRpdGlvbiBiZXlvbmQgY2hlY2sgY291bnQnKTtcbiAgICAgICAgaWYgKGRlc2NyKVxuICAgICAgICAgICAgdGhpcy5fZGVzY3Jbbl0gPSBkZXNjcjtcbiAgICAgICAgLy8gcGFzcyAtIHJldHVybiBBU0FQXG4gICAgICAgIGlmICghZXZpZGVuY2UpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgLy8gbmVzdGVkIHJlcG9ydCBuZWVkcyBzcGVjaWFsIGhhbmRsaW5nXG4gICAgICAgIGlmIChldmlkZW5jZSBpbnN0YW5jZW9mIFJlcG9ydCkge1xuICAgICAgICAgICAgdGhpcy5fbmVzdGVkW25dID0gZXZpZGVuY2U7XG4gICAgICAgICAgICBpZiAoZXZpZGVuY2UuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGV2aWRlbmNlID0gW107XG4gICAgICAgIH1cblxuICAgICAgICAvLyBsaXN0aWZ5ICYgc3RyaW5naWZ5IGV2aWRlbmNlLCBzbyB0aGF0IGl0IGRvZXNuJ3QgY2hhbmdlIHBvc3QtZmFjdHVtXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShldmlkZW5jZSkpXG4gICAgICAgICAgICBldmlkZW5jZSA9IFsgZXZpZGVuY2UgXTtcbiAgICAgICAgdGhpcy5fZXZpZGVuY2Vbbl0gPSBldmlkZW5jZS5tYXAoIHg9Pl9leHBsYWluKHgsIEluZmluaXR5KSApO1xuICAgICAgICB0aGlzLl93aGVyZVtuXSAgICA9IGNhbGxlckluZm8oMik7XG4gICAgICAgIHRoaXMuX2NvbmROYW1lW25dID0gY29uZE5hbWU7XG4gICAgICAgIHRoaXMuX2ZhaWxDb3VudCsrO1xuXG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBBcHBlbmQgYW4gaW5mb3JtYXRpb25hbCBtZXNzYWdlIHRvIHRoZSByZXBvcnQuXG4gICAgICogTm9uLXN0cmluZyB2YWx1ZXMgd2lsbCBiZSBzdHJpbmdpZmllZCB2aWEgZXhwbGFpbigpLlxuICAgICAqIEBwYXJhbSB7QW55fSBtZXNzYWdlXG4gICAgICogQHJldHVybnMge1JlcG9ydH0gY2hhaW5hYmxlXG4gICAgICovXG4gICAgaW5mbyggLi4ubWVzc2FnZSApIHtcbiAgICAgICAgaWYgKHRoaXMuX2RvbmUpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIFJlcG9ydCcpO1xuICAgICAgICBpZiAoIXRoaXMuX2luZm9bdGhpcy5fY291bnRdKVxuICAgICAgICAgICAgdGhpcy5faW5mb1t0aGlzLl9jb3VudF0gPSBbXTtcbiAgICAgICAgdGhpcy5faW5mb1t0aGlzLl9jb3VudF0ucHVzaCggbWVzc2FnZS5tYXAoIHM9Pl9leHBsYWluKHMpICkuam9pbihcIiBcIikgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgc3RvcCgpIHtcbiAgICAgICAgdGhpcy5fZG9uZSA9IHRydWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIHF1ZXJ5aW5nXG4gICAgZ2V0VGl0bGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90aXRsZTsgLy9KRllJXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqICAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0RG9uZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RvbmU7IC8vIGlzIGl0IGV2ZW4gbmVlZGVkP1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgV2l0aG91dCBhcmd1bWVudCByZXR1cm5zIHdoZXRoZXIgdGhlIGNvbnRyYWN0IHdhcyBmdWxmaWxsZWQuXG4gICAgICogICBBcyBhIHNwZWNpYWwgY2FzZSwgaWYgbm8gY2hlY2tzIHdlcmUgcnVuIGFuZCB0aGUgY29udHJhY3QgaXMgZmluaXNoZWQsXG4gICAgICogICByZXR1cm5zIGZhbHNlLCBhcyBpbiBcInNvbWVvbmUgbXVzdCBoYXZlIGZvcmdvdHRlbiB0byBleGVjdXRlXG4gICAgICogICBwbGFubmVkIGNoZWNrcy4gVXNlIHBhc3MoKSBpZiBubyBjaGVja3MgYXJlIHBsYW5uZWQuXG4gICAgICpcbiAgICAgKiAgIElmIGEgcGFyYW1ldGVyIGlzIGdpdmVuLCByZXR1cm4gdGhlIHN0YXR1cyBvZiBuLXRoIGNoZWNrIGluc3RlYWQuXG4gICAgICogICBAcGFyYW0ge2ludGVnZXJ9IG5cbiAgICAgKiAgIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGdldFBhc3Mobikge1xuICAgICAgICBpZiAobiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ZhaWxDb3VudCA9PT0gMCAmJiAoIXRoaXMuX2RvbmUgfHwgdGhpcy5fY291bnQgPiAwKTtcbiAgICAgICAgcmV0dXJuIChuID4gMCAmJiBuIDw9IHRoaXMuX2NvdW50KSA/ICF0aGlzLl9ldmlkZW5jZVtuXSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgcGVyZm9ybWVkLlxuICAgICAqICAgQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBXaGV0aGVyIHRoZSBsYXN0IGNoZWNrIHdhcyBhIHN1Y2Nlc3MuXG4gICAgICogIFRoaXMgaXMganVzdCBhIHNob3J0Y3V0IGZvciBmb28uZ2V0RGV0YWlscyhmb28uZ2V0Q291bnQpLnBhc3NcbiAgICAgKiAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgbGFzdCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50ID8gIXRoaXMuX2V2aWRlbmNlW3RoaXMuX2NvdW50XSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgZmFpbGluZy5cbiAgICAgKiAgIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0RmFpbENvdW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZmFpbENvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgUmV0dXJuIGEgc3RyaW5nIG9mIGZhaWxpbmcvcGFzc2luZyBjaGVja3MuXG4gICAgICogICBUaGlzIG1heSBiZSB1c2VmdWwgZm9yIHZhbGlkYXRpbmcgY3VzdG9tIGNvbmRpdGlvbnMuXG4gICAgICogICBDb25zZWN1dGl2ZSBwYXNzaW5nIGNoZWNrYSBhcmUgcmVwcmVzZW50ZWQgYnkgbnVtYmVycy5cbiAgICAgKiAgIEEgY2FwaXRhbCBsZXR0ZXIgaW4gdGhlIHN0cmluZyByZXByZXNlbnRzIGZhaWx1cmUuXG4gICAgICogICBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIHBhc3NpbmcgY2hlY2tzXG4gICAgICogICBcInIoMTApXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBjaGVja3Mgd2l0aCAxIGZhaWx1cmUgaW4gdGhlIG1pZGRsZVxuICAgICAqICAgXCJyKDUsTiw0KVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgY2hlY2tzIGluY2x1ZGluZyBhIG5lc3RlZCBjb250cmFjdFxuICAgICAqICAgXCJyKDMscigxLE4pLDYpXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyBubyBjaGVja3Mgd2VyZSBydW4gLSBhdXRvLWZhaWxcbiAgICAgKiAgIFwicihaKVwiXG4gICAgICovXG4gICAgZ2V0R2hvc3QoKSB7XG4gICAgICAgIGNvbnN0IGdob3N0ID0gW107XG4gICAgICAgIGxldCBzdHJlYWsgPSAwO1xuICAgICAgICBmb3IgKGxldCBpPTE7IGkgPD0gdGhpcy5fY291bnQ7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2V2aWRlbmNlW2ldIHx8IHRoaXMuX25lc3RlZFtpXSkge1xuICAgICAgICAgICAgICAgIGlmIChzdHJlYWspIGdob3N0LnB1c2goc3RyZWFrKTtcbiAgICAgICAgICAgICAgICBzdHJlYWsgPSAwO1xuICAgICAgICAgICAgICAgIGdob3N0LnB1c2goIHRoaXMuX25lc3RlZFtpXSA/IHRoaXMuX25lc3RlZFtpXS5nZXRHaG9zdCgpIDogJ04nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RyZWFrKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0cmVhaykgZ2hvc3QucHVzaChzdHJlYWspO1xuICAgICAgICBpZiAoZ2hvc3QubGVuZ3RoID09PSAwICYmICF0aGlzLmdldFBhc3MoKSlcbiAgICAgICAgICAgIGdob3N0LnB1c2goJ1onKTtcbiAgICAgICAgcmV0dXJuICdyKCcrZ2hvc3Quam9pbignLCcpKycpJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgcmV0dXJucyBhIHBsYWluIHNlcmlhbGl6YWJsZSBvYmplY3RcbiAgICAgKiAgQHJldHVybnMge09iamVjdH1cbiAgICAgKi9cbiAgICB0b0pTT04oKSB7XG4gICAgICAgIGNvbnN0IG4gPSB0aGlzLmdldENvdW50KCk7XG4gICAgICAgIGNvbnN0IGRldGFpbHMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGk8PW47IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuZ2V0RGV0YWlscyhpKTtcbiAgICAgICAgICAgIC8vIHN0cmlwIGV4dHJhIGtleXNcbiAgICAgICAgICAgIGZvciggbGV0IGtleSBpbiBub2RlICkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlW2tleV0gPT09IHVuZGVmaW5lZCB8fCAoQXJyYXkuaXNBcnJheShub2RlW2tleV0pICYmIG5vZGVba2V5XS5sZW5ndGggPT09IDApKVxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbm9kZVtrZXldO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChub2RlKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHBhc3M6ICB0aGlzLmdldFBhc3MoKSxcbiAgICAgICAgICAgIGNvdW50OiB0aGlzLmdldENvdW50KCksXG4gICAgICAgICAgICB0aXRsZTogdGhpcy5nZXRUaXRsZSgpLFxuICAgICAgICAgICAgZGV0YWlscyxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VGFwKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIFJldHVybnMgcmVwb3J0IHN0cmluZ2lmaWVkIGFzIFRBUCBmb3JtYXRcbiAgICAgKiAgQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXRUYXAobikge1xuICAgICAgICBjb25zdCB0YXAgPSBuID09PSB1bmRlZmluZWQgPyB0aGlzLmdldFRhcExpbmVzKCkgOiB0aGlzLmdldFRhcEVudHJ5KG4pO1xuICAgICAgICB0YXAucHVzaCgnJyk7XG4gICAgICAgIHJldHVybiB0YXAuam9pbignXFxuJyk7XG4gICAgfVxuXG4gICAgZ2V0VGFwTGluZXMobikge1xuICAgICAgICAvLyBUQVAgZm9yIG5vdywgdXNlIGFub3RoZXIgZm9ybWF0IGxhdGVyIGJlY2F1c2UgXCJwZXJsIGlzIHNjYXJ5XCJcbiAgICAgICAgY29uc3QgdGFwID0gWyAnMS4uJyt0aGlzLl9jb3VudCBdO1xuICAgICAgICBpZiAodGhpcy5nZXRUaXRsZSgpKVxuICAgICAgICAgICAgdGFwLnB1c2goJyMgJyt0aGlzLmdldFRpdGxlKCkpO1xuICAgICAgICAvLyBUT0RPIGluZm9bMF1cbiAgICAgICAgY29uc3QgcHJlZmFjZSA9IHRoaXMuZ2V0RGV0YWlscygwKTtcbiAgICAgICAgdGFwLnB1c2goIC4uLnByZWZhY2UuaW5mby5tYXAoIHMgPT4gJyMgJytzICkgKTtcbiAgICAgICAgZm9yKCBsZXQgaSA9IDE7IGkgPD0gdGhpcy5fY291bnQ7IGkrKyApIFxuICAgICAgICAgICAgdGFwLnB1c2goIC4uLiB0aGlzLmdldFRhcEVudHJ5KGkpICk7XG4gICAgICAgIGlmICghdGhpcy5nZXRQYXNzKCkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmdldENvdW50KCkgPiAwKVxuICAgICAgICAgICAgICAgIHRhcC5wdXNoKCcjIEZhaWxlZCAnK3RoaXMuZ2V0RmFpbENvdW50KCkrJy8nK3RoaXMuZ2V0Q291bnQoKSsgJyBjb25kaXRpb25zJyk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgdGFwLnB1c2goJyMgTm8gY2hlY2tzIHdlcmUgcnVuLCBjb25zaWRlciB1c2luZyBwYXNzKCkgaWYgdGhhdFxcJ3MgZGVsaWJlcmF0ZScpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdGFwO1xuICAgIH1cblxuICAgIGdldFRhcEVudHJ5KG4pIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHR5cGVvZihuKSA9PT0gJ29iamVjdCcgPyBuIDogdGhpcy5nZXREZXRhaWxzKG4pO1xuICAgICAgICBjb25zdCB0YXAgPSBbXTtcbiAgICAgICAgaWYgKGRhdGEubmVzdGVkKSB7XG4gICAgICAgICAgICB0YXAucHVzaCggJyMgc3ViY29udHJhY3Q6JysoZGF0YS5uYW1lPycgJytkYXRhLm5hbWU6JycpICk7XG4gICAgICAgICAgICB0YXAucHVzaCggLi4uIGRhdGEubmVzdGVkLmdldFRhcExpbmVzKCkubWFwKCBzID0+ICcgICAgJytzICkpO1xuICAgICAgICB9XG4gICAgICAgIHRhcC5wdXNoKChkYXRhLnBhc3M/Jyc6J25vdCAnKSArICdvayAnICsgZGF0YS5uXG4gICAgICAgICAgICArIChkYXRhLm5hbWUgPyAnIC0gJytkYXRhLm5hbWUgOiAnJykpO1xuICAgICAgICBpZiAoIWRhdGEucGFzcylcbiAgICAgICAgICAgIHRhcC5wdXNoKCcjIENvbmRpdGlvbicrKGRhdGEuY29uZCA/ICcgJytkYXRhLmNvbmQgOiAnJykrJyBmYWlsZWQgYXQgJytkYXRhLndoZXJlKTtcbiAgICAgICAgdGFwLnB1c2goLi4uZGF0YS5ldmlkZW5jZS5tYXAocz0+JyMgJytzKSk7XG4gICAgICAgIHRhcC5wdXNoKC4uLmRhdGEuaW5mby5tYXAocz0+JyMgJytzKSk7XG4gICAgICAgIHJldHVybiB0YXA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBSZXR1cm5zIGRldGFpbGVkIHJlcG9ydCBvbiBhIHNwZWNpZmljIGNoZWNrXG4gICAgICogICBAcGFyYW0ge2ludGVnZXJ9IG4gLSBjaGVjayBudW1iZXIsIG11c3QgYmUgPD0gZ2V0Q291bnQoKVxuICAgICAqICAgQHJldHVybnMge29iamVjdH1cbiAgICAgKi9cbiAgICBnZXREZXRhaWxzKG4pIHtcbiAgICAgICAgLy8gVE9ETyB2YWxpZGF0ZSBuXG5cbiAgICAgICAgLy8gdWdseSBidXQgd2hhdCBjYW4gSSBkb1xuICAgICAgICBpZiAobiA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuOiAgICAwLFxuICAgICAgICAgICAgICAgIGluZm86IHRoaXMuX2luZm9bMF0gfHwgW10sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGV2aWRlbmNlID0gdGhpcy5fZXZpZGVuY2Vbbl07XG4gICAgICAgIGlmIChldmlkZW5jZSAmJiAhQXJyYXkuaXNBcnJheShldmlkZW5jZSkpXG4gICAgICAgICAgICBldmlkZW5jZSA9IFtldmlkZW5jZV07XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG46ICAgICAgbixcbiAgICAgICAgICAgIG5hbWU6ICAgdGhpcy5fZGVzY3Jbbl0gfHwgJycsXG4gICAgICAgICAgICBwYXNzOiAgICFldmlkZW5jZSxcbiAgICAgICAgICAgIGV2aWRlbmNlOiBldmlkZW5jZSB8fCBbXSxcbiAgICAgICAgICAgIHdoZXJlOiAgdGhpcy5fd2hlcmVbbl0sXG4gICAgICAgICAgICBjb25kOiAgIHRoaXMuX2NvbmROYW1lW25dLFxuICAgICAgICAgICAgaW5mbzogICB0aGlzLl9pbmZvW25dIHx8IFtdLFxuICAgICAgICAgICAgbmVzdGVkOiB0aGlzLl9uZXN0ZWRbbl0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIENvbnZlcnQgcmVwb3J0IHRvIGFuIEFzc2VydGlvbkVycm9yIChpZiBhdmFpbGFibGUpIG9yIGp1c3QgRXJyb3IuXG4gICAgICogIEBwYXJhbSB7bnVtYmVyfSBbbl0gTnVtYmVyIG9mIGNoZWNrIHRvIGNvbnZlcnQgdG8gZXhjZXB0aW9uLlxuICAgICAqICBDdXJyZW50IGVycm9yIGZvcm1hdCBpcyBUQVAsIHRoaXMgbWF5IGNoYW5nZSBpbiB0aGUgZnV0dXJlLlxuICAgICAqICBJZiAwIG9yIHVuc3BlY2lmaWVkLCBjb252ZXJ0IHRoZSB3aG9sZSByZXBvcnQuXG4gICAgICogIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc11cbiAgICAgKiAgQHBhcmFtIHtib29sZWFufSBvcHRpb25zLnBhc3MgSWYgZmFsc2UgKHRoZSBkZWZhdWx0KSwgcmV0dXJuIG5vdGhpbmdcbiAgICAgKiAgaWYgdGhlIHJlcG9ydCBpcyBwYXNzaW5nLlxuICAgICAqICBAcmV0dXJucyB7RXJyb3J8dW5kZWZpbmVkfVxuICAgICAqL1xuICAgIGdldEVycm9yKG4sIG9wdGlvbnM9e30pIHtcbiAgICAgICAgaWYgKCFuKSB7XG4gICAgICAgICAgICAvLyBubyBlbnRyeSBnaXZlblxuICAgICAgICAgICAgaWYgKCFvcHRpb25zLnBhc3MgJiYgdGhpcy5nZXRQYXNzKCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICByZXR1cm4gbWFrZUVycm9yKHtcbiAgICAgICAgICAgICAgICBhY3R1YWw6ICAgdGhpcy5nZXRUYXAoKSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogJycsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogIHRoaXMuZ2V0VGl0bGUoKSxcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ2NvbnRyYWN0JyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGRhdGEgPSB0eXBlb2YgbiA9PT0gJ29iamVjdCcgPyBuIDogdGhpcy5nZXREZXRhaWxzKG4pO1xuXG4gICAgICAgIC8vIG5vIGVycm9yXG4gICAgICAgIGlmICghb3B0aW9ucy5wYXNzICYmIGRhdGEucGFzcylcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICByZXR1cm4gbWFrZUVycm9yKHtcbiAgICAgICAgICAgIGFjdHVhbDogICB0aGlzLmdldFRhcEVudHJ5KGRhdGEpLmpvaW4oJ1xcbicpLFxuICAgICAgICAgICAgZXhwZWN0ZWQ6ICcnLFxuICAgICAgICAgICAgbWVzc2FnZTogIGRhdGEubmFtZSxcbiAgICAgICAgICAgIG9wZXJhdG9yOiBkYXRhLmNvbmQsXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGdldFRocm93bihuLCBvcHRpb25zPXt9KSB7XG4gICAgICAgIC8vIFRPRE8gcmVuYW1lIHRvIGp1c3QgdGhyb3c/XG4gICAgICAgIGNvbnN0IGVyciA9IHRoaXMuZ2V0RXJyb3Iobiwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgfVxufVxuXG4vLyB0aGlzIGlzIGZvciBzdHVmZiBsaWtlIGBvYmplY3QgZm9vID0ge1wiZm9vXCI6NDJ9YFxuLy8gd2UgZG9uJ3Qgd2FudCB0aGUgZXhwbGFuYXRpb24gdG8gYmUgcXVvdGVkIVxuZnVuY3Rpb24gX2V4cGxhaW4oIGl0ZW0sIGRlcHRoICkge1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycgKVxuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICByZXR1cm4gZXhwbGFpbiggaXRlbSwgZGVwdGggKTtcbn07XG5cblJlcG9ydC5wcm90b3R5cGUuZXhwbGFpbiA9IGV4cGxhaW47IC8vIGFsc28gbWFrZSBhdmFpbGFibGUgdmlhIHJlcG9ydFxuXG4vKipcbiAqICBAZGVzYyBDcmVhdGUgbmV3IGNoZWNrIG1ldGhvZCBhdmFpbGFibGUgdmlhIGFsbCBSZXBvcnQgaW5zdGFuY2VzXG4gKiAgQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSBvZiB0aGUgbmV3IGNvbmRpdGlvbi5cbiAqICBNdXN0IG5vdCBiZSBwcmVzZW50IGluIFJlcG9ydCBhbHJlYWR5LCBhbmQgc2hvdWxkIE5PVCBzdGFydCB3aXRoXG4gKiAgZ2V0Li4uLCBzZXQuLi4sIG9yIGFkZC4uLiAodGhlc2UgYXJlIHJlc2VydmVkIGZvciBSZXBvcnQgaXRzZWxmKVxuICogIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIENvbmZpZ3VyaW5nIHRoZSBjaGVjaydzIGhhbmRsaW5nIG9mIGFyZ3VtZW50c1xuICogIEBwYXJhbSB7aW50ZWdlcn0gb3B0aW9ucy5hcmdzIFRoZSByZXF1aXJlZCBudW1iZXIgb2YgYXJndW1lbnRzXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBbb3B0aW9ucy5taW5BcmdzXSBNaW5pbXVtIG51bWJlciBvZiBhcmd1bWVudCAoZGVmYXVsdHMgdG8gYXJncylcbiAqICBAcGFyYW0ge2ludGVnZXJ9IFtvcHRpb25zLm1heEFyZ3NdIE1heGltdW0gbnVtYmVyIG9mIGFyZ3VtZW50IChkZWZhdWx0cyB0byBhcmdzKVxuICogIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuaGFzT3B0aW9uc10gSWYgdHJ1ZSwgYW4gb3B0aW9uYWwgb2JqZWN0XG5jYW4gYmUgc3VwcGxpZWQgYXMgbGFzdCBhcmd1bWVudC4gSXQgd29uJ3QgaW50ZXJmZXJlIHdpdGggZGVzY3JpcHRpb24uXG4gKiAgQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5mdW5dIFRoZSBsYXN0IGFyZ3VtZW50IGlzIGEgY2FsbGJhY2tcbiAqICBAcGFyYW0ge0Z1bmN0aW9ufSBpbXBsZW1lbnRhdGlvbiAtIGEgY2FsbGJhY2sgdGhhdCB0YWtlcyB7YXJnc30gYXJndW1lbnRzXG4gKiAgYW5kIHJldHVybnMgYSBmYWxzZXkgdmFsdWUgaWYgY29uZGl0aW9uIHBhc3Nlc1xuICogIChcIm5vdGhpbmcgdG8gc2VlIGhlcmUsIG1vdmUgYWxvbmdcIiksXG4gKiAgb3IgZXZpZGVuY2UgaWYgaXQgZmFpbHNcbiAqICAoZS5nLiB0eXBpY2FsbHkgYSBnb3QvZXhwZWN0ZWQgZGlmZikuXG4gKi9cbmNvbnN0IHNlZW4gPSBuZXcgU2V0KCk7XG5mdW5jdGlvbiBhZGRDb25kaXRpb24gKG5hbWUsIG9wdGlvbnMsIGltcGwpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiBuYW1lIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXihffGdldFtfQS1aXXxzZXRbX0EtWl0pLykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uIG5hbWUgbXVzdCBub3Qgc3RhcnQgd2l0aCBnZXRfLCBzZXRfLCBvciBfJyk7XG4gICAgLy8gVE9ETyBtdXN0IGRvIHNvbWV0aGluZyBhYm91dCBuYW1lIGNsYXNoZXMsIGJ1dCBsYXRlclxuICAgIC8vIGJlY2F1c2UgZXZhbCBpbiBicm93c2VyIG1heSAoa2luZCBvZiBsZWdpbWl0ZWx5KSBvdmVycmlkZSBjb25kaXRpb25zXG4gICAgaWYgKCFzZWVuLmhhcyhuYW1lKSAmJiBSZXBvcnQucHJvdG90eXBlW25hbWVdKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBhbHJlYWR5IGV4aXN0cyBpbiBSZXBvcnQ6ICcrbmFtZSk7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSAnb2JqZWN0JylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdiYWQgb3B0aW9ucycpO1xuICAgIGlmICh0eXBlb2YgaW1wbCAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdiYWQgaW1wbGVtZW50YXRpb24nKTtcblxuICAgIGNvbnN0IG1pbkFyZ3MgICAgPSBvcHRpb25zLm1pbkFyZ3MgfHwgb3B0aW9ucy5hcmdzO1xuICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihtaW5BcmdzKSB8fCBtaW5BcmdzIDwgMClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdhcmdzL21pbkFyZ3MgbXVzdCBiZSBub25uZWdhdGl2ZSBpbnRlZ2VyJyk7XG4gICAgY29uc3QgbWF4QXJncyAgICA9IG9wdGlvbnMubWF4QXJncyB8fCBvcHRpb25zLmFyZ3MgfHwgSW5maW5pdHk7XG4gICAgaWYgKG1heEFyZ3MgIT09IEluZmluaXR5ICYmICghTnVtYmVyLmlzSW50ZWdlcihtaW5BcmdzKSB8fCBtYXhBcmdzIDwgbWluQXJncykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbWF4QXJncyBtdXN0IGJlIGludGVnZXIgYW5kIGdyZWF0ZXIgdGhhbiBtaW5BcmdzLCBvciBJbmZpbml0eScpO1xuICAgIGNvbnN0IGRlc2NyRmlyc3QgICAgPSBvcHRpb25zLmRlc2NyRmlyc3QgfHwgb3B0aW9ucy5mdW4gfHwgbWF4QXJncyA+IDEwO1xuICAgIGNvbnN0IGhhc09wdGlvbnMgICAgPSAhIW9wdGlvbnMuaGFzT3B0aW9ucztcbiAgICBjb25zdCBtYXhBcmdzUmVhbCAgID0gbWF4QXJncyArIChoYXNPcHRpb25zID8gMSA6IDApO1xuXG4gICAgLy8gVE9ETyBhbGVydCB1bmtub3duIG9wdGlvbnNcblxuICAgIC8vIFRPRE8gdGhpcyBjb2RlIGlzIGNsdXR0ZXJlZCwgcmV3cml0ZSBcbiAgICBjb25zdCBjb2RlID0gZnVuY3Rpb24oLi4uYXJncykge1xuICAgICAgICBjb25zdCBkZXNjciA9IGRlc2NyRmlyc3RcbiAgICAgICAgICAgID8gYXJncy5zaGlmdCgpXG4gICAgICAgICAgICA6ICggKGFyZ3MubGVuZ3RoID4gbWF4QXJncyAmJiB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aC0xXSA9PT0gJ3N0cmluZycpID8gYXJncy5wb3AoKSA6IHVuZGVmaW5lZCk7XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IG1heEFyZ3NSZWFsIHx8IGFyZ3MubGVuZ3RoIDwgbWluQXJncylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uICcrbmFtZSsnIG11c3QgaGF2ZSAnK21pbkFyZ3MrJy4uJyttYXhBcmdzUmVhbCsnIGFyZ3VtZW50cyAnKTsgLy8gVE9ET1xuXG4gICAgICAgIGNvbnN0IG4gPSB0aGlzLm5leHQoKTsgLy8gVE9ETyBjYWxsIGl0IGFkdmFuY2UoKSBvciBzbXRoLlxuICAgICAgICBjb25zdCBldmlkZW5jZSA9IGltcGwoIC4uLmFyZ3MgKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0UmVzdWx0KCBuLCBldmlkZW5jZSwgZGVzY3IsIG5hbWUgKTtcbiAgICB9O1xuXG4gICAgc2Vlbi5hZGQobmFtZSk7XG4gICAgUmVwb3J0LnByb3RvdHlwZVtuYW1lXSA9IGNvZGU7XG59XG5cbi8qKlxuICogICBAZnVuY3Rpb24gY2hlY2tcbiAqICAgQG1lbWJlck9mIFJlcG9ydFxuICogICBAcGFyYW0gZXZpZGVuY2UgSWYgZmFsc2UsIHRoZSBjaGVjayBpcyBhc3N1bWVkIHRvIHBhc3MuXG4gKiAgIEEgdHJ1ZSB2YWx1ZSBtZWFucyB0aGUgY2hlY2sgZmFpbGVkLlxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfSBcbiAqL1xuXG4vLyB0aGVzZSBjb25kaXRpb25zIGNvdWxkIGJlIHVuZGVyIHRoZSBjb25kaXRpb24gbGlicmFyeVxuLy8gYnV0IHdlJ2xsIG5lZWQgdGhlbSB0byB2ZXJpZnkgdGhlIFJlcG9ydCBjbGFzcyBpdHNlbGYuXG5cbmFkZENvbmRpdGlvbihcbiAgICAnY2hlY2snLFxuICAgIHthcmdzOjF9LFxuICAgIHg9Pnhcbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ3Bhc3MnLFxuICAgIHthcmdzOjB9LFxuICAgICgpPT4wXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdmYWlsJyxcbiAgICB7YXJnczowfSxcbiAgICAoKT0+J2ZhaWxlZCBkZWxpYmVyYXRlbHknXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdlcXVhbCcsXG4gICAge2FyZ3M6Mn0sXG4gICAgKGEsYikgPT4gYSA9PT0gYiA/IDAgOiBbICctICcrZXhwbGFpbihhKSwgJysgJyArIGV4cGxhaW4oYikgXVxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnbWF0Y2gnLFxuICAgIHthcmdzOjJ9LFxuICAgIChhLHJleCkgPT4gKCcnK2EpLm1hdGNoKHJleCkgPyAwIDogW1xuICAgICAgICAnU3RyaW5nICAgICAgICAgOiAnK2EsXG4gICAgICAgICdEb2VzIG5vdCBtYXRjaCA6ICcrcmV4XG4gICAgXVxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnbmVzdGVkJyxcbiAgICB7ZnVuOjEsbWluQXJnczoxfSxcbiAgICAoLi4uYXJncykgPT4gbmV3IFJlcG9ydCgpLnJ1biguLi5hcmdzKS5zdG9wKClcbik7XG5cbi8qKlxuICogICBAZXhwb3J0cyBSZXBvcnRcbiAqICAgQGV4cG9ydHMgcmVwb3J0XG4gKiAgIEBleHBvcnRzIGFkZENvbmRpdGlvblxuICogICBAZXhwb3J0cyBleHBsYWluXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7IFJlcG9ydCwgYWRkQ29uZGl0aW9uLCBleHBsYWluIH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgQW5ub3RhdGVkU2V0IH0gPSByZXF1aXJlKCAnLi91dGlsL2Fubm90YXRlZC1zZXQuanMnICk7XG5cbi8qIERldGVybWluZSBuLXRoIGNhbGxlciB1cCB0aGUgc3RhY2sgKi9cbi8qIEluc3BpcmVkIGJ5IFBlcmwncyBDYXJwIG1vZHVsZSAqL1xuY29uc3QgaW5TdGFjayA9IC8oW146XFxzKCldKzpcXGQrKD86OlxcZCspPylcXFcqKFxcbnwkKS9nO1xuXG4vKipcbiAqICBAcHVibGljXG4gKiAgQGZ1bmN0aW9uXG4gKiAgQGRlc2MgUmV0dXJucyBzb3VyY2UgcG9zaXRpb24gbiBmcmFtZXMgdXAgdGhlIHN0YWNrXG4gKiAgQGV4YW1wbGVcbiAqICBcIi9mb28vYmFyLmpzOjI1OjExXCJcbiAqICBAcGFyYW0ge2ludGVnZXJ9IGRlcHRoIEhvdyBtYW55IGZyYW1lcyB0byBza2lwXG4gKiAgQHJldHVybnMge3N0cmluZ30gc291cmNlIGZpbGUsIGxpbmUsIGFuZCBjb2x1bW4sIHNlcGFyYXRlZCBieSBjb2xvbi5cbiAqL1xuZnVuY3Rpb24gY2FsbGVySW5mbyhuKSB7XG4gICAgLyogYSB0ZXJyaWJsZSByZXggdGhhdCBiYXNpY2FsbHkgc2VhcmNoZXMgZm9yIGZpbGUuanM6bm5uOm5ubiBzZXZlcmFsIHRpbWVzKi9cbiAgICByZXR1cm4gKG5ldyBFcnJvcigpLnN0YWNrLm1hdGNoKGluU3RhY2spW24rMV0ucmVwbGFjZSgvXFxuJC8sICcnKSB8fCAnJylcbn1cblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBmdW5jdGlvblxuICogIEBkZXNjIFN0cmluZ2lyeSBvYmplY3RzIHJlY3Vyc2l2ZWx5IHdpdGggbGltaXRlZCBkZXB0aFxuICogIGFuZCBjaXJjdWxhciByZWZlcmVuY2UgdHJhY2tpbmcuXG4gKiAgR2VuZXJhbGx5IEpTT04uc3RyaW5naWZ5IGlzIHVzZWQgYXMgcmVmZXJlbmNlOlxuICogIHN0cmluZ3MgYXJlIGVzY2FwZWQgYW5kIGRvdWJsZS1xdW90ZWQ7IG51bWJlcnMsIGJvb2xlYW4sIGFuZCBudWxscyBhcmVcbiAqICBzdHJpbmdpZmllZCBcImFzIGlzXCI7IG9iamVjdHMgYW5kIGFycmF5cyBhcmUgZGVzY2VuZGVkIGludG8uXG4gKiAgVGhlIGRpZmZlcmVuY2VzIGZvbGxvdzpcbiAqICB1bmRlZmluZWQgaXMgcmVwb3J0ZWQgYXMgJzx1bmRlZj4nLlxuICogIE9iamVjdHMgdGhhdCBoYXZlIGNvbnN0cnVjdG9ycyBhcmUgcHJlZml4ZWQgd2l0aCBjbGFzcyBuYW1lcy5cbiAqICBPYmplY3QgYW5kIGFycmF5IGNvbnRlbnQgaXMgYWJicmV2aWF0ZWQgYXMgXCIuLi5cIiBhbmQgXCJDaXJjdWxhclwiXG4gKiAgaW4gY2FzZSBvZiBkZXB0aCBleGhhdXN0aW9uIGFuZCBjaXJjdWxhciByZWZlcmVuY2UsIHJlc3BlY3RpdmVseS5cbiAqICBGdW5jdGlvbnMgYXJlIG5haXZlbHkgc3RyaW5naWZpZWQuXG4gKiAgQHBhcmFtIHtBbnl9IHRhcmdldCBPYmplY3QgdG8gc2VyaWFsaXplLlxuICogIEBwYXJhbSB7aW50ZWdlcn0gZGVwdGg9MyBEZXB0aCBsaW1pdC5cbiAqICBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5mdW5jdGlvbiBleHBsYWluKCBpdGVtLCBkZXB0aD0zLCBvcHRpb25zPXt9LCBwYXRoPSckJywgc2Vlbj1uZXcgQW5ub3RhdGVkU2V0KCkgKSB7XG4gICAgLy8gc2ltcGxlIHR5cGVzXG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJylcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGl0ZW0pOyAvLyBkb24ndCB3YW50IHRvIHNwZW5kIHRpbWUgcW91dGluZ1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ251bWJlcicgfHwgdHlwZW9mIGl0ZW0gPT09ICdib29sZWFuJyB8fCBpdGVtID09PSBudWxsKVxuICAgICAgICByZXR1cm4gJycraXRlbTtcbiAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gJzx1bmRlZj4nO1xuICAgIGlmICh0eXBlb2YgaXRlbSAhPT0gJ29iamVjdCcpIC8vIG1heWJlIGZ1bmN0aW9uXG4gICAgICAgIHJldHVybiAnJytpdGVtOyAvLyBUT0RPIGRvbid0IHByaW50IG91dCBhIGxvbmcgZnVuY3Rpb24ncyBib2R5XG5cbiAgICAvLyByZWN1cnNlXG4gICAgaWYgKHNlZW4uaGFzKGl0ZW0pKSB7XG4gICAgICAgIC8vIFRPRE8gZGV0ZXJtaW5lIHBhdGhcbiAgICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoaXRlbSkgPyAnW0NpcmN1bGFyXScgOiAne0NpcmN1bGFyfSc7XG4gICAgfTtcbiAgICBzZWVuID0gc2Vlbi5hZGQoIGl0ZW0sIHBhdGggKTsgLy8gY2xvbmVzIG9iamVjdFxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoaXRlbSkpIHtcbiAgICAgICAgaWYgKGRlcHRoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiAnWy4uLl0nO1xuICAgICAgICBzZWVuLmFkZChpdGVtKTtcbiAgICAgICAgLy8gVE9ETyA8eCBlbXB0eSBpdGVtcz5cbiAgICAgICAgY29uc3QgbGlzdCA9IGl0ZW0ubWFwKFxuICAgICAgICAgICAgKHZhbCwgaW5kZXgpID0+IGV4cGxhaW4odmFsLCBkZXB0aC0xLCBvcHRpb25zLCBwYXRoKydbJytpbmRleCsnXScsIHNlZW4pXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiAnWycrbGlzdC5qb2luKCcsICcpKyddJzsgLy8gVE9ETyBjb25maWd1cmFibGUgd2hpdGVzcGFjZVxuICAgIH1cblxuICAgIGNvbnN0IHR5cGUgPSBpdGVtLmNvbnN0cnVjdG9yICYmIGl0ZW0uY29uc3RydWN0b3IubmFtZTtcbiAgICBjb25zdCBwcmVmaXggPSB0eXBlICYmIHR5cGUgIT09ICdPYmplY3QnID8gdHlwZSArICcgJyA6ICcnO1xuICAgIGlmIChkZXB0aCA8IDEpXG4gICAgICAgIHJldHVybiBwcmVmaXggKyAney4uLn0nO1xuICAgIGNvbnN0IGxpc3QgPSBPYmplY3Qua2V5cyhpdGVtKS5zb3J0KCkubWFwKCBrZXkgPT4ge1xuICAgICAgICBjb25zdCBpbmRleCA9IEpTT04uc3RyaW5naWZ5KGtleSk7XG4gICAgICAgIHJldHVybiBpbmRleCtcIjpcIitleHBsYWluKGl0ZW1ba2V5XSwgZGVwdGgtMSwgb3B0aW9ucywgcGF0aCsnWycraW5kZXgrJ10nLCBzZWVuKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcHJlZml4ICsgJ3snICsgbGlzdC5qb2luKFwiLCBcIikgKyAnfSc7XG5cbiAgICAvLyBkdW5ubyB3aGF0IGl0IGlzLCBtYXliZSBhIGZ1bmN0aW9uXG4gICAgcmV0dXJuICcnK2l0ZW07XG59XG5cbi8vIE11c3Qgd29yayBldmVuIHdpdGhvdXQgYXNzZXJ0XG5jb25zdCBoYXNBc3NlcnQgPSB0eXBlb2YgYXNzZXJ0ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFzc2VydC5Bc3NlcnRpb25FcnJvciA9PT0gJ2Z1bmN0aW9uJztcblxuY29uc3QgbWFrZUVycm9yID0gaGFzQXNzZXJ0XG4gICAgPyBlbnRyeSA9PiBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKGVudHJ5KVxuICAgIDogZW50cnkgPT4gbmV3IEVycm9yKCBlbnRyeS5hY3R1YWwgKTtcblxuLyoqXG4gKiAgIEBleHBvcnRzIGNhbGxlckluZm9cbiAqICAgQGV4cG9ydHMgZXhwbGFpblxuICovXG5cbm1vZHVsZS5leHBvcnRzID0geyBjYWxsZXJJbmZvLCBleHBsYWluLCBtYWtlRXJyb3IgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gU2VlIGFsc28gbm90ZWQtc2V0LmpzXG5cbmNsYXNzIEFubm90YXRlZFNldCB7XG4gICAgY29uc3RydWN0b3IoYWxsPW5ldyBTZXQoKSwgbm90ZXM9W10pIHtcbiAgICAgICAgdGhpcy5hbGwgICA9IGFsbDtcbiAgICAgICAgdGhpcy5ub3RlcyA9IG5vdGVzO1xuICAgIH1cbiAgICBhZGQoIGl0ZW0sIG5vdGUgKSB7XG4gICAgICAgIGlmICh0aGlzLmFsbC5oYXMoaXRlbSkpXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgcmV0dXJuIG5ldyBBbm5vdGF0ZWRTZXQoXG4gICAgICAgICAgICBuZXcgU2V0KHRoaXMuYWxsKS5hZGQoaXRlbSksXG4gICAgICAgICAgICBbIC4uLnRoaXMubm90ZXMsIFsgaXRlbSwgbm90ZSBdIF1cbiAgICAgICAgKTtcbiAgICB9XG4gICAgaGFzKCBpdGVtICkge1xuICAgICAgICBpZiAoIXRoaXMuYWxsLmhhcyggaXRlbSApKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKGxldCBwYWlyIG9mIHRoaXMubm90ZXMpIHtcbiAgICAgICAgICAgIGlmIChwYWlyWzBdID09PSBpdGVtKVxuICAgICAgICAgICAgICAgIHJldHVybiBwYWlyWzFdO1xuICAgICAgICB9O1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3d0ZiwgdW5yZWFjaGFibGUnKTtcbiAgICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7IEFubm90YXRlZFNldCB9O1xuIl19
