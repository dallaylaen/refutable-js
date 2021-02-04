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

/**
 *   @desc Create a fresh Report object and pass it to a function.
 *   @returns {Report}
 *   @param {Function} callback
 *   The last argument must be a callback taking {Report} as first argument.
 *   Any preceding arguments will be forwarded to callback as is.
 */
function report (...args) {
    return new Report().run(...args).stop();
}


// Allow creating multiple parallel configurations of refute
// e.g. one strict (throwing errors) and other lax (just debugging to console)
function setup( options={}, orig ) {
    // TODO validate options
    const onFail = options.onFail || (rep => { throw new Error(rep.getTap()) });

    const refute = options.skip
        ? ()=>{}
        : (...args) => {
            const ok = report(...args);
            if (!ok.getPass())
                onFail(ok, args);
        };

    // reexport all from report.js
    refute.Report = Report;
    refute.report = report; // TODO ouch, rename?
    refute.explain = explain;
    refute.addCondition = addCondition;

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
function explain( item, depth=3, options={}, path='$', seen=new Set() ) {
    // simple types
    if (typeof item === 'string')
        return JSON.stringify(item); // don't want to spend time qouting
    if (typeof item === 'number' || typeof item === 'boolean' || item === null)
        return ''+item;
    if (item === undefined) return '<undef>';

    // recurse

    if (Array.isArray(item)) {
        // TODO keep path but there's no way of storing smth by object
        if (seen.has(item))
            return '[Circular]';
        if (depth < 1)
            return '[...]';
        seen.add(item);
        // TODO <x empty items>
        const list = item.map(
            (val, index) => explain(val, depth-1, options, path+'['+index+']', new Set(seen))
        );
        return '['+list.join(", ")+"]";
    }

    if (typeof item === 'object') {
        const type = item.constructor && item.constructor.name;
        const prefix = type && type !== 'Object' ? type + ' ' : '';
        // TODO keep path but there's no way of storing smth by object
        if (seen.has(item))
            return prefix+'{Circular}';
        // TODO <x empty items>
        if (depth < 1)
            return prefix + '{...}';
        seen.add(item);
        const list = Object.keys(item).sort().map( key => {
            const index = JSON.stringify(key);
            return index+":"+explain(item[key], depth-1, options, path+'['+index+']', new Set(seen));
        });
        return prefix + '{' + list.join(", ") + '}';
    }

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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9yZWZ1dGUuanMiLCJsaWIvcmVmdXRlL2NvbmQvYXJyYXkuanMiLCJsaWIvcmVmdXRlL2NvbmQvYmFzaWMuanMiLCJsaWIvcmVmdXRlL2NvbmQvZGVlcC5qcyIsImxpYi9yZWZ1dGUvZGJjLmpzIiwibGliL3JlZnV0ZS9yZXBvcnQuanMiLCJsaWIvcmVmdXRlL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyB0aGUgY29yZSAoc2hvdWxkIGV4cGxhaW4gZXZlbiBiZSB0aGVyZT8pXG5jb25zdCB7IFJlcG9ydCwgYWRkQ29uZGl0aW9uLCBleHBsYWluIH0gPSByZXF1aXJlICgnLi9yZWZ1dGUvcmVwb3J0LmpzJyk7XG5cbi8vIGVpZmZlbC1zdHlsZSBkZXNpZ24tYnktY29udHJhY3RcbmNvbnN0IHsgREJDIH0gPSByZXF1aXJlKCAnLi9yZWZ1dGUvZGJjLmpzJyApO1xuXG4vLyBpbXBvcnQgZGVmYXVsdCBjb25kaXRpb24gYXJzZW5hbFxucmVxdWlyZSggJy4vcmVmdXRlL2NvbmQvYmFzaWMuanMnICk7XG5yZXF1aXJlKCAnLi9yZWZ1dGUvY29uZC9hcnJheS5qcycgKTtcbnJlcXVpcmUoICcuL3JlZnV0ZS9jb25kL2RlZXAuanMnICk7XG5cbi8qKlxuICogICBAZGVzYyBDcmVhdGUgYSBmcmVzaCBSZXBvcnQgb2JqZWN0IGFuZCBwYXNzIGl0IHRvIGEgZnVuY3Rpb24uXG4gKiAgIEByZXR1cm5zIHtSZXBvcnR9XG4gKiAgIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiAgIFRoZSBsYXN0IGFyZ3VtZW50IG11c3QgYmUgYSBjYWxsYmFjayB0YWtpbmcge1JlcG9ydH0gYXMgZmlyc3QgYXJndW1lbnQuXG4gKiAgIEFueSBwcmVjZWRpbmcgYXJndW1lbnRzIHdpbGwgYmUgZm9yd2FyZGVkIHRvIGNhbGxiYWNrIGFzIGlzLlxuICovXG5mdW5jdGlvbiByZXBvcnQgKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gbmV3IFJlcG9ydCgpLnJ1biguLi5hcmdzKS5zdG9wKCk7XG59XG5cblxuLy8gQWxsb3cgY3JlYXRpbmcgbXVsdGlwbGUgcGFyYWxsZWwgY29uZmlndXJhdGlvbnMgb2YgcmVmdXRlXG4vLyBlLmcuIG9uZSBzdHJpY3QgKHRocm93aW5nIGVycm9ycykgYW5kIG90aGVyIGxheCAoanVzdCBkZWJ1Z2dpbmcgdG8gY29uc29sZSlcbmZ1bmN0aW9uIHNldHVwKCBvcHRpb25zPXt9LCBvcmlnICkge1xuICAgIC8vIFRPRE8gdmFsaWRhdGUgb3B0aW9uc1xuICAgIGNvbnN0IG9uRmFpbCA9IG9wdGlvbnMub25GYWlsIHx8IChyZXAgPT4geyB0aHJvdyBuZXcgRXJyb3IocmVwLmdldFRhcCgpKSB9KTtcblxuICAgIGNvbnN0IHJlZnV0ZSA9IG9wdGlvbnMuc2tpcFxuICAgICAgICA/ICgpPT57fVxuICAgICAgICA6ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBvayA9IHJlcG9ydCguLi5hcmdzKTtcbiAgICAgICAgICAgIGlmICghb2suZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgIG9uRmFpbChvaywgYXJncyk7XG4gICAgICAgIH07XG5cbiAgICAvLyByZWV4cG9ydCBhbGwgZnJvbSByZXBvcnQuanNcbiAgICByZWZ1dGUuUmVwb3J0ID0gUmVwb3J0O1xuICAgIHJlZnV0ZS5yZXBvcnQgPSByZXBvcnQ7IC8vIFRPRE8gb3VjaCwgcmVuYW1lP1xuICAgIHJlZnV0ZS5leHBsYWluID0gZXhwbGFpbjtcbiAgICByZWZ1dGUuYWRkQ29uZGl0aW9uID0gYWRkQ29uZGl0aW9uO1xuXG4gICAgLy8gcmVmdXRlLmNvbmYoey4uLn0pIHdpbGwgZ2VuZXJhdGUgYSBfbmV3XyByZWZ1dGVcbiAgICByZWZ1dGUuY29uZmlnID0gdXBkYXRlID0+IHNldHVwKCB7IC4uLm9wdGlvbnMsIC4uLnVwZGF0ZSB9LCByZWZ1dGUgKTtcblxuICAgIC8vIGFkZCBkZXNpZ24tYnktY29udHJhY3RcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoIHJlZnV0ZSwgJ2RiYycsIHsgZ2V0OiAoKT0+bmV3IERCQygpIH0gKTtcblxuICAgIC8vIFRPRE8gdGhpcyBpcyBzdHVwaWQsIGNvbWUgdXAgd2l0aCBzbXRoIGJldHRlclxuICAgIC8vIHdoZW4gaW4gYnJvd3Nlciwgd2luZG93LnJlZnV0ZS5jb25maWcoKSB1cGRhdGVzIHdpbmRvdy5yZWZ1dGUgaXRzZWxmXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIG9yaWcgPT09IHdpbmRvdy5yZWZ1dGUpXG4gICAgICAgIHdpbmRvdy5yZWZ1dGUgPSByZWZ1dGU7XG5cbiAgICByZXR1cm4gcmVmdXRlO1xufVxuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBzZXR1cCgpO1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuICAgIHdpbmRvdy5yZWZ1dGUgPSBzZXR1cCgpOyAvLyBUT0RPIGNoZWNrIHByZWV4aXN0aW5nXG5cbi8qKlxuICogICBAY2FsbGJhY2sgQ29udHJhY3RcbiAqICAgQGRlc2MgQSBjb2RlIGJsb2NrIGNvbnRhaW5pbmcgb25lIG9yIG1vcmUgY29uZGl0aW9uIGNoZWNrcy5cbiAqICAgQSBjaGVjayBpcyBwZXJmb3JtZWQgYnkgY2FsbGluZyBvbmUgb2YgYSBmZXcgc3BlY2lhbCBtZXRob2RzXG4gKiAgIChlcXVhbCwgbWF0Y2gsIGRlZXBFcXVhbCwgdHlwZSBldGMpXG4gKiAgIG9uIHRoZSBSZXBvcnQgb2JqZWN0LlxuICogICBDb250cmFjdHMgbWF5IGJlIG5lc3RlZCB1c2luZyB0aGUgJ25lc3RlZCcgbWV0aG9kIHdoaWNoIGFjY2VwdHNcbiAqICAgYW5vdGhlciBjb250cmFjdCBhbmQgcmVjb3JkcyBhIHBhc3MvZmFpbHVyZSBpbiB0aGUgcGFyZW50IGFjY29yZGluZ2x5LnFcbiAqICAgQSBjb250cmFjdCBpcyBhbHdheXMgZXhlY3V0ZWQgdG8gdGhlIGVuZC5cbiAqICAgQHBhcmFtIHtSZXBvcnR9IG9rIEFuIG9iamVjdCB0aGF0IHJlY29yZHMgY2hlY2sgcmVzdWx0cy5cbiAqICAgQHBhcmFtIHtBbnl9IFsuLi5saXN0XSBBZGRpdGlvbmFsIHBhcmFtZXRlcnNcbiAqICAgKGUuZy4gZGF0YSBzdHJ1Y3R1cmUgdG8gYmUgdmFsaWRhdGVkKVxuICogICBAcmV0dXJucyB7dm9pZH0gUmV0dXJuZWQgdmFsdWUgaXMgaWdub3JlZC5cbiAqL1xuXG4vKipcbiAqICAgQHB1YmxpY1xuICogICBAZnVuY3Rpb24gcmVmdXRlXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gRGF0YSB0byBmZWVkIHRvIHRoZSBjYWxsYmFja1xuICogICBAcGFyYW0ge0NvbnRyYWN0fSBjb250cmFjdCBBIGNvZGUgYmxvY2sgd2l0aCBjaGVja3MuXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9IFJldHVybiB2YWx1ZSBpcyBpZ25vcmVkLlxuICogICBAdGhyb3dzIHtFcnJvcn0gSWYgb25lIG9yIG1vcmUgY2hlY2tzIGFyZSBmYWlsaW5nLCBhbiBleGNlcHRpb24gaXMgdGhyb3duXG4gKiAgIHdpdGggZGV0YWlscyBhYm91dCBhbGwgcGFzc2luZy9mYWlsaW5nIGNoZWNrcy5cbiAqICAgVGhpcyBhY3Rpb24gY2FuIGJlIGNoYW5nZWQgdmlhIHJlZnV0ZS5jb25maWcoKSBjYWxsLlxuICovXG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIFJlcG9ydCB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcblxuLy8gVE9ETyByZW5hbWUgZm9yRWFjaCBvciBzbXRoLlxuYWRkQ29uZGl0aW9uKFxuICAgICdtYXAnLFxuICAgIHtmdW46MSxhcmdzOjJ9LFxuICAgIChsaXN0LCBjb250cmFjdCkgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpXG4gICAgICAgICAgICByZXR1cm4gJ0V4cGVjdGVkIGEgbGlzdCwgZm91bmQgYSAnLnR5cGVvZihsaXN0KTtcbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBhdXRvLXBhc3NcblxuICAgICAgICByZXR1cm4gbmV3IFJlcG9ydCgpLnJ1biggb2sgPT4ge1xuICAgICAgICAgICAgbGlzdC5mb3JFYWNoKCAoaXRlbSwgaW5kZXgpID0+IG9rLm5lc3RlZCggXCJpdGVtIFwiK2luZGV4LCBpdGVtLCBjb250cmFjdCApICk7XG4gICAgICAgIH0pLnN0b3AoKTtcbiAgICB9XG4pO1xuXG4vLyBUT0RPIHRoaXMgaXMgY2FsbGVkIFwiY29tcGxpYW50IGNoYWluXCIgYnV0IGJldHRlciBqdXN0IHNheSBoZXJlXG4vLyBcIm9oIHdlJ3JlIGNoZWNraW5nIGVsZW1lbnQgb3JkZXJcIlxuYWRkQ29uZGl0aW9uKFxuICAgICdvcmRlcmVkJywgLy8gVE9ETyBiZXR0ZXIgbmFtZT9cbiAgICB7ZnVuOjEsYXJnczoyfSxcbiAgICAobGlzdCwgY29udHJhY3QpID0+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKVxuICAgICAgICAgICAgcmV0dXJuICdFeHBlY3RlZCBhIGxpc3QsIGZvdW5kIGEgJy50eXBlb2YobGlzdCk7XG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA8IDIpXG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gYXV0by1wYXNzXG5cbiAgICAgICAgcmV0dXJuIG5ldyBSZXBvcnQoKS5ydW4oIG9rID0+IHtcbiAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgbGlzdC5sZW5ndGgtMTsgbisrKSB7XG4gICAgICAgICAgICAgICAgb2submVzdGVkKCBcIml0ZW1zIFwiK24rXCIsIFwiKyhuKzEpLCBsaXN0W25dLCBsaXN0W24rMV0sIGNvbnRyYWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkuc3RvcCgpO1xuICAgIH1cbik7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIHJlcG9ydCwgZXhwbGFpbiB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcbmNvbnN0IE9LID0gZmFsc2U7XG5cbmNvbnN0IG51bUNtcCA9IHtcbiAgICAnPCcgOiAoeCx5KT0+KHggIDwgeSksXG4gICAgJz4nIDogKHgseSk9Pih4ICA+IHkpLFxuICAgICc8PSc6ICh4LHkpPT4oeCA8PSB5KSxcbiAgICAnPj0nOiAoeCx5KT0+KHggPj0geSksXG4gICAgJz09JzogKHgseSk9Pih4ID09PSB5KSxcbiAgICAnIT0nOiAoeCx5KT0+KHggIT09IHkpLFxufTtcblxuLy8gdXNlICE9IGFuZCBub3QgIT09IGRlbGliZXJhdGVseSB0byBmaWx0ZXIgb3V0IG51bGwgJiB1bmRlZmluZWRcbmNvbnN0IHN0ckNtcCA9IHtcbiAgICAnPCcgOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggIDwgJycreSksXG4gICAgJz4nIDogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ICA+ICcnK3kpLFxuICAgICc8PSc6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCA8PSAnJyt5KSxcbiAgICAnPj0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPj0gJycreSksXG5cbiAgICAnPT0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPT09ICcnK3kpLFxuICAgICchPSc6ICh4LHkpPT4oKHggPT0gdW5kZWZpbmVkKV4oeSA9PSB1bmRlZmluZWQpKSB8fCAoJycreCAhPT0gJycreSksXG59O1xuXG5hZGRDb25kaXRpb24oXG4gICAgJ251bUNtcCcsXG4gICAge2FyZ3M6M30sXG4gICAgKHgsb3AseSkgPT4gbnVtQ21wW29wXSh4LHkpPzA6W3gsXCJpcyBub3QgXCIrb3AseV1cbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ3N0ckNtcCcsXG4gICAge2FyZ3M6M30sXG4gICAgKHgsb3AseSkgPT4gc3RyQ21wW29wXSh4LHkpPzA6W3gsXCJpcyBub3QgXCIrb3AseV1cbik7XG5cbmNvbnN0IHR5cGVDaGVjayA9IHtcbiAgICB1bmRlZmluZWQ6IHggPT4geCA9PT0gdW5kZWZpbmVkLFxuICAgIG51bGw6ICAgICAgeCA9PiB4ID09PSBudWxsLFxuICAgIG51bWJlcjogICAgeCA9PiB0eXBlb2YgeCA9PT0gJ251bWJlcicgJiYgIU51bWJlci5pc05hTih4KSxcbiAgICBpbnRlZ2VyOiAgIHggPT4gTnVtYmVyLmlzSW50ZWdlcih4KSxcbiAgICBuYW46ICAgICAgIHggPT4gTnVtYmVyLmlzTmFOKHgpLFxuICAgIHN0cmluZzogICAgeCA9PiB0eXBlb2YgeCA9PT0gJ3N0cmluZycsXG4gICAgZnVuY3Rpb246ICB4ID0+IHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nLFxuICAgIGJvb2xlYW46ICAgeCA9PiB0eXBlb2YgeCA9PT0gJ2Jvb2xlYW4nLFxuICAgIG9iamVjdDogICAgeCA9PiB4ICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh4KSxcbiAgICBhcnJheTogICAgIHggPT4gQXJyYXkuaXNBcnJheSh4KSxcbn07XG5mdW5jdGlvbiB0eXBlRXhwbGFpbiAoeCkge1xuICAgIGlmICh0eXBlb2YgeCA9PT0gJ3N0cmluZycpXG4gICAgICAgIHJldHVybiB4O1xuICAgIGlmICh0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgcmV0dXJuICdpbnN0YW5jZW9mICcrKHgubmFtZSB8fCB4KTtcbn07XG5cbmFkZENvbmRpdGlvbihcbiAgICAndHlwZScsXG4gICAge2FyZ3M6IDJ9LFxuICAgIChnb3QsIGV4cCk9PntcbiAgICAgICAgaWYgKCAhQXJyYXkuaXNBcnJheShleHApIClcbiAgICAgICAgICAgIGV4cCA9IFtleHBdO1xuXG4gICAgICAgIGZvciAobGV0IHZhcmlhbnQgb2YgZXhwKSB7XG4gICAgICAgICAgICAvLyBrbm93biB0eXBlXG4gICAgICAgICAgICBpZiggdHlwZW9mIHZhcmlhbnQgPT09ICdzdHJpbmcnICYmIHR5cGVDaGVja1t2YXJpYW50XSApIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZUNoZWNrW3ZhcmlhbnRdKGdvdCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPSztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGluc3RhbmNlb2ZcbiAgICAgICAgICAgIGlmKCB0eXBlb2YgdmFyaWFudCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZ290ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGlmKCBnb3QgaW5zdGFuY2VvZiB2YXJpYW50IClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9LO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gZG9uJ3Qga25vdyB3aGF0IHlvdSdyZSBhc2tpbmcgZm9yXG4gICAgICAgICAgICByZXR1cm4gJ3Vua25vd24gdmFsdWUgdHlwZSBzcGVjOiAnK2V4cGxhaW4odmFyaWFudCwgMSk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAnLSAnK2V4cGxhaW4oZ290LCAxKSxcbiAgICAgICAgICAgICcrICcrZXhwLm1hcCggdHlwZUV4cGxhaW4gKS5qb2luKFwiIG9yIFwiKSxcbiAgICAgICAgXTtcbiAgICB9XG4pO1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCBleHBsYWluIH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuXG5hZGRDb25kaXRpb24oICdkZWVwRXF1YWwnLCB7XCJhcmdzXCI6MixoYXNPcHRpb25zOnRydWV9LCBkZWVwICk7XG5cbmZ1bmN0aW9uIGRlZXAoIGdvdCwgZXhwLCBvcHRpb25zPXt9ICkge1xuICAgIGlmICghb3B0aW9ucy5tYXgpXG4gICAgICAgIG9wdGlvbnMubWF4ID0gNTtcbiAgICBvcHRpb25zLmRpZmYgPSBbXTtcbiAgICBfZGVlcCggZ290LCBleHAsIG9wdGlvbnMgKTtcbiAgICBpZiAoIW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgIHJldHVybiAwO1xuXG4gICAgY29uc3QgcmV0ID0gW107XG4gICAgZm9yIChsZXQgaXRlbSBvZiBvcHRpb25zLmRpZmYpIHtcbiAgICAgICAgcmV0LnB1c2goIFxuICAgICAgICAgICAgXCJhdCBcIitpdGVtWzBdLFxuICAgICAgICAgICAgXCItIFwiK2V4cGxhaW4oIGl0ZW1bMV0sIDIgKSxcbiAgICAgICAgICAgIFwiKyBcIitleHBsYWluKCBpdGVtWzJdLCAyIClcbiAgICAgICAgKTtcbiAgICB9O1xuICAgIHJldHVybiByZXQ7XG59O1xuXG4vLyByZXN1bHQgaXMgc3RvcmVkIGluIG9wdGlvbnMuZGlmZj1bXSwgcmV0dXJuIHZhbHVlIGlzIGlnbm9yZWRcbi8vIGlmIHNhaWQgZGlmZiBleGNlZWRzIG1heCwgcmV0dXJuIGltbWVkaWF0ZWx5ICYgZG9uJ3Qgd2FzdGUgdGltZVxuZnVuY3Rpb24gX2RlZXAoIGdvdCwgZXhwLCBvcHRpb25zPXt9LCBwYXRoPSckJywgc2Vlbj1uZXcgU2V0KCkgKSB7XG4gICAgaWYgKGdvdCA9PT0gZXhwIHx8IG9wdGlvbnMubWF4IDw9IG9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgIHJldHVybjtcbiAgICBpZiAodHlwZW9mIGdvdCAhPT0gdHlwZW9mIGV4cClcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuXG4gICAgLy8gcmVjdXJzZSBieSBleHBlY3RlZCB2YWx1ZSAtIGNvbnNpZGVyIGl0IG1vcmUgcHJlZGljdGFibGVcbiAgICBpZiAodHlwZW9mIGV4cCAhPT0gJ29iamVjdCcgfHwgZXhwID09PSBudWxsICkge1xuICAgICAgICAvLyBub24tb2JqZWN0cyAtIHNvIGNhbid0IGRlc2NlbmRcbiAgICAgICAgLy8gYW5kIGNvbXBhcmlzb24gYWxyZWFkeSBkb25lIGF0IHRoZSBiZWdpbm5uaW5nXG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcbiAgICB9XG5cbiAgICAvLyBtdXN0IGRldGVjdCBsb29wcyBiZWZvcmUgZ29pbmcgZG93blxuICAgIGlmIChzZWVuLmhhcyhleHApKSB7XG4gICAgICAgIG9wdGlvbnMubWF4ID0gMDtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBcbiAgICAgICAgICAgIFtwYXRoICsgJyAoRXhwZWN0aW5nIGNpcmN1bGFyIHJlZmVyZW5jZSwgYXV0by1mYWlsKScsIGdvdCwgZXhwIF0gKTtcbiAgICB9O1xuICAgIHNlZW4uYWRkKGV4cCk7XG5cbiAgICAvLyBjb21wYXJlIG9iamVjdCB0eXBlc1xuICAgIC8vIChpZiBhIHVzZXIgaXMgc3R1cGlkIGVub3VnaCB0byBvdmVycmlkZSBjb25zdHJ1Y3RvciBmaWVsZCwgd2VsbCB0aGUgdGVzdFxuICAgIC8vIHdvdWxkIGZhaWwgbGF0ZXIgYW55d2F5KVxuICAgIGlmIChnb3QuY29uc3RydWN0b3IgIT09IGV4cC5jb25zdHJ1Y3RvcilcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuXG4gICAgLy8gYXJyYXlcbiAgICBpZiAoQXJyYXkuaXNBcnJheShleHApKSB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShnb3QpIHx8IGdvdC5sZW5ndGggIT09IGV4cC5sZW5ndGgpXG4gICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBleHAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIF9kZWVwKCBnb3RbaV0sIGV4cFtpXSwgb3B0aW9ucywgcGF0aCsnWycraSsnXScsIG5ldyBTZXQoc2VlbikpO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMubWF4PD1vcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm47XG4gICAgfTtcblxuICAgIC8vIGNvbXBhcmUga2V5cyAtICsxIGZvciBleHAsIC0xIGZvciBnb3QsIG5vbnplcm8ga2V5IGF0IGVuZCBtZWFucyBrZXlzIGRpZmZlclxuICAgIGNvbnN0IHVuaXEgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhleHApLmZvckVhY2goIHggPT4gdW5pcVt4XSA9IDEgKTtcbiAgICBPYmplY3Qua2V5cyhnb3QpLmZvckVhY2goIHggPT4gdW5pcVt4XSA9ICh1bmlxW3hdIHx8IDApIC0gMSApO1xuICAgIGZvciAobGV0IHggaW4gdW5pcSkge1xuICAgICAgICBpZiAodW5pcVt4XSAhPT0gMClcbiAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcbiAgICB9XG4gICAgXG4gICAgLy8gbm93IHR5cGVvZiwgb2JqZWN0IHR5cGUsIGFuZCBvYmplY3Qga2V5cyBhcmUgdGhlIHNhbWUuXG4gICAgLy8gcmVjdXJzZS5cbiAgICBmb3IgKGxldCBpIGluIGV4cCkge1xuICAgICAgICBfZGVlcCggZ290W2ldLCBleHBbaV0sIG9wdGlvbnMsIHBhdGgrJ1snK2V4cGxhaW4oaSkrJ10nLCBuZXcgU2V0KHNlZW4pKTtcbiAgICAgICAgaWYgKG9wdGlvbnMubWF4PD1vcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgfTtcbiAgICByZXR1cm47XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IFJlcG9ydCB9ID0gcmVxdWlyZSAoICcuL3JlcG9ydC5qcycgKTtcbmNvbnN0IG5vb3AgPSAoKT0+e307XG5cbmNsYXNzIERCQyB7XG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuX3ByZSAgICA9IG5vb3A7XG4gICAgICAgIHRoaXMuX3Bvc3QgICA9IG5vb3A7XG4gICAgICAgIHRoaXMuX29uZmFpbCA9IHJlcG9ydCA9PiByZXBvcnQuZ2V0VGhyb3duKCk7XG4gICAgICAgIHRoaXMuX29ucG9zdCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcG9zdChjb2RlKSB7XG4gICAgICAgIGlmIChjb2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wb3N0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYoIHR5cGVvZiBjb2RlICE9PSAnZnVuY3Rpb24nIClcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Bvc3QtY29uZGl0aW9uIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICAgICAgdGhpcy5fcG9zdCA9IGNvZGU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbiAgICBwcmUoY29kZSkge1xuICAgICAgICBpZiAoY29kZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYoIHR5cGVvZiBjb2RlICE9PSAnZnVuY3Rpb24nIClcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3ByZS1jb25kaXRpb24gbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgICAgICB0aGlzLl9wcmUgPSBjb2RlO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZGVjb3JhdGUob3JpZykge1xuICAgICAgICAvLyBjbG9zZSBhcm91bmQgdGhlc2UgdmFyc1xuICAgICAgICBjb25zdCBwcmUgICAgPSB0aGlzLl9wcmU7XG4gICAgICAgIGNvbnN0IHBvc3QgICA9IHRoaXMuX3Bvc3Q7XG4gICAgICAgIGNvbnN0IG9uZmFpbCA9IHRoaXMuX29uZmFpbDtcbiAgICAgICAgY29uc3Qgb25wb3N0ID0gdGhpcy5fb25wb3N0IHx8IHRoaXMuX29uZmFpbDtcblxuICAgICAgICAvLyBubyBhcnJvdyBmdW5jdGlvbiB0byBnZXQgY29ycmVjdCAndGhpcycgb2JqZWN0XG4gICAgICAgIGNvbnN0IGNvZGUgPSBmdW5jdGlvbiAoLi4uYXJncykge1xuICAgICAgICAgICAgY29uc3QgclByZSA9IG5ldyBSZXBvcnQoKTtcbiAgICAgICAgICAgIHByZS5hcHBseSggdGhpcywgWyByUHJlLCB1bmRlZmluZWQsIC4uLmFyZ3MgXSApO1xuICAgICAgICAgICAgaWYoIXJQcmUuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgIG9uZmFpbChyUHJlLnNldFRpdGxlKCdwcmUtY29uZGl0aW9uIGZhaWxlZCcpKTtcbiAgICAgICAgICAgIGNvbnN0IHJldCA9IG9yaWcuYXBwbHkoIHRoaXMsIGFyZ3MgKTtcbiAgICAgICAgICAgIGNvbnN0IHJQb3N0ID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICAgICAgcG9zdC5hcHBseSggdGhpcywgWyByUG9zdCwgcmV0LCAuLi5hcmdzIF0gKTtcbiAgICAgICAgICAgIGlmKCFyUG9zdC5nZXRQYXNzKCkpXG4gICAgICAgICAgICAgICAgb25wb3N0KHJQb3N0LnNldFRpdGxlKCdwb3N0LWNvbmRpdGlvbiBmYWlsZWQnKSk7XG4gICAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9XG5cbiAgICAgICAgY29kZS5vcmlnID0gb3JpZztcbiAgICAgICAgY29kZS5wcmUgID0gcHJlO1xuICAgICAgICBjb2RlLnBvc3QgPSBwb3N0O1xuXG4gICAgICAgIHJldHVybiBjb2RlO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7IERCQyB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGNhbGxlckluZm8sIGV4cGxhaW4sIG1ha2VFcnJvciB9ID0gcmVxdWlyZSggJy4vdXRpbC5qcycgKTtcblxuLyoqXG4gKiBAcHVibGljXG4gKiBAY2xhc3NkZXNjXG4gKiBUaGUgY29yZSBvZiB0aGUgcmVmdXRlIGxpYnJhcnksIHRoZSByZXBvcnQgb2JqZWN0IGNvbnRhaW5zIGluZm9cbiAqIGFib3V0IHBhc3NpbmcgYW5kIGZhaWxpbmcgY29uZGl0aW9ucy5cbiAqL1xuY2xhc3MgUmVwb3J0IHtcbiAgICAvLyBzZXR1cFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9jb3VudCAgICAgPSAwO1xuICAgICAgICB0aGlzLl9mYWlsQ291bnQgPSAwO1xuICAgICAgICB0aGlzLl9kZXNjciAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fZXZpZGVuY2UgID0gW107XG4gICAgICAgIHRoaXMuX3doZXJlICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9jb25kTmFtZSAgPSBbXTtcbiAgICAgICAgdGhpcy5faW5mbyAgICAgID0gW107XG4gICAgICAgIHRoaXMuX25lc3RlZCAgICA9IFtdO1xuICAgICAgICB0aGlzLl9kb25lICAgICAgPSBmYWxzZTtcbiAgICAgICAgLy8gVE9ETyBhZGQgY2FsbGVyIGluZm8gYWJvdXQgdGhlIHJlcG9ydCBpdHNlbGZcbiAgICB9XG5cbiAgICAvLyBzZXR1cCAtIG11c3QgYmUgY2hhaW5hYmxlXG4gICAgc2V0VGl0bGUoc3RyKSB7XG4gICAgICAgIHRoaXMuX3RpdGxlID0gc3RyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLy8gcnVubmluZ1xuICAgIHJ1biguLi5hcmdzKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnQXR0ZW1wdCB0byBtb2RpZnkgYSBmaW5pc2hlZCBSZXBvcnQnKTtcbiAgICAgICAgY29uc3QgYmxvY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICBpZiAodHlwZW9mIGJsb2NrICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdMYXN0IGFyZ3VtZW50IG9mIHJ1bigpIG11c3QgYmUgYSBmdW5jdGlvbiwgbm90ICcrdHlwZW9mKGJsb2NrKSk7XG4gICAgICAgIGJsb2NrKCB0aGlzLCAuLi5hcmdzICk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIEluIHRoZW9yeSwgaGF2aW5nIGNvbnN0IG49bmV4dCgpOyBzZXRSZXN1bHQobi4gLi4uKVxuICAgIC8vIHNob3VsZCBhbGxvdyBmb3IgYXN5bmMgY29uZGl0aW9ucyBpbiB0aGUgZnV0dXJlXG4gICAgLy8gaWYgYXQgYWxsIHBvc3NpYmxlIHdpdGhvdXQgZ3JlYXQgc2FjcmlmaWNlcy5cbiAgICBuZXh0KCkge1xuICAgICAgICBpZiAodGhpcy5fZG9uZSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciAoJ0F0dGVtcHQgdG8gbW9kaWZ5IGEgZmluaXNoZWQgUmVwb3J0Jyk7XG4gICAgICAgIHJldHVybiArK3RoaXMuX2NvdW50O1xuICAgIH1cblxuICAgIHNldFJlc3VsdCAobiwgZXZpZGVuY2UsIGRlc2NyLCBjb25kTmFtZSkge1xuICAgICAgICBpZiAodGhpcy5fZG9uZSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciAoJ0F0dGVtcHQgdG8gbW9kaWZ5IGEgZmluaXNoZWQgUmVwb3J0Jyk7XG4gICAgICAgIGlmIChuID4gdGhpcy5fY291bnQpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdBdHRlbXB0IHRvIHNldCBjb25kaXRpb24gYmV5b25kIGNoZWNrIGNvdW50Jyk7XG4gICAgICAgIGlmIChkZXNjcilcbiAgICAgICAgICAgIHRoaXMuX2Rlc2NyW25dID0gZGVzY3I7XG4gICAgICAgIC8vIHBhc3MgLSByZXR1cm4gQVNBUFxuICAgICAgICBpZiAoIWV2aWRlbmNlKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIC8vIG5lc3RlZCByZXBvcnQgbmVlZHMgc3BlY2lhbCBoYW5kbGluZ1xuICAgICAgICBpZiAoZXZpZGVuY2UgaW5zdGFuY2VvZiBSZXBvcnQpIHtcbiAgICAgICAgICAgIHRoaXMuX25lc3RlZFtuXSA9IGV2aWRlbmNlO1xuICAgICAgICAgICAgaWYgKGV2aWRlbmNlLmdldFBhc3MoKSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBldmlkZW5jZSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbGlzdGlmeSAmIHN0cmluZ2lmeSBldmlkZW5jZSwgc28gdGhhdCBpdCBkb2Vzbid0IGNoYW5nZSBwb3N0LWZhY3R1bVxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZXZpZGVuY2UpKVxuICAgICAgICAgICAgZXZpZGVuY2UgPSBbIGV2aWRlbmNlIF07XG4gICAgICAgIHRoaXMuX2V2aWRlbmNlW25dID0gZXZpZGVuY2UubWFwKCB4PT5fZXhwbGFpbih4LCBJbmZpbml0eSkgKTtcbiAgICAgICAgdGhpcy5fd2hlcmVbbl0gICAgPSBjYWxsZXJJbmZvKDIpO1xuICAgICAgICB0aGlzLl9jb25kTmFtZVtuXSA9IGNvbmROYW1lO1xuICAgICAgICB0aGlzLl9mYWlsQ291bnQrKztcblxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgQXBwZW5kIGFuIGluZm9ybWF0aW9uYWwgbWVzc2FnZSB0byB0aGUgcmVwb3J0LlxuICAgICAqIE5vbi1zdHJpbmcgdmFsdWVzIHdpbGwgYmUgc3RyaW5naWZpZWQgdmlhIGV4cGxhaW4oKS5cbiAgICAgKiBAcGFyYW0ge0FueX0gbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtSZXBvcnR9IGNoYWluYWJsZVxuICAgICAqL1xuICAgIGluZm8oIC4uLm1lc3NhZ2UgKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnQXR0ZW1wdCB0byBtb2RpZnkgYSBmaW5pc2hlZCBSZXBvcnQnKTtcbiAgICAgICAgaWYgKCF0aGlzLl9pbmZvW3RoaXMuX2NvdW50XSlcbiAgICAgICAgICAgIHRoaXMuX2luZm9bdGhpcy5fY291bnRdID0gW107XG4gICAgICAgIHRoaXMuX2luZm9bdGhpcy5fY291bnRdLnB1c2goIG1lc3NhZ2UubWFwKCBzPT5fZXhwbGFpbihzKSApLmpvaW4oXCIgXCIpICk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHN0b3AoKSB7XG4gICAgICAgIHRoaXMuX2RvbmUgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvLyBxdWVyeWluZ1xuICAgIGdldFRpdGxlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdGl0bGU7IC8vSkZZSVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiAgIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGdldERvbmUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kb25lOyAvLyBpcyBpdCBldmVuIG5lZWRlZD9cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIFdpdGhvdXQgYXJndW1lbnQgcmV0dXJucyB3aGV0aGVyIHRoZSBjb250cmFjdCB3YXMgZnVsZmlsbGVkLlxuICAgICAqICAgQXMgYSBzcGVjaWFsIGNhc2UsIGlmIG5vIGNoZWNrcyB3ZXJlIHJ1biBhbmQgdGhlIGNvbnRyYWN0IGlzIGZpbmlzaGVkLFxuICAgICAqICAgcmV0dXJucyBmYWxzZSwgYXMgaW4gXCJzb21lb25lIG11c3QgaGF2ZSBmb3Jnb3R0ZW4gdG8gZXhlY3V0ZVxuICAgICAqICAgcGxhbm5lZCBjaGVja3MuIFVzZSBwYXNzKCkgaWYgbm8gY2hlY2tzIGFyZSBwbGFubmVkLlxuICAgICAqXG4gICAgICogICBJZiBhIHBhcmFtZXRlciBpcyBnaXZlbiwgcmV0dXJuIHRoZSBzdGF0dXMgb2Ygbi10aCBjaGVjayBpbnN0ZWFkLlxuICAgICAqICAgQHBhcmFtIHtpbnRlZ2VyfSBuXG4gICAgICogICBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBnZXRQYXNzKG4pIHtcbiAgICAgICAgaWYgKG4gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9mYWlsQ291bnQgPT09IDAgJiYgKCF0aGlzLl9kb25lIHx8IHRoaXMuX2NvdW50ID4gMCk7XG4gICAgICAgIHJldHVybiAobiA+IDAgJiYgbiA8PSB0aGlzLl9jb3VudCkgPyAhdGhpcy5fZXZpZGVuY2Vbbl0gOiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBOdW1iZXIgb2YgY2hlY2tzIHBlcmZvcm1lZC5cbiAgICAgKiAgIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0Q291bnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb3VudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgV2hldGhlciB0aGUgbGFzdCBjaGVjayB3YXMgYSBzdWNjZXNzLlxuICAgICAqICBUaGlzIGlzIGp1c3QgYSBzaG9ydGN1dCBmb3IgZm9vLmdldERldGFpbHMoZm9vLmdldENvdW50KS5wYXNzXG4gICAgICogIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGxhc3QoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb3VudCA/ICF0aGlzLl9ldmlkZW5jZVt0aGlzLl9jb3VudF0gOiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBOdW1iZXIgb2YgY2hlY2tzIGZhaWxpbmcuXG4gICAgICogICBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldEZhaWxDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZhaWxDb3VudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIFJldHVybiBhIHN0cmluZyBvZiBmYWlsaW5nL3Bhc3NpbmcgY2hlY2tzLlxuICAgICAqICAgVGhpcyBtYXkgYmUgdXNlZnVsIGZvciB2YWxpZGF0aW5nIGN1c3RvbSBjb25kaXRpb25zLlxuICAgICAqICAgQ29uc2VjdXRpdmUgcGFzc2luZyBjaGVja2EgYXJlIHJlcHJlc2VudGVkIGJ5IG51bWJlcnMuXG4gICAgICogICBBIGNhcGl0YWwgbGV0dGVyIGluIHRoZSBzdHJpbmcgcmVwcmVzZW50cyBmYWlsdXJlLlxuICAgICAqICAgQHJldHVybnMge3N0cmluZ31cbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBwYXNzaW5nIGNoZWNrc1xuICAgICAqICAgXCJyKDEwKVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgY2hlY2tzIHdpdGggMSBmYWlsdXJlIGluIHRoZSBtaWRkbGVcbiAgICAgKiAgIFwicig1LE4sNClcIlxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIGNoZWNrcyBpbmNsdWRpbmcgYSBuZXN0ZWQgY29udHJhY3RcbiAgICAgKiAgIFwicigzLHIoMSxOKSw2KVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gbm8gY2hlY2tzIHdlcmUgcnVuIC0gYXV0by1mYWlsXG4gICAgICogICBcInIoWilcIlxuICAgICAqL1xuICAgIGdldEdob3N0KCkge1xuICAgICAgICBjb25zdCBnaG9zdCA9IFtdO1xuICAgICAgICBsZXQgc3RyZWFrID0gMDtcbiAgICAgICAgZm9yIChsZXQgaT0xOyBpIDw9IHRoaXMuX2NvdW50OyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9ldmlkZW5jZVtpXSB8fCB0aGlzLl9uZXN0ZWRbaV0pIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RyZWFrKSBnaG9zdC5wdXNoKHN0cmVhayk7XG4gICAgICAgICAgICAgICAgc3RyZWFrID0gMDtcbiAgICAgICAgICAgICAgICBnaG9zdC5wdXNoKCB0aGlzLl9uZXN0ZWRbaV0gPyB0aGlzLl9uZXN0ZWRbaV0uZ2V0R2hvc3QoKSA6ICdOJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0cmVhaysrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdHJlYWspIGdob3N0LnB1c2goc3RyZWFrKTtcbiAgICAgICAgaWYgKGdob3N0Lmxlbmd0aCA9PT0gMCAmJiAhdGhpcy5nZXRQYXNzKCkpXG4gICAgICAgICAgICBnaG9zdC5wdXNoKCdaJyk7XG4gICAgICAgIHJldHVybiAncignK2dob3N0LmpvaW4oJywnKSsnKSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIHJldHVybnMgYSBwbGFpbiBzZXJpYWxpemFibGUgb2JqZWN0XG4gICAgICogIEByZXR1cm5zIHtPYmplY3R9XG4gICAgICovXG4gICAgdG9KU09OKCkge1xuICAgICAgICBjb25zdCBuID0gdGhpcy5nZXRDb3VudCgpO1xuICAgICAgICBjb25zdCBkZXRhaWxzID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpPD1uOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLmdldERldGFpbHMoaSk7XG4gICAgICAgICAgICAvLyBzdHJpcCBleHRyYSBrZXlzXG4gICAgICAgICAgICBmb3IoIGxldCBrZXkgaW4gbm9kZSApIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZVtrZXldID09PSB1bmRlZmluZWQgfHwgKEFycmF5LmlzQXJyYXkobm9kZVtrZXldKSAmJiBub2RlW2tleV0ubGVuZ3RoID09PSAwKSlcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG5vZGVba2V5XTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBkZXRhaWxzLnB1c2gobm9kZSk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwYXNzOiAgdGhpcy5nZXRQYXNzKCksXG4gICAgICAgICAgICBjb3VudDogdGhpcy5nZXRDb3VudCgpLFxuICAgICAgICAgICAgdGl0bGU6IHRoaXMuZ2V0VGl0bGUoKSxcbiAgICAgICAgICAgIGRldGFpbHMsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFRhcCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBSZXR1cm5zIHJlcG9ydCBzdHJpbmdpZmllZCBhcyBUQVAgZm9ybWF0XG4gICAgICogIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0VGFwKG4pIHtcbiAgICAgICAgY29uc3QgdGFwID0gbiA9PT0gdW5kZWZpbmVkID8gdGhpcy5nZXRUYXBMaW5lcygpIDogdGhpcy5nZXRUYXBFbnRyeShuKTtcbiAgICAgICAgdGFwLnB1c2goJycpO1xuICAgICAgICByZXR1cm4gdGFwLmpvaW4oJ1xcbicpO1xuICAgIH1cblxuICAgIGdldFRhcExpbmVzKG4pIHtcbiAgICAgICAgLy8gVEFQIGZvciBub3csIHVzZSBhbm90aGVyIGZvcm1hdCBsYXRlciBiZWNhdXNlIFwicGVybCBpcyBzY2FyeVwiXG4gICAgICAgIGNvbnN0IHRhcCA9IFsgJzEuLicrdGhpcy5fY291bnQgXTtcbiAgICAgICAgaWYgKHRoaXMuZ2V0VGl0bGUoKSlcbiAgICAgICAgICAgIHRhcC5wdXNoKCcjICcrdGhpcy5nZXRUaXRsZSgpKTtcbiAgICAgICAgLy8gVE9ETyBpbmZvWzBdXG4gICAgICAgIGNvbnN0IHByZWZhY2UgPSB0aGlzLmdldERldGFpbHMoMCk7XG4gICAgICAgIHRhcC5wdXNoKCAuLi5wcmVmYWNlLmluZm8ubWFwKCBzID0+ICcjICcrcyApICk7XG4gICAgICAgIGZvciggbGV0IGkgPSAxOyBpIDw9IHRoaXMuX2NvdW50OyBpKysgKSBcbiAgICAgICAgICAgIHRhcC5wdXNoKCAuLi4gdGhpcy5nZXRUYXBFbnRyeShpKSApO1xuICAgICAgICBpZiAoIXRoaXMuZ2V0UGFzcygpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5nZXRDb3VudCgpID4gMClcbiAgICAgICAgICAgICAgICB0YXAucHVzaCgnIyBGYWlsZWQgJyt0aGlzLmdldEZhaWxDb3VudCgpKycvJyt0aGlzLmdldENvdW50KCkrICcgY29uZGl0aW9ucycpO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHRhcC5wdXNoKCcjIE5vIGNoZWNrcyB3ZXJlIHJ1biwgY29uc2lkZXIgdXNpbmcgcGFzcygpIGlmIHRoYXRcXCdzIGRlbGliZXJhdGUnKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRhcDtcbiAgICB9XG5cbiAgICBnZXRUYXBFbnRyeShuKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB0eXBlb2YobikgPT09ICdvYmplY3QnID8gbiA6IHRoaXMuZ2V0RGV0YWlscyhuKTtcbiAgICAgICAgY29uc3QgdGFwID0gW107XG4gICAgICAgIGlmIChkYXRhLm5lc3RlZCkge1xuICAgICAgICAgICAgdGFwLnB1c2goICcjIHN1YmNvbnRyYWN0OicrKGRhdGEubmFtZT8nICcrZGF0YS5uYW1lOicnKSApO1xuICAgICAgICAgICAgdGFwLnB1c2goIC4uLiBkYXRhLm5lc3RlZC5nZXRUYXBMaW5lcygpLm1hcCggcyA9PiAnICAgICcrcyApKTtcbiAgICAgICAgfVxuICAgICAgICB0YXAucHVzaCgoZGF0YS5wYXNzPycnOidub3QgJykgKyAnb2sgJyArIGRhdGEublxuICAgICAgICAgICAgKyAoZGF0YS5uYW1lID8gJyAtICcrZGF0YS5uYW1lIDogJycpKTtcbiAgICAgICAgaWYgKCFkYXRhLnBhc3MpXG4gICAgICAgICAgICB0YXAucHVzaCgnIyBDb25kaXRpb24nKyhkYXRhLmNvbmQgPyAnICcrZGF0YS5jb25kIDogJycpKycgZmFpbGVkIGF0ICcrZGF0YS53aGVyZSk7XG4gICAgICAgIHRhcC5wdXNoKC4uLmRhdGEuZXZpZGVuY2UubWFwKHM9PicjICcrcykpO1xuICAgICAgICB0YXAucHVzaCguLi5kYXRhLmluZm8ubWFwKHM9PicjICcrcykpO1xuICAgICAgICByZXR1cm4gdGFwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgUmV0dXJucyBkZXRhaWxlZCByZXBvcnQgb24gYSBzcGVjaWZpYyBjaGVja1xuICAgICAqICAgQHBhcmFtIHtpbnRlZ2VyfSBuIC0gY2hlY2sgbnVtYmVyLCBtdXN0IGJlIDw9IGdldENvdW50KClcbiAgICAgKiAgIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICovXG4gICAgZ2V0RGV0YWlscyhuKSB7XG4gICAgICAgIC8vIFRPRE8gdmFsaWRhdGUgblxuXG4gICAgICAgIC8vIHVnbHkgYnV0IHdoYXQgY2FuIEkgZG9cbiAgICAgICAgaWYgKG4gPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbjogICAgMCxcbiAgICAgICAgICAgICAgICBpbmZvOiB0aGlzLl9pbmZvWzBdIHx8IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBldmlkZW5jZSA9IHRoaXMuX2V2aWRlbmNlW25dO1xuICAgICAgICBpZiAoZXZpZGVuY2UgJiYgIUFycmF5LmlzQXJyYXkoZXZpZGVuY2UpKVxuICAgICAgICAgICAgZXZpZGVuY2UgPSBbZXZpZGVuY2VdO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuOiAgICAgIG4sXG4gICAgICAgICAgICBuYW1lOiAgIHRoaXMuX2Rlc2NyW25dIHx8ICcnLFxuICAgICAgICAgICAgcGFzczogICAhZXZpZGVuY2UsXG4gICAgICAgICAgICBldmlkZW5jZTogZXZpZGVuY2UgfHwgW10sXG4gICAgICAgICAgICB3aGVyZTogIHRoaXMuX3doZXJlW25dLFxuICAgICAgICAgICAgY29uZDogICB0aGlzLl9jb25kTmFtZVtuXSxcbiAgICAgICAgICAgIGluZm86ICAgdGhpcy5faW5mb1tuXSB8fCBbXSxcbiAgICAgICAgICAgIG5lc3RlZDogdGhpcy5fbmVzdGVkW25dLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBDb252ZXJ0IHJlcG9ydCB0byBhbiBBc3NlcnRpb25FcnJvciAoaWYgYXZhaWxhYmxlKSBvciBqdXN0IEVycm9yLlxuICAgICAqICBAcGFyYW0ge251bWJlcn0gW25dIE51bWJlciBvZiBjaGVjayB0byBjb252ZXJ0IHRvIGV4Y2VwdGlvbi5cbiAgICAgKiAgQ3VycmVudCBlcnJvciBmb3JtYXQgaXMgVEFQLCB0aGlzIG1heSBjaGFuZ2UgaW4gdGhlIGZ1dHVyZS5cbiAgICAgKiAgSWYgMCBvciB1bnNwZWNpZmllZCwgY29udmVydCB0aGUgd2hvbGUgcmVwb3J0LlxuICAgICAqICBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXG4gICAgICogIEBwYXJhbSB7Ym9vbGVhbn0gb3B0aW9ucy5wYXNzIElmIGZhbHNlICh0aGUgZGVmYXVsdCksIHJldHVybiBub3RoaW5nXG4gICAgICogIGlmIHRoZSByZXBvcnQgaXMgcGFzc2luZy5cbiAgICAgKiAgQHJldHVybnMge0Vycm9yfHVuZGVmaW5lZH1cbiAgICAgKi9cbiAgICBnZXRFcnJvcihuLCBvcHRpb25zPXt9KSB7XG4gICAgICAgIGlmICghbikge1xuICAgICAgICAgICAgLy8gbm8gZW50cnkgZ2l2ZW5cbiAgICAgICAgICAgIGlmICghb3B0aW9ucy5wYXNzICYmIHRoaXMuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgcmV0dXJuIG1ha2VFcnJvcih7XG4gICAgICAgICAgICAgICAgYWN0dWFsOiAgIHRoaXMuZ2V0VGFwKCksXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6ICcnLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICB0aGlzLmdldFRpdGxlKCksXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICdjb250cmFjdCcsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBkYXRhID0gdHlwZW9mIG4gPT09ICdvYmplY3QnID8gbiA6IHRoaXMuZ2V0RGV0YWlscyhuKTtcblxuICAgICAgICAvLyBubyBlcnJvclxuICAgICAgICBpZiAoIW9wdGlvbnMucGFzcyAmJiBkYXRhLnBhc3MpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgcmV0dXJuIG1ha2VFcnJvcih7XG4gICAgICAgICAgICBhY3R1YWw6ICAgdGhpcy5nZXRUYXBFbnRyeShkYXRhKS5qb2luKCdcXG4nKSxcbiAgICAgICAgICAgIGV4cGVjdGVkOiAnJyxcbiAgICAgICAgICAgIG1lc3NhZ2U6ICBkYXRhLm5hbWUsXG4gICAgICAgICAgICBvcGVyYXRvcjogZGF0YS5jb25kLFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXRUaHJvd24obiwgb3B0aW9ucz17fSkge1xuICAgICAgICAvLyBUT0RPIHJlbmFtZSB0byBqdXN0IHRocm93P1xuICAgICAgICBjb25zdCBlcnIgPSB0aGlzLmdldEVycm9yKG4sIG9wdGlvbnMpO1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbn1cblxuLy8gdGhpcyBpcyBmb3Igc3R1ZmYgbGlrZSBgb2JqZWN0IGZvbyA9IHtcImZvb1wiOjQyfWBcbi8vIHdlIGRvbid0IHdhbnQgdGhlIGV4cGxhbmF0aW9uIHRvIGJlIHF1b3RlZCFcbmZ1bmN0aW9uIF9leHBsYWluKCBpdGVtLCBkZXB0aCApIHtcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnIClcbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgcmV0dXJuIGV4cGxhaW4oIGl0ZW0sIGRlcHRoICk7XG59O1xuXG5SZXBvcnQucHJvdG90eXBlLmV4cGxhaW4gPSBleHBsYWluOyAvLyBhbHNvIG1ha2UgYXZhaWxhYmxlIHZpYSByZXBvcnRcblxuLyoqXG4gKiAgQGRlc2MgQ3JlYXRlIG5ldyBjaGVjayBtZXRob2QgYXZhaWxhYmxlIHZpYSBhbGwgUmVwb3J0IGluc3RhbmNlc1xuICogIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWUgb2YgdGhlIG5ldyBjb25kaXRpb24uXG4gKiAgTXVzdCBub3QgYmUgcHJlc2VudCBpbiBSZXBvcnQgYWxyZWFkeSwgYW5kIHNob3VsZCBOT1Qgc3RhcnQgd2l0aFxuICogIGdldC4uLiwgc2V0Li4uLCBvciBhZGQuLi4gKHRoZXNlIGFyZSByZXNlcnZlZCBmb3IgUmVwb3J0IGl0c2VsZilcbiAqICBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBDb25maWd1cmluZyB0aGUgY2hlY2sncyBoYW5kbGluZyBvZiBhcmd1bWVudHNcbiAqICBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMuYXJncyBUaGUgcmVxdWlyZWQgbnVtYmVyIG9mIGFyZ3VtZW50c1xuICogIEBwYXJhbSB7aW50ZWdlcn0gW29wdGlvbnMubWluQXJnc10gTWluaW11bSBudW1iZXIgb2YgYXJndW1lbnQgKGRlZmF1bHRzIHRvIGFyZ3MpXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBbb3B0aW9ucy5tYXhBcmdzXSBNYXhpbXVtIG51bWJlciBvZiBhcmd1bWVudCAoZGVmYXVsdHMgdG8gYXJncylcbiAqICBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmhhc09wdGlvbnNdIElmIHRydWUsIGFuIG9wdGlvbmFsIG9iamVjdFxuY2FuIGJlIHN1cHBsaWVkIGFzIGxhc3QgYXJndW1lbnQuIEl0IHdvbid0IGludGVyZmVyZSB3aXRoIGRlc2NyaXB0aW9uLlxuICogIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuZnVuXSBUaGUgbGFzdCBhcmd1bWVudCBpcyBhIGNhbGxiYWNrXG4gKiAgQHBhcmFtIHtGdW5jdGlvbn0gaW1wbGVtZW50YXRpb24gLSBhIGNhbGxiYWNrIHRoYXQgdGFrZXMge2FyZ3N9IGFyZ3VtZW50c1xuICogIGFuZCByZXR1cm5zIGEgZmFsc2V5IHZhbHVlIGlmIGNvbmRpdGlvbiBwYXNzZXNcbiAqICAoXCJub3RoaW5nIHRvIHNlZSBoZXJlLCBtb3ZlIGFsb25nXCIpLFxuICogIG9yIGV2aWRlbmNlIGlmIGl0IGZhaWxzXG4gKiAgKGUuZy4gdHlwaWNhbGx5IGEgZ290L2V4cGVjdGVkIGRpZmYpLlxuICovXG5jb25zdCBzZWVuID0gbmV3IFNldCgpO1xuZnVuY3Rpb24gYWRkQ29uZGl0aW9uIChuYW1lLCBvcHRpb25zLCBpbXBsKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gbmFtZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgaWYgKG5hbWUubWF0Y2goL14oX3xnZXRbX0EtWl18c2V0W19BLVpdKS8pKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiBuYW1lIG11c3Qgbm90IHN0YXJ0IHdpdGggZ2V0Xywgc2V0Xywgb3IgXycpO1xuICAgIC8vIFRPRE8gbXVzdCBkbyBzb21ldGhpbmcgYWJvdXQgbmFtZSBjbGFzaGVzLCBidXQgbGF0ZXJcbiAgICAvLyBiZWNhdXNlIGV2YWwgaW4gYnJvd3NlciBtYXkgKGtpbmQgb2YgbGVnaW1pdGVseSkgb3ZlcnJpZGUgY29uZGl0aW9uc1xuICAgIGlmICghc2Vlbi5oYXMobmFtZSkgJiYgUmVwb3J0LnByb3RvdHlwZVtuYW1lXSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2QgYWxyZWFkeSBleGlzdHMgaW4gUmVwb3J0OiAnK25hbWUpO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIG9wdGlvbnMnKTtcbiAgICBpZiAodHlwZW9mIGltcGwgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIGltcGxlbWVudGF0aW9uJyk7XG5cbiAgICBjb25zdCBtaW5BcmdzICAgID0gb3B0aW9ucy5taW5BcmdzIHx8IG9wdGlvbnMuYXJncztcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIobWluQXJncykgfHwgbWluQXJncyA8IDApXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYXJncy9taW5BcmdzIG11c3QgYmUgbm9ubmVnYXRpdmUgaW50ZWdlcicpO1xuICAgIGNvbnN0IG1heEFyZ3MgICAgPSBvcHRpb25zLm1heEFyZ3MgfHwgb3B0aW9ucy5hcmdzIHx8IEluZmluaXR5O1xuICAgIGlmIChtYXhBcmdzICE9PSBJbmZpbml0eSAmJiAoIU51bWJlci5pc0ludGVnZXIobWluQXJncykgfHwgbWF4QXJncyA8IG1pbkFyZ3MpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ21heEFyZ3MgbXVzdCBiZSBpbnRlZ2VyIGFuZCBncmVhdGVyIHRoYW4gbWluQXJncywgb3IgSW5maW5pdHknKTtcbiAgICBjb25zdCBkZXNjckZpcnN0ICAgID0gb3B0aW9ucy5kZXNjckZpcnN0IHx8IG9wdGlvbnMuZnVuIHx8IG1heEFyZ3MgPiAxMDtcbiAgICBjb25zdCBoYXNPcHRpb25zICAgID0gISFvcHRpb25zLmhhc09wdGlvbnM7XG4gICAgY29uc3QgbWF4QXJnc1JlYWwgICA9IG1heEFyZ3MgKyAoaGFzT3B0aW9ucyA/IDEgOiAwKTtcblxuICAgIC8vIFRPRE8gYWxlcnQgdW5rbm93biBvcHRpb25zXG5cbiAgICAvLyBUT0RPIHRoaXMgY29kZSBpcyBjbHV0dGVyZWQsIHJld3JpdGUgXG4gICAgY29uc3QgY29kZSA9IGZ1bmN0aW9uKC4uLmFyZ3MpIHtcbiAgICAgICAgY29uc3QgZGVzY3IgPSBkZXNjckZpcnN0XG4gICAgICAgICAgICA/IGFyZ3Muc2hpZnQoKVxuICAgICAgICAgICAgOiAoIChhcmdzLmxlbmd0aCA+IG1heEFyZ3MgJiYgdHlwZW9mIGFyZ3NbYXJncy5sZW5ndGgtMV0gPT09ICdzdHJpbmcnKSA/IGFyZ3MucG9wKCkgOiB1bmRlZmluZWQpO1xuICAgICAgICBpZiAoYXJncy5sZW5ndGggPiBtYXhBcmdzUmVhbCB8fCBhcmdzLmxlbmd0aCA8IG1pbkFyZ3MpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiAnK25hbWUrJyBtdXN0IGhhdmUgJyttaW5BcmdzKycuLicrbWF4QXJnc1JlYWwrJyBhcmd1bWVudHMgJyk7IC8vIFRPRE9cblxuICAgICAgICBjb25zdCBuID0gdGhpcy5uZXh0KCk7IC8vIFRPRE8gY2FsbCBpdCBhZHZhbmNlKCkgb3Igc210aC5cbiAgICAgICAgY29uc3QgZXZpZGVuY2UgPSBpbXBsKCAuLi5hcmdzICk7XG4gICAgICAgIHJldHVybiB0aGlzLnNldFJlc3VsdCggbiwgZXZpZGVuY2UsIGRlc2NyLCBuYW1lICk7XG4gICAgfTtcblxuICAgIHNlZW4uYWRkKG5hbWUpO1xuICAgIFJlcG9ydC5wcm90b3R5cGVbbmFtZV0gPSBjb2RlO1xufVxuXG4vKipcbiAqICAgQGZ1bmN0aW9uIGNoZWNrXG4gKiAgIEBtZW1iZXJPZiBSZXBvcnRcbiAqICAgQHBhcmFtIGV2aWRlbmNlIElmIGZhbHNlLCB0aGUgY2hlY2sgaXMgYXNzdW1lZCB0byBwYXNzLlxuICogICBBIHRydWUgdmFsdWUgbWVhbnMgdGhlIGNoZWNrIGZhaWxlZC5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH0gXG4gKi9cblxuLy8gdGhlc2UgY29uZGl0aW9ucyBjb3VsZCBiZSB1bmRlciB0aGUgY29uZGl0aW9uIGxpYnJhcnlcbi8vIGJ1dCB3ZSdsbCBuZWVkIHRoZW0gdG8gdmVyaWZ5IHRoZSBSZXBvcnQgY2xhc3MgaXRzZWxmLlxuXG5hZGRDb25kaXRpb24oXG4gICAgJ2NoZWNrJyxcbiAgICB7YXJnczoxfSxcbiAgICB4PT54XG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdwYXNzJyxcbiAgICB7YXJnczowfSxcbiAgICAoKT0+MFxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnZmFpbCcsXG4gICAge2FyZ3M6MH0sXG4gICAgKCk9PidmYWlsZWQgZGVsaWJlcmF0ZWx5J1xuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnZXF1YWwnLFxuICAgIHthcmdzOjJ9LFxuICAgIChhLGIpID0+IGEgPT09IGIgPyAwIDogWyAnLSAnK2V4cGxhaW4oYSksICcrICcgKyBleHBsYWluKGIpIF1cbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ21hdGNoJyxcbiAgICB7YXJnczoyfSxcbiAgICAoYSxyZXgpID0+ICgnJythKS5tYXRjaChyZXgpID8gMCA6IFtcbiAgICAgICAgJ1N0cmluZyAgICAgICAgIDogJythLFxuICAgICAgICAnRG9lcyBub3QgbWF0Y2ggOiAnK3JleFxuICAgIF1cbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ25lc3RlZCcsXG4gICAge2Z1bjoxLG1pbkFyZ3M6MX0sXG4gICAgKC4uLmFyZ3MpID0+IG5ldyBSZXBvcnQoKS5ydW4oLi4uYXJncykuc3RvcCgpXG4pO1xuXG4vKipcbiAqICAgQGV4cG9ydHMgUmVwb3J0XG4gKiAgIEBleHBvcnRzIHJlcG9ydFxuICogICBAZXhwb3J0cyBhZGRDb25kaXRpb25cbiAqICAgQGV4cG9ydHMgZXhwbGFpblxuICovXG5cbm1vZHVsZS5leHBvcnRzID0geyBSZXBvcnQsIGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBEZXRlcm1pbmUgbi10aCBjYWxsZXIgdXAgdGhlIHN0YWNrICovXG4vKiBJbnNwaXJlZCBieSBQZXJsJ3MgQ2FycCBtb2R1bGUgKi9cbmNvbnN0IGluU3RhY2sgPSAvKFteOlxccygpXSs6XFxkKyg/OjpcXGQrKT8pXFxXKihcXG58JCkvZztcblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBmdW5jdGlvblxuICogIEBkZXNjIFJldHVybnMgc291cmNlIHBvc2l0aW9uIG4gZnJhbWVzIHVwIHRoZSBzdGFja1xuICogIEBleGFtcGxlXG4gKiAgXCIvZm9vL2Jhci5qczoyNToxMVwiXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBkZXB0aCBIb3cgbWFueSBmcmFtZXMgdG8gc2tpcFxuICogIEByZXR1cm5zIHtzdHJpbmd9IHNvdXJjZSBmaWxlLCBsaW5lLCBhbmQgY29sdW1uLCBzZXBhcmF0ZWQgYnkgY29sb24uXG4gKi9cbmZ1bmN0aW9uIGNhbGxlckluZm8obikge1xuICAgIC8qIGEgdGVycmlibGUgcmV4IHRoYXQgYmFzaWNhbGx5IHNlYXJjaGVzIGZvciBmaWxlLmpzOm5ubjpubm4gc2V2ZXJhbCB0aW1lcyovXG4gICAgcmV0dXJuIChuZXcgRXJyb3IoKS5zdGFjay5tYXRjaChpblN0YWNrKVtuKzFdLnJlcGxhY2UoL1xcbiQvLCAnJykgfHwgJycpXG59XG5cbi8qKlxuICogIEBwdWJsaWNcbiAqICBAZnVuY3Rpb25cbiAqICBAZGVzYyBTdHJpbmdpcnkgb2JqZWN0cyByZWN1cnNpdmVseSB3aXRoIGxpbWl0ZWQgZGVwdGhcbiAqICBhbmQgY2lyY3VsYXIgcmVmZXJlbmNlIHRyYWNraW5nLlxuICogIEdlbmVyYWxseSBKU09OLnN0cmluZ2lmeSBpcyB1c2VkIGFzIHJlZmVyZW5jZTpcbiAqICBzdHJpbmdzIGFyZSBlc2NhcGVkIGFuZCBkb3VibGUtcXVvdGVkOyBudW1iZXJzLCBib29sZWFuLCBhbmQgbnVsbHMgYXJlXG4gKiAgc3RyaW5naWZpZWQgXCJhcyBpc1wiOyBvYmplY3RzIGFuZCBhcnJheXMgYXJlIGRlc2NlbmRlZCBpbnRvLlxuICogIFRoZSBkaWZmZXJlbmNlcyBmb2xsb3c6XG4gKiAgdW5kZWZpbmVkIGlzIHJlcG9ydGVkIGFzICc8dW5kZWY+Jy5cbiAqICBPYmplY3RzIHRoYXQgaGF2ZSBjb25zdHJ1Y3RvcnMgYXJlIHByZWZpeGVkIHdpdGggY2xhc3MgbmFtZXMuXG4gKiAgT2JqZWN0IGFuZCBhcnJheSBjb250ZW50IGlzIGFiYnJldmlhdGVkIGFzIFwiLi4uXCIgYW5kIFwiQ2lyY3VsYXJcIlxuICogIGluIGNhc2Ugb2YgZGVwdGggZXhoYXVzdGlvbiBhbmQgY2lyY3VsYXIgcmVmZXJlbmNlLCByZXNwZWN0aXZlbHkuXG4gKiAgRnVuY3Rpb25zIGFyZSBuYWl2ZWx5IHN0cmluZ2lmaWVkLlxuICogIEBwYXJhbSB7QW55fSB0YXJnZXQgT2JqZWN0IHRvIHNlcmlhbGl6ZS5cbiAqICBAcGFyYW0ge2ludGVnZXJ9IGRlcHRoPTMgRGVwdGggbGltaXQuXG4gKiAgQHJldHVybnMge3N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZXhwbGFpbiggaXRlbSwgZGVwdGg9Mywgb3B0aW9ucz17fSwgcGF0aD0nJCcsIHNlZW49bmV3IFNldCgpICkge1xuICAgIC8vIHNpbXBsZSB0eXBlc1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpXG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShpdGVtKTsgLy8gZG9uJ3Qgd2FudCB0byBzcGVuZCB0aW1lIHFvdXRpbmdcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdudW1iZXInIHx8IHR5cGVvZiBpdGVtID09PSAnYm9vbGVhbicgfHwgaXRlbSA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuICcnK2l0ZW07XG4gICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCkgcmV0dXJuICc8dW5kZWY+JztcblxuICAgIC8vIHJlY3Vyc2VcblxuICAgIGlmIChBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICAgIC8vIFRPRE8ga2VlcCBwYXRoIGJ1dCB0aGVyZSdzIG5vIHdheSBvZiBzdG9yaW5nIHNtdGggYnkgb2JqZWN0XG4gICAgICAgIGlmIChzZWVuLmhhcyhpdGVtKSlcbiAgICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIGlmIChkZXB0aCA8IDEpXG4gICAgICAgICAgICByZXR1cm4gJ1suLi5dJztcbiAgICAgICAgc2Vlbi5hZGQoaXRlbSk7XG4gICAgICAgIC8vIFRPRE8gPHggZW1wdHkgaXRlbXM+XG4gICAgICAgIGNvbnN0IGxpc3QgPSBpdGVtLm1hcChcbiAgICAgICAgICAgICh2YWwsIGluZGV4KSA9PiBleHBsYWluKHZhbCwgZGVwdGgtMSwgb3B0aW9ucywgcGF0aCsnWycraW5kZXgrJ10nLCBuZXcgU2V0KHNlZW4pKVxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gJ1snK2xpc3Quam9pbihcIiwgXCIpK1wiXVwiO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IGl0ZW0uY29uc3RydWN0b3IgJiYgaXRlbS5jb25zdHJ1Y3Rvci5uYW1lO1xuICAgICAgICBjb25zdCBwcmVmaXggPSB0eXBlICYmIHR5cGUgIT09ICdPYmplY3QnID8gdHlwZSArICcgJyA6ICcnO1xuICAgICAgICAvLyBUT0RPIGtlZXAgcGF0aCBidXQgdGhlcmUncyBubyB3YXkgb2Ygc3RvcmluZyBzbXRoIGJ5IG9iamVjdFxuICAgICAgICBpZiAoc2Vlbi5oYXMoaXRlbSkpXG4gICAgICAgICAgICByZXR1cm4gcHJlZml4Kyd7Q2lyY3VsYXJ9JztcbiAgICAgICAgLy8gVE9ETyA8eCBlbXB0eSBpdGVtcz5cbiAgICAgICAgaWYgKGRlcHRoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiBwcmVmaXggKyAney4uLn0nO1xuICAgICAgICBzZWVuLmFkZChpdGVtKTtcbiAgICAgICAgY29uc3QgbGlzdCA9IE9iamVjdC5rZXlzKGl0ZW0pLnNvcnQoKS5tYXAoIGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IEpTT04uc3RyaW5naWZ5KGtleSk7XG4gICAgICAgICAgICByZXR1cm4gaW5kZXgrXCI6XCIrZXhwbGFpbihpdGVtW2tleV0sIGRlcHRoLTEsIG9wdGlvbnMsIHBhdGgrJ1snK2luZGV4KyddJywgbmV3IFNldChzZWVuKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcHJlZml4ICsgJ3snICsgbGlzdC5qb2luKFwiLCBcIikgKyAnfSc7XG4gICAgfVxuXG4gICAgLy8gZHVubm8gd2hhdCBpdCBpcywgbWF5YmUgYSBmdW5jdGlvblxuICAgIHJldHVybiAnJytpdGVtO1xufVxuXG4vLyBNdXN0IHdvcmsgZXZlbiB3aXRob3V0IGFzc2VydFxuY29uc3QgaGFzQXNzZXJ0ID0gdHlwZW9mIGFzc2VydCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IgPT09ICdmdW5jdGlvbic7XG5cbmNvbnN0IG1ha2VFcnJvciA9IGhhc0Fzc2VydFxuICAgID8gZW50cnkgPT4gbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcihlbnRyeSlcbiAgICA6IGVudHJ5ID0+IG5ldyBFcnJvciggZW50cnkuYWN0dWFsICk7XG5cbi8qKlxuICogICBAZXhwb3J0cyBjYWxsZXJJbmZvXG4gKiAgIEBleHBvcnRzIGV4cGxhaW5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHsgY2FsbGVySW5mbywgZXhwbGFpbiwgbWFrZUVycm9yIH07XG4iXX0=
