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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9yZWZ1dGUuanMiLCJsaWIvcmVmdXRlL2NvbmQvYXJyYXkuanMiLCJsaWIvcmVmdXRlL2NvbmQvYmFzaWMuanMiLCJsaWIvcmVmdXRlL2NvbmQvZGVlcC5qcyIsImxpYi9yZWZ1dGUvcmVwb3J0LmpzIiwibGliL3JlZnV0ZS91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IFJlcG9ydCwgcmVwb3J0LCBhZGRDb25kaXRpb24gLCBleHBsYWluIH0gPSByZXF1aXJlICgnLi9yZWZ1dGUvcmVwb3J0LmpzJyk7XG5cbi8vIGltcG9ydCBkZWZhdWx0IGNvbmRpdGlvbiBhcnNlbmFsXG5yZXF1aXJlKCAnLi9yZWZ1dGUvY29uZC9iYXNpYy5qcycgKTtcbnJlcXVpcmUoICcuL3JlZnV0ZS9jb25kL2FycmF5LmpzJyApO1xucmVxdWlyZSggJy4vcmVmdXRlL2NvbmQvZGVlcC5qcycgKTtcblxuLy8gQWxsb3cgY3JlYXRpbmcgbXVsdGlwbGUgcGFyYWxsZWwgY29uZmlndXJhdGlvbnMgb2YgcmVmdXRlXG4vLyBlLmcuIG9uZSBzdHJpY3QgKHRocm93aW5nIGVycm9ycykgYW5kIG90aGVyIGxheCAoanVzdCBkZWJ1Z2dpbmcgdG8gY29uc29sZSlcbmZ1bmN0aW9uIHNldHVwKCBvcHRpb25zPXt9LCBvcmlnICkge1xuICAgIC8vIFRPRE8gdmFsaWRhdGUgb3B0aW9uc1xuICAgIGNvbnN0IG9uRmFpbCA9IG9wdGlvbnMub25GYWlsIHx8IChyZXAgPT4geyB0aHJvdyBuZXcgRXJyb3IocmVwLmdldFRhcCgpKSB9KTtcblxuICAgIGNvbnN0IHJlZnV0ZSA9IG9wdGlvbnMuc2tpcFxuICAgICAgICA/ICgpPT57fVxuICAgICAgICA6ICguLi5hcmdzKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBvayA9IHJlcG9ydCguLi5hcmdzKTtcbiAgICAgICAgICAgIGlmICghb2suZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgIG9uRmFpbChvaywgYXJncyk7XG4gICAgICAgIH07XG5cbiAgICAvLyByZWV4cG9ydCBhbGwgZnJvbSByZXBvcnQuanNcbiAgICByZWZ1dGUuUmVwb3J0ID0gUmVwb3J0O1xuICAgIHJlZnV0ZS5yZXBvcnQgPSByZXBvcnQ7IC8vIFRPRE8gb3VjaCwgcmVuYW1lP1xuICAgIHJlZnV0ZS5leHBsYWluID0gZXhwbGFpbjtcbiAgICByZWZ1dGUuYWRkQ29uZGl0aW9uID0gYWRkQ29uZGl0aW9uO1xuXG4gICAgLy8gcmVmdXRlLmNvbmYoey4uLn0pIHdpbGwgZ2VuZXJhdGUgYSBfbmV3XyByZWZ1dGVcbiAgICByZWZ1dGUuY29uZmlnID0gdXBkYXRlID0+IHNldHVwKCB7IC4uLm9wdGlvbnMsIC4uLnVwZGF0ZSB9LCByZWZ1dGUgKTtcblxuICAgIC8vIFRPRE8gdGhpcyBpcyBzdHVwaWQsIGNvbWUgdXAgd2l0aCBzbXRoIGJldHRlclxuICAgIC8vIHdoZW4gaW4gYnJvd3Nlciwgd2luZG93LnJlZnV0ZS5jb25maWcoKSB1cGRhdGVzIHdpbmRvdy5yZWZ1dGUgaXRzZWxmXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIG9yaWcgPT09IHdpbmRvdy5yZWZ1dGUpXG4gICAgICAgIHdpbmRvdy5yZWZ1dGUgPSByZWZ1dGU7XG5cbiAgICByZXR1cm4gcmVmdXRlO1xufVxuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBzZXR1cCgpO1xuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuICAgIHdpbmRvdy5yZWZ1dGUgPSBzZXR1cCgpOyAvLyBUT0RPIGNoZWNrIHByZWV4aXN0aW5nXG5cbi8qKlxuICogICBAY2FsbGJhY2sgQ29udHJhY3RcbiAqICAgQGRlc2MgQSBjb2RlIGJsb2NrIGNvbnRhaW5pbmcgb25lIG9yIG1vcmUgY29uZGl0aW9uIGNoZWNrcy5cbiAqICAgQSBjaGVjayBpcyBwZXJmb3JtZWQgYnkgY2FsbGluZyBvbmUgb2YgYSBmZXcgc3BlY2lhbCBtZXRob2RzXG4gKiAgIChlcXVhbCwgbWF0Y2gsIGRlZXBFcXVhbCwgdHlwZSBldGMpXG4gKiAgIG9uIHRoZSBSZXBvcnQgb2JqZWN0LlxuICogICBDb250cmFjdHMgbWF5IGJlIG5lc3RlZCB1c2luZyB0aGUgJ25lc3RlZCcgbWV0aG9kIHdoaWNoIGFjY2VwdHNcbiAqICAgYW5vdGhlciBjb250cmFjdCBhbmQgcmVjb3JkcyBhIHBhc3MvZmFpbHVyZSBpbiB0aGUgcGFyZW50IGFjY29yZGluZ2x5LnFcbiAqICAgQSBjb250cmFjdCBpcyBhbHdheXMgZXhlY3V0ZWQgdG8gdGhlIGVuZC5cbiAqICAgQHBhcmFtIHtSZXBvcnR9IG9rIEFuIG9iamVjdCB0aGF0IHJlY29yZHMgY2hlY2sgcmVzdWx0cy5cbiAqICAgQHBhcmFtIHtBbnl9IFsuLi5saXN0XSBBZGRpdGlvbmFsIHBhcmFtZXRlcnNcbiAqICAgKGUuZy4gZGF0YSBzdHJ1Y3R1cmUgdG8gYmUgdmFsaWRhdGVkKVxuICogICBAcmV0dXJucyB7dm9pZH0gUmV0dXJuZWQgdmFsdWUgaXMgaWdub3JlZC5cbiAqL1xuXG4vKipcbiAqICAgQHB1YmxpY1xuICogICBAZnVuY3Rpb24gcmVmdXRlXG4gKiAgIEBwYXJhbSB7QW55fSBbLi4ubGlzdF0gRGF0YSB0byBmZWVkIHRvIHRoZSBjYWxsYmFja1xuICogICBAcGFyYW0ge0NvbnRyYWN0fSBjb250cmFjdCBBIGNvZGUgYmxvY2sgd2l0aCBjaGVja3MuXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9IFJldHVybiB2YWx1ZSBpcyBpZ25vcmVkLlxuICogICBAdGhyb3dzIHtFcnJvcn0gSWYgb25lIG9yIG1vcmUgY2hlY2tzIGFyZSBmYWlsaW5nLCBhbiBleGNlcHRpb24gaXMgdGhyb3duXG4gKiAgIHdpdGggZGV0YWlscyBhYm91dCBhbGwgcGFzc2luZy9mYWlsaW5nIGNoZWNrcy5cbiAqICAgVGhpcyBhY3Rpb24gY2FuIGJlIGNoYW5nZWQgdmlhIHJlZnV0ZS5jb25maWcoKSBjYWxsLlxuICovXG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIHJlcG9ydCB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcblxuLy8gVE9ETyByZW5hbWUgZm9yRWFjaCBvciBzbXRoLlxuYWRkQ29uZGl0aW9uKFxuICAgICdtYXAnLFxuICAgIHtmdW46MSxhcmdzOjJ9LFxuICAgIChsaXN0LCBjb250cmFjdCkgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpXG4gICAgICAgICAgICByZXR1cm4gJ0V4cGVjdGVkIGEgbGlzdCwgZm91bmQgYSAnLnR5cGVvZihsaXN0KTtcbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBhdXRvLXBhc3NcblxuICAgICAgICByZXR1cm4gcmVwb3J0KCBvayA9PiB7XG4gICAgICAgICAgICBsaXN0LmZvckVhY2goIChpdGVtLCBpbmRleCkgPT4gb2submVzdGVkKCBcIml0ZW0gXCIraW5kZXgsIGl0ZW0sIGNvbnRyYWN0ICkgKTtcbiAgICAgICAgfSk7XG4gICAgfVxuKTtcblxuLy8gVE9ETyB0aGlzIGlzIGNhbGxlZCBcImNvbXBsaWFudCBjaGFpblwiIGJ1dCBiZXR0ZXIganVzdCBzYXkgaGVyZVxuLy8gXCJvaCB3ZSdyZSBjaGVja2luZyBlbGVtZW50IG9yZGVyXCJcbmFkZENvbmRpdGlvbihcbiAgICAnb3JkZXJlZCcsIC8vIFRPRE8gYmV0dGVyIG5hbWU/XG4gICAge2Z1bjoxLGFyZ3M6Mn0sXG4gICAgKGxpc3QsIGNvbnRyYWN0KSA9PiB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSlcbiAgICAgICAgICAgIHJldHVybiAnRXhwZWN0ZWQgYSBsaXN0LCBmb3VuZCBhICcudHlwZW9mKGxpc3QpO1xuICAgICAgICBpZiAobGlzdC5sZW5ndGggPCAyKVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGF1dG8tcGFzc1xuXG4gICAgICAgIHJldHVybiByZXBvcnQoIG9rID0+IHtcbiAgICAgICAgICAgIGZvciAobGV0IG4gPSAwOyBuIDwgbGlzdC5sZW5ndGgtMTsgbisrKSB7XG4gICAgICAgICAgICAgICAgb2submVzdGVkKCBcIml0ZW1zIFwiK24rXCIsIFwiKyhuKzEpLCBsaXN0W25dLCBsaXN0W24rMV0sIGNvbnRyYWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuKTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IGFkZENvbmRpdGlvbiwgcmVwb3J0LCBleHBsYWluIH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuY29uc3QgT0sgPSBmYWxzZTtcblxuY29uc3QgbnVtQ21wID0ge1xuICAgICc8JyA6ICh4LHkpPT4oeCAgPCB5KSxcbiAgICAnPicgOiAoeCx5KT0+KHggID4geSksXG4gICAgJzw9JzogKHgseSk9Pih4IDw9IHkpLFxuICAgICc+PSc6ICh4LHkpPT4oeCA+PSB5KSxcbiAgICAnPT0nOiAoeCx5KT0+KHggPT09IHkpLFxuICAgICchPSc6ICh4LHkpPT4oeCAhPT0geSksXG59O1xuXG4vLyB1c2UgIT0gYW5kIG5vdCAhPT0gZGVsaWJlcmF0ZWx5IHRvIGZpbHRlciBvdXQgbnVsbCAmIHVuZGVmaW5lZFxuY29uc3Qgc3RyQ21wID0ge1xuICAgICc8JyA6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCAgPCAnJyt5KSxcbiAgICAnPicgOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggID4gJycreSksXG4gICAgJzw9JzogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4IDw9ICcnK3kpLFxuICAgICc+PSc6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCA+PSAnJyt5KSxcblxuICAgICc9PSc6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCA9PT0gJycreSksXG4gICAgJyE9JzogKHgseSk9PigoeCA9PSB1bmRlZmluZWQpXih5ID09IHVuZGVmaW5lZCkpIHx8ICgnJyt4ICE9PSAnJyt5KSxcbn07XG5cbmFkZENvbmRpdGlvbihcbiAgICAnbnVtQ21wJyxcbiAgICB7YXJnczozfSxcbiAgICAoeCxvcCx5KSA9PiBudW1DbXBbb3BdKHgseSk/MDpbeCxcImlzIG5vdCBcIitvcCx5XVxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnc3RyQ21wJyxcbiAgICB7YXJnczozfSxcbiAgICAoeCxvcCx5KSA9PiBzdHJDbXBbb3BdKHgseSk/MDpbeCxcImlzIG5vdCBcIitvcCx5XVxuKTtcblxuY29uc3QgdHlwZUNoZWNrID0ge1xuICAgIHVuZGVmaW5lZDogeCA9PiB4ID09PSB1bmRlZmluZWQsXG4gICAgbnVsbDogICAgICB4ID0+IHggPT09IG51bGwsXG4gICAgbnVtYmVyOiAgICB4ID0+IHR5cGVvZiB4ID09PSAnbnVtYmVyJyAmJiAhTnVtYmVyLmlzTmFOKHgpLFxuICAgIGludGVnZXI6ICAgeCA9PiBOdW1iZXIuaXNJbnRlZ2VyKHgpLFxuICAgIG5hbjogICAgICAgeCA9PiBOdW1iZXIuaXNOYU4oeCksXG4gICAgc3RyaW5nOiAgICB4ID0+IHR5cGVvZiB4ID09PSAnc3RyaW5nJyxcbiAgICBmdW5jdGlvbjogIHggPT4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicsXG4gICAgYm9vbGVhbjogICB4ID0+IHR5cGVvZiB4ID09PSAnYm9vbGVhbicsXG4gICAgb2JqZWN0OiAgICB4ID0+IHggJiYgdHlwZW9mIHggPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KHgpLFxuICAgIGFycmF5OiAgICAgeCA9PiBBcnJheS5pc0FycmF5KHgpLFxufTtcbmZ1bmN0aW9uIHR5cGVFeHBsYWluICh4KSB7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnc3RyaW5nJylcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKVxuICAgICAgICByZXR1cm4gJ2luc3RhbmNlb2YgJysoeC5uYW1lIHx8IHgpO1xufTtcblxuYWRkQ29uZGl0aW9uKFxuICAgICd0eXBlJyxcbiAgICB7YXJnczogMn0sXG4gICAgKGdvdCwgZXhwKT0+e1xuICAgICAgICBpZiAoICFBcnJheS5pc0FycmF5KGV4cCkgKVxuICAgICAgICAgICAgZXhwID0gW2V4cF07XG5cbiAgICAgICAgZm9yIChsZXQgdmFyaWFudCBvZiBleHApIHtcbiAgICAgICAgICAgIC8vIGtub3duIHR5cGVcbiAgICAgICAgICAgIGlmKCB0eXBlb2YgdmFyaWFudCA9PT0gJ3N0cmluZycgJiYgdHlwZUNoZWNrW3ZhcmlhbnRdICkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlQ2hlY2tbdmFyaWFudF0oZ290KSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9LO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gaW5zdGFuY2VvZlxuICAgICAgICAgICAgaWYoIHR5cGVvZiB2YXJpYW50ID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBnb3QgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgaWYoIGdvdCBpbnN0YW5jZW9mIHZhcmlhbnQgKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gT0s7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBkb24ndCBrbm93IHdoYXQgeW91J3JlIGFza2luZyBmb3JcbiAgICAgICAgICAgIHJldHVybiAndW5rbm93biB2YWx1ZSB0eXBlIHNwZWM6ICcrZXhwbGFpbih2YXJpYW50LCAxKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICctICcrZXhwbGFpbihnb3QsIDEpLFxuICAgICAgICAgICAgJysgJytleHAubWFwKCB0eXBlRXhwbGFpbiApLmpvaW4oXCIgb3IgXCIpLFxuICAgICAgICBdO1xuICAgIH1cbik7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIGV4cGxhaW4gfSA9IHJlcXVpcmUoICcuLi9yZXBvcnQuanMnICk7XG5cbmFkZENvbmRpdGlvbiggJ2RlZXBFcXVhbCcsIHtcImFyZ3NcIjoyLGhhc09wdGlvbnM6dHJ1ZX0sIGRlZXAgKTtcblxuZnVuY3Rpb24gZGVlcCggZ290LCBleHAsIG9wdGlvbnM9e30gKSB7XG4gICAgaWYgKCFvcHRpb25zLm1heClcbiAgICAgICAgb3B0aW9ucy5tYXggPSA1O1xuICAgIG9wdGlvbnMuZGlmZiA9IFtdO1xuICAgIF9kZWVwKCBnb3QsIGV4cCwgb3B0aW9ucyApO1xuICAgIGlmICghb3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgcmV0dXJuIDA7XG5cbiAgICBjb25zdCByZXQgPSBbXTtcbiAgICBmb3IgKGxldCBpdGVtIG9mIG9wdGlvbnMuZGlmZikge1xuICAgICAgICByZXQucHVzaCggXG4gICAgICAgICAgICBcImF0IFwiK2l0ZW1bMF0sXG4gICAgICAgICAgICBcIi0gXCIrZXhwbGFpbiggaXRlbVsxXSwgMiApLFxuICAgICAgICAgICAgXCIrIFwiK2V4cGxhaW4oIGl0ZW1bMl0sIDIgKVxuICAgICAgICApO1xuICAgIH07XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbi8vIHJlc3VsdCBpcyBzdG9yZWQgaW4gb3B0aW9ucy5kaWZmPVtdLCByZXR1cm4gdmFsdWUgaXMgaWdub3JlZFxuLy8gaWYgc2FpZCBkaWZmIGV4Y2VlZHMgbWF4LCByZXR1cm4gaW1tZWRpYXRlbHkgJiBkb24ndCB3YXN0ZSB0aW1lXG5mdW5jdGlvbiBfZGVlcCggZ290LCBleHAsIG9wdGlvbnM9e30sIHBhdGg9JyQnLCBzZWVuPW5ldyBTZXQoKSApIHtcbiAgICBpZiAoZ290ID09PSBleHAgfHwgb3B0aW9ucy5tYXggPD0gb3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgcmV0dXJuO1xuICAgIGlmICh0eXBlb2YgZ290ICE9PSB0eXBlb2YgZXhwKVxuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG5cbiAgICAvLyByZWN1cnNlIGJ5IGV4cGVjdGVkIHZhbHVlIC0gY29uc2lkZXIgaXQgbW9yZSBwcmVkaWN0YWJsZVxuICAgIGlmICh0eXBlb2YgZXhwICE9PSAnb2JqZWN0JyB8fCBleHAgPT09IG51bGwgKSB7XG4gICAgICAgIC8vIG5vbi1vYmplY3RzIC0gc28gY2FuJ3QgZGVzY2VuZFxuICAgICAgICAvLyBhbmQgY29tcGFyaXNvbiBhbHJlYWR5IGRvbmUgYXQgdGhlIGJlZ2lubm5pbmdcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuICAgIH1cblxuICAgIC8vIG11c3QgZGV0ZWN0IGxvb3BzIGJlZm9yZSBnb2luZyBkb3duXG4gICAgaWYgKHNlZW4uaGFzKGV4cCkpIHtcbiAgICAgICAgb3B0aW9ucy5tYXggPSAwO1xuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFxuICAgICAgICAgICAgW3BhdGggKyAnIChFeHBlY3RpbmcgY2lyY3VsYXIgcmVmZXJlbmNlLCBhdXRvLWZhaWwpJywgZ290LCBleHAgXSApO1xuICAgIH07XG4gICAgc2Vlbi5hZGQoZXhwKTtcblxuICAgIC8vIGNvbXBhcmUgb2JqZWN0IHR5cGVzXG4gICAgLy8gKGlmIGEgdXNlciBpcyBzdHVwaWQgZW5vdWdoIHRvIG92ZXJyaWRlIGNvbnN0cnVjdG9yIGZpZWxkLCB3ZWxsIHRoZSB0ZXN0XG4gICAgLy8gd291bGQgZmFpbCBsYXRlciBhbnl3YXkpXG4gICAgaWYgKGdvdC5jb25zdHJ1Y3RvciAhPT0gZXhwLmNvbnN0cnVjdG9yKVxuICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG5cbiAgICAvLyBhcnJheVxuICAgIGlmIChBcnJheS5pc0FycmF5KGV4cCkpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGdvdCkgfHwgZ290Lmxlbmd0aCAhPT0gZXhwLmxlbmd0aClcbiAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGV4cC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgX2RlZXAoIGdvdFtpXSwgZXhwW2ldLCBvcHRpb25zLCBwYXRoKydbJytpKyddJywgbmV3IFNldChzZWVuKSk7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5tYXg8PW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybjtcbiAgICB9O1xuXG4gICAgLy8gY29tcGFyZSBrZXlzIC0gKzEgZm9yIGV4cCwgLTEgZm9yIGdvdCwgbm9uemVybyBrZXkgYXQgZW5kIG1lYW5zIGtleXMgZGlmZmVyXG4gICAgY29uc3QgdW5pcSA9IHt9O1xuICAgIE9iamVjdC5rZXlzKGV4cCkuZm9yRWFjaCggeCA9PiB1bmlxW3hdID0gMSApO1xuICAgIE9iamVjdC5rZXlzKGdvdCkuZm9yRWFjaCggeCA9PiB1bmlxW3hdID0gKHVuaXFbeF0gfHwgMCkgLSAxICk7XG4gICAgZm9yIChsZXQgeCBpbiB1bmlxKSB7XG4gICAgICAgIGlmICh1bmlxW3hdICE9PSAwKVxuICAgICAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuICAgIH1cbiAgICBcbiAgICAvLyBub3cgdHlwZW9mLCBvYmplY3QgdHlwZSwgYW5kIG9iamVjdCBrZXlzIGFyZSB0aGUgc2FtZS5cbiAgICAvLyByZWN1cnNlLlxuICAgIGZvciAobGV0IGkgaW4gZXhwKSB7XG4gICAgICAgIF9kZWVwKCBnb3RbaV0sIGV4cFtpXSwgb3B0aW9ucywgcGF0aCsnWycrZXhwbGFpbihpKSsnXScsIG5ldyBTZXQoc2VlbikpO1xuICAgICAgICBpZiAob3B0aW9ucy5tYXg8PW9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgICAgICBicmVhaztcbiAgICB9O1xuICAgIHJldHVybjtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgY2FsbGVySW5mbywgZXhwbGFpbiwgbWFrZUVycm9yIH0gPSByZXF1aXJlKCAnLi91dGlsLmpzJyApO1xuXG4vKipcbiAqIEBwdWJsaWNcbiAqIEBjbGFzc2Rlc2NcbiAqIFRoZSBjb3JlIG9mIHRoZSByZWZ1dGUgbGlicmFyeSwgdGhlIHJlcG9ydCBvYmplY3QgY29udGFpbnMgaW5mb1xuICogYWJvdXQgcGFzc2luZyBhbmQgZmFpbGluZyBjb25kaXRpb25zLlxuICovXG5jbGFzcyBSZXBvcnQge1xuICAgIC8vIHNldHVwXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuX2NvdW50ICAgICA9IDA7XG4gICAgICAgIHRoaXMuX2ZhaWxDb3VudCA9IDA7XG4gICAgICAgIHRoaXMuX2Rlc2NyICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9ldmlkZW5jZSAgPSBbXTtcbiAgICAgICAgdGhpcy5fd2hlcmUgICAgID0gW107XG4gICAgICAgIHRoaXMuX2NvbmROYW1lICA9IFtdO1xuICAgICAgICB0aGlzLl9pbmZvICAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fbmVzdGVkICAgID0gW107XG4gICAgICAgIHRoaXMuX2RvbmUgICAgICA9IGZhbHNlO1xuICAgICAgICAvLyBUT0RPIGFkZCBjYWxsZXIgaW5mbyBhYm91dCB0aGUgcmVwb3J0IGl0c2VsZlxuICAgIH1cblxuICAgIC8vIHNldHVwIC0gbXVzdCBiZSBjaGFpbmFibGVcbiAgICBzZXRUaXRsZShzdHIpIHtcbiAgICAgICAgdGhpcy5fdGl0bGUgPSBzdHI7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbiAgICAvLyBydW5uaW5nXG4gICAgcnVuKC4uLmFyZ3MpIHtcbiAgICAgICAgaWYgKHRoaXMuX2RvbmUpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIFJlcG9ydCcpO1xuICAgICAgICBjb25zdCBibG9jayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhc3QgYXJndW1lbnQgb2YgcnVuKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLCBub3QgJyt0eXBlb2YoYmxvY2spKTtcbiAgICAgICAgYmxvY2soIHRoaXMsIC4uLmFyZ3MgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gSW4gdGhlb3J5LCBoYXZpbmcgY29uc3Qgbj1uZXh0KCk7IHNldFJlc3VsdChuLiAuLi4pXG4gICAgLy8gc2hvdWxkIGFsbG93IGZvciBhc3luYyBjb25kaXRpb25zIGluIHRoZSBmdXR1cmVcbiAgICAvLyBpZiBhdCBhbGwgcG9zc2libGUgd2l0aG91dCBncmVhdCBzYWNyaWZpY2VzLlxuICAgIG5leHQoKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnQXR0ZW1wdCB0byBtb2RpZnkgYSBmaW5pc2hlZCBSZXBvcnQnKTtcbiAgICAgICAgcmV0dXJuICsrdGhpcy5fY291bnQ7XG4gICAgfVxuXG4gICAgc2V0UmVzdWx0IChuLCBldmlkZW5jZSwgZGVzY3IsIGNvbmROYW1lKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnQXR0ZW1wdCB0byBtb2RpZnkgYSBmaW5pc2hlZCBSZXBvcnQnKTtcbiAgICAgICAgaWYgKG4gPiB0aGlzLl9jb3VudClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciAoJ0F0dGVtcHQgdG8gc2V0IGNvbmRpdGlvbiBiZXlvbmQgY2hlY2sgY291bnQnKTtcbiAgICAgICAgaWYgKGRlc2NyKVxuICAgICAgICAgICAgdGhpcy5fZGVzY3Jbbl0gPSBkZXNjcjtcbiAgICAgICAgLy8gcGFzcyAtIHJldHVybiBBU0FQXG4gICAgICAgIGlmICghZXZpZGVuY2UpXG4gICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgLy8gbmVzdGVkIHJlcG9ydCBuZWVkcyBzcGVjaWFsIGhhbmRsaW5nXG4gICAgICAgIGlmIChldmlkZW5jZSBpbnN0YW5jZW9mIFJlcG9ydCkge1xuICAgICAgICAgICAgdGhpcy5fbmVzdGVkW25dID0gZXZpZGVuY2U7XG4gICAgICAgICAgICBpZiAoZXZpZGVuY2UuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGV2aWRlbmNlID0gW107XG4gICAgICAgIH1cblxuICAgICAgICAvLyBsaXN0aWZ5ICYgc3RyaW5naWZ5IGV2aWRlbmNlLCBzbyB0aGF0IGl0IGRvZXNuJ3QgY2hhbmdlIHBvc3QtZmFjdHVtXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShldmlkZW5jZSkpXG4gICAgICAgICAgICBldmlkZW5jZSA9IFsgZXZpZGVuY2UgXTtcbiAgICAgICAgdGhpcy5fZXZpZGVuY2Vbbl0gPSBldmlkZW5jZS5tYXAoIHg9Pl9leHBsYWluKHgsIEluZmluaXR5KSApO1xuICAgICAgICB0aGlzLl93aGVyZVtuXSAgICA9IGNhbGxlckluZm8oMik7XG4gICAgICAgIHRoaXMuX2NvbmROYW1lW25dID0gY29uZE5hbWU7XG4gICAgICAgIHRoaXMuX2ZhaWxDb3VudCsrO1xuXG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBAZGVzYyBBcHBlbmQgYW4gaW5mb3JtYXRpb25hbCBtZXNzYWdlIHRvIHRoZSByZXBvcnQuXG4gICAgICogTm9uLXN0cmluZyB2YWx1ZXMgd2lsbCBiZSBzdHJpbmdpZmllZCB2aWEgZXhwbGFpbigpLlxuICAgICAqIEBwYXJhbSB7QW55fSBtZXNzYWdlXG4gICAgICogQHJldHVybnMge1JlcG9ydH0gY2hhaW5hYmxlXG4gICAgICovXG4gICAgaW5mbyggLi4ubWVzc2FnZSApIHtcbiAgICAgICAgaWYgKHRoaXMuX2RvbmUpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIFJlcG9ydCcpO1xuICAgICAgICBpZiAoIXRoaXMuX2luZm9bdGhpcy5fY291bnRdKVxuICAgICAgICAgICAgdGhpcy5faW5mb1t0aGlzLl9jb3VudF0gPSBbXTtcbiAgICAgICAgdGhpcy5faW5mb1t0aGlzLl9jb3VudF0ucHVzaCggbWVzc2FnZS5tYXAoIHM9Pl9leHBsYWluKHMpICkuam9pbihcIiBcIikgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgc3RvcCgpIHtcbiAgICAgICAgdGhpcy5fZG9uZSA9IHRydWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIHF1ZXJ5aW5nXG4gICAgZ2V0VGl0bGUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl90aXRsZTsgLy9KRllJXG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqICAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0RG9uZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RvbmU7IC8vIGlzIGl0IGV2ZW4gbmVlZGVkP1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgV2l0aG91dCBhcmd1bWVudCByZXR1cm5zIHdoZXRoZXIgdGhlIGNvbnRyYWN0IHdhcyBmdWxmaWxsZWQuXG4gICAgICogICBBcyBhIHNwZWNpYWwgY2FzZSwgaWYgbm8gY2hlY2tzIHdlcmUgcnVuIGFuZCB0aGUgY29udHJhY3QgaXMgZmluaXNoZWQsXG4gICAgICogICByZXR1cm5zIGZhbHNlLCBhcyBpbiBcInNvbWVvbmUgbXVzdCBoYXZlIGZvcmdvdHRlbiB0byBleGVjdXRlXG4gICAgICogICBwbGFubmVkIGNoZWNrcy4gVXNlIHBhc3MoKSBpZiBubyBjaGVja3MgYXJlIHBsYW5uZWQuXG4gICAgICpcbiAgICAgKiAgIElmIGEgcGFyYW1ldGVyIGlzIGdpdmVuLCByZXR1cm4gdGhlIHN0YXR1cyBvZiBuLXRoIGNoZWNrIGluc3RlYWQuXG4gICAgICogICBAcGFyYW0ge2ludGVnZXJ9IG5cbiAgICAgKiAgIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGdldFBhc3Mobikge1xuICAgICAgICBpZiAobiA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2ZhaWxDb3VudCA9PT0gMCAmJiAoIXRoaXMuX2RvbmUgfHwgdGhpcy5fY291bnQgPiAwKTtcbiAgICAgICAgcmV0dXJuIChuID4gMCAmJiBuIDw9IHRoaXMuX2NvdW50KSA/ICF0aGlzLl9ldmlkZW5jZVtuXSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgcGVyZm9ybWVkLlxuICAgICAqICAgQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBXaGV0aGVyIHRoZSBsYXN0IGNoZWNrIHdhcyBhIHN1Y2Nlc3MuXG4gICAgICogIFRoaXMgaXMganVzdCBhIHNob3J0Y3V0IGZvciBmb28uZ2V0RGV0YWlscyhmb28uZ2V0Q291bnQpLnBhc3NcbiAgICAgKiAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgbGFzdCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50ID8gIXRoaXMuX2V2aWRlbmNlW3RoaXMuX2NvdW50XSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgZmFpbGluZy5cbiAgICAgKiAgIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0RmFpbENvdW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZmFpbENvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgUmV0dXJuIGEgc3RyaW5nIG9mIGZhaWxpbmcvcGFzc2luZyBjaGVja3MuXG4gICAgICogICBUaGlzIG1heSBiZSB1c2VmdWwgZm9yIHZhbGlkYXRpbmcgY3VzdG9tIGNvbmRpdGlvbnMuXG4gICAgICogICBDb25zZWN1dGl2ZSBwYXNzaW5nIGNoZWNrYSBhcmUgcmVwcmVzZW50ZWQgYnkgbnVtYmVycy5cbiAgICAgKiAgIEEgY2FwaXRhbCBsZXR0ZXIgaW4gdGhlIHN0cmluZyByZXByZXNlbnRzIGZhaWx1cmUuXG4gICAgICogICBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIHBhc3NpbmcgY2hlY2tzXG4gICAgICogICBcInIoMTApXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBjaGVja3Mgd2l0aCAxIGZhaWx1cmUgaW4gdGhlIG1pZGRsZVxuICAgICAqICAgXCJyKDUsTiw0KVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgY2hlY2tzIGluY2x1ZGluZyBhIG5lc3RlZCBjb250cmFjdFxuICAgICAqICAgXCJyKDMscigxLE4pLDYpXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyBubyBjaGVja3Mgd2VyZSBydW4gLSBhdXRvLWZhaWxcbiAgICAgKiAgIFwicihaKVwiXG4gICAgICovXG4gICAgZ2V0R2hvc3QoKSB7XG4gICAgICAgIGNvbnN0IGdob3N0ID0gW107XG4gICAgICAgIGxldCBzdHJlYWsgPSAwO1xuICAgICAgICBmb3IgKGxldCBpPTE7IGkgPD0gdGhpcy5fY291bnQ7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2V2aWRlbmNlW2ldIHx8IHRoaXMuX25lc3RlZFtpXSkge1xuICAgICAgICAgICAgICAgIGlmIChzdHJlYWspIGdob3N0LnB1c2goc3RyZWFrKTtcbiAgICAgICAgICAgICAgICBzdHJlYWsgPSAwO1xuICAgICAgICAgICAgICAgIGdob3N0LnB1c2goIHRoaXMuX25lc3RlZFtpXSA/IHRoaXMuX25lc3RlZFtpXS5nZXRHaG9zdCgpIDogJ04nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RyZWFrKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0cmVhaykgZ2hvc3QucHVzaChzdHJlYWspO1xuICAgICAgICBpZiAoZ2hvc3QubGVuZ3RoID09PSAwICYmICF0aGlzLmdldFBhc3MoKSlcbiAgICAgICAgICAgIGdob3N0LnB1c2goJ1onKTtcbiAgICAgICAgcmV0dXJuICdyKCcrZ2hvc3Quam9pbignLCcpKycpJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgcmV0dXJucyBhIHBsYWluIHNlcmlhbGl6YWJsZSBvYmplY3RcbiAgICAgKiAgQHJldHVybnMge09iamVjdH1cbiAgICAgKi9cbiAgICB0b0pTT04oKSB7XG4gICAgICAgIGNvbnN0IG4gPSB0aGlzLmdldENvdW50KCk7XG4gICAgICAgIGNvbnN0IGRldGFpbHMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGk8PW47IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuZ2V0RGV0YWlscyhpKTtcbiAgICAgICAgICAgIC8vIHN0cmlwIGV4dHJhIGtleXNcbiAgICAgICAgICAgIGZvciggbGV0IGtleSBpbiBub2RlICkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlW2tleV0gPT09IHVuZGVmaW5lZCB8fCAoQXJyYXkuaXNBcnJheShub2RlW2tleV0pICYmIG5vZGVba2V5XS5sZW5ndGggPT09IDApKVxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbm9kZVtrZXldO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChub2RlKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHBhc3M6ICB0aGlzLmdldFBhc3MoKSxcbiAgICAgICAgICAgIGNvdW50OiB0aGlzLmdldENvdW50KCksXG4gICAgICAgICAgICB0aXRsZTogdGhpcy5nZXRUaXRsZSgpLFxuICAgICAgICAgICAgZGV0YWlscyxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VGFwKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIFJldHVybnMgcmVwb3J0IHN0cmluZ2lmaWVkIGFzIFRBUCBmb3JtYXRcbiAgICAgKiAgQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXRUYXAobikge1xuICAgICAgICBjb25zdCB0YXAgPSBuID09PSB1bmRlZmluZWQgPyB0aGlzLmdldFRhcExpbmVzKCkgOiB0aGlzLmdldFRhcEVudHJ5KG4pO1xuICAgICAgICB0YXAucHVzaCgnJyk7XG4gICAgICAgIHJldHVybiB0YXAuam9pbignXFxuJyk7XG4gICAgfVxuXG4gICAgZ2V0VGFwTGluZXMobikge1xuICAgICAgICAvLyBUQVAgZm9yIG5vdywgdXNlIGFub3RoZXIgZm9ybWF0IGxhdGVyIGJlY2F1c2UgXCJwZXJsIGlzIHNjYXJ5XCJcbiAgICAgICAgY29uc3QgdGFwID0gWyAnMS4uJyt0aGlzLl9jb3VudCBdO1xuICAgICAgICBpZiAodGhpcy5nZXRUaXRsZSgpKVxuICAgICAgICAgICAgdGFwLnB1c2goJyMgJyt0aGlzLmdldFRpdGxlKCkpO1xuICAgICAgICAvLyBUT0RPIGluZm9bMF1cbiAgICAgICAgY29uc3QgcHJlZmFjZSA9IHRoaXMuZ2V0RGV0YWlscygwKTtcbiAgICAgICAgdGFwLnB1c2goIC4uLnByZWZhY2UuaW5mby5tYXAoIHMgPT4gJyMgJytzICkgKTtcbiAgICAgICAgZm9yKCBsZXQgaSA9IDE7IGkgPD0gdGhpcy5fY291bnQ7IGkrKyApIFxuICAgICAgICAgICAgdGFwLnB1c2goIC4uLiB0aGlzLmdldFRhcEVudHJ5KGkpICk7XG4gICAgICAgIGlmICghdGhpcy5nZXRQYXNzKCkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmdldENvdW50KCkgPiAwKVxuICAgICAgICAgICAgICAgIHRhcC5wdXNoKCcjIEZhaWxlZCAnK3RoaXMuZ2V0RmFpbENvdW50KCkrJy8nK3RoaXMuZ2V0Q291bnQoKSsgJyBjb25kaXRpb25zJyk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgdGFwLnB1c2goJyMgTm8gY2hlY2tzIHdlcmUgcnVuLCBjb25zaWRlciB1c2luZyBwYXNzKCkgaWYgdGhhdFxcJ3MgZGVsaWJlcmF0ZScpO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gdGFwO1xuICAgIH1cblxuICAgIGdldFRhcEVudHJ5KG4pIHtcbiAgICAgICAgY29uc3QgZGF0YSA9IHR5cGVvZihuKSA9PT0gJ29iamVjdCcgPyBuIDogdGhpcy5nZXREZXRhaWxzKG4pO1xuICAgICAgICBjb25zdCB0YXAgPSBbXTtcbiAgICAgICAgaWYgKGRhdGEubmVzdGVkKSB7XG4gICAgICAgICAgICB0YXAucHVzaCggJyMgc3ViY29udHJhY3Q6JysoZGF0YS5uYW1lPycgJytkYXRhLm5hbWU6JycpICk7XG4gICAgICAgICAgICB0YXAucHVzaCggLi4uIGRhdGEubmVzdGVkLmdldFRhcExpbmVzKCkubWFwKCBzID0+ICcgICAgJytzICkpO1xuICAgICAgICB9XG4gICAgICAgIHRhcC5wdXNoKChkYXRhLnBhc3M/Jyc6J25vdCAnKSArICdvayAnICsgZGF0YS5uXG4gICAgICAgICAgICArIChkYXRhLm5hbWUgPyAnIC0gJytkYXRhLm5hbWUgOiAnJykpO1xuICAgICAgICBpZiAoIWRhdGEucGFzcylcbiAgICAgICAgICAgIHRhcC5wdXNoKCcjIENvbmRpdGlvbicrKGRhdGEuY29uZCA/ICcgJytkYXRhLmNvbmQgOiAnJykrJyBmYWlsZWQgYXQgJytkYXRhLndoZXJlKTtcbiAgICAgICAgdGFwLnB1c2goLi4uZGF0YS5ldmlkZW5jZS5tYXAocz0+JyMgJytzKSk7XG4gICAgICAgIHRhcC5wdXNoKC4uLmRhdGEuaW5mby5tYXAocz0+JyMgJytzKSk7XG4gICAgICAgIHJldHVybiB0YXA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBSZXR1cm5zIGRldGFpbGVkIHJlcG9ydCBvbiBhIHNwZWNpZmljIGNoZWNrXG4gICAgICogICBAcGFyYW0ge2ludGVnZXJ9IG4gLSBjaGVjayBudW1iZXIsIG11c3QgYmUgPD0gZ2V0Q291bnQoKVxuICAgICAqICAgQHJldHVybnMge29iamVjdH1cbiAgICAgKi9cbiAgICBnZXREZXRhaWxzKG4pIHtcbiAgICAgICAgLy8gVE9ETyB2YWxpZGF0ZSBuXG5cbiAgICAgICAgLy8gdWdseSBidXQgd2hhdCBjYW4gSSBkb1xuICAgICAgICBpZiAobiA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuOiAgICAwLFxuICAgICAgICAgICAgICAgIGluZm86IHRoaXMuX2luZm9bMF0gfHwgW10sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGV2aWRlbmNlID0gdGhpcy5fZXZpZGVuY2Vbbl07XG4gICAgICAgIGlmIChldmlkZW5jZSAmJiAhQXJyYXkuaXNBcnJheShldmlkZW5jZSkpXG4gICAgICAgICAgICBldmlkZW5jZSA9IFtldmlkZW5jZV07XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG46ICAgICAgbixcbiAgICAgICAgICAgIG5hbWU6ICAgdGhpcy5fZGVzY3Jbbl0gfHwgJycsXG4gICAgICAgICAgICBwYXNzOiAgICFldmlkZW5jZSxcbiAgICAgICAgICAgIGV2aWRlbmNlOiBldmlkZW5jZSB8fCBbXSxcbiAgICAgICAgICAgIHdoZXJlOiAgdGhpcy5fd2hlcmVbbl0sXG4gICAgICAgICAgICBjb25kOiAgIHRoaXMuX2NvbmROYW1lW25dLFxuICAgICAgICAgICAgaW5mbzogICB0aGlzLl9pbmZvW25dIHx8IFtdLFxuICAgICAgICAgICAgbmVzdGVkOiB0aGlzLl9uZXN0ZWRbbl0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgZ2V0RXJyb3Iobiwgb3B0aW9ucz17fSkge1xuICAgICAgICBpZiAoIW4pIHtcbiAgICAgICAgICAgIC8vIG5vIGVudHJ5IGdpdmVuXG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMucGFzcyAmJiB0aGlzLmdldFBhc3MoKSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgIHJldHVybiBtYWtlRXJyb3Ioe1xuICAgICAgICAgICAgICAgIGFjdHVhbDogICB0aGlzLmdldFRhcCgpLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiAnJyxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAgdGhpcy5nZXRUaXRsZSgpLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnY29udHJhY3QnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgZGF0YSA9IHR5cGVvZiBuID09PSAnb2JqZWN0JyA/IG4gOiB0aGlzLmdldERldGFpbHMobik7XG5cbiAgICAgICAgLy8gbm8gZXJyb3JcbiAgICAgICAgaWYgKCFvcHRpb25zLnBhc3MgJiYgZGF0YS5wYXNzKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHJldHVybiBtYWtlRXJyb3Ioe1xuICAgICAgICAgICAgYWN0dWFsOiAgIHRoaXMuZ2V0VGFwRW50cnkoZGF0YSkuam9pbignXFxuJyksXG4gICAgICAgICAgICBleHBlY3RlZDogJycsXG4gICAgICAgICAgICBtZXNzYWdlOiAgZGF0YS5uYW1lLFxuICAgICAgICAgICAgb3BlcmF0b3I6IGRhdGEuY29uZCxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0VGhyb3duKG4sIG9wdGlvbnM9e30pIHtcbiAgICAgICAgY29uc3QgZXJyID0gdGhpcy5nZXRFcnJvcihuLCBvcHRpb25zKTtcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICB9XG59XG5cbi8vIHRoaXMgaXMgZm9yIHN0dWZmIGxpa2UgYG9iamVjdCBmb28gPSB7XCJmb29cIjo0Mn1gXG4vLyB3ZSBkb24ndCB3YW50IHRoZSBleHBsYW5hdGlvbiB0byBiZSBxdW90ZWQhXG5mdW5jdGlvbiBfZXhwbGFpbiggaXRlbSwgZGVwdGggKSB7XG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJyApXG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgIHJldHVybiBleHBsYWluKCBpdGVtLCBkZXB0aCApO1xufTtcblxuUmVwb3J0LnByb3RvdHlwZS5leHBsYWluID0gZXhwbGFpbjsgLy8gYWxzbyBtYWtlIGF2YWlsYWJsZSB2aWEgcmVwb3J0XG5cbi8qKlxuICogIEBkZXNjIENyZWF0ZSBuZXcgY2hlY2sgbWV0aG9kIGF2YWlsYWJsZSB2aWEgYWxsIFJlcG9ydCBpbnN0YW5jZXNcbiAqICBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lIG9mIHRoZSBuZXcgY29uZGl0aW9uLlxuICogIE11c3Qgbm90IGJlIHByZXNlbnQgaW4gUmVwb3J0IGFscmVhZHksIGFuZCBzaG91bGQgTk9UIHN0YXJ0IHdpdGhcbiAqICBnZXQuLi4sIHNldC4uLiwgb3IgYWRkLi4uICh0aGVzZSBhcmUgcmVzZXJ2ZWQgZm9yIFJlcG9ydCBpdHNlbGYpXG4gKiAgQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgQ29uZmlndXJpbmcgdGhlIGNoZWNrJ3MgaGFuZGxpbmcgb2YgYXJndW1lbnRzXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLmFyZ3MgVGhlIHJlcXVpcmVkIG51bWJlciBvZiBhcmd1bWVudHNcbiAqICBAcGFyYW0ge2ludGVnZXJ9IFtvcHRpb25zLm1pbkFyZ3NdIE1pbmltdW0gbnVtYmVyIG9mIGFyZ3VtZW50IChkZWZhdWx0cyB0byBhcmdzKVxuICogIEBwYXJhbSB7aW50ZWdlcn0gW29wdGlvbnMubWF4QXJnc10gTWF4aW11bSBudW1iZXIgb2YgYXJndW1lbnQgKGRlZmF1bHRzIHRvIGFyZ3MpXG4gKiAgQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5oYXNPcHRpb25zXSBJZiB0cnVlLCBhbiBvcHRpb25hbCBvYmplY3RcbmNhbiBiZSBzdXBwbGllZCBhcyBsYXN0IGFyZ3VtZW50LiBJdCB3b24ndCBpbnRlcmZlcmUgd2l0aCBkZXNjcmlwdGlvbi5cbiAqICBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmZ1bl0gVGhlIGxhc3QgYXJndW1lbnQgaXMgYSBjYWxsYmFja1xuICogIEBwYXJhbSB7RnVuY3Rpb259IGltcGxlbWVudGF0aW9uIC0gYSBjYWxsYmFjayB0aGF0IHRha2VzIHthcmdzfSBhcmd1bWVudHNcbiAqICBhbmQgcmV0dXJucyBhIGZhbHNleSB2YWx1ZSBpZiBjb25kaXRpb24gcGFzc2VzXG4gKiAgKFwibm90aGluZyB0byBzZWUgaGVyZSwgbW92ZSBhbG9uZ1wiKSxcbiAqICBvciBldmlkZW5jZSBpZiBpdCBmYWlsc1xuICogIChlLmcuIHR5cGljYWxseSBhIGdvdC9leHBlY3RlZCBkaWZmKS5cbiAqL1xuY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbmZ1bmN0aW9uIGFkZENvbmRpdGlvbiAobmFtZSwgb3B0aW9ucywgaW1wbCkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uIG5hbWUgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eKF98Z2V0W19BLVpdfHNldFtfQS1aXSkvKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gbmFtZSBtdXN0IG5vdCBzdGFydCB3aXRoIGdldF8sIHNldF8sIG9yIF8nKTtcbiAgICAvLyBUT0RPIG11c3QgZG8gc29tZXRoaW5nIGFib3V0IG5hbWUgY2xhc2hlcywgYnV0IGxhdGVyXG4gICAgLy8gYmVjYXVzZSBldmFsIGluIGJyb3dzZXIgbWF5IChraW5kIG9mIGxlZ2ltaXRlbHkpIG92ZXJyaWRlIGNvbmRpdGlvbnNcbiAgICBpZiAoIXNlZW4uaGFzKG5hbWUpICYmIFJlcG9ydC5wcm90b3R5cGVbbmFtZV0pXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIGFscmVhZHkgZXhpc3RzIGluIFJlcG9ydDogJytuYW1lKTtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBvcHRpb25zJyk7XG4gICAgaWYgKHR5cGVvZiBpbXBsICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBpbXBsZW1lbnRhdGlvbicpO1xuXG4gICAgY29uc3QgbWluQXJncyAgICA9IG9wdGlvbnMubWluQXJncyB8fCBvcHRpb25zLmFyZ3M7XG4gICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFyZ3MpIHx8IG1pbkFyZ3MgPCAwKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FyZ3MvbWluQXJncyBtdXN0IGJlIG5vbm5lZ2F0aXZlIGludGVnZXInKTtcbiAgICBjb25zdCBtYXhBcmdzICAgID0gb3B0aW9ucy5tYXhBcmdzIHx8IG9wdGlvbnMuYXJncyB8fCBJbmZpbml0eTtcbiAgICBpZiAobWF4QXJncyAhPT0gSW5maW5pdHkgJiYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFyZ3MpIHx8IG1heEFyZ3MgPCBtaW5BcmdzKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdtYXhBcmdzIG11c3QgYmUgaW50ZWdlciBhbmQgZ3JlYXRlciB0aGFuIG1pbkFyZ3MsIG9yIEluZmluaXR5Jyk7XG4gICAgY29uc3QgZGVzY3JGaXJzdCAgICA9IG9wdGlvbnMuZGVzY3JGaXJzdCB8fCBvcHRpb25zLmZ1biB8fCBtYXhBcmdzID4gMTA7XG4gICAgY29uc3QgaGFzT3B0aW9ucyAgICA9ICEhb3B0aW9ucy5oYXNPcHRpb25zO1xuICAgIGNvbnN0IG1heEFyZ3NSZWFsICAgPSBtYXhBcmdzICsgKGhhc09wdGlvbnMgPyAxIDogMCk7XG5cbiAgICAvLyBUT0RPIGFsZXJ0IHVua25vd24gb3B0aW9uc1xuXG4gICAgLy8gVE9ETyB0aGlzIGNvZGUgaXMgY2x1dHRlcmVkLCByZXdyaXRlIFxuICAgIGNvbnN0IGNvZGUgPSBmdW5jdGlvbiguLi5hcmdzKSB7XG4gICAgICAgIGNvbnN0IGRlc2NyID0gZGVzY3JGaXJzdFxuICAgICAgICAgICAgPyBhcmdzLnNoaWZ0KClcbiAgICAgICAgICAgIDogKCAoYXJncy5sZW5ndGggPiBtYXhBcmdzICYmIHR5cGVvZiBhcmdzW2FyZ3MubGVuZ3RoLTFdID09PSAnc3RyaW5nJykgPyBhcmdzLnBvcCgpIDogdW5kZWZpbmVkKTtcbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gbWF4QXJnc1JlYWwgfHwgYXJncy5sZW5ndGggPCBtaW5BcmdzKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gJytuYW1lKycgbXVzdCBoYXZlICcrbWluQXJncysnLi4nK21heEFyZ3NSZWFsKycgYXJndW1lbnRzICcpOyAvLyBUT0RPXG5cbiAgICAgICAgY29uc3QgbiA9IHRoaXMubmV4dCgpOyAvLyBUT0RPIGNhbGwgaXQgYWR2YW5jZSgpIG9yIHNtdGguXG4gICAgICAgIGNvbnN0IGV2aWRlbmNlID0gaW1wbCggLi4uYXJncyApO1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRSZXN1bHQoIG4sIGV2aWRlbmNlLCBkZXNjciwgbmFtZSApO1xuICAgIH07XG5cbiAgICBzZWVuLmFkZChuYW1lKTtcbiAgICBSZXBvcnQucHJvdG90eXBlW25hbWVdID0gY29kZTtcbn1cblxuLyoqXG4gKiAgIEBmdW5jdGlvbiBjaGVja1xuICogICBAbWVtYmVyT2YgUmVwb3J0XG4gKiAgIEBwYXJhbSBldmlkZW5jZSBJZiBmYWxzZSwgdGhlIGNoZWNrIGlzIGFzc3VtZWQgdG8gcGFzcy5cbiAqICAgQSB0cnVlIHZhbHVlIG1lYW5zIHRoZSBjaGVjayBmYWlsZWQuXG4gKiAgIEBwYXJhbSB7c3RyaW5nfSBbZGVzY3JpcHRpb25dXG4gKiAgIEByZXR1cm5zIHt1bmRlZmluZWR9IFxuICovXG5cbi8vIHRoZXNlIGNvbmRpdGlvbnMgY291bGQgYmUgdW5kZXIgdGhlIGNvbmRpdGlvbiBsaWJyYXJ5XG4vLyBidXQgd2UnbGwgbmVlZCB0aGVtIHRvIHZlcmlmeSB0aGUgUmVwb3J0IGNsYXNzIGl0c2VsZi5cblxuYWRkQ29uZGl0aW9uKFxuICAgICdjaGVjaycsXG4gICAge2FyZ3M6MX0sXG4gICAgeD0+eFxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAncGFzcycsXG4gICAge2FyZ3M6MH0sXG4gICAgKCk9PjBcbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ2ZhaWwnLFxuICAgIHthcmdzOjB9LFxuICAgICgpPT4nZmFpbGVkIGRlbGliZXJhdGVseSdcbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ2VxdWFsJyxcbiAgICB7YXJnczoyfSxcbiAgICAoYSxiKSA9PiBhID09PSBiID8gMCA6IFsgJy0gJytleHBsYWluKGEpLCAnKyAnICsgZXhwbGFpbihiKSBdXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdtYXRjaCcsXG4gICAge2FyZ3M6Mn0sXG4gICAgKGEscmV4KSA9PiAoJycrYSkubWF0Y2gocmV4KSA/IDAgOiBbXG4gICAgICAgICdTdHJpbmcgICAgICAgICA6ICcrYSxcbiAgICAgICAgJ0RvZXMgbm90IG1hdGNoIDogJytyZXhcbiAgICBdXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICduZXN0ZWQnLFxuICAgIHtmdW46MSxtaW5BcmdzOjF9LFxuICAgICguLi5hcmdzKSA9PiBuZXcgUmVwb3J0KCkucnVuKC4uLmFyZ3MpLnN0b3AoKVxuKTtcblxuLyoqXG4gKiAgIEBkZXNjIENyZWF0ZSBhIGZyZXNoIFJlcG9ydCBvYmplY3QgYW5kIHBhc3MgaXQgdG8gYSBmdW5jdGlvbi5cbiAqICAgQHJldHVybnMge1JlcG9ydH1cbiAqICAgQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAqICAgVGhlIGxhc3QgYXJndW1lbnQgbXVzdCBiZSBhIGNhbGxiYWNrIHRha2luZyB7UmVwb3J0fSBhcyBmaXJzdCBhcmd1bWVudC5cbiAqICAgQW55IHByZWNlZGluZyBhcmd1bWVudHMgd2lsbCBiZSBmb3J3YXJkZWQgdG8gY2FsbGJhY2sgYXMgaXMuXG4gKi9cbmZ1bmN0aW9uIHJlcG9ydCAoLi4uYXJncykge1xuICAgIHJldHVybiBuZXcgUmVwb3J0KCkucnVuKC4uLmFyZ3MpLnN0b3AoKTtcbn1cblxuLyoqXG4gKiAgIEBleHBvcnRzIFJlcG9ydFxuICogICBAZXhwb3J0cyByZXBvcnRcbiAqICAgQGV4cG9ydHMgYWRkQ29uZGl0aW9uXG4gKiAgIEBleHBvcnRzIGV4cGxhaW5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHsgUmVwb3J0LCByZXBvcnQsIGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBEZXRlcm1pbmUgbi10aCBjYWxsZXIgdXAgdGhlIHN0YWNrICovXG4vKiBJbnNwaXJlZCBieSBQZXJsJ3MgQ2FycCBtb2R1bGUgKi9cbmNvbnN0IGluU3RhY2sgPSAvKFteOlxccygpXSs6XFxkKyg/OjpcXGQrKT8pXFxXKihcXG58JCkvZztcblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBmdW5jdGlvblxuICogIEBkZXNjIFJldHVybnMgc291cmNlIHBvc2l0aW9uIG4gZnJhbWVzIHVwIHRoZSBzdGFja1xuICogIEBleGFtcGxlXG4gKiAgXCIvZm9vL2Jhci5qczoyNToxMVwiXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBkZXB0aCBIb3cgbWFueSBmcmFtZXMgdG8gc2tpcFxuICogIEByZXR1cm5zIHtzdHJpbmd9IHNvdXJjZSBmaWxlLCBsaW5lLCBhbmQgY29sdW1uLCBzZXBhcmF0ZWQgYnkgY29sb24uXG4gKi9cbmZ1bmN0aW9uIGNhbGxlckluZm8obikge1xuICAgIC8qIGEgdGVycmlibGUgcmV4IHRoYXQgYmFzaWNhbGx5IHNlYXJjaGVzIGZvciBmaWxlLmpzOm5ubjpubm4gc2V2ZXJhbCB0aW1lcyovXG4gICAgcmV0dXJuIChuZXcgRXJyb3IoKS5zdGFjay5tYXRjaChpblN0YWNrKVtuKzFdLnJlcGxhY2UoL1xcbiQvLCAnJykgfHwgJycpXG59XG5cbi8qKlxuICogIEBwdWJsaWNcbiAqICBAZnVuY3Rpb25cbiAqICBAZGVzYyBTdHJpbmdpcnkgb2JqZWN0cyByZWN1cnNpdmVseSB3aXRoIGxpbWl0ZWQgZGVwdGhcbiAqICBhbmQgY2lyY3VsYXIgcmVmZXJlbmNlIHRyYWNraW5nLlxuICogIEdlbmVyYWxseSBKU09OLnN0cmluZ2lmeSBpcyB1c2VkIGFzIHJlZmVyZW5jZTpcbiAqICBzdHJpbmdzIGFyZSBlc2NhcGVkIGFuZCBkb3VibGUtcXVvdGVkOyBudW1iZXJzLCBib29sZWFuLCBhbmQgbnVsbHMgYXJlXG4gKiAgc3RyaW5naWZpZWQgXCJhcyBpc1wiOyBvYmplY3RzIGFuZCBhcnJheXMgYXJlIGRlc2NlbmRlZCBpbnRvLlxuICogIFRoZSBkaWZmZXJlbmNlcyBmb2xsb3c6XG4gKiAgdW5kZWZpbmVkIGlzIHJlcG9ydGVkIGFzICc8dW5kZWY+Jy5cbiAqICBPYmplY3RzIHRoYXQgaGF2ZSBjb25zdHJ1Y3RvcnMgYXJlIHByZWZpeGVkIHdpdGggY2xhc3MgbmFtZXMuXG4gKiAgT2JqZWN0IGFuZCBhcnJheSBjb250ZW50IGlzIGFiYnJldmlhdGVkIGFzIFwiLi4uXCIgYW5kIFwiQ2lyY3VsYXJcIlxuICogIGluIGNhc2Ugb2YgZGVwdGggZXhoYXVzdGlvbiBhbmQgY2lyY3VsYXIgcmVmZXJlbmNlLCByZXNwZWN0aXZlbHkuXG4gKiAgRnVuY3Rpb25zIGFyZSBuYWl2ZWx5IHN0cmluZ2lmaWVkLlxuICogIEBwYXJhbSB7QW55fSB0YXJnZXQgT2JqZWN0IHRvIHNlcmlhbGl6ZS5cbiAqICBAcGFyYW0ge2ludGVnZXJ9IGRlcHRoPTMgRGVwdGggbGltaXQuXG4gKiAgQHJldHVybnMge3N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZXhwbGFpbiggaXRlbSwgZGVwdGg9Mywgb3B0aW9ucz17fSwgcGF0aD0nJCcsIHNlZW49bmV3IFNldCgpICkge1xuICAgIC8vIHNpbXBsZSB0eXBlc1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpXG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShpdGVtKTsgLy8gZG9uJ3Qgd2FudCB0byBzcGVuZCB0aW1lIHFvdXRpbmdcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdudW1iZXInIHx8IHR5cGVvZiBpdGVtID09PSAnYm9vbGVhbicgfHwgaXRlbSA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuICcnK2l0ZW07XG4gICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCkgcmV0dXJuICc8dW5kZWY+JztcblxuICAgIC8vIHJlY3Vyc2VcblxuICAgIGlmIChBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICAgIC8vIFRPRE8ga2VlcCBwYXRoIGJ1dCB0aGVyZSdzIG5vIHdheSBvZiBzdG9yaW5nIHNtdGggYnkgb2JqZWN0XG4gICAgICAgIGlmIChzZWVuLmhhcyhpdGVtKSlcbiAgICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIGlmIChkZXB0aCA8IDEpXG4gICAgICAgICAgICByZXR1cm4gJ1suLi5dJztcbiAgICAgICAgc2Vlbi5hZGQoaXRlbSk7XG4gICAgICAgIC8vIFRPRE8gPHggZW1wdHkgaXRlbXM+XG4gICAgICAgIGNvbnN0IGxpc3QgPSBpdGVtLm1hcChcbiAgICAgICAgICAgICh2YWwsIGluZGV4KSA9PiBleHBsYWluKHZhbCwgZGVwdGgtMSwgb3B0aW9ucywgcGF0aCsnWycraW5kZXgrJ10nLCBuZXcgU2V0KHNlZW4pKVxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gJ1snK2xpc3Quam9pbihcIiwgXCIpK1wiXVwiO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IGl0ZW0uY29uc3RydWN0b3IgJiYgaXRlbS5jb25zdHJ1Y3Rvci5uYW1lO1xuICAgICAgICBjb25zdCBwcmVmaXggPSB0eXBlICYmIHR5cGUgIT09ICdPYmplY3QnID8gdHlwZSArICcgJyA6ICcnO1xuICAgICAgICAvLyBUT0RPIGtlZXAgcGF0aCBidXQgdGhlcmUncyBubyB3YXkgb2Ygc3RvcmluZyBzbXRoIGJ5IG9iamVjdFxuICAgICAgICBpZiAoc2Vlbi5oYXMoaXRlbSkpXG4gICAgICAgICAgICByZXR1cm4gcHJlZml4Kyd7Q2lyY3VsYXJ9JztcbiAgICAgICAgLy8gVE9ETyA8eCBlbXB0eSBpdGVtcz5cbiAgICAgICAgaWYgKGRlcHRoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiBwcmVmaXggKyAney4uLn0nO1xuICAgICAgICBzZWVuLmFkZChpdGVtKTtcbiAgICAgICAgY29uc3QgbGlzdCA9IE9iamVjdC5rZXlzKGl0ZW0pLnNvcnQoKS5tYXAoIGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9IEpTT04uc3RyaW5naWZ5KGtleSk7XG4gICAgICAgICAgICByZXR1cm4gaW5kZXgrXCI6XCIrZXhwbGFpbihpdGVtW2tleV0sIGRlcHRoLTEsIG9wdGlvbnMsIHBhdGgrJ1snK2luZGV4KyddJywgbmV3IFNldChzZWVuKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcHJlZml4ICsgJ3snICsgbGlzdC5qb2luKFwiLCBcIikgKyAnfSc7XG4gICAgfVxuXG4gICAgLy8gZHVubm8gd2hhdCBpdCBpcywgbWF5YmUgYSBmdW5jdGlvblxuICAgIHJldHVybiAnJytpdGVtO1xufVxuXG4vLyBNdXN0IHdvcmsgZXZlbiB3aXRob3V0IGFzc2VydFxuY29uc3QgaGFzQXNzZXJ0ID0gdHlwZW9mIGFzc2VydCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IgPT09ICdmdW5jdGlvbic7XG5cbmNvbnN0IG1ha2VFcnJvciA9IGhhc0Fzc2VydFxuICAgID8gZW50cnkgPT4gbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcihlbnRyeSlcbiAgICA6IGVudHJ5ID0+IG5ldyBFcnJvciggZW50cnkuYWN0dWFsICk7XG5cbi8qKlxuICogICBAZXhwb3J0cyBjYWxsZXJJbmZvXG4gKiAgIEBleHBvcnRzIGV4cGxhaW5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHsgY2FsbGVySW5mbywgZXhwbGFpbiwgbWFrZUVycm9yIH07XG4iXX0=
