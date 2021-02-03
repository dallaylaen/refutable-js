(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

const { Report, report, addCondition , explain } = require ('./refute/report.js');

// import default condition arsenal
require( './refute/cond/basic.js' );
require( './refute/cond/array.js' );
require( './refute/cond/deep.js' );

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9yZWZ1dGUuanMiLCJsaWIvcmVmdXRlL2NvbmQvYXJyYXkuanMiLCJsaWIvcmVmdXRlL2NvbmQvYmFzaWMuanMiLCJsaWIvcmVmdXRlL2NvbmQvZGVlcC5qcyIsImxpYi9yZWZ1dGUvcmVwb3J0LmpzIiwibGliL3JlZnV0ZS91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgUmVwb3J0LCByZXBvcnQsIGFkZENvbmRpdGlvbiAsIGV4cGxhaW4gfSA9IHJlcXVpcmUgKCcuL3JlZnV0ZS9yZXBvcnQuanMnKTtcblxuLy8gaW1wb3J0IGRlZmF1bHQgY29uZGl0aW9uIGFyc2VuYWxcbnJlcXVpcmUoICcuL3JlZnV0ZS9jb25kL2Jhc2ljLmpzJyApO1xucmVxdWlyZSggJy4vcmVmdXRlL2NvbmQvYXJyYXkuanMnICk7XG5yZXF1aXJlKCAnLi9yZWZ1dGUvY29uZC9kZWVwLmpzJyApO1xuXG4vLyBBbGxvdyBjcmVhdGluZyBtdWx0aXBsZSBwYXJhbGxlbCBjb25maWd1cmF0aW9ucyBvZiByZWZ1dGVcbi8vIGUuZy4gb25lIHN0cmljdCAodGhyb3dpbmcgZXJyb3JzKSBhbmQgb3RoZXIgbGF4IChqdXN0IGRlYnVnZ2luZyB0byBjb25zb2xlKVxuZnVuY3Rpb24gc2V0dXAoIG9wdGlvbnM9e30sIG9yaWcgKSB7XG4gICAgLy8gVE9ETyB2YWxpZGF0ZSBvcHRpb25zXG4gICAgY29uc3Qgb25GYWlsID0gb3B0aW9ucy5vbkZhaWwgfHwgKHJlcCA9PiB7IHRocm93IG5ldyBFcnJvcihyZXAuZ2V0VGFwKCkpIH0pO1xuXG4gICAgY29uc3QgcmVmdXRlID0gb3B0aW9ucy5za2lwXG4gICAgICAgID8gKCk9Pnt9XG4gICAgICAgIDogKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG9rID0gcmVwb3J0KC4uLmFyZ3MpO1xuICAgICAgICAgICAgaWYgKCFvay5nZXRQYXNzKCkpXG4gICAgICAgICAgICAgICAgb25GYWlsKG9rLCBhcmdzKTtcbiAgICAgICAgfTtcblxuICAgIC8vIHJlZXhwb3J0IGFsbCBmcm9tIHJlcG9ydC5qc1xuICAgIHJlZnV0ZS5SZXBvcnQgPSBSZXBvcnQ7XG4gICAgcmVmdXRlLnJlcG9ydCA9IHJlcG9ydDsgLy8gVE9ETyBvdWNoLCByZW5hbWU/XG4gICAgcmVmdXRlLmV4cGxhaW4gPSBleHBsYWluO1xuICAgIHJlZnV0ZS5hZGRDb25kaXRpb24gPSBhZGRDb25kaXRpb247XG5cbiAgICAvLyByZWZ1dGUuY29uZih7Li4ufSkgd2lsbCBnZW5lcmF0ZSBhIF9uZXdfIHJlZnV0ZVxuICAgIHJlZnV0ZS5jb25maWcgPSB1cGRhdGUgPT4gc2V0dXAoIHsgLi4ub3B0aW9ucywgLi4udXBkYXRlIH0sIHJlZnV0ZSApO1xuXG4gICAgLy8gVE9ETyB0aGlzIGlzIHN0dXBpZCwgY29tZSB1cCB3aXRoIHNtdGggYmV0dGVyXG4gICAgLy8gd2hlbiBpbiBicm93c2VyLCB3aW5kb3cucmVmdXRlLmNvbmZpZygpIHVwZGF0ZXMgd2luZG93LnJlZnV0ZSBpdHNlbGZcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgb3JpZyA9PT0gd2luZG93LnJlZnV0ZSlcbiAgICAgICAgd2luZG93LnJlZnV0ZSA9IHJlZnV0ZTtcblxuICAgIHJldHVybiByZWZ1dGU7XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJylcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHNldHVwKCk7XG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgd2luZG93LnJlZnV0ZSA9IHNldHVwKCk7IC8vIFRPRE8gY2hlY2sgcHJlZXhpc3RpbmdcblxuLyoqXG4gKiAgIEBjYWxsYmFjayBDb250cmFjdFxuICogICBAZGVzYyBBIGNvZGUgYmxvY2sgY29udGFpbmluZyBvbmUgb3IgbW9yZSBjb25kaXRpb24gY2hlY2tzLlxuICogICBBIGNoZWNrIGlzIHBlcmZvcm1lZCBieSBjYWxsaW5nIG9uZSBvZiBhIGZldyBzcGVjaWFsIG1ldGhvZHNcbiAqICAgKGVxdWFsLCBtYXRjaCwgZGVlcEVxdWFsLCB0eXBlIGV0YylcbiAqICAgb24gdGhlIFJlcG9ydCBvYmplY3QuXG4gKiAgIENvbnRyYWN0cyBtYXkgYmUgbmVzdGVkIHVzaW5nIHRoZSAnbmVzdGVkJyBtZXRob2Qgd2hpY2ggYWNjZXB0c1xuICogICBhbm90aGVyIGNvbnRyYWN0IGFuZCByZWNvcmRzIGEgcGFzcy9mYWlsdXJlIGluIHRoZSBwYXJlbnQgYWNjb3JkaW5nbHkucVxuICogICBBIGNvbnRyYWN0IGlzIGFsd2F5cyBleGVjdXRlZCB0byB0aGUgZW5kLlxuICogICBAcGFyYW0ge1JlcG9ydH0gb2sgQW4gb2JqZWN0IHRoYXQgcmVjb3JkcyBjaGVjayByZXN1bHRzLlxuICogICBAcGFyYW0ge0FueX0gWy4uLmxpc3RdIEFkZGl0aW9uYWwgcGFyYW1ldGVyc1xuICogICAoZS5nLiBkYXRhIHN0cnVjdHVyZSB0byBiZSB2YWxpZGF0ZWQpXG4gKiAgIEByZXR1cm5zIHt2b2lkfSBSZXR1cm5lZCB2YWx1ZSBpcyBpZ25vcmVkLlxuICovXG5cbi8qKlxuICogICBAcHVibGljXG4gKiAgIEBmdW5jdGlvbiByZWZ1dGVcbiAqICAgQHBhcmFtIHtBbnl9IFsuLi5saXN0XSBEYXRhIHRvIGZlZWQgdG8gdGhlIGNhbGxiYWNrXG4gKiAgIEBwYXJhbSB7Q29udHJhY3R9IGNvbnRyYWN0IEEgY29kZSBibG9jayB3aXRoIGNoZWNrcy5cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH0gUmV0dXJuIHZhbHVlIGlzIGlnbm9yZWQuXG4gKiAgIEB0aHJvd3Mge0Vycm9yfSBJZiBvbmUgb3IgbW9yZSBjaGVja3MgYXJlIGZhaWxpbmcsIGFuIGV4Y2VwdGlvbiBpcyB0aHJvd25cbiAqICAgd2l0aCBkZXRhaWxzIGFib3V0IGFsbCBwYXNzaW5nL2ZhaWxpbmcgY2hlY2tzLlxuICogICBUaGlzIGFjdGlvbiBjYW4gYmUgY2hhbmdlZCB2aWEgcmVmdXRlLmNvbmZpZygpIGNhbGwuXG4gKi9cblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgcmVwb3J0IH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuXG4vLyBUT0RPIHJlbmFtZSBmb3JFYWNoIG9yIHNtdGguXG5hZGRDb25kaXRpb24oXG4gICAgJ21hcCcsXG4gICAge2Z1bjoxLGFyZ3M6Mn0sXG4gICAgKGxpc3QsIGNvbnRyYWN0KSA9PiB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSlcbiAgICAgICAgICAgIHJldHVybiAnRXhwZWN0ZWQgYSBsaXN0LCBmb3VuZCBhICcudHlwZW9mKGxpc3QpO1xuICAgICAgICBpZiAobGlzdC5sZW5ndGggPCAxKVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGF1dG8tcGFzc1xuXG4gICAgICAgIHJldHVybiByZXBvcnQoIG9rID0+IHtcbiAgICAgICAgICAgIGxpc3QuZm9yRWFjaCggKGl0ZW0sIGluZGV4KSA9PiBvay5uZXN0ZWQoIFwiaXRlbSBcIitpbmRleCwgaXRlbSwgY29udHJhY3QgKSApO1xuICAgICAgICB9KTtcbiAgICB9XG4pO1xuXG4vLyBUT0RPIHRoaXMgaXMgY2FsbGVkIFwiY29tcGxpYW50IGNoYWluXCIgYnV0IGJldHRlciBqdXN0IHNheSBoZXJlXG4vLyBcIm9oIHdlJ3JlIGNoZWNraW5nIGVsZW1lbnQgb3JkZXJcIlxuYWRkQ29uZGl0aW9uKFxuICAgICdvcmRlcmVkJywgLy8gVE9ETyBiZXR0ZXIgbmFtZT9cbiAgICB7ZnVuOjEsYXJnczoyfSxcbiAgICAobGlzdCwgY29udHJhY3QpID0+IHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGxpc3QpKVxuICAgICAgICAgICAgcmV0dXJuICdFeHBlY3RlZCBhIGxpc3QsIGZvdW5kIGEgJy50eXBlb2YobGlzdCk7XG4gICAgICAgIGlmIChsaXN0Lmxlbmd0aCA8IDIpXG4gICAgICAgICAgICByZXR1cm4gMDsgLy8gYXV0by1wYXNzXG5cbiAgICAgICAgcmV0dXJuIHJlcG9ydCggb2sgPT4ge1xuICAgICAgICAgICAgZm9yIChsZXQgbiA9IDA7IG4gPCBsaXN0Lmxlbmd0aC0xOyBuKyspIHtcbiAgICAgICAgICAgICAgICBvay5uZXN0ZWQoIFwiaXRlbXMgXCIrbitcIiwgXCIrKG4rMSksIGxpc3Rbbl0sIGxpc3RbbisxXSwgY29udHJhY3QpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4pO1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCByZXBvcnQsIGV4cGxhaW4gfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5jb25zdCBPSyA9IGZhbHNlO1xuXG5jb25zdCBudW1DbXAgPSB7XG4gICAgJzwnIDogKHgseSk9Pih4ICA8IHkpLFxuICAgICc+JyA6ICh4LHkpPT4oeCAgPiB5KSxcbiAgICAnPD0nOiAoeCx5KT0+KHggPD0geSksXG4gICAgJz49JzogKHgseSk9Pih4ID49IHkpLFxuICAgICc9PSc6ICh4LHkpPT4oeCA9PT0geSksXG4gICAgJyE9JzogKHgseSk9Pih4ICE9PSB5KSxcbn07XG5cbi8vIHVzZSAhPSBhbmQgbm90ICE9PSBkZWxpYmVyYXRlbHkgdG8gZmlsdGVyIG91dCBudWxsICYgdW5kZWZpbmVkXG5jb25zdCBzdHJDbXAgPSB7XG4gICAgJzwnIDogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ICA8ICcnK3kpLFxuICAgICc+JyA6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCAgPiAnJyt5KSxcbiAgICAnPD0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPD0gJycreSksXG4gICAgJz49JzogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ID49ICcnK3kpLFxuXG4gICAgJz09JzogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ID09PSAnJyt5KSxcbiAgICAnIT0nOiAoeCx5KT0+KCh4ID09IHVuZGVmaW5lZCleKHkgPT0gdW5kZWZpbmVkKSkgfHwgKCcnK3ggIT09ICcnK3kpLFxufTtcblxuYWRkQ29uZGl0aW9uKFxuICAgICdudW1DbXAnLFxuICAgIHthcmdzOjN9LFxuICAgICh4LG9wLHkpID0+IG51bUNtcFtvcF0oeCx5KT8wOlt4LFwiaXMgbm90IFwiK29wLHldXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdzdHJDbXAnLFxuICAgIHthcmdzOjN9LFxuICAgICh4LG9wLHkpID0+IHN0ckNtcFtvcF0oeCx5KT8wOlt4LFwiaXMgbm90IFwiK29wLHldXG4pO1xuXG5jb25zdCB0eXBlQ2hlY2sgPSB7XG4gICAgdW5kZWZpbmVkOiB4ID0+IHggPT09IHVuZGVmaW5lZCxcbiAgICBudWxsOiAgICAgIHggPT4geCA9PT0gbnVsbCxcbiAgICBudW1iZXI6ICAgIHggPT4gdHlwZW9mIHggPT09ICdudW1iZXInICYmICFOdW1iZXIuaXNOYU4oeCksXG4gICAgaW50ZWdlcjogICB4ID0+IE51bWJlci5pc0ludGVnZXIoeCksXG4gICAgbmFuOiAgICAgICB4ID0+IE51bWJlci5pc05hTih4KSxcbiAgICBzdHJpbmc6ICAgIHggPT4gdHlwZW9mIHggPT09ICdzdHJpbmcnLFxuICAgIGZ1bmN0aW9uOiAgeCA9PiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyxcbiAgICBib29sZWFuOiAgIHggPT4gdHlwZW9mIHggPT09ICdib29sZWFuJyxcbiAgICBvYmplY3Q6ICAgIHggPT4geCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkoeCksXG4gICAgYXJyYXk6ICAgICB4ID0+IEFycmF5LmlzQXJyYXkoeCksXG59O1xuZnVuY3Rpb24gdHlwZUV4cGxhaW4gKHgpIHtcbiAgICBpZiAodHlwZW9mIHggPT09ICdzdHJpbmcnKVxuICAgICAgICByZXR1cm4geDtcbiAgICBpZiAodHlwZW9mIHggPT09ICdmdW5jdGlvbicpXG4gICAgICAgIHJldHVybiAnaW5zdGFuY2VvZiAnKyh4Lm5hbWUgfHwgeCk7XG59O1xuXG5hZGRDb25kaXRpb24oXG4gICAgJ3R5cGUnLFxuICAgIHthcmdzOiAyfSxcbiAgICAoZ290LCBleHApPT57XG4gICAgICAgIGlmICggIUFycmF5LmlzQXJyYXkoZXhwKSApXG4gICAgICAgICAgICBleHAgPSBbZXhwXTtcblxuICAgICAgICBmb3IgKGxldCB2YXJpYW50IG9mIGV4cCkge1xuICAgICAgICAgICAgLy8ga25vd24gdHlwZVxuICAgICAgICAgICAgaWYoIHR5cGVvZiB2YXJpYW50ID09PSAnc3RyaW5nJyAmJiB0eXBlQ2hlY2tbdmFyaWFudF0gKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVDaGVja1t2YXJpYW50XShnb3QpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gT0s7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBpbnN0YW5jZW9mXG4gICAgICAgICAgICBpZiggdHlwZW9mIHZhcmlhbnQgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIGdvdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBpZiggZ290IGluc3RhbmNlb2YgdmFyaWFudCApXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPSztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGRvbid0IGtub3cgd2hhdCB5b3UncmUgYXNraW5nIGZvclxuICAgICAgICAgICAgcmV0dXJuICd1bmtub3duIHZhbHVlIHR5cGUgc3BlYzogJytleHBsYWluKHZhcmlhbnQsIDEpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgJy0gJytleHBsYWluKGdvdCwgMSksXG4gICAgICAgICAgICAnKyAnK2V4cC5tYXAoIHR5cGVFeHBsYWluICkuam9pbihcIiBvciBcIiksXG4gICAgICAgIF07XG4gICAgfVxuKTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcblxuYWRkQ29uZGl0aW9uKCAnZGVlcEVxdWFsJywge1wiYXJnc1wiOjIsaGFzT3B0aW9uczp0cnVlfSwgZGVlcCApO1xuXG5mdW5jdGlvbiBkZWVwKCBnb3QsIGV4cCwgb3B0aW9ucz17fSApIHtcbiAgICBpZiAoIW9wdGlvbnMubWF4KVxuICAgICAgICBvcHRpb25zLm1heCA9IDU7XG4gICAgb3B0aW9ucy5kaWZmID0gW107XG4gICAgX2RlZXAoIGdvdCwgZXhwLCBvcHRpb25zICk7XG4gICAgaWYgKCFvcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICByZXR1cm4gMDtcblxuICAgIGNvbnN0IHJldCA9IFtdO1xuICAgIGZvciAobGV0IGl0ZW0gb2Ygb3B0aW9ucy5kaWZmKSB7XG4gICAgICAgIHJldC5wdXNoKCBcbiAgICAgICAgICAgIFwiYXQgXCIraXRlbVswXSxcbiAgICAgICAgICAgIFwiLSBcIitleHBsYWluKCBpdGVtWzFdLCAyICksXG4gICAgICAgICAgICBcIisgXCIrZXhwbGFpbiggaXRlbVsyXSwgMiApXG4gICAgICAgICk7XG4gICAgfTtcbiAgICByZXR1cm4gcmV0O1xufTtcblxuLy8gcmVzdWx0IGlzIHN0b3JlZCBpbiBvcHRpb25zLmRpZmY9W10sIHJldHVybiB2YWx1ZSBpcyBpZ25vcmVkXG4vLyBpZiBzYWlkIGRpZmYgZXhjZWVkcyBtYXgsIHJldHVybiBpbW1lZGlhdGVseSAmIGRvbid0IHdhc3RlIHRpbWVcbmZ1bmN0aW9uIF9kZWVwKCBnb3QsIGV4cCwgb3B0aW9ucz17fSwgcGF0aD0nJCcsIHNlZW49bmV3IFNldCgpICkge1xuICAgIGlmIChnb3QgPT09IGV4cCB8fCBvcHRpb25zLm1heCA8PSBvcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICByZXR1cm47XG4gICAgaWYgKHR5cGVvZiBnb3QgIT09IHR5cGVvZiBleHApXG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcblxuICAgIC8vIHJlY3Vyc2UgYnkgZXhwZWN0ZWQgdmFsdWUgLSBjb25zaWRlciBpdCBtb3JlIHByZWRpY3RhYmxlXG4gICAgaWYgKHR5cGVvZiBleHAgIT09ICdvYmplY3QnIHx8IGV4cCA9PT0gbnVsbCApIHtcbiAgICAgICAgLy8gbm9uLW9iamVjdHMgLSBzbyBjYW4ndCBkZXNjZW5kXG4gICAgICAgIC8vIGFuZCBjb21wYXJpc29uIGFscmVhZHkgZG9uZSBhdCB0aGUgYmVnaW5ubmluZ1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG4gICAgfVxuXG4gICAgLy8gbXVzdCBkZXRlY3QgbG9vcHMgYmVmb3JlIGdvaW5nIGRvd25cbiAgICBpZiAoc2Vlbi5oYXMoZXhwKSkge1xuICAgICAgICBvcHRpb25zLm1heCA9IDA7XG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggXG4gICAgICAgICAgICBbcGF0aCArICcgKEV4cGVjdGluZyBjaXJjdWxhciByZWZlcmVuY2UsIGF1dG8tZmFpbCknLCBnb3QsIGV4cCBdICk7XG4gICAgfTtcbiAgICBzZWVuLmFkZChleHApO1xuXG4gICAgLy8gY29tcGFyZSBvYmplY3QgdHlwZXNcbiAgICAvLyAoaWYgYSB1c2VyIGlzIHN0dXBpZCBlbm91Z2ggdG8gb3ZlcnJpZGUgY29uc3RydWN0b3IgZmllbGQsIHdlbGwgdGhlIHRlc3RcbiAgICAvLyB3b3VsZCBmYWlsIGxhdGVyIGFueXdheSlcbiAgICBpZiAoZ290LmNvbnN0cnVjdG9yICE9PSBleHAuY29uc3RydWN0b3IpXG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcblxuICAgIC8vIGFycmF5XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZXhwKSkge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZ290KSB8fCBnb3QubGVuZ3RoICE9PSBleHAubGVuZ3RoKVxuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZXhwLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBfZGVlcCggZ290W2ldLCBleHBbaV0sIG9wdGlvbnMsIHBhdGgrJ1snK2krJ10nLCBuZXcgU2V0KHNlZW4pKTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLm1heDw9b3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH07XG5cbiAgICAvLyBjb21wYXJlIGtleXMgLSArMSBmb3IgZXhwLCAtMSBmb3IgZ290LCBub256ZXJvIGtleSBhdCBlbmQgbWVhbnMga2V5cyBkaWZmZXJcbiAgICBjb25zdCB1bmlxID0ge307XG4gICAgT2JqZWN0LmtleXMoZXhwKS5mb3JFYWNoKCB4ID0+IHVuaXFbeF0gPSAxICk7XG4gICAgT2JqZWN0LmtleXMoZ290KS5mb3JFYWNoKCB4ID0+IHVuaXFbeF0gPSAodW5pcVt4XSB8fCAwKSAtIDEgKTtcbiAgICBmb3IgKGxldCB4IGluIHVuaXEpIHtcbiAgICAgICAgaWYgKHVuaXFbeF0gIT09IDApXG4gICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG4gICAgfVxuICAgIFxuICAgIC8vIG5vdyB0eXBlb2YsIG9iamVjdCB0eXBlLCBhbmQgb2JqZWN0IGtleXMgYXJlIHRoZSBzYW1lLlxuICAgIC8vIHJlY3Vyc2UuXG4gICAgZm9yIChsZXQgaSBpbiBleHApIHtcbiAgICAgICAgX2RlZXAoIGdvdFtpXSwgZXhwW2ldLCBvcHRpb25zLCBwYXRoKydbJytleHBsYWluKGkpKyddJywgbmV3IFNldChzZWVuKSk7XG4gICAgICAgIGlmIChvcHRpb25zLm1heDw9b3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH07XG4gICAgcmV0dXJuO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBjYWxsZXJJbmZvLCBleHBsYWluLCBtYWtlRXJyb3IgfSA9IHJlcXVpcmUoICcuL3V0aWwuanMnICk7XG5cbi8qKlxuICogQHB1YmxpY1xuICogQGNsYXNzZGVzY1xuICogVGhlIGNvcmUgb2YgdGhlIHJlZnV0ZSBsaWJyYXJ5LCB0aGUgcmVwb3J0IG9iamVjdCBjb250YWlucyBpbmZvXG4gKiBhYm91dCBwYXNzaW5nIGFuZCBmYWlsaW5nIGNvbmRpdGlvbnMuXG4gKi9cbmNsYXNzIFJlcG9ydCB7XG4gICAgLy8gc2V0dXBcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5fY291bnQgICAgID0gMDtcbiAgICAgICAgdGhpcy5fZmFpbENvdW50ID0gMDtcbiAgICAgICAgdGhpcy5fZGVzY3IgICAgID0gW107XG4gICAgICAgIHRoaXMuX2V2aWRlbmNlICA9IFtdO1xuICAgICAgICB0aGlzLl93aGVyZSAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fY29uZE5hbWUgID0gW107XG4gICAgICAgIHRoaXMuX2luZm8gICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9uZXN0ZWQgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fZG9uZSAgICAgID0gZmFsc2U7XG4gICAgICAgIC8vIFRPRE8gYWRkIGNhbGxlciBpbmZvIGFib3V0IHRoZSByZXBvcnQgaXRzZWxmXG4gICAgfVxuXG4gICAgLy8gc2V0dXAgLSBtdXN0IGJlIGNoYWluYWJsZVxuICAgIHNldFRpdGxlKHN0cikge1xuICAgICAgICB0aGlzLl90aXRsZSA9IHN0cjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8vIHJ1bm5pbmdcbiAgICBydW4oLi4uYXJncykge1xuICAgICAgICBpZiAodGhpcy5fZG9uZSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciAoJ0F0dGVtcHQgdG8gbW9kaWZ5IGEgZmluaXNoZWQgUmVwb3J0Jyk7XG4gICAgICAgIGNvbnN0IGJsb2NrID0gYXJncy5wb3AoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBibG9jayAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTGFzdCBhcmd1bWVudCBvZiBydW4oKSBtdXN0IGJlIGEgZnVuY3Rpb24sIG5vdCAnK3R5cGVvZihibG9jaykpO1xuICAgICAgICBibG9jayggdGhpcywgLi4uYXJncyApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvLyBJbiB0aGVvcnksIGhhdmluZyBjb25zdCBuPW5leHQoKTsgc2V0UmVzdWx0KG4uIC4uLilcbiAgICAvLyBzaG91bGQgYWxsb3cgZm9yIGFzeW5jIGNvbmRpdGlvbnMgaW4gdGhlIGZ1dHVyZVxuICAgIC8vIGlmIGF0IGFsbCBwb3NzaWJsZSB3aXRob3V0IGdyZWF0IHNhY3JpZmljZXMuXG4gICAgbmV4dCgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RvbmUpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIFJlcG9ydCcpO1xuICAgICAgICByZXR1cm4gKyt0aGlzLl9jb3VudDtcbiAgICB9XG5cbiAgICBzZXRSZXN1bHQgKG4sIGV2aWRlbmNlLCBkZXNjciwgY29uZE5hbWUpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RvbmUpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIFJlcG9ydCcpO1xuICAgICAgICBpZiAobiA+IHRoaXMuX2NvdW50KVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnQXR0ZW1wdCB0byBzZXQgY29uZGl0aW9uIGJleW9uZCBjaGVjayBjb3VudCcpO1xuICAgICAgICBpZiAoZGVzY3IpXG4gICAgICAgICAgICB0aGlzLl9kZXNjcltuXSA9IGRlc2NyO1xuICAgICAgICAvLyBwYXNzIC0gcmV0dXJuIEFTQVBcbiAgICAgICAgaWYgKCFldmlkZW5jZSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBuZXN0ZWQgcmVwb3J0IG5lZWRzIHNwZWNpYWwgaGFuZGxpbmdcbiAgICAgICAgaWYgKGV2aWRlbmNlIGluc3RhbmNlb2YgUmVwb3J0KSB7XG4gICAgICAgICAgICB0aGlzLl9uZXN0ZWRbbl0gPSBldmlkZW5jZTtcbiAgICAgICAgICAgIGlmIChldmlkZW5jZS5nZXRQYXNzKCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgZXZpZGVuY2UgPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGxpc3RpZnkgJiBzdHJpbmdpZnkgZXZpZGVuY2UsIHNvIHRoYXQgaXQgZG9lc24ndCBjaGFuZ2UgcG9zdC1mYWN0dW1cbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGV2aWRlbmNlKSlcbiAgICAgICAgICAgIGV2aWRlbmNlID0gWyBldmlkZW5jZSBdO1xuICAgICAgICB0aGlzLl9ldmlkZW5jZVtuXSA9IGV2aWRlbmNlLm1hcCggeD0+X2V4cGxhaW4oeCwgSW5maW5pdHkpICk7XG4gICAgICAgIHRoaXMuX3doZXJlW25dICAgID0gY2FsbGVySW5mbygyKTtcbiAgICAgICAgdGhpcy5fY29uZE5hbWVbbl0gPSBjb25kTmFtZTtcbiAgICAgICAgdGhpcy5fZmFpbENvdW50Kys7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBkZXNjIEFwcGVuZCBhbiBpbmZvcm1hdGlvbmFsIG1lc3NhZ2UgdG8gdGhlIHJlcG9ydC5cbiAgICAgKiBOb24tc3RyaW5nIHZhbHVlcyB3aWxsIGJlIHN0cmluZ2lmaWVkIHZpYSBleHBsYWluKCkuXG4gICAgICogQHBhcmFtIHtBbnl9IG1lc3NhZ2VcbiAgICAgKiBAcmV0dXJucyB7UmVwb3J0fSBjaGFpbmFibGVcbiAgICAgKi9cbiAgICBpbmZvKCAuLi5tZXNzYWdlICkge1xuICAgICAgICBpZiAodGhpcy5fZG9uZSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciAoJ0F0dGVtcHQgdG8gbW9kaWZ5IGEgZmluaXNoZWQgUmVwb3J0Jyk7XG4gICAgICAgIGlmICghdGhpcy5faW5mb1t0aGlzLl9jb3VudF0pXG4gICAgICAgICAgICB0aGlzLl9pbmZvW3RoaXMuX2NvdW50XSA9IFtdO1xuICAgICAgICB0aGlzLl9pbmZvW3RoaXMuX2NvdW50XS5wdXNoKCBtZXNzYWdlLm1hcCggcz0+X2V4cGxhaW4ocykgKS5qb2luKFwiIFwiKSApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBzdG9wKCkge1xuICAgICAgICB0aGlzLl9kb25lID0gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gcXVlcnlpbmdcbiAgICBnZXRUaXRsZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RpdGxlOyAvL0pGWUlcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogICBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBnZXREb25lKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZG9uZTsgLy8gaXMgaXQgZXZlbiBuZWVkZWQ/XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBXaXRob3V0IGFyZ3VtZW50IHJldHVybnMgd2hldGhlciB0aGUgY29udHJhY3Qgd2FzIGZ1bGZpbGxlZC5cbiAgICAgKiAgIEFzIGEgc3BlY2lhbCBjYXNlLCBpZiBubyBjaGVja3Mgd2VyZSBydW4gYW5kIHRoZSBjb250cmFjdCBpcyBmaW5pc2hlZCxcbiAgICAgKiAgIHJldHVybnMgZmFsc2UsIGFzIGluIFwic29tZW9uZSBtdXN0IGhhdmUgZm9yZ290dGVuIHRvIGV4ZWN1dGVcbiAgICAgKiAgIHBsYW5uZWQgY2hlY2tzLiBVc2UgcGFzcygpIGlmIG5vIGNoZWNrcyBhcmUgcGxhbm5lZC5cbiAgICAgKlxuICAgICAqICAgSWYgYSBwYXJhbWV0ZXIgaXMgZ2l2ZW4sIHJldHVybiB0aGUgc3RhdHVzIG9mIG4tdGggY2hlY2sgaW5zdGVhZC5cbiAgICAgKiAgIEBwYXJhbSB7aW50ZWdlcn0gblxuICAgICAqICAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0UGFzcyhuKSB7XG4gICAgICAgIGlmIChuID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZmFpbENvdW50ID09PSAwICYmICghdGhpcy5fZG9uZSB8fCB0aGlzLl9jb3VudCA+IDApO1xuICAgICAgICByZXR1cm4gKG4gPiAwICYmIG4gPD0gdGhpcy5fY291bnQpID8gIXRoaXMuX2V2aWRlbmNlW25dIDogdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgTnVtYmVyIG9mIGNoZWNrcyBwZXJmb3JtZWQuXG4gICAgICogICBAcmV0dXJucyB7bnVtYmVyfVxuICAgICAqL1xuICAgIGdldENvdW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY291bnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIFdoZXRoZXIgdGhlIGxhc3QgY2hlY2sgd2FzIGEgc3VjY2Vzcy5cbiAgICAgKiAgVGhpcyBpcyBqdXN0IGEgc2hvcnRjdXQgZm9yIGZvby5nZXREZXRhaWxzKGZvby5nZXRDb3VudCkucGFzc1xuICAgICAqICBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBsYXN0KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY291bnQgPyAhdGhpcy5fZXZpZGVuY2VbdGhpcy5fY291bnRdIDogdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgTnVtYmVyIG9mIGNoZWNrcyBmYWlsaW5nLlxuICAgICAqICAgQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRGYWlsQ291bnQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9mYWlsQ291bnQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBSZXR1cm4gYSBzdHJpbmcgb2YgZmFpbGluZy9wYXNzaW5nIGNoZWNrcy5cbiAgICAgKiAgIFRoaXMgbWF5IGJlIHVzZWZ1bCBmb3IgdmFsaWRhdGluZyBjdXN0b20gY29uZGl0aW9ucy5cbiAgICAgKiAgIENvbnNlY3V0aXZlIHBhc3NpbmcgY2hlY2thIGFyZSByZXByZXNlbnRlZCBieSBudW1iZXJzLlxuICAgICAqICAgQSBjYXBpdGFsIGxldHRlciBpbiB0aGUgc3RyaW5nIHJlcHJlc2VudHMgZmFpbHVyZS5cbiAgICAgKiAgIEByZXR1cm5zIHtzdHJpbmd9XG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgcGFzc2luZyBjaGVja3NcbiAgICAgKiAgIFwicigxMClcIlxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIGNoZWNrcyB3aXRoIDEgZmFpbHVyZSBpbiB0aGUgbWlkZGxlXG4gICAgICogICBcInIoNSxOLDQpXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBjaGVja3MgaW5jbHVkaW5nIGEgbmVzdGVkIGNvbnRyYWN0XG4gICAgICogICBcInIoMyxyKDEsTiksNilcIlxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIG5vIGNoZWNrcyB3ZXJlIHJ1biAtIGF1dG8tZmFpbFxuICAgICAqICAgXCJyKFopXCJcbiAgICAgKi9cbiAgICBnZXRHaG9zdCgpIHtcbiAgICAgICAgY29uc3QgZ2hvc3QgPSBbXTtcbiAgICAgICAgbGV0IHN0cmVhayA9IDA7XG4gICAgICAgIGZvciAobGV0IGk9MTsgaSA8PSB0aGlzLl9jb3VudDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fZXZpZGVuY2VbaV0gfHwgdGhpcy5fbmVzdGVkW2ldKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0cmVhaykgZ2hvc3QucHVzaChzdHJlYWspO1xuICAgICAgICAgICAgICAgIHN0cmVhayA9IDA7XG4gICAgICAgICAgICAgICAgZ2hvc3QucHVzaCggdGhpcy5fbmVzdGVkW2ldID8gdGhpcy5fbmVzdGVkW2ldLmdldEdob3N0KCkgOiAnTicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdHJlYWsrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RyZWFrKSBnaG9zdC5wdXNoKHN0cmVhayk7XG4gICAgICAgIGlmIChnaG9zdC5sZW5ndGggPT09IDAgJiYgIXRoaXMuZ2V0UGFzcygpKVxuICAgICAgICAgICAgZ2hvc3QucHVzaCgnWicpO1xuICAgICAgICByZXR1cm4gJ3IoJytnaG9zdC5qb2luKCcsJykrJyknO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyByZXR1cm5zIGEgcGxhaW4gc2VyaWFsaXphYmxlIG9iamVjdFxuICAgICAqICBAcmV0dXJucyB7T2JqZWN0fVxuICAgICAqL1xuICAgIHRvSlNPTigpIHtcbiAgICAgICAgY29uc3QgbiA9IHRoaXMuZ2V0Q291bnQoKTtcbiAgICAgICAgY29uc3QgZGV0YWlscyA9IFtdO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaTw9bjsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBub2RlID0gdGhpcy5nZXREZXRhaWxzKGkpO1xuICAgICAgICAgICAgLy8gc3RyaXAgZXh0cmEga2V5c1xuICAgICAgICAgICAgZm9yKCBsZXQga2V5IGluIG5vZGUgKSB7XG4gICAgICAgICAgICAgICAgaWYgKG5vZGVba2V5XSA9PT0gdW5kZWZpbmVkIHx8IChBcnJheS5pc0FycmF5KG5vZGVba2V5XSkgJiYgbm9kZVtrZXldLmxlbmd0aCA9PT0gMCkpXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBub2RlW2tleV07XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZGV0YWlscy5wdXNoKG5vZGUpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcGFzczogIHRoaXMuZ2V0UGFzcygpLFxuICAgICAgICAgICAgY291bnQ6IHRoaXMuZ2V0Q291bnQoKSxcbiAgICAgICAgICAgIHRpdGxlOiB0aGlzLmdldFRpdGxlKCksXG4gICAgICAgICAgICBkZXRhaWxzLFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXRUYXAoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgUmV0dXJucyByZXBvcnQgc3RyaW5naWZpZWQgYXMgVEFQIGZvcm1hdFxuICAgICAqICBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldFRhcChuKSB7XG4gICAgICAgIGNvbnN0IHRhcCA9IG4gPT09IHVuZGVmaW5lZCA/IHRoaXMuZ2V0VGFwTGluZXMoKSA6IHRoaXMuZ2V0VGFwRW50cnkobik7XG4gICAgICAgIHRhcC5wdXNoKCcnKTtcbiAgICAgICAgcmV0dXJuIHRhcC5qb2luKCdcXG4nKTtcbiAgICB9XG5cbiAgICBnZXRUYXBMaW5lcyhuKSB7XG4gICAgICAgIC8vIFRBUCBmb3Igbm93LCB1c2UgYW5vdGhlciBmb3JtYXQgbGF0ZXIgYmVjYXVzZSBcInBlcmwgaXMgc2NhcnlcIlxuICAgICAgICBjb25zdCB0YXAgPSBbICcxLi4nK3RoaXMuX2NvdW50IF07XG4gICAgICAgIGlmICh0aGlzLmdldFRpdGxlKCkpXG4gICAgICAgICAgICB0YXAucHVzaCgnIyAnK3RoaXMuZ2V0VGl0bGUoKSk7XG4gICAgICAgIC8vIFRPRE8gaW5mb1swXVxuICAgICAgICBjb25zdCBwcmVmYWNlID0gdGhpcy5nZXREZXRhaWxzKDApO1xuICAgICAgICB0YXAucHVzaCggLi4ucHJlZmFjZS5pbmZvLm1hcCggcyA9PiAnIyAnK3MgKSApO1xuICAgICAgICBmb3IoIGxldCBpID0gMTsgaSA8PSB0aGlzLl9jb3VudDsgaSsrICkgXG4gICAgICAgICAgICB0YXAucHVzaCggLi4uIHRoaXMuZ2V0VGFwRW50cnkoaSkgKTtcbiAgICAgICAgaWYgKCF0aGlzLmdldFBhc3MoKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0Q291bnQoKSA+IDApXG4gICAgICAgICAgICAgICAgdGFwLnB1c2goJyMgRmFpbGVkICcrdGhpcy5nZXRGYWlsQ291bnQoKSsnLycrdGhpcy5nZXRDb3VudCgpKyAnIGNvbmRpdGlvbnMnKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB0YXAucHVzaCgnIyBObyBjaGVja3Mgd2VyZSBydW4sIGNvbnNpZGVyIHVzaW5nIHBhc3MoKSBpZiB0aGF0XFwncyBkZWxpYmVyYXRlJyk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0YXA7XG4gICAgfVxuXG4gICAgZ2V0VGFwRW50cnkobikge1xuICAgICAgICBjb25zdCBkYXRhID0gdHlwZW9mKG4pID09PSAnb2JqZWN0JyA/IG4gOiB0aGlzLmdldERldGFpbHMobik7XG4gICAgICAgIGNvbnN0IHRhcCA9IFtdO1xuICAgICAgICBpZiAoZGF0YS5uZXN0ZWQpIHtcbiAgICAgICAgICAgIHRhcC5wdXNoKCAnIyBzdWJjb250cmFjdDonKyhkYXRhLm5hbWU/JyAnK2RhdGEubmFtZTonJykgKTtcbiAgICAgICAgICAgIHRhcC5wdXNoKCAuLi4gZGF0YS5uZXN0ZWQuZ2V0VGFwTGluZXMoKS5tYXAoIHMgPT4gJyAgICAnK3MgKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGFwLnB1c2goKGRhdGEucGFzcz8nJzonbm90ICcpICsgJ29rICcgKyBkYXRhLm5cbiAgICAgICAgICAgICsgKGRhdGEubmFtZSA/ICcgLSAnK2RhdGEubmFtZSA6ICcnKSk7XG4gICAgICAgIGlmICghZGF0YS5wYXNzKVxuICAgICAgICAgICAgdGFwLnB1c2goJyMgQ29uZGl0aW9uJysoZGF0YS5jb25kID8gJyAnK2RhdGEuY29uZCA6ICcnKSsnIGZhaWxlZCBhdCAnK2RhdGEud2hlcmUpO1xuICAgICAgICB0YXAucHVzaCguLi5kYXRhLmV2aWRlbmNlLm1hcChzPT4nIyAnK3MpKTtcbiAgICAgICAgdGFwLnB1c2goLi4uZGF0YS5pbmZvLm1hcChzPT4nIyAnK3MpKTtcbiAgICAgICAgcmV0dXJuIHRhcDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIFJldHVybnMgZGV0YWlsZWQgcmVwb3J0IG9uIGEgc3BlY2lmaWMgY2hlY2tcbiAgICAgKiAgIEBwYXJhbSB7aW50ZWdlcn0gbiAtIGNoZWNrIG51bWJlciwgbXVzdCBiZSA8PSBnZXRDb3VudCgpXG4gICAgICogICBAcmV0dXJucyB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldERldGFpbHMobikge1xuICAgICAgICAvLyBUT0RPIHZhbGlkYXRlIG5cblxuICAgICAgICAvLyB1Z2x5IGJ1dCB3aGF0IGNhbiBJIGRvXG4gICAgICAgIGlmIChuID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG46ICAgIDAsXG4gICAgICAgICAgICAgICAgaW5mbzogdGhpcy5faW5mb1swXSB8fCBbXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZXZpZGVuY2UgPSB0aGlzLl9ldmlkZW5jZVtuXTtcbiAgICAgICAgaWYgKGV2aWRlbmNlICYmICFBcnJheS5pc0FycmF5KGV2aWRlbmNlKSlcbiAgICAgICAgICAgIGV2aWRlbmNlID0gW2V2aWRlbmNlXTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbjogICAgICBuLFxuICAgICAgICAgICAgbmFtZTogICB0aGlzLl9kZXNjcltuXSB8fCAnJyxcbiAgICAgICAgICAgIHBhc3M6ICAgIWV2aWRlbmNlLFxuICAgICAgICAgICAgZXZpZGVuY2U6IGV2aWRlbmNlIHx8IFtdLFxuICAgICAgICAgICAgd2hlcmU6ICB0aGlzLl93aGVyZVtuXSxcbiAgICAgICAgICAgIGNvbmQ6ICAgdGhpcy5fY29uZE5hbWVbbl0sXG4gICAgICAgICAgICBpbmZvOiAgIHRoaXMuX2luZm9bbl0gfHwgW10sXG4gICAgICAgICAgICBuZXN0ZWQ6IHRoaXMuX25lc3RlZFtuXSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBnZXRFcnJvcihuLCBvcHRpb25zPXt9KSB7XG4gICAgICAgIGlmICghbikge1xuICAgICAgICAgICAgLy8gbm8gZW50cnkgZ2l2ZW5cbiAgICAgICAgICAgIGlmICghb3B0aW9ucy5wYXNzICYmIHRoaXMuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgICAgcmV0dXJuIG1ha2VFcnJvcih7XG4gICAgICAgICAgICAgICAgYWN0dWFsOiAgIHRoaXMuZ2V0VGFwKCksXG4gICAgICAgICAgICAgICAgZXhwZWN0ZWQ6ICcnLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICB0aGlzLmdldFRpdGxlKCksXG4gICAgICAgICAgICAgICAgb3BlcmF0b3I6ICdjb250cmFjdCcsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBkYXRhID0gdHlwZW9mIG4gPT09ICdvYmplY3QnID8gbiA6IHRoaXMuZ2V0RGV0YWlscyhuKTtcblxuICAgICAgICAvLyBubyBlcnJvclxuICAgICAgICBpZiAoIW9wdGlvbnMucGFzcyAmJiBkYXRhLnBhc3MpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgcmV0dXJuIG1ha2VFcnJvcih7XG4gICAgICAgICAgICBhY3R1YWw6ICAgdGhpcy5nZXRUYXBFbnRyeShkYXRhKS5qb2luKCdcXG4nKSxcbiAgICAgICAgICAgIGV4cGVjdGVkOiAnJyxcbiAgICAgICAgICAgIG1lc3NhZ2U6ICBkYXRhLm5hbWUsXG4gICAgICAgICAgICBvcGVyYXRvcjogZGF0YS5jb25kLFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXRUaHJvd24obiwgb3B0aW9ucz17fSkge1xuICAgICAgICAvLyBUT0RPIHJlbmFtZSB0byBqdXN0IHRocm93P1xuICAgICAgICBjb25zdCBlcnIgPSB0aGlzLmdldEVycm9yKG4sIG9wdGlvbnMpO1xuICAgICAgICBpZiAoZXJyKVxuICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgIH1cbn1cblxuLy8gdGhpcyBpcyBmb3Igc3R1ZmYgbGlrZSBgb2JqZWN0IGZvbyA9IHtcImZvb1wiOjQyfWBcbi8vIHdlIGRvbid0IHdhbnQgdGhlIGV4cGxhbmF0aW9uIHRvIGJlIHF1b3RlZCFcbmZ1bmN0aW9uIF9leHBsYWluKCBpdGVtLCBkZXB0aCApIHtcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnIClcbiAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgcmV0dXJuIGV4cGxhaW4oIGl0ZW0sIGRlcHRoICk7XG59O1xuXG5SZXBvcnQucHJvdG90eXBlLmV4cGxhaW4gPSBleHBsYWluOyAvLyBhbHNvIG1ha2UgYXZhaWxhYmxlIHZpYSByZXBvcnRcblxuLyoqXG4gKiAgQGRlc2MgQ3JlYXRlIG5ldyBjaGVjayBtZXRob2QgYXZhaWxhYmxlIHZpYSBhbGwgUmVwb3J0IGluc3RhbmNlc1xuICogIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWUgb2YgdGhlIG5ldyBjb25kaXRpb24uXG4gKiAgTXVzdCBub3QgYmUgcHJlc2VudCBpbiBSZXBvcnQgYWxyZWFkeSwgYW5kIHNob3VsZCBOT1Qgc3RhcnQgd2l0aFxuICogIGdldC4uLiwgc2V0Li4uLCBvciBhZGQuLi4gKHRoZXNlIGFyZSByZXNlcnZlZCBmb3IgUmVwb3J0IGl0c2VsZilcbiAqICBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBDb25maWd1cmluZyB0aGUgY2hlY2sncyBoYW5kbGluZyBvZiBhcmd1bWVudHNcbiAqICBAcGFyYW0ge2ludGVnZXJ9IG9wdGlvbnMuYXJncyBUaGUgcmVxdWlyZWQgbnVtYmVyIG9mIGFyZ3VtZW50c1xuICogIEBwYXJhbSB7aW50ZWdlcn0gW29wdGlvbnMubWluQXJnc10gTWluaW11bSBudW1iZXIgb2YgYXJndW1lbnQgKGRlZmF1bHRzIHRvIGFyZ3MpXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBbb3B0aW9ucy5tYXhBcmdzXSBNYXhpbXVtIG51bWJlciBvZiBhcmd1bWVudCAoZGVmYXVsdHMgdG8gYXJncylcbiAqICBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmhhc09wdGlvbnNdIElmIHRydWUsIGFuIG9wdGlvbmFsIG9iamVjdFxuY2FuIGJlIHN1cHBsaWVkIGFzIGxhc3QgYXJndW1lbnQuIEl0IHdvbid0IGludGVyZmVyZSB3aXRoIGRlc2NyaXB0aW9uLlxuICogIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuZnVuXSBUaGUgbGFzdCBhcmd1bWVudCBpcyBhIGNhbGxiYWNrXG4gKiAgQHBhcmFtIHtGdW5jdGlvbn0gaW1wbGVtZW50YXRpb24gLSBhIGNhbGxiYWNrIHRoYXQgdGFrZXMge2FyZ3N9IGFyZ3VtZW50c1xuICogIGFuZCByZXR1cm5zIGEgZmFsc2V5IHZhbHVlIGlmIGNvbmRpdGlvbiBwYXNzZXNcbiAqICAoXCJub3RoaW5nIHRvIHNlZSBoZXJlLCBtb3ZlIGFsb25nXCIpLFxuICogIG9yIGV2aWRlbmNlIGlmIGl0IGZhaWxzXG4gKiAgKGUuZy4gdHlwaWNhbGx5IGEgZ290L2V4cGVjdGVkIGRpZmYpLlxuICovXG5jb25zdCBzZWVuID0gbmV3IFNldCgpO1xuZnVuY3Rpb24gYWRkQ29uZGl0aW9uIChuYW1lLCBvcHRpb25zLCBpbXBsKSB7XG4gICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJylcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gbmFtZSBtdXN0IGJlIGEgc3RyaW5nJyk7XG4gICAgaWYgKG5hbWUubWF0Y2goL14oX3xnZXRbX0EtWl18c2V0W19BLVpdKS8pKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiBuYW1lIG11c3Qgbm90IHN0YXJ0IHdpdGggZ2V0Xywgc2V0Xywgb3IgXycpO1xuICAgIC8vIFRPRE8gbXVzdCBkbyBzb21ldGhpbmcgYWJvdXQgbmFtZSBjbGFzaGVzLCBidXQgbGF0ZXJcbiAgICAvLyBiZWNhdXNlIGV2YWwgaW4gYnJvd3NlciBtYXkgKGtpbmQgb2YgbGVnaW1pdGVseSkgb3ZlcnJpZGUgY29uZGl0aW9uc1xuICAgIGlmICghc2Vlbi5oYXMobmFtZSkgJiYgUmVwb3J0LnByb3RvdHlwZVtuYW1lXSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2QgYWxyZWFkeSBleGlzdHMgaW4gUmVwb3J0OiAnK25hbWUpO1xuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIG9wdGlvbnMnKTtcbiAgICBpZiAodHlwZW9mIGltcGwgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYmFkIGltcGxlbWVudGF0aW9uJyk7XG5cbiAgICBjb25zdCBtaW5BcmdzICAgID0gb3B0aW9ucy5taW5BcmdzIHx8IG9wdGlvbnMuYXJncztcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIobWluQXJncykgfHwgbWluQXJncyA8IDApXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignYXJncy9taW5BcmdzIG11c3QgYmUgbm9ubmVnYXRpdmUgaW50ZWdlcicpO1xuICAgIGNvbnN0IG1heEFyZ3MgICAgPSBvcHRpb25zLm1heEFyZ3MgfHwgb3B0aW9ucy5hcmdzIHx8IEluZmluaXR5O1xuICAgIGlmIChtYXhBcmdzICE9PSBJbmZpbml0eSAmJiAoIU51bWJlci5pc0ludGVnZXIobWluQXJncykgfHwgbWF4QXJncyA8IG1pbkFyZ3MpKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ21heEFyZ3MgbXVzdCBiZSBpbnRlZ2VyIGFuZCBncmVhdGVyIHRoYW4gbWluQXJncywgb3IgSW5maW5pdHknKTtcbiAgICBjb25zdCBkZXNjckZpcnN0ICAgID0gb3B0aW9ucy5kZXNjckZpcnN0IHx8IG9wdGlvbnMuZnVuIHx8IG1heEFyZ3MgPiAxMDtcbiAgICBjb25zdCBoYXNPcHRpb25zICAgID0gISFvcHRpb25zLmhhc09wdGlvbnM7XG4gICAgY29uc3QgbWF4QXJnc1JlYWwgICA9IG1heEFyZ3MgKyAoaGFzT3B0aW9ucyA/IDEgOiAwKTtcblxuICAgIC8vIFRPRE8gYWxlcnQgdW5rbm93biBvcHRpb25zXG5cbiAgICAvLyBUT0RPIHRoaXMgY29kZSBpcyBjbHV0dGVyZWQsIHJld3JpdGUgXG4gICAgY29uc3QgY29kZSA9IGZ1bmN0aW9uKC4uLmFyZ3MpIHtcbiAgICAgICAgY29uc3QgZGVzY3IgPSBkZXNjckZpcnN0XG4gICAgICAgICAgICA/IGFyZ3Muc2hpZnQoKVxuICAgICAgICAgICAgOiAoIChhcmdzLmxlbmd0aCA+IG1heEFyZ3MgJiYgdHlwZW9mIGFyZ3NbYXJncy5sZW5ndGgtMV0gPT09ICdzdHJpbmcnKSA/IGFyZ3MucG9wKCkgOiB1bmRlZmluZWQpO1xuICAgICAgICBpZiAoYXJncy5sZW5ndGggPiBtYXhBcmdzUmVhbCB8fCBhcmdzLmxlbmd0aCA8IG1pbkFyZ3MpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiAnK25hbWUrJyBtdXN0IGhhdmUgJyttaW5BcmdzKycuLicrbWF4QXJnc1JlYWwrJyBhcmd1bWVudHMgJyk7IC8vIFRPRE9cblxuICAgICAgICBjb25zdCBuID0gdGhpcy5uZXh0KCk7IC8vIFRPRE8gY2FsbCBpdCBhZHZhbmNlKCkgb3Igc210aC5cbiAgICAgICAgY29uc3QgZXZpZGVuY2UgPSBpbXBsKCAuLi5hcmdzICk7XG4gICAgICAgIHJldHVybiB0aGlzLnNldFJlc3VsdCggbiwgZXZpZGVuY2UsIGRlc2NyLCBuYW1lICk7XG4gICAgfTtcblxuICAgIHNlZW4uYWRkKG5hbWUpO1xuICAgIFJlcG9ydC5wcm90b3R5cGVbbmFtZV0gPSBjb2RlO1xufVxuXG4vKipcbiAqICAgQGZ1bmN0aW9uIGNoZWNrXG4gKiAgIEBtZW1iZXJPZiBSZXBvcnRcbiAqICAgQHBhcmFtIGV2aWRlbmNlIElmIGZhbHNlLCB0aGUgY2hlY2sgaXMgYXNzdW1lZCB0byBwYXNzLlxuICogICBBIHRydWUgdmFsdWUgbWVhbnMgdGhlIGNoZWNrIGZhaWxlZC5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH0gXG4gKi9cblxuLy8gdGhlc2UgY29uZGl0aW9ucyBjb3VsZCBiZSB1bmRlciB0aGUgY29uZGl0aW9uIGxpYnJhcnlcbi8vIGJ1dCB3ZSdsbCBuZWVkIHRoZW0gdG8gdmVyaWZ5IHRoZSBSZXBvcnQgY2xhc3MgaXRzZWxmLlxuXG5hZGRDb25kaXRpb24oXG4gICAgJ2NoZWNrJyxcbiAgICB7YXJnczoxfSxcbiAgICB4PT54XG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdwYXNzJyxcbiAgICB7YXJnczowfSxcbiAgICAoKT0+MFxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnZmFpbCcsXG4gICAge2FyZ3M6MH0sXG4gICAgKCk9PidmYWlsZWQgZGVsaWJlcmF0ZWx5J1xuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnZXF1YWwnLFxuICAgIHthcmdzOjJ9LFxuICAgIChhLGIpID0+IGEgPT09IGIgPyAwIDogWyAnLSAnK2V4cGxhaW4oYSksICcrICcgKyBleHBsYWluKGIpIF1cbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ21hdGNoJyxcbiAgICB7YXJnczoyfSxcbiAgICAoYSxyZXgpID0+ICgnJythKS5tYXRjaChyZXgpID8gMCA6IFtcbiAgICAgICAgJ1N0cmluZyAgICAgICAgIDogJythLFxuICAgICAgICAnRG9lcyBub3QgbWF0Y2ggOiAnK3JleFxuICAgIF1cbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ25lc3RlZCcsXG4gICAge2Z1bjoxLG1pbkFyZ3M6MX0sXG4gICAgKC4uLmFyZ3MpID0+IG5ldyBSZXBvcnQoKS5ydW4oLi4uYXJncykuc3RvcCgpXG4pO1xuXG4vKipcbiAqICAgQGRlc2MgQ3JlYXRlIGEgZnJlc2ggUmVwb3J0IG9iamVjdCBhbmQgcGFzcyBpdCB0byBhIGZ1bmN0aW9uLlxuICogICBAcmV0dXJucyB7UmVwb3J0fVxuICogICBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogICBUaGUgbGFzdCBhcmd1bWVudCBtdXN0IGJlIGEgY2FsbGJhY2sgdGFraW5nIHtSZXBvcnR9IGFzIGZpcnN0IGFyZ3VtZW50LlxuICogICBBbnkgcHJlY2VkaW5nIGFyZ3VtZW50cyB3aWxsIGJlIGZvcndhcmRlZCB0byBjYWxsYmFjayBhcyBpcy5cbiAqL1xuZnVuY3Rpb24gcmVwb3J0ICguLi5hcmdzKSB7XG4gICAgcmV0dXJuIG5ldyBSZXBvcnQoKS5ydW4oLi4uYXJncykuc3RvcCgpO1xufVxuXG4vKipcbiAqICAgQGV4cG9ydHMgUmVwb3J0XG4gKiAgIEBleHBvcnRzIHJlcG9ydFxuICogICBAZXhwb3J0cyBhZGRDb25kaXRpb25cbiAqICAgQGV4cG9ydHMgZXhwbGFpblxuICovXG5cbm1vZHVsZS5leHBvcnRzID0geyBSZXBvcnQsIHJlcG9ydCwgYWRkQ29uZGl0aW9uLCBleHBsYWluIH07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIERldGVybWluZSBuLXRoIGNhbGxlciB1cCB0aGUgc3RhY2sgKi9cbi8qIEluc3BpcmVkIGJ5IFBlcmwncyBDYXJwIG1vZHVsZSAqL1xuY29uc3QgaW5TdGFjayA9IC8oW146XFxzKCldKzpcXGQrKD86OlxcZCspPylcXFcqKFxcbnwkKS9nO1xuXG4vKipcbiAqICBAcHVibGljXG4gKiAgQGZ1bmN0aW9uXG4gKiAgQGRlc2MgUmV0dXJucyBzb3VyY2UgcG9zaXRpb24gbiBmcmFtZXMgdXAgdGhlIHN0YWNrXG4gKiAgQGV4YW1wbGVcbiAqICBcIi9mb28vYmFyLmpzOjI1OjExXCJcbiAqICBAcGFyYW0ge2ludGVnZXJ9IGRlcHRoIEhvdyBtYW55IGZyYW1lcyB0byBza2lwXG4gKiAgQHJldHVybnMge3N0cmluZ30gc291cmNlIGZpbGUsIGxpbmUsIGFuZCBjb2x1bW4sIHNlcGFyYXRlZCBieSBjb2xvbi5cbiAqL1xuZnVuY3Rpb24gY2FsbGVySW5mbyhuKSB7XG4gICAgLyogYSB0ZXJyaWJsZSByZXggdGhhdCBiYXNpY2FsbHkgc2VhcmNoZXMgZm9yIGZpbGUuanM6bm5uOm5ubiBzZXZlcmFsIHRpbWVzKi9cbiAgICByZXR1cm4gKG5ldyBFcnJvcigpLnN0YWNrLm1hdGNoKGluU3RhY2spW24rMV0ucmVwbGFjZSgvXFxuJC8sICcnKSB8fCAnJylcbn1cblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBmdW5jdGlvblxuICogIEBkZXNjIFN0cmluZ2lyeSBvYmplY3RzIHJlY3Vyc2l2ZWx5IHdpdGggbGltaXRlZCBkZXB0aFxuICogIGFuZCBjaXJjdWxhciByZWZlcmVuY2UgdHJhY2tpbmcuXG4gKiAgR2VuZXJhbGx5IEpTT04uc3RyaW5naWZ5IGlzIHVzZWQgYXMgcmVmZXJlbmNlOlxuICogIHN0cmluZ3MgYXJlIGVzY2FwZWQgYW5kIGRvdWJsZS1xdW90ZWQ7IG51bWJlcnMsIGJvb2xlYW4sIGFuZCBudWxscyBhcmVcbiAqICBzdHJpbmdpZmllZCBcImFzIGlzXCI7IG9iamVjdHMgYW5kIGFycmF5cyBhcmUgZGVzY2VuZGVkIGludG8uXG4gKiAgVGhlIGRpZmZlcmVuY2VzIGZvbGxvdzpcbiAqICB1bmRlZmluZWQgaXMgcmVwb3J0ZWQgYXMgJzx1bmRlZj4nLlxuICogIE9iamVjdHMgdGhhdCBoYXZlIGNvbnN0cnVjdG9ycyBhcmUgcHJlZml4ZWQgd2l0aCBjbGFzcyBuYW1lcy5cbiAqICBPYmplY3QgYW5kIGFycmF5IGNvbnRlbnQgaXMgYWJicmV2aWF0ZWQgYXMgXCIuLi5cIiBhbmQgXCJDaXJjdWxhclwiXG4gKiAgaW4gY2FzZSBvZiBkZXB0aCBleGhhdXN0aW9uIGFuZCBjaXJjdWxhciByZWZlcmVuY2UsIHJlc3BlY3RpdmVseS5cbiAqICBGdW5jdGlvbnMgYXJlIG5haXZlbHkgc3RyaW5naWZpZWQuXG4gKiAgQHBhcmFtIHtBbnl9IHRhcmdldCBPYmplY3QgdG8gc2VyaWFsaXplLlxuICogIEBwYXJhbSB7aW50ZWdlcn0gZGVwdGg9MyBEZXB0aCBsaW1pdC5cbiAqICBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5mdW5jdGlvbiBleHBsYWluKCBpdGVtLCBkZXB0aD0zLCBvcHRpb25zPXt9LCBwYXRoPSckJywgc2Vlbj1uZXcgU2V0KCkgKSB7XG4gICAgLy8gc2ltcGxlIHR5cGVzXG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJylcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGl0ZW0pOyAvLyBkb24ndCB3YW50IHRvIHNwZW5kIHRpbWUgcW91dGluZ1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ251bWJlcicgfHwgdHlwZW9mIGl0ZW0gPT09ICdib29sZWFuJyB8fCBpdGVtID09PSBudWxsKVxuICAgICAgICByZXR1cm4gJycraXRlbTtcbiAgICBpZiAoaXRlbSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gJzx1bmRlZj4nO1xuXG4gICAgLy8gcmVjdXJzZVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoaXRlbSkpIHtcbiAgICAgICAgLy8gVE9ETyBrZWVwIHBhdGggYnV0IHRoZXJlJ3Mgbm8gd2F5IG9mIHN0b3Jpbmcgc210aCBieSBvYmplY3RcbiAgICAgICAgaWYgKHNlZW4uaGFzKGl0ZW0pKVxuICAgICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgaWYgKGRlcHRoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiAnWy4uLl0nO1xuICAgICAgICBzZWVuLmFkZChpdGVtKTtcbiAgICAgICAgLy8gVE9ETyA8eCBlbXB0eSBpdGVtcz5cbiAgICAgICAgY29uc3QgbGlzdCA9IGl0ZW0ubWFwKFxuICAgICAgICAgICAgKHZhbCwgaW5kZXgpID0+IGV4cGxhaW4odmFsLCBkZXB0aC0xLCBvcHRpb25zLCBwYXRoKydbJytpbmRleCsnXScsIG5ldyBTZXQoc2VlbikpXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiAnWycrbGlzdC5qb2luKFwiLCBcIikrXCJdXCI7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0Jykge1xuICAgICAgICBjb25zdCB0eXBlID0gaXRlbS5jb25zdHJ1Y3RvciAmJiBpdGVtLmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgICAgIGNvbnN0IHByZWZpeCA9IHR5cGUgJiYgdHlwZSAhPT0gJ09iamVjdCcgPyB0eXBlICsgJyAnIDogJyc7XG4gICAgICAgIC8vIFRPRE8ga2VlcCBwYXRoIGJ1dCB0aGVyZSdzIG5vIHdheSBvZiBzdG9yaW5nIHNtdGggYnkgb2JqZWN0XG4gICAgICAgIGlmIChzZWVuLmhhcyhpdGVtKSlcbiAgICAgICAgICAgIHJldHVybiBwcmVmaXgrJ3tDaXJjdWxhcn0nO1xuICAgICAgICAvLyBUT0RPIDx4IGVtcHR5IGl0ZW1zPlxuICAgICAgICBpZiAoZGVwdGggPCAxKVxuICAgICAgICAgICAgcmV0dXJuIHByZWZpeCArICd7Li4ufSc7XG4gICAgICAgIHNlZW4uYWRkKGl0ZW0pO1xuICAgICAgICBjb25zdCBsaXN0ID0gT2JqZWN0LmtleXMoaXRlbSkuc29ydCgpLm1hcCgga2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gSlNPTi5zdHJpbmdpZnkoa2V5KTtcbiAgICAgICAgICAgIHJldHVybiBpbmRleCtcIjpcIitleHBsYWluKGl0ZW1ba2V5XSwgZGVwdGgtMSwgb3B0aW9ucywgcGF0aCsnWycraW5kZXgrJ10nLCBuZXcgU2V0KHNlZW4pKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBwcmVmaXggKyAneycgKyBsaXN0LmpvaW4oXCIsIFwiKSArICd9JztcbiAgICB9XG5cbiAgICAvLyBkdW5ubyB3aGF0IGl0IGlzLCBtYXliZSBhIGZ1bmN0aW9uXG4gICAgcmV0dXJuICcnK2l0ZW07XG59XG5cbi8vIE11c3Qgd29yayBldmVuIHdpdGhvdXQgYXNzZXJ0XG5jb25zdCBoYXNBc3NlcnQgPSB0eXBlb2YgYXNzZXJ0ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFzc2VydC5Bc3NlcnRpb25FcnJvciA9PT0gJ2Z1bmN0aW9uJztcblxuY29uc3QgbWFrZUVycm9yID0gaGFzQXNzZXJ0XG4gICAgPyBlbnRyeSA9PiBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKGVudHJ5KVxuICAgIDogZW50cnkgPT4gbmV3IEVycm9yKCBlbnRyeS5hY3R1YWwgKTtcblxuLyoqXG4gKiAgIEBleHBvcnRzIGNhbGxlckluZm9cbiAqICAgQGV4cG9ydHMgZXhwbGFpblxuICovXG5cbm1vZHVsZS5leHBvcnRzID0geyBjYWxsZXJJbmZvLCBleHBsYWluLCBtYWtlRXJyb3IgfTtcbiJdfQ==
