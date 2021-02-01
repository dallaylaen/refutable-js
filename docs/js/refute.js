(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

const { Report, report, addCondition , explain } = require ('./refute/report.js');

// import default condition arsenal
require( './refute/cond/basic.js' );
require( './refute/cond/array.js' );
require( './refute/cond/deep.js' );

// Allow creating multiple parallel configurations of refute
// e.g. one strict (throwing errors) and other lax (just debugging to console)
function setup( options={} ) {
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
    refute.config = update => setup( { ...options, ...update } );

    // TODO this is stupid, come up with smth better
    // when in browser, window.refute.config() updates window.refute itself
    if (typeof window !== 'undefined' && this === window.refute)
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


},{"./refute/cond/array.js":2,"./refute/cond/basic.js":3,"./refute/cond/deep.js":4,"./refute/report.js":5}],2:[function(require,module,exports){
'use strict';

const { addCondition, report } = require( '../report.js' );

// TODO rename forEach or smth.
addCondition(
    'map',
    {fun:1,args:2},
    (list, contract) => {
        if (!Array.isArray(list))
            return 'Expected a list, found a '.typeof(list);
        if (list.length < 1)
            return 0; // auto-pass

        return report( ok => {
            list.forEach( (item, index) => ok.nested( "item "+index, item, contract ) );
        });
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

        return report( ok => {
            for (let n = 0; n < list.length-1; n++) {
                ok.nested( "items "+n+", "+(n+1), list[n], list[n+1], contract);
            }
        });
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


},{"../report.js":5}],4:[function(require,module,exports){
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

},{"../report.js":5}],5:[function(require,module,exports){
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
        this._diag      = [];
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
    diag( ...message ) {
        if (this._done)
            throw new Error ('Attempt to modify a finished Report');
        if (!this._diag[this._count])
            this._diag[this._count] = [];
        this._diag[this._count].push( message.map( s=>_explain(s) ).join(" ") );
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
        // TODO diag[0]
        const preface = this.getDetails(0);
        tap.push( ...preface.diag.map( s => '# '+s ) );
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
        tap.push(...data.diag.map(s=>'# '+s));
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
                diag: this._diag[0] || [],
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
            diag:   this._diag[n] || [],
            nested: this._nested[n],
        };
    }

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
 *   @desc Create a fresh Report object and pass it to a function.
 *   @returns {Report}
 *   @param {Function} callback
 *   The last argument must be a callback taking {Report} as first argument.
 *   Any preceding arguments will be forwarded to callback as is.
 */
function report (...args) {
    return new Report().run(...args).stop();
}

/**
 *   @exports Report
 *   @exports report
 *   @exports addCondition
 *   @exports explain
 */

module.exports = { Report, report, addCondition, explain };

},{"./util.js":6}],6:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9yZWZ1dGUuanMiLCJsaWIvcmVmdXRlL2NvbmQvYXJyYXkuanMiLCJsaWIvcmVmdXRlL2NvbmQvYmFzaWMuanMiLCJsaWIvcmVmdXRlL2NvbmQvZGVlcC5qcyIsImxpYi9yZWZ1dGUvcmVwb3J0LmpzIiwibGliL3JlZnV0ZS91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IFJlcG9ydCwgcmVwb3J0LCBhZGRDb25kaXRpb24gLCBleHBsYWluIH0gPSByZXF1aXJlICgnLi9yZWZ1dGUvcmVwb3J0LmpzJyk7XG5cbi8vIGltcG9ydCBkZWZhdWx0IGNvbmRpdGlvbiBhcnNlbmFsXG5yZXF1aXJlKCAnLi9yZWZ1dGUvY29uZC9iYXNpYy5qcycgKTtcbnJlcXVpcmUoICcuL3JlZnV0ZS9jb25kL2FycmF5LmpzJyApO1xucmVxdWlyZSggJy4vcmVmdXRlL2NvbmQvZGVlcC5qcycgKTtcblxuLy8gQWxsb3cgY3JlYXRpbmcgbXVsdGlwbGUgcGFyYWxsZWwgY29uZmlndXJhdGlvbnMgb2YgcmVmdXRlXG4vLyBlLmcuIG9uZSBzdHJpY3QgKHRocm93aW5nIGVycm9ycykgYW5kIG90aGVyIGxheCAoanVzdCBkZWJ1Z2dpbmcgdG8gY29uc29sZSlcbmZ1bmN0aW9uIHNldHVwKCBvcHRpb25zPXt9ICkge1xuICAgIC8vIFRPRE8gdmFsaWRhdGUgb3B0aW9uc1xuICAgIGNvbnN0IG9uRmFpbCA9IG9wdGlvbnMub25GYWlsIHx8IChyZXAgPT4geyB0aHJvdyBuZXcgRXJyb3IocmVwLmdldFRhcCgpKSB9KTtcblxuICAgIGNvbnN0IHJlZnV0ZSA9IG9wdGlvbnMuc2tpcFxuICAgICAgICA/ICgpPT57fVxuICAgICAgICA6ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBvayA9IHJlcG9ydCguLi5hcmdzKTtcbiAgICAgICAgICAgIGlmICghb2suZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgIG9uRmFpbChvaywgYXJncyk7XG4gICAgICAgIH07XG5cbiAgICAvLyByZWV4cG9ydCBhbGwgZnJvbSByZXBvcnQuanNcbiAgICByZWZ1dGUuUmVwb3J0ID0gUmVwb3J0O1xuICAgIHJlZnV0ZS5yZXBvcnQgPSByZXBvcnQ7IC8vIFRPRE8gb3VjaCwgcmVuYW1lP1xuICAgIHJlZnV0ZS5leHBsYWluID0gZXhwbGFpbjtcbiAgICByZWZ1dGUuYWRkQ29uZGl0aW9uID0gYWRkQ29uZGl0aW9uO1xuXG4gICAgLy8gcmVmdXRlLmNvbmYoey4uLn0pIHdpbGwgZ2VuZXJhdGUgYSBfbmV3XyByZWZ1dGVcbiAgICByZWZ1dGUuY29uZmlnID0gdXBkYXRlID0+IHNldHVwKCB7IC4uLm9wdGlvbnMsIC4uLnVwZGF0ZSB9ICk7XG5cbiAgICAvLyBUT0RPIHRoaXMgaXMgc3R1cGlkLCBjb21lIHVwIHdpdGggc210aCBiZXR0ZXJcbiAgICAvLyB3aGVuIGluIGJyb3dzZXIsIHdpbmRvdy5yZWZ1dGUuY29uZmlnKCkgdXBkYXRlcyB3aW5kb3cucmVmdXRlIGl0c2VsZlxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzID09PSB3aW5kb3cucmVmdXRlKVxuICAgICAgICB3aW5kb3cucmVmdXRlID0gcmVmdXRlO1xuXG4gICAgcmV0dXJuIHJlZnV0ZTtcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKVxuICAgIG1vZHVsZS5leHBvcnRzID0gc2V0dXAoKTtcbmlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJylcbiAgICB3aW5kb3cucmVmdXRlID0gc2V0dXAoKTsgLy8gVE9ETyBjaGVjayBwcmVleGlzdGluZ1xuXG4vKipcbiAqICAgQGNhbGxiYWNrIENvbnRyYWN0XG4gKiAgIEBkZXNjIEEgY29kZSBibG9jayBjb250YWluaW5nIG9uZSBvciBtb3JlIGNvbmRpdGlvbiBjaGVja3MuXG4gKiAgIEEgY2hlY2sgaXMgcGVyZm9ybWVkIGJ5IGNhbGxpbmcgb25lIG9mIGEgZmV3IHNwZWNpYWwgbWV0aG9kc1xuICogICAoZXF1YWwsIG1hdGNoLCBkZWVwRXF1YWwsIHR5cGUgZXRjKVxuICogICBvbiB0aGUgUmVwb3J0IG9iamVjdC5cbiAqICAgQ29udHJhY3RzIG1heSBiZSBuZXN0ZWQgdXNpbmcgdGhlICduZXN0ZWQnIG1ldGhvZCB3aGljaCBhY2NlcHRzXG4gKiAgIGFub3RoZXIgY29udHJhY3QgYW5kIHJlY29yZHMgYSBwYXNzL2ZhaWx1cmUgaW4gdGhlIHBhcmVudCBhY2NvcmRpbmdseS5xXG4gKiAgIEEgY29udHJhY3QgaXMgYWx3YXlzIGV4ZWN1dGVkIHRvIHRoZSBlbmQuXG4gKiAgIEBwYXJhbSB7UmVwb3J0fSBvayBBbiBvYmplY3QgdGhhdCByZWNvcmRzIGNoZWNrIHJlc3VsdHMuXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzXG4gKiAgIChlLmcuIGRhdGEgc3RydWN0dXJlIHRvIGJlIHZhbGlkYXRlZClcbiAqICAgQHJldHVybnMge3ZvaWR9IFJldHVybmVkIHZhbHVlIGlzIGlnbm9yZWQuXG4gKi9cblxuLyoqXG4gKiAgIEBwdWJsaWNcbiAqICAgQGZ1bmN0aW9uIHJlZnV0ZVxuICogICBAcGFyYW0ge0FueX0gWy4uLmxpc3RdIERhdGEgdG8gZmVlZCB0byB0aGUgY2FsbGJhY2tcbiAqICAgQHBhcmFtIHtDb250cmFjdH0gY29udHJhY3QgQSBjb2RlIGJsb2NrIHdpdGggY2hlY2tzLlxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfSBSZXR1cm4gdmFsdWUgaXMgaWdub3JlZC5cbiAqICAgQHRocm93cyB7RXJyb3J9IElmIG9uZSBvciBtb3JlIGNoZWNrcyBhcmUgZmFpbGluZywgYW4gZXhjZXB0aW9uIGlzIHRocm93blxuICogICB3aXRoIGRldGFpbHMgYWJvdXQgYWxsIHBhc3NpbmcvZmFpbGluZyBjaGVja3MuXG4gKiAgIFRoaXMgYWN0aW9uIGNhbiBiZSBjaGFuZ2VkIHZpYSByZWZ1dGUuY29uZmlnKCkgY2FsbC5cbiAqL1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCByZXBvcnQgfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5cbi8vIFRPRE8gcmVuYW1lIGZvckVhY2ggb3Igc210aC5cbmFkZENvbmRpdGlvbihcbiAgICAnbWFwJyxcbiAgICB7ZnVuOjEsYXJnczoyfSxcbiAgICAobGlzdCwgY29udHJhY3QpID0+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKVxuICAgICAgICAgICAgcmV0dXJuICdFeHBlY3RlZCBhIGxpc3QsIGZvdW5kIGEgJy50eXBlb2YobGlzdCk7XG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA8IDEpXG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gYXV0by1wYXNzXG5cbiAgICAgICAgcmV0dXJuIHJlcG9ydCggb2sgPT4ge1xuICAgICAgICAgICAgbGlzdC5mb3JFYWNoKCAoaXRlbSwgaW5kZXgpID0+IG9rLm5lc3RlZCggXCJpdGVtIFwiK2luZGV4LCBpdGVtLCBjb250cmFjdCApICk7XG4gICAgICAgIH0pO1xuICAgIH1cbik7XG5cbi8vIFRPRE8gdGhpcyBpcyBjYWxsZWQgXCJjb21wbGlhbnQgY2hhaW5cIiBidXQgYmV0dGVyIGp1c3Qgc2F5IGhlcmVcbi8vIFwib2ggd2UncmUgY2hlY2tpbmcgZWxlbWVudCBvcmRlclwiXG5hZGRDb25kaXRpb24oXG4gICAgJ29yZGVyZWQnLCAvLyBUT0RPIGJldHRlciBuYW1lP1xuICAgIHtmdW46MSxhcmdzOjJ9LFxuICAgIChsaXN0LCBjb250cmFjdCkgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpXG4gICAgICAgICAgICByZXR1cm4gJ0V4cGVjdGVkIGEgbGlzdCwgZm91bmQgYSAnLnR5cGVvZihsaXN0KTtcbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoIDwgMilcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBhdXRvLXBhc3NcblxuICAgICAgICByZXR1cm4gcmVwb3J0KCBvayA9PiB7XG4gICAgICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IGxpc3QubGVuZ3RoLTE7IG4rKykge1xuICAgICAgICAgICAgICAgIG9rLm5lc3RlZCggXCJpdGVtcyBcIituK1wiLCBcIisobisxKSwgbGlzdFtuXSwgbGlzdFtuKzFdLCBjb250cmFjdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbik7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIHJlcG9ydCwgZXhwbGFpbiB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcbmNvbnN0IE9LID0gZmFsc2U7XG5cbmNvbnN0IG51bUNtcCA9IHtcbiAgICAnPCcgOiAoeCx5KT0+KHggIDwgeSksXG4gICAgJz4nIDogKHgseSk9Pih4ICA+IHkpLFxuICAgICc8PSc6ICh4LHkpPT4oeCA8PSB5KSxcbiAgICAnPj0nOiAoeCx5KT0+KHggPj0geSksXG4gICAgJz09JzogKHgseSk9Pih4ID09PSB5KSxcbiAgICAnIT0nOiAoeCx5KT0+KHggIT09IHkpLFxufTtcblxuLy8gdXNlICE9IGFuZCBub3QgIT09IGRlbGliZXJhdGVseSB0byBmaWx0ZXIgb3V0IG51bGwgJiB1bmRlZmluZWRcbmNvbnN0IHN0ckNtcCA9IHtcbiAgICAnPCcgOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggIDwgJycreSksXG4gICAgJz4nIDogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ICA+ICcnK3kpLFxuICAgICc8PSc6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCA8PSAnJyt5KSxcbiAgICAnPj0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPj0gJycreSksXG5cbiAgICAnPT0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPT09ICcnK3kpLFxuICAgICchPSc6ICh4LHkpPT4oKHggPT0gdW5kZWZpbmVkKV4oeSA9PSB1bmRlZmluZWQpKSB8fCAoJycreCAhPT0gJycreSksXG59O1xuXG5hZGRDb25kaXRpb24oXG4gICAgJ251bUNtcCcsXG4gICAge2FyZ3M6M30sXG4gICAgKHgsb3AseSkgPT4gbnVtQ21wW29wXSh4LHkpPzA6W3gsXCJpcyBub3QgXCIrb3AseV1cbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ3N0ckNtcCcsXG4gICAge2FyZ3M6M30sXG4gICAgKHgsb3AseSkgPT4gc3RyQ21wW29wXSh4LHkpPzA6W3gsXCJpcyBub3QgXCIrb3AseV1cbik7XG5cbmNvbnN0IHR5cGVDaGVjayA9IHtcbiAgICB1bmRlZmluZWQ6IHggPT4geCA9PT0gdW5kZWZpbmVkLFxuICAgIG51bGw6ICAgICAgeCA9PiB4ID09PSBudWxsLFxuICAgIG51bWJlcjogICAgeCA9PiB0eXBlb2YgeCA9PT0gJ251bWJlcicgJiYgIU51bWJlci5pc05hTih4KSxcbiAgICBpbnRlZ2VyOiAgIHggPT4gTnVtYmVyLmlzSW50ZWdlcih4KSxcbiAgICBuYW46ICAgICAgIHggPT4gTnVtYmVyLmlzTmFOKHgpLFxuICAgIHN0cmluZzogICAgeCA9PiB0eXBlb2YgeCA9PT0gJ3N0cmluZycsXG4gICAgZnVuY3Rpb246ICB4ID0+IHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nLFxuICAgIGJvb2xlYW46ICAgeCA9PiB0eXBlb2YgeCA9PT0gJ2Jvb2xlYW4nLFxuICAgIG9iamVjdDogICAgeCA9PiB4ICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh4KSxcbiAgICBhcnJheTogICAgIHggPT4gQXJyYXkuaXNBcnJheSh4KSxcbn07XG5mdW5jdGlvbiB0eXBlRXhwbGFpbiAoeCkge1xuICAgIGlmICh0eXBlb2YgeCA9PT0gJ3N0cmluZycpXG4gICAgICAgIHJldHVybiB4O1xuICAgIGlmICh0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgcmV0dXJuICdpbnN0YW5jZW9mICcrKHgubmFtZSB8fCB4KTtcbn07XG5cbmFkZENvbmRpdGlvbihcbiAgICAndHlwZScsXG4gICAge2FyZ3M6IDJ9LFxuICAgIChnb3QsIGV4cCk9PntcbiAgICAgICAgaWYgKCAhQXJyYXkuaXNBcnJheShleHApIClcbiAgICAgICAgICAgIGV4cCA9IFtleHBdO1xuXG4gICAgICAgIGZvciAobGV0IHZhcmlhbnQgb2YgZXhwKSB7XG4gICAgICAgICAgICAvLyBrbm93biB0eXBlXG4gICAgICAgICAgICBpZiggdHlwZW9mIHZhcmlhbnQgPT09ICdzdHJpbmcnICYmIHR5cGVDaGVja1t2YXJpYW50XSApIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZUNoZWNrW3ZhcmlhbnRdKGdvdCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPSztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGluc3RhbmNlb2ZcbiAgICAgICAgICAgIGlmKCB0eXBlb2YgdmFyaWFudCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZ290ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGlmKCBnb3QgaW5zdGFuY2VvZiB2YXJpYW50IClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9LO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gZG9uJ3Qga25vdyB3aGF0IHlvdSdyZSBhc2tpbmcgZm9yXG4gICAgICAgICAgICByZXR1cm4gJ3Vua25vd24gdmFsdWUgdHlwZSBzcGVjOiAnK2V4cGxhaW4odmFyaWFudCwgMSk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAnLSAnK2V4cGxhaW4oZ290LCAxKSxcbiAgICAgICAgICAgICcrICcrZXhwLm1hcCggdHlwZUV4cGxhaW4gKS5qb2luKFwiIG9yIFwiKSxcbiAgICAgICAgXTtcbiAgICB9XG4pO1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCBleHBsYWluIH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuXG5hZGRDb25kaXRpb24oICdkZWVwRXF1YWwnLCB7XCJhcmdzXCI6MixoYXNPcHRpb25zOnRydWV9LCBkZWVwICk7XG5cbmZ1bmN0aW9uIGRlZXAoIGdvdCwgZXhwLCBvcHRpb25zPXt9ICkge1xuICAgIGlmICghb3B0aW9ucy5tYXgpXG4gICAgICAgIG9wdGlvbnMubWF4ID0gNTtcbiAgICBvcHRpb25zLmRpZmYgPSBbXTtcbiAgICBfZGVlcCggZ290LCBleHAsIG9wdGlvbnMgKTtcbiAgICBpZiAoIW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgIHJldHVybiAwO1xuXG4gICAgY29uc3QgcmV0ID0gW107XG4gICAgZm9yIChsZXQgaXRlbSBvZiBvcHRpb25zLmRpZmYpIHtcbiAgICAgICAgcmV0LnB1c2goIFxuICAgICAgICAgICAgXCJhdCBcIitpdGVtWzBdLFxuICAgICAgICAgICAgXCItIFwiK2V4cGxhaW4oIGl0ZW1bMV0sIDIgKSxcbiAgICAgICAgICAgIFwiKyBcIitleHBsYWluKCBpdGVtWzJdLCAyIClcbiAgICAgICAgKTtcbiAgICB9O1xuICAgIHJldHVybiByZXQ7XG59O1xuXG4vLyByZXN1bHQgaXMgc3RvcmVkIGluIG9wdGlvbnMuZGlmZj1bXSwgcmV0dXJuIHZhbHVlIGlzIGlnbm9yZWRcbi8vIGlmIHNhaWQgZGlmZiBleGNlZWRzIG1heCwgcmV0dXJuIGltbWVkaWF0ZWx5ICYgZG9uJ3Qgd2FzdGUgdGltZVxuZnVuY3Rpb24gX2RlZXAoIGdvdCwgZXhwLCBvcHRpb25zPXt9LCBwYXRoPSckJywgc2Vlbj1uZXcgU2V0KCkgKSB7XG4gICAgaWYgKGdvdCA9PT0gZXhwIHx8IG9wdGlvbnMubWF4IDw9IG9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgIHJldHVybjtcbiAgICBpZiAodHlwZW9mIGdvdCAhPT0gdHlwZW9mIGV4cClcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuXG4gICAgLy8gcmVjdXJzZSBieSBleHBlY3RlZCB2YWx1ZSAtIGNvbnNpZGVyIGl0IG1vcmUgcHJlZGljdGFibGVcbiAgICBpZiAodHlwZW9mIGV4cCAhPT0gJ29iamVjdCcgfHwgZXhwID09PSBudWxsICkge1xuICAgICAgICAvLyBub24tb2JqZWN0cyAtIHNvIGNhbid0IGRlc2NlbmRcbiAgICAgICAgLy8gYW5kIGNvbXBhcmlzb24gYWxyZWFkeSBkb25lIGF0IHRoZSBiZWdpbm5uaW5nXG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcbiAgICB9XG5cbiAgICAvLyBtdXN0IGRldGVjdCBsb29wcyBiZWZvcmUgZ29pbmcgZG93blxuICAgIGlmIChzZWVuLmhhcyhleHApKSB7XG4gICAgICAgIG9wdGlvbnMubWF4ID0gMDtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBcbiAgICAgICAgICAgIFtwYXRoICsgJyAoRXhwZWN0aW5nIGNpcmN1bGFyIHJlZmVyZW5jZSwgYXV0by1mYWlsKScsIGdvdCwgZXhwIF0gKTtcbiAgICB9O1xuICAgIHNlZW4uYWRkKGV4cCk7XG5cbiAgICAvLyBjb21wYXJlIG9iamVjdCB0eXBlc1xuICAgIC8vIChpZiBhIHVzZXIgaXMgc3R1cGlkIGVub3VnaCB0byBvdmVycmlkZSBjb25zdHJ1Y3RvciBmaWVsZCwgd2VsbCB0aGUgdGVzdFxuICAgIC8vIHdvdWxkIGZhaWwgbGF0ZXIgYW55d2F5KVxuICAgIGlmIChnb3QuY29uc3RydWN0b3IgIT09IGV4cC5jb25zdHJ1Y3RvcilcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuXG4gICAgLy8gYXJyYXlcbiAgICBpZiAoQXJyYXkuaXNBcnJheShleHApKSB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShnb3QpIHx8IGdvdC5sZW5ndGggIT09IGV4cC5sZW5ndGgpXG4gICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBleHAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIF9kZWVwKCBnb3RbaV0sIGV4cFtpXSwgb3B0aW9ucywgcGF0aCsnWycraSsnXScsIG5ldyBTZXQoc2VlbikpO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMubWF4PD1vcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm47XG4gICAgfTtcblxuICAgIC8vIGNvbXBhcmUga2V5cyAtICsxIGZvciBleHAsIC0xIGZvciBnb3QsIG5vbnplcm8ga2V5IGF0IGVuZCBtZWFucyBrZXlzIGRpZmZlclxuICAgIGNvbnN0IHVuaXEgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhleHApLmZvckVhY2goIHggPT4gdW5pcVt4XSA9IDEgKTtcbiAgICBPYmplY3Qua2V5cyhnb3QpLmZvckVhY2goIHggPT4gdW5pcVt4XSA9ICh1bmlxW3hdIHx8IDApIC0gMSApO1xuICAgIGZvciAobGV0IHggaW4gdW5pcSkge1xuICAgICAgICBpZiAodW5pcVt4XSAhPT0gMClcbiAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcbiAgICB9XG4gICAgXG4gICAgLy8gbm93IHR5cGVvZiwgb2JqZWN0IHR5cGUsIGFuZCBvYmplY3Qga2V5cyBhcmUgdGhlIHNhbWUuXG4gICAgLy8gcmVjdXJzZS5cbiAgICBmb3IgKGxldCBpIGluIGV4cCkge1xuICAgICAgICBfZGVlcCggZ290W2ldLCBleHBbaV0sIG9wdGlvbnMsIHBhdGgrJ1snK2V4cGxhaW4oaSkrJ10nLCBuZXcgU2V0KHNlZW4pKTtcbiAgICAgICAgaWYgKG9wdGlvbnMubWF4PD1vcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgfTtcbiAgICByZXR1cm47XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGNhbGxlckluZm8sIGV4cGxhaW4sIG1ha2VFcnJvciB9ID0gcmVxdWlyZSggJy4vdXRpbC5qcycgKTtcblxuLyoqXG4gKiBAcHVibGljXG4gKiBAY2xhc3NkZXNjXG4gKiBUaGUgY29yZSBvZiB0aGUgcmVmdXRlIGxpYnJhcnksIHRoZSByZXBvcnQgb2JqZWN0IGNvbnRhaW5zIGluZm9cbiAqIGFib3V0IHBhc3NpbmcgYW5kIGZhaWxpbmcgY29uZGl0aW9ucy5cbiAqL1xuY2xhc3MgUmVwb3J0IHtcbiAgICAvLyBzZXR1cFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9jb3VudCAgICAgPSAwO1xuICAgICAgICB0aGlzLl9mYWlsQ291bnQgPSAwO1xuICAgICAgICB0aGlzLl9kZXNjciAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fZXZpZGVuY2UgID0gW107XG4gICAgICAgIHRoaXMuX3doZXJlICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9jb25kTmFtZSAgPSBbXTtcbiAgICAgICAgdGhpcy5fZGlhZyAgICAgID0gW107XG4gICAgICAgIHRoaXMuX25lc3RlZCAgICA9IFtdO1xuICAgICAgICB0aGlzLl9kb25lICAgICAgPSBmYWxzZTtcbiAgICAgICAgLy8gVE9ETyBhZGQgY2FsbGVyIGluZm8gYWJvdXQgdGhlIHJlcG9ydCBpdHNlbGZcbiAgICB9XG5cbiAgICAvLyBzZXR1cCAtIG11c3QgYmUgY2hhaW5hYmxlXG4gICAgc2V0VGl0bGUoc3RyKSB7XG4gICAgICAgIHRoaXMuX3RpdGxlID0gc3RyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgLy8gcnVubmluZ1xuICAgIHJ1biguLi5hcmdzKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnQXR0ZW1wdCB0byBtb2RpZnkgYSBmaW5pc2hlZCBSZXBvcnQnKTtcbiAgICAgICAgY29uc3QgYmxvY2sgPSBhcmdzLnBvcCgpO1xuICAgICAgICBpZiAodHlwZW9mIGJsb2NrICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdMYXN0IGFyZ3VtZW50IG9mIHJ1bigpIG11c3QgYmUgYSBmdW5jdGlvbiwgbm90ICcrdHlwZW9mKGJsb2NrKSk7XG4gICAgICAgIGJsb2NrKCB0aGlzLCAuLi5hcmdzICk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIEluIHRoZW9yeSwgaGF2aW5nIGNvbnN0IG49bmV4dCgpOyBzZXRSZXN1bHQobi4gLi4uKVxuICAgIC8vIHNob3VsZCBhbGxvdyBmb3IgYXN5bmMgY29uZGl0aW9ucyBpbiB0aGUgZnV0dXJlXG4gICAgLy8gaWYgYXQgYWxsIHBvc3NpYmxlIHdpdGhvdXQgZ3JlYXQgc2FjcmlmaWNlcy5cbiAgICBuZXh0KCkge1xuICAgICAgICBpZiAodGhpcy5fZG9uZSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciAoJ0F0dGVtcHQgdG8gbW9kaWZ5IGEgZmluaXNoZWQgUmVwb3J0Jyk7XG4gICAgICAgIHJldHVybiArK3RoaXMuX2NvdW50O1xuICAgIH1cblxuICAgIHNldFJlc3VsdCAobiwgZXZpZGVuY2UsIGRlc2NyLCBjb25kTmFtZSkge1xuICAgICAgICBpZiAodGhpcy5fZG9uZSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciAoJ0F0dGVtcHQgdG8gbW9kaWZ5IGEgZmluaXNoZWQgUmVwb3J0Jyk7XG4gICAgICAgIGlmIChuID4gdGhpcy5fY291bnQpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdBdHRlbXB0IHRvIHNldCBjb25kaXRpb24gYmV5b25kIGNoZWNrIGNvdW50Jyk7XG4gICAgICAgIGlmIChkZXNjcilcbiAgICAgICAgICAgIHRoaXMuX2Rlc2NyW25dID0gZGVzY3I7XG4gICAgICAgIC8vIHBhc3MgLSByZXR1cm4gQVNBUFxuICAgICAgICBpZiAoIWV2aWRlbmNlKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIC8vIG5lc3RlZCByZXBvcnQgbmVlZHMgc3BlY2lhbCBoYW5kbGluZ1xuICAgICAgICBpZiAoZXZpZGVuY2UgaW5zdGFuY2VvZiBSZXBvcnQpIHtcbiAgICAgICAgICAgIHRoaXMuX25lc3RlZFtuXSA9IGV2aWRlbmNlO1xuICAgICAgICAgICAgaWYgKGV2aWRlbmNlLmdldFBhc3MoKSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBldmlkZW5jZSA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gbGlzdGlmeSAmIHN0cmluZ2lmeSBldmlkZW5jZSwgc28gdGhhdCBpdCBkb2Vzbid0IGNoYW5nZSBwb3N0LWZhY3R1bVxuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZXZpZGVuY2UpKVxuICAgICAgICAgICAgZXZpZGVuY2UgPSBbIGV2aWRlbmNlIF07XG4gICAgICAgIHRoaXMuX2V2aWRlbmNlW25dID0gZXZpZGVuY2UubWFwKCB4PT5fZXhwbGFpbih4LCBJbmZpbml0eSkgKTtcbiAgICAgICAgdGhpcy5fd2hlcmVbbl0gICAgPSBjYWxsZXJJbmZvKDIpO1xuICAgICAgICB0aGlzLl9jb25kTmFtZVtuXSA9IGNvbmROYW1lO1xuICAgICAgICB0aGlzLl9mYWlsQ291bnQrKztcblxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQGRlc2MgQXBwZW5kIGFuIGluZm9ybWF0aW9uYWwgbWVzc2FnZSB0byB0aGUgcmVwb3J0LlxuICAgICAqIE5vbi1zdHJpbmcgdmFsdWVzIHdpbGwgYmUgc3RyaW5naWZpZWQgdmlhIGV4cGxhaW4oKS5cbiAgICAgKiBAcGFyYW0ge0FueX0gbWVzc2FnZVxuICAgICAqIEByZXR1cm5zIHtSZXBvcnR9IGNoYWluYWJsZVxuICAgICAqL1xuICAgIGRpYWcoIC4uLm1lc3NhZ2UgKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnQXR0ZW1wdCB0byBtb2RpZnkgYSBmaW5pc2hlZCBSZXBvcnQnKTtcbiAgICAgICAgaWYgKCF0aGlzLl9kaWFnW3RoaXMuX2NvdW50XSlcbiAgICAgICAgICAgIHRoaXMuX2RpYWdbdGhpcy5fY291bnRdID0gW107XG4gICAgICAgIHRoaXMuX2RpYWdbdGhpcy5fY291bnRdLnB1c2goIG1lc3NhZ2UubWFwKCBzPT5fZXhwbGFpbihzKSApLmpvaW4oXCIgXCIpICk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHN0b3AoKSB7XG4gICAgICAgIHRoaXMuX2RvbmUgPSB0cnVlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvLyBxdWVyeWluZ1xuICAgIGdldFRpdGxlKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdGl0bGU7IC8vSkZZSVxuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiAgIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGdldERvbmUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kb25lOyAvLyBpcyBpdCBldmVuIG5lZWRlZD9cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIFdpdGhvdXQgYXJndW1lbnQgcmV0dXJucyB3aGV0aGVyIHRoZSBjb250cmFjdCB3YXMgZnVsZmlsbGVkLlxuICAgICAqICAgQXMgYSBzcGVjaWFsIGNhc2UsIGlmIG5vIGNoZWNrcyB3ZXJlIHJ1biBhbmQgdGhlIGNvbnRyYWN0IGlzIGZpbmlzaGVkLFxuICAgICAqICAgcmV0dXJucyBmYWxzZSwgYXMgaW4gXCJzb21lb25lIG11c3QgaGF2ZSBmb3Jnb3R0ZW4gdG8gZXhlY3V0ZVxuICAgICAqICAgcGxhbm5lZCBjaGVja3MuIFVzZSBwYXNzKCkgaWYgbm8gY2hlY2tzIGFyZSBwbGFubmVkLlxuICAgICAqXG4gICAgICogICBJZiBhIHBhcmFtZXRlciBpcyBnaXZlbiwgcmV0dXJuIHRoZSBzdGF0dXMgb2Ygbi10aCBjaGVjayBpbnN0ZWFkLlxuICAgICAqICAgQHBhcmFtIHtpbnRlZ2VyfSBuXG4gICAgICogICBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBnZXRQYXNzKG4pIHtcbiAgICAgICAgaWYgKG4gPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9mYWlsQ291bnQgPT09IDAgJiYgKCF0aGlzLl9kb25lIHx8IHRoaXMuX2NvdW50ID4gMCk7XG4gICAgICAgIHJldHVybiAobiA+IDAgJiYgbiA8PSB0aGlzLl9jb3VudCkgPyAhdGhpcy5fZXZpZGVuY2Vbbl0gOiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBOdW1iZXIgb2YgY2hlY2tzIHBlcmZvcm1lZC5cbiAgICAgKiAgIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0Q291bnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb3VudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgV2hldGhlciB0aGUgbGFzdCBjaGVjayB3YXMgYSBzdWNjZXNzLlxuICAgICAqICBUaGlzIGlzIGp1c3QgYSBzaG9ydGN1dCBmb3IgZm9vLmdldERldGFpbHMoZm9vLmdldENvdW50KS5wYXNzXG4gICAgICogIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGxhc3QoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb3VudCA/ICF0aGlzLl9ldmlkZW5jZVt0aGlzLl9jb3VudF0gOiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBOdW1iZXIgb2YgY2hlY2tzIGZhaWxpbmcuXG4gICAgICogICBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldEZhaWxDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2ZhaWxDb3VudDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIFJldHVybiBhIHN0cmluZyBvZiBmYWlsaW5nL3Bhc3NpbmcgY2hlY2tzLlxuICAgICAqICAgVGhpcyBtYXkgYmUgdXNlZnVsIGZvciB2YWxpZGF0aW5nIGN1c3RvbSBjb25kaXRpb25zLlxuICAgICAqICAgQ29uc2VjdXRpdmUgcGFzc2luZyBjaGVja2EgYXJlIHJlcHJlc2VudGVkIGJ5IG51bWJlcnMuXG4gICAgICogICBBIGNhcGl0YWwgbGV0dGVyIGluIHRoZSBzdHJpbmcgcmVwcmVzZW50cyBmYWlsdXJlLlxuICAgICAqICAgQHJldHVybnMge3N0cmluZ31cbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBwYXNzaW5nIGNoZWNrc1xuICAgICAqICAgXCJyKDEwKVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgY2hlY2tzIHdpdGggMSBmYWlsdXJlIGluIHRoZSBtaWRkbGVcbiAgICAgKiAgIFwicig1LE4sNClcIlxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIGNoZWNrcyBpbmNsdWRpbmcgYSBuZXN0ZWQgY29udHJhY3RcbiAgICAgKiAgIFwicigzLHIoMSxOKSw2KVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gbm8gY2hlY2tzIHdlcmUgcnVuIC0gYXV0by1mYWlsXG4gICAgICogICBcInIoWilcIlxuICAgICAqL1xuICAgIGdldEdob3N0KCkge1xuICAgICAgICBjb25zdCBnaG9zdCA9IFtdO1xuICAgICAgICBsZXQgc3RyZWFrID0gMDtcbiAgICAgICAgZm9yIChsZXQgaT0xOyBpIDw9IHRoaXMuX2NvdW50OyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9ldmlkZW5jZVtpXSB8fCB0aGlzLl9uZXN0ZWRbaV0pIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RyZWFrKSBnaG9zdC5wdXNoKHN0cmVhayk7XG4gICAgICAgICAgICAgICAgc3RyZWFrID0gMDtcbiAgICAgICAgICAgICAgICBnaG9zdC5wdXNoKCB0aGlzLl9uZXN0ZWRbaV0gPyB0aGlzLl9uZXN0ZWRbaV0uZ2V0R2hvc3QoKSA6ICdOJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0cmVhaysrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzdHJlYWspIGdob3N0LnB1c2goc3RyZWFrKTtcbiAgICAgICAgaWYgKGdob3N0Lmxlbmd0aCA9PT0gMCAmJiAhdGhpcy5nZXRQYXNzKCkpXG4gICAgICAgICAgICBnaG9zdC5wdXNoKCdaJyk7XG4gICAgICAgIHJldHVybiAncignK2dob3N0LmpvaW4oJywnKSsnKSc7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIHJldHVybnMgYSBwbGFpbiBzZXJpYWxpemFibGUgb2JqZWN0XG4gICAgICogIEByZXR1cm5zIHtPYmplY3R9XG4gICAgICovXG4gICAgdG9KU09OKCkge1xuICAgICAgICBjb25zdCBuID0gdGhpcy5nZXRDb3VudCgpO1xuICAgICAgICBjb25zdCBkZXRhaWxzID0gW107XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpPD1uOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLmdldERldGFpbHMoaSk7XG4gICAgICAgICAgICAvLyBzdHJpcCBleHRyYSBrZXlzXG4gICAgICAgICAgICBmb3IoIGxldCBrZXkgaW4gbm9kZSApIHtcbiAgICAgICAgICAgICAgICBpZiAobm9kZVtrZXldID09PSB1bmRlZmluZWQgfHwgKEFycmF5LmlzQXJyYXkobm9kZVtrZXldKSAmJiBub2RlW2tleV0ubGVuZ3RoID09PSAwKSlcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG5vZGVba2V5XTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBkZXRhaWxzLnB1c2gobm9kZSk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwYXNzOiAgdGhpcy5nZXRQYXNzKCksXG4gICAgICAgICAgICBjb3VudDogdGhpcy5nZXRDb3VudCgpLFxuICAgICAgICAgICAgdGl0bGU6IHRoaXMuZ2V0VGl0bGUoKSxcbiAgICAgICAgICAgIGRldGFpbHMsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgdG9TdHJpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmdldFRhcCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBSZXR1cm5zIHJlcG9ydCBzdHJpbmdpZmllZCBhcyBUQVAgZm9ybWF0XG4gICAgICogIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0VGFwKG4pIHtcbiAgICAgICAgY29uc3QgdGFwID0gbiA9PT0gdW5kZWZpbmVkID8gdGhpcy5nZXRUYXBMaW5lcygpIDogdGhpcy5nZXRUYXBFbnRyeShuKTtcbiAgICAgICAgdGFwLnB1c2goJycpO1xuICAgICAgICByZXR1cm4gdGFwLmpvaW4oJ1xcbicpO1xuICAgIH1cblxuICAgIGdldFRhcExpbmVzKG4pIHtcbiAgICAgICAgLy8gVEFQIGZvciBub3csIHVzZSBhbm90aGVyIGZvcm1hdCBsYXRlciBiZWNhdXNlIFwicGVybCBpcyBzY2FyeVwiXG4gICAgICAgIGNvbnN0IHRhcCA9IFsgJzEuLicrdGhpcy5fY291bnQgXTtcbiAgICAgICAgaWYgKHRoaXMuZ2V0VGl0bGUoKSlcbiAgICAgICAgICAgIHRhcC5wdXNoKCcjICcrdGhpcy5nZXRUaXRsZSgpKTtcbiAgICAgICAgLy8gVE9ETyBkaWFnWzBdXG4gICAgICAgIGNvbnN0IHByZWZhY2UgPSB0aGlzLmdldERldGFpbHMoMCk7XG4gICAgICAgIHRhcC5wdXNoKCAuLi5wcmVmYWNlLmRpYWcubWFwKCBzID0+ICcjICcrcyApICk7XG4gICAgICAgIGZvciggbGV0IGkgPSAxOyBpIDw9IHRoaXMuX2NvdW50OyBpKysgKSBcbiAgICAgICAgICAgIHRhcC5wdXNoKCAuLi4gdGhpcy5nZXRUYXBFbnRyeShpKSApO1xuICAgICAgICBpZiAoIXRoaXMuZ2V0UGFzcygpKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5nZXRDb3VudCgpID4gMClcbiAgICAgICAgICAgICAgICB0YXAucHVzaCgnIyBGYWlsZWQgJyt0aGlzLmdldEZhaWxDb3VudCgpKycvJyt0aGlzLmdldENvdW50KCkrICcgY29uZGl0aW9ucycpO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHRhcC5wdXNoKCcjIE5vIGNoZWNrcyB3ZXJlIHJ1biwgY29uc2lkZXIgdXNpbmcgcGFzcygpIGlmIHRoYXRcXCdzIGRlbGliZXJhdGUnKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRhcDtcbiAgICB9XG5cbiAgICBnZXRUYXBFbnRyeShuKSB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB0eXBlb2YobikgPT09ICdvYmplY3QnID8gbiA6IHRoaXMuZ2V0RGV0YWlscyhuKTtcbiAgICAgICAgY29uc3QgdGFwID0gW107XG4gICAgICAgIGlmIChkYXRhLm5lc3RlZCkge1xuICAgICAgICAgICAgdGFwLnB1c2goICcjIHN1YmNvbnRyYWN0OicrKGRhdGEubmFtZT8nICcrZGF0YS5uYW1lOicnKSApO1xuICAgICAgICAgICAgdGFwLnB1c2goIC4uLiBkYXRhLm5lc3RlZC5nZXRUYXBMaW5lcygpLm1hcCggcyA9PiAnICAgICcrcyApKTtcbiAgICAgICAgfVxuICAgICAgICB0YXAucHVzaCgoZGF0YS5wYXNzPycnOidub3QgJykgKyAnb2sgJyArIGRhdGEublxuICAgICAgICAgICAgKyAoZGF0YS5uYW1lID8gJyAtICcrZGF0YS5uYW1lIDogJycpKTtcbiAgICAgICAgaWYgKCFkYXRhLnBhc3MpXG4gICAgICAgICAgICB0YXAucHVzaCgnIyBDb25kaXRpb24nKyhkYXRhLmNvbmQgPyAnICcrZGF0YS5jb25kIDogJycpKycgZmFpbGVkIGF0ICcrZGF0YS53aGVyZSk7XG4gICAgICAgIHRhcC5wdXNoKC4uLmRhdGEuZXZpZGVuY2UubWFwKHM9PicjICcrcykpO1xuICAgICAgICB0YXAucHVzaCguLi5kYXRhLmRpYWcubWFwKHM9PicjICcrcykpO1xuICAgICAgICByZXR1cm4gdGFwO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgUmV0dXJucyBkZXRhaWxlZCByZXBvcnQgb24gYSBzcGVjaWZpYyBjaGVja1xuICAgICAqICAgQHBhcmFtIHtpbnRlZ2VyfSBuIC0gY2hlY2sgbnVtYmVyLCBtdXN0IGJlIDw9IGdldENvdW50KClcbiAgICAgKiAgIEByZXR1cm5zIHtvYmplY3R9XG4gICAgICovXG4gICAgZ2V0RGV0YWlscyhuKSB7XG4gICAgICAgIC8vIFRPRE8gdmFsaWRhdGUgblxuXG4gICAgICAgIC8vIHVnbHkgYnV0IHdoYXQgY2FuIEkgZG9cbiAgICAgICAgaWYgKG4gPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbjogICAgMCxcbiAgICAgICAgICAgICAgICBkaWFnOiB0aGlzLl9kaWFnWzBdIHx8IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBldmlkZW5jZSA9IHRoaXMuX2V2aWRlbmNlW25dO1xuICAgICAgICBpZiAoZXZpZGVuY2UgJiYgIUFycmF5LmlzQXJyYXkoZXZpZGVuY2UpKVxuICAgICAgICAgICAgZXZpZGVuY2UgPSBbZXZpZGVuY2VdO1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuOiAgICAgIG4sXG4gICAgICAgICAgICBuYW1lOiAgIHRoaXMuX2Rlc2NyW25dIHx8ICcnLFxuICAgICAgICAgICAgcGFzczogICAhZXZpZGVuY2UsXG4gICAgICAgICAgICBldmlkZW5jZTogZXZpZGVuY2UgfHwgW10sXG4gICAgICAgICAgICB3aGVyZTogIHRoaXMuX3doZXJlW25dLFxuICAgICAgICAgICAgY29uZDogICB0aGlzLl9jb25kTmFtZVtuXSxcbiAgICAgICAgICAgIGRpYWc6ICAgdGhpcy5fZGlhZ1tuXSB8fCBbXSxcbiAgICAgICAgICAgIG5lc3RlZDogdGhpcy5fbmVzdGVkW25dLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGdldEVycm9yKG4sIG9wdGlvbnM9e30pIHtcbiAgICAgICAgaWYgKCFuKSB7XG4gICAgICAgICAgICAvLyBubyBlbnRyeSBnaXZlblxuICAgICAgICAgICAgaWYgKCFvcHRpb25zLnBhc3MgJiYgdGhpcy5nZXRQYXNzKCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgICAgICByZXR1cm4gbWFrZUVycm9yKHtcbiAgICAgICAgICAgICAgICBhY3R1YWw6ICAgdGhpcy5nZXRUYXAoKSxcbiAgICAgICAgICAgICAgICBleHBlY3RlZDogJycsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogIHRoaXMuZ2V0VGl0bGUoKSxcbiAgICAgICAgICAgICAgICBvcGVyYXRvcjogJ2NvbnRyYWN0JyxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGRhdGEgPSB0eXBlb2YgbiA9PT0gJ29iamVjdCcgPyBuIDogdGhpcy5nZXREZXRhaWxzKG4pO1xuXG4gICAgICAgIC8vIG5vIGVycm9yXG4gICAgICAgIGlmICghb3B0aW9ucy5wYXNzICYmIGRhdGEucGFzcylcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICByZXR1cm4gbWFrZUVycm9yKHtcbiAgICAgICAgICAgIGFjdHVhbDogICB0aGlzLmdldFRhcEVudHJ5KGRhdGEpLmpvaW4oJ1xcbicpLFxuICAgICAgICAgICAgZXhwZWN0ZWQ6ICcnLFxuICAgICAgICAgICAgbWVzc2FnZTogIGRhdGEubmFtZSxcbiAgICAgICAgICAgIG9wZXJhdG9yOiBkYXRhLmNvbmQsXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGdldFRocm93bihuLCBvcHRpb25zPXt9KSB7XG4gICAgICAgIGNvbnN0IGVyciA9IHRoaXMuZ2V0RXJyb3Iobiwgb3B0aW9ucyk7XG4gICAgICAgIGlmIChlcnIpXG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgfVxufVxuXG4vLyB0aGlzIGlzIGZvciBzdHVmZiBsaWtlIGBvYmplY3QgZm9vID0ge1wiZm9vXCI6NDJ9YFxuLy8gd2UgZG9uJ3Qgd2FudCB0aGUgZXhwbGFuYXRpb24gdG8gYmUgcXVvdGVkIVxuZnVuY3Rpb24gX2V4cGxhaW4oIGl0ZW0sIGRlcHRoICkge1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycgKVxuICAgICAgICByZXR1cm4gaXRlbTtcbiAgICByZXR1cm4gZXhwbGFpbiggaXRlbSwgZGVwdGggKTtcbn07XG5cblJlcG9ydC5wcm90b3R5cGUuZXhwbGFpbiA9IGV4cGxhaW47IC8vIGFsc28gbWFrZSBhdmFpbGFibGUgdmlhIHJlcG9ydFxuXG4vKipcbiAqICBAZGVzYyBDcmVhdGUgbmV3IGNoZWNrIG1ldGhvZCBhdmFpbGFibGUgdmlhIGFsbCBSZXBvcnQgaW5zdGFuY2VzXG4gKiAgQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSBvZiB0aGUgbmV3IGNvbmRpdGlvbi5cbiAqICBNdXN0IG5vdCBiZSBwcmVzZW50IGluIFJlcG9ydCBhbHJlYWR5LCBhbmQgc2hvdWxkIE5PVCBzdGFydCB3aXRoXG4gKiAgZ2V0Li4uLCBzZXQuLi4sIG9yIGFkZC4uLiAodGhlc2UgYXJlIHJlc2VydmVkIGZvciBSZXBvcnQgaXRzZWxmKVxuICogIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIENvbmZpZ3VyaW5nIHRoZSBjaGVjaydzIGhhbmRsaW5nIG9mIGFyZ3VtZW50c1xuICogIEBwYXJhbSB7aW50ZWdlcn0gb3B0aW9ucy5hcmdzIFRoZSByZXF1aXJlZCBudW1iZXIgb2YgYXJndW1lbnRzXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBbb3B0aW9ucy5taW5BcmdzXSBNaW5pbXVtIG51bWJlciBvZiBhcmd1bWVudCAoZGVmYXVsdHMgdG8gYXJncylcbiAqICBAcGFyYW0ge2ludGVnZXJ9IFtvcHRpb25zLm1heEFyZ3NdIE1heGltdW0gbnVtYmVyIG9mIGFyZ3VtZW50IChkZWZhdWx0cyB0byBhcmdzKVxuICogIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuaGFzT3B0aW9uc10gSWYgdHJ1ZSwgYW4gb3B0aW9uYWwgb2JqZWN0XG5jYW4gYmUgc3VwcGxpZWQgYXMgbGFzdCBhcmd1bWVudC4gSXQgd29uJ3QgaW50ZXJmZXJlIHdpdGggZGVzY3JpcHRpb24uXG4gKiAgQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5mdW5dIFRoZSBsYXN0IGFyZ3VtZW50IGlzIGEgY2FsbGJhY2tcbiAqICBAcGFyYW0ge0Z1bmN0aW9ufSBpbXBsZW1lbnRhdGlvbiAtIGEgY2FsbGJhY2sgdGhhdCB0YWtlcyB7YXJnc30gYXJndW1lbnRzXG4gKiAgYW5kIHJldHVybnMgYSBmYWxzZXkgdmFsdWUgaWYgY29uZGl0aW9uIHBhc3Nlc1xuICogIChcIm5vdGhpbmcgdG8gc2VlIGhlcmUsIG1vdmUgYWxvbmdcIiksXG4gKiAgb3IgZXZpZGVuY2UgaWYgaXQgZmFpbHNcbiAqICAoZS5nLiB0eXBpY2FsbHkgYSBnb3QvZXhwZWN0ZWQgZGlmZikuXG4gKi9cbmNvbnN0IHNlZW4gPSBuZXcgU2V0KCk7XG5mdW5jdGlvbiBhZGRDb25kaXRpb24gKG5hbWUsIG9wdGlvbnMsIGltcGwpIHtcbiAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiBuYW1lIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXihffGdldFtfQS1aXXxzZXRbX0EtWl0pLykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uIG5hbWUgbXVzdCBub3Qgc3RhcnQgd2l0aCBnZXRfLCBzZXRfLCBvciBfJyk7XG4gICAgLy8gVE9ETyBtdXN0IGRvIHNvbWV0aGluZyBhYm91dCBuYW1lIGNsYXNoZXMsIGJ1dCBsYXRlclxuICAgIC8vIGJlY2F1c2UgZXZhbCBpbiBicm93c2VyIG1heSAoa2luZCBvZiBsZWdpbWl0ZWx5KSBvdmVycmlkZSBjb25kaXRpb25zXG4gICAgaWYgKCFzZWVuLmhhcyhuYW1lKSAmJiBSZXBvcnQucHJvdG90eXBlW25hbWVdKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01ldGhvZCBhbHJlYWR5IGV4aXN0cyBpbiBSZXBvcnQ6ICcrbmFtZSk7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSAnb2JqZWN0JylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdiYWQgb3B0aW9ucycpO1xuICAgIGlmICh0eXBlb2YgaW1wbCAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdiYWQgaW1wbGVtZW50YXRpb24nKTtcblxuICAgIGNvbnN0IG1pbkFyZ3MgICAgPSBvcHRpb25zLm1pbkFyZ3MgfHwgb3B0aW9ucy5hcmdzO1xuICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihtaW5BcmdzKSB8fCBtaW5BcmdzIDwgMClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdhcmdzL21pbkFyZ3MgbXVzdCBiZSBub25uZWdhdGl2ZSBpbnRlZ2VyJyk7XG4gICAgY29uc3QgbWF4QXJncyAgICA9IG9wdGlvbnMubWF4QXJncyB8fCBvcHRpb25zLmFyZ3MgfHwgSW5maW5pdHk7XG4gICAgaWYgKG1heEFyZ3MgIT09IEluZmluaXR5ICYmICghTnVtYmVyLmlzSW50ZWdlcihtaW5BcmdzKSB8fCBtYXhBcmdzIDwgbWluQXJncykpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbWF4QXJncyBtdXN0IGJlIGludGVnZXIgYW5kIGdyZWF0ZXIgdGhhbiBtaW5BcmdzLCBvciBJbmZpbml0eScpO1xuICAgIGNvbnN0IGRlc2NyRmlyc3QgICAgPSBvcHRpb25zLmRlc2NyRmlyc3QgfHwgb3B0aW9ucy5mdW4gfHwgbWF4QXJncyA+IDEwO1xuICAgIGNvbnN0IGhhc09wdGlvbnMgICAgPSAhIW9wdGlvbnMuaGFzT3B0aW9ucztcbiAgICBjb25zdCBtYXhBcmdzUmVhbCAgID0gbWF4QXJncyArIChoYXNPcHRpb25zID8gMSA6IDApO1xuXG4gICAgLy8gVE9ETyBhbGVydCB1bmtub3duIG9wdGlvbnNcblxuICAgIC8vIFRPRE8gdGhpcyBjb2RlIGlzIGNsdXR0ZXJlZCwgcmV3cml0ZSBcbiAgICBjb25zdCBjb2RlID0gZnVuY3Rpb24oLi4uYXJncykge1xuICAgICAgICBjb25zdCBkZXNjciA9IGRlc2NyRmlyc3RcbiAgICAgICAgICAgID8gYXJncy5zaGlmdCgpXG4gICAgICAgICAgICA6ICggKGFyZ3MubGVuZ3RoID4gbWF4QXJncyAmJiB0eXBlb2YgYXJnc1thcmdzLmxlbmd0aC0xXSA9PT0gJ3N0cmluZycpID8gYXJncy5wb3AoKSA6IHVuZGVmaW5lZCk7XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IG1heEFyZ3NSZWFsIHx8IGFyZ3MubGVuZ3RoIDwgbWluQXJncylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uICcrbmFtZSsnIG11c3QgaGF2ZSAnK21pbkFyZ3MrJy4uJyttYXhBcmdzUmVhbCsnIGFyZ3VtZW50cyAnKTsgLy8gVE9ET1xuXG4gICAgICAgIGNvbnN0IG4gPSB0aGlzLm5leHQoKTsgLy8gVE9ETyBjYWxsIGl0IGFkdmFuY2UoKSBvciBzbXRoLlxuICAgICAgICBjb25zdCBldmlkZW5jZSA9IGltcGwoIC4uLmFyZ3MgKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0UmVzdWx0KCBuLCBldmlkZW5jZSwgZGVzY3IsIG5hbWUgKTtcbiAgICB9O1xuXG4gICAgc2Vlbi5hZGQobmFtZSk7XG4gICAgUmVwb3J0LnByb3RvdHlwZVtuYW1lXSA9IGNvZGU7XG59XG5cbi8qKlxuICogICBAZnVuY3Rpb24gY2hlY2tcbiAqICAgQG1lbWJlck9mIFJlcG9ydFxuICogICBAcGFyYW0gZXZpZGVuY2UgSWYgZmFsc2UsIHRoZSBjaGVjayBpcyBhc3N1bWVkIHRvIHBhc3MuXG4gKiAgIEEgdHJ1ZSB2YWx1ZSBtZWFucyB0aGUgY2hlY2sgZmFpbGVkLlxuICogICBAcGFyYW0ge3N0cmluZ30gW2Rlc2NyaXB0aW9uXVxuICogICBAcmV0dXJucyB7dW5kZWZpbmVkfSBcbiAqL1xuXG4vLyB0aGVzZSBjb25kaXRpb25zIGNvdWxkIGJlIHVuZGVyIHRoZSBjb25kaXRpb24gbGlicmFyeVxuLy8gYnV0IHdlJ2xsIG5lZWQgdGhlbSB0byB2ZXJpZnkgdGhlIFJlcG9ydCBjbGFzcyBpdHNlbGYuXG5cbmFkZENvbmRpdGlvbihcbiAgICAnY2hlY2snLFxuICAgIHthcmdzOjF9LFxuICAgIHg9Pnhcbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ3Bhc3MnLFxuICAgIHthcmdzOjB9LFxuICAgICgpPT4wXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdmYWlsJyxcbiAgICB7YXJnczowfSxcbiAgICAoKT0+J2ZhaWxlZCBkZWxpYmVyYXRlbHknXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdlcXVhbCcsXG4gICAge2FyZ3M6Mn0sXG4gICAgKGEsYikgPT4gYSA9PT0gYiA/IDAgOiBbICctICcrZXhwbGFpbihhKSwgJysgJyArIGV4cGxhaW4oYikgXVxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnbWF0Y2gnLFxuICAgIHthcmdzOjJ9LFxuICAgIChhLHJleCkgPT4gKCcnK2EpLm1hdGNoKHJleCkgPyAwIDogW1xuICAgICAgICAnU3RyaW5nICAgICAgICAgOiAnK2EsXG4gICAgICAgICdEb2VzIG5vdCBtYXRjaCA6ICcrcmV4XG4gICAgXVxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnbmVzdGVkJyxcbiAgICB7ZnVuOjEsbWluQXJnczoxfSxcbiAgICAoLi4uYXJncykgPT4gbmV3IFJlcG9ydCgpLnJ1biguLi5hcmdzKS5zdG9wKClcbik7XG5cbi8qKlxuICogICBAZGVzYyBDcmVhdGUgYSBmcmVzaCBSZXBvcnQgb2JqZWN0IGFuZCBwYXNzIGl0IHRvIGEgZnVuY3Rpb24uXG4gKiAgIEByZXR1cm5zIHtSZXBvcnR9XG4gKiAgIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiAgIFRoZSBsYXN0IGFyZ3VtZW50IG11c3QgYmUgYSBjYWxsYmFjayB0YWtpbmcge1JlcG9ydH0gYXMgZmlyc3QgYXJndW1lbnQuXG4gKiAgIEFueSBwcmVjZWRpbmcgYXJndW1lbnRzIHdpbGwgYmUgZm9yd2FyZGVkIHRvIGNhbGxiYWNrIGFzIGlzLlxuICovXG5mdW5jdGlvbiByZXBvcnQgKC4uLmFyZ3MpIHtcbiAgICByZXR1cm4gbmV3IFJlcG9ydCgpLnJ1biguLi5hcmdzKS5zdG9wKCk7XG59XG5cbi8qKlxuICogICBAZXhwb3J0cyBSZXBvcnRcbiAqICAgQGV4cG9ydHMgcmVwb3J0XG4gKiAgIEBleHBvcnRzIGFkZENvbmRpdGlvblxuICogICBAZXhwb3J0cyBleHBsYWluXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7IFJlcG9ydCwgcmVwb3J0LCBhZGRDb25kaXRpb24sIGV4cGxhaW4gfTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogRGV0ZXJtaW5lIG4tdGggY2FsbGVyIHVwIHRoZSBzdGFjayAqL1xuLyogSW5zcGlyZWQgYnkgUGVybCdzIENhcnAgbW9kdWxlICovXG5jb25zdCBpblN0YWNrID0gLyhbXjpcXHMoKV0rOlxcZCsoPzo6XFxkKyk/KVxcVyooXFxufCQpL2c7XG5cbi8qKlxuICogIEBwdWJsaWNcbiAqICBAZnVuY3Rpb25cbiAqICBAZGVzYyBSZXR1cm5zIHNvdXJjZSBwb3NpdGlvbiBuIGZyYW1lcyB1cCB0aGUgc3RhY2tcbiAqICBAZXhhbXBsZVxuICogIFwiL2Zvby9iYXIuanM6MjU6MTFcIlxuICogIEBwYXJhbSB7aW50ZWdlcn0gZGVwdGggSG93IG1hbnkgZnJhbWVzIHRvIHNraXBcbiAqICBAcmV0dXJucyB7c3RyaW5nfSBzb3VyY2UgZmlsZSwgbGluZSwgYW5kIGNvbHVtbiwgc2VwYXJhdGVkIGJ5IGNvbG9uLlxuICovXG5mdW5jdGlvbiBjYWxsZXJJbmZvKG4pIHtcbiAgICAvKiBhIHRlcnJpYmxlIHJleCB0aGF0IGJhc2ljYWxseSBzZWFyY2hlcyBmb3IgZmlsZS5qczpubm46bm5uIHNldmVyYWwgdGltZXMqL1xuICAgIHJldHVybiAobmV3IEVycm9yKCkuc3RhY2subWF0Y2goaW5TdGFjaylbbisxXS5yZXBsYWNlKC9cXG4kLywgJycpIHx8ICcnKVxufVxuXG4vKipcbiAqICBAcHVibGljXG4gKiAgQGZ1bmN0aW9uXG4gKiAgQGRlc2MgU3RyaW5naXJ5IG9iamVjdHMgcmVjdXJzaXZlbHkgd2l0aCBsaW1pdGVkIGRlcHRoXG4gKiAgYW5kIGNpcmN1bGFyIHJlZmVyZW5jZSB0cmFja2luZy5cbiAqICBHZW5lcmFsbHkgSlNPTi5zdHJpbmdpZnkgaXMgdXNlZCBhcyByZWZlcmVuY2U6XG4gKiAgc3RyaW5ncyBhcmUgZXNjYXBlZCBhbmQgZG91YmxlLXF1b3RlZDsgbnVtYmVycywgYm9vbGVhbiwgYW5kIG51bGxzIGFyZVxuICogIHN0cmluZ2lmaWVkIFwiYXMgaXNcIjsgb2JqZWN0cyBhbmQgYXJyYXlzIGFyZSBkZXNjZW5kZWQgaW50by5cbiAqICBUaGUgZGlmZmVyZW5jZXMgZm9sbG93OlxuICogIHVuZGVmaW5lZCBpcyByZXBvcnRlZCBhcyAnPHVuZGVmPicuXG4gKiAgT2JqZWN0cyB0aGF0IGhhdmUgY29uc3RydWN0b3JzIGFyZSBwcmVmaXhlZCB3aXRoIGNsYXNzIG5hbWVzLlxuICogIE9iamVjdCBhbmQgYXJyYXkgY29udGVudCBpcyBhYmJyZXZpYXRlZCBhcyBcIi4uLlwiIGFuZCBcIkNpcmN1bGFyXCJcbiAqICBpbiBjYXNlIG9mIGRlcHRoIGV4aGF1c3Rpb24gYW5kIGNpcmN1bGFyIHJlZmVyZW5jZSwgcmVzcGVjdGl2ZWx5LlxuICogIEZ1bmN0aW9ucyBhcmUgbmFpdmVseSBzdHJpbmdpZmllZC5cbiAqICBAcGFyYW0ge0FueX0gdGFyZ2V0IE9iamVjdCB0byBzZXJpYWxpemUuXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBkZXB0aD0zIERlcHRoIGxpbWl0LlxuICogIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmZ1bmN0aW9uIGV4cGxhaW4oIGl0ZW0sIGRlcHRoPTMsIG9wdGlvbnM9e30sIHBhdGg9JyQnLCBzZWVuPW5ldyBTZXQoKSApIHtcbiAgICAvLyBzaW1wbGUgdHlwZXNcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKVxuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoaXRlbSk7IC8vIGRvbid0IHdhbnQgdG8gc3BlbmQgdGltZSBxb3V0aW5nXG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnbnVtYmVyJyB8fCB0eXBlb2YgaXRlbSA9PT0gJ2Jvb2xlYW4nIHx8IGl0ZW0gPT09IG51bGwpXG4gICAgICAgIHJldHVybiAnJytpdGVtO1xuICAgIGlmIChpdGVtID09PSB1bmRlZmluZWQpIHJldHVybiAnPHVuZGVmPic7XG5cbiAgICAvLyByZWN1cnNlXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShpdGVtKSkge1xuICAgICAgICAvLyBUT0RPIGtlZXAgcGF0aCBidXQgdGhlcmUncyBubyB3YXkgb2Ygc3RvcmluZyBzbXRoIGJ5IG9iamVjdFxuICAgICAgICBpZiAoc2Vlbi5oYXMoaXRlbSkpXG4gICAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICBpZiAoZGVwdGggPCAxKVxuICAgICAgICAgICAgcmV0dXJuICdbLi4uXSc7XG4gICAgICAgIHNlZW4uYWRkKGl0ZW0pO1xuICAgICAgICAvLyBUT0RPIDx4IGVtcHR5IGl0ZW1zPlxuICAgICAgICBjb25zdCBsaXN0ID0gaXRlbS5tYXAoXG4gICAgICAgICAgICAodmFsLCBpbmRleCkgPT4gZXhwbGFpbih2YWwsIGRlcHRoLTEsIG9wdGlvbnMsIHBhdGgrJ1snK2luZGV4KyddJywgbmV3IFNldChzZWVuKSlcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuICdbJytsaXN0LmpvaW4oXCIsIFwiKStcIl1cIjtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSBpdGVtLmNvbnN0cnVjdG9yICYmIGl0ZW0uY29uc3RydWN0b3IubmFtZTtcbiAgICAgICAgY29uc3QgcHJlZml4ID0gdHlwZSAmJiB0eXBlICE9PSAnT2JqZWN0JyA/IHR5cGUgKyAnICcgOiAnJztcbiAgICAgICAgLy8gVE9ETyBrZWVwIHBhdGggYnV0IHRoZXJlJ3Mgbm8gd2F5IG9mIHN0b3Jpbmcgc210aCBieSBvYmplY3RcbiAgICAgICAgaWYgKHNlZW4uaGFzKGl0ZW0pKVxuICAgICAgICAgICAgcmV0dXJuIHByZWZpeCsne0NpcmN1bGFyfSc7XG4gICAgICAgIC8vIFRPRE8gPHggZW1wdHkgaXRlbXM+XG4gICAgICAgIGlmIChkZXB0aCA8IDEpXG4gICAgICAgICAgICByZXR1cm4gcHJlZml4ICsgJ3suLi59JztcbiAgICAgICAgc2Vlbi5hZGQoaXRlbSk7XG4gICAgICAgIGNvbnN0IGxpc3QgPSBPYmplY3Qua2V5cyhpdGVtKS5zb3J0KCkubWFwKCBrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBKU09OLnN0cmluZ2lmeShrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIGluZGV4K1wiOlwiK2V4cGxhaW4oaXRlbVtrZXldLCBkZXB0aC0xLCBvcHRpb25zLCBwYXRoKydbJytpbmRleCsnXScsIG5ldyBTZXQoc2VlbikpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHByZWZpeCArICd7JyArIGxpc3Quam9pbihcIiwgXCIpICsgJ30nO1xuICAgIH1cblxuICAgIC8vIGR1bm5vIHdoYXQgaXQgaXMsIG1heWJlIGEgZnVuY3Rpb25cbiAgICByZXR1cm4gJycraXRlbTtcbn1cblxuLy8gTXVzdCB3b3JrIGV2ZW4gd2l0aG91dCBhc3NlcnRcbmNvbnN0IGhhc0Fzc2VydCA9IHR5cGVvZiBhc3NlcnQgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXNzZXJ0LkFzc2VydGlvbkVycm9yID09PSAnZnVuY3Rpb24nO1xuXG5jb25zdCBtYWtlRXJyb3IgPSBoYXNBc3NlcnRcbiAgICA/IGVudHJ5ID0+IG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IoZW50cnkpXG4gICAgOiBlbnRyeSA9PiBuZXcgRXJyb3IoIGVudHJ5LmFjdHVhbCApO1xuXG4vKipcbiAqICAgQGV4cG9ydHMgY2FsbGVySW5mb1xuICogICBAZXhwb3J0cyBleHBsYWluXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7IGNhbGxlckluZm8sIGV4cGxhaW4sIG1ha2VFcnJvciB9O1xuIl19
