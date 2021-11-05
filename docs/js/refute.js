(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

// TODO this has nothing to do with refute and should be a separate package

/*
 *  These classes describe a tree-like structure consisting of (indented)
 *  strings representing actual and expected values and their context.
 *  A cross between TAP and diff(1) output.
 */

/*
 *  Base class for DiffContent & DiffTree
 */
class Renderable {
    constructor() {} // pass
    render() {
        throw new Error('render() unimplemented in subclass');
        // return 'a string';
    }
}

/**
 *   DiffTree is a class that represents a nested indented
 *   collection of actual/expected lines.
 */

class DiffTree extends Renderable {
    constructor() {
        super();
        this._log = [];
    }
    append (msg) {
        if (!(msg instanceof Renderable))
            throw new Error('DiffTree entry must be a Renderable');
        this._log.push(msg);
        return this;
    }
    render(format, indent=0) {
        return this._log.map( x=>x.render(format, indent+1) ).join('');
    };
}

/*
 *  Another abstract class - an actual line of diff information.
 *  Requires predefined metainformation to function correctly.
 */

class DiffLine extends Renderable {
    constructor( text, meta ) {
        super();
        this._text = text;
        this._meta = meta;
    }
    toString() {
        return this._meta.prefix + this._text;
    }
    render(format={}, indent=1) {
        // TODO actually utilize format
        return '    '.repeat(indent-1)+this._meta.prefix + this._text + '\n';
    }
}

const DIFF_CONTENT_TYPES = {
    actual: {
        level: 3,
        prefix: '- ',
        color: 'red',
    },
    expected: {
        level: 3,
        prefix: '+ ',
        color: 'green',
    },
    location: {
        level: 3,
        prefix: 'at ', // TODO @
        color: 'gray',
    },
    context: {
        level: 3,
        prefix: '  ',
        color: 'gray',
    },
    note: {
        level: 7,
        prefix: '',
        color: 'gray',
    },
};
for( let name in DIFF_CONTENT_TYPES )
    DIFF_CONTENT_TYPES[name].name=name;

class DiffContent extends DiffLine {
    constructor( text, type ) {
        if (!DIFF_CONTENT_TYPES[type])
            throw new Error('Unknown DiffContent type: '+type);

        super( text, DIFF_CONTENT_TYPES[type] );
    }
}

const DIFF_CHECK_TYPES = {
    pass: {
        level: 2,
        prefix: 'ok ',
        color: 'green',
    },
    fail: {
        level: 1,
        prefix: '!fail ',
        color: 'red',
    },
    plan: {
        level: 1,
        prefix: 'plan ', // TODO better
        color: 'green',
    },
};
for( let name in DIFF_CHECK_TYPES )
    DIFF_CHECK_TYPES[name].name=name;

// TODO better name!!
// TODO this is a copypaste of DiffContent, unify better
class DiffCheck extends DiffLine {
    constructor( text, type ) {
        if (!DIFF_CHECK_TYPES[type])
            throw new Error('Unknown DiffContent type: '+type);

        super( text, DIFF_CHECK_TYPES[type] );
    }
}

const out = { Renderable, DiffTree, DiffLine, DiffContent };

Object.keys( DIFF_CONTENT_TYPES ).forEach( i => out[i] = msg => new DiffContent (msg, i));
Object.keys( DIFF_CHECK_TYPES ).forEach( i => out[i] = msg => new DiffCheck (msg, i));

out.log = () => new DiffTree();

module.exports = out;

},{}],2:[function(require,module,exports){
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


},{"./refute/cond/array.js":3,"./refute/cond/basic.js":4,"./refute/cond/deep.js":5,"./refute/dbc.js":6,"./refute/report.js":7}],3:[function(require,module,exports){
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


},{"../report.js":7}],4:[function(require,module,exports){
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


},{"../report.js":7}],5:[function(require,module,exports){
'use strict';

const { addCondition, explain, diff } = require( '../report.js' );
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
            diff.loc(item[0]),
            diff.got(item[3] ? item[1] : explain( item[1], 2 )),
            diff.exp(item[3] ? item[2] : explain( item[2], 2 )),
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


},{"../report.js":7,"../util/annotated-set.js":9}],6:[function(require,module,exports){
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

},{"./report.js":7}],7:[function(require,module,exports){
'use strict';

const { callerInfo, explain, makeError } = require( './util.js' );
const dt = require( '../diff-tree.js' ); // TODO should be external package

// TODO better names, and diff-tree should export those from the start
const diff = {
    got: dt.actual,
    exp: dt.expected,
    ctx: dt.context,
    loc: dt.location,
    note: dt.note,
};

// TODO it's a test
for( let i in diff )
    if( typeof diff[i] !== 'function' )
        throw new Error ('not a function: '.i);

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

        // coerce evidence into a list of diff-tree objects
        if (!Array.isArray(evidence))
            evidence = [ evidence ];
        this._evidence[n] = evidence.map(
            x=>x instanceof dt.DiffContent ? x : diff.note( _explain(x, Infinity) ) );
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
        this._info[this._count].push( diff.note( message.map( s=>_explain(s) ).join(" ") ) );
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

// TODO rename diff to something better

module.exports = { Report, addCondition, explain, diff };

},{"../diff-tree.js":1,"./util.js":8}],8:[function(require,module,exports){
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

},{"./util/annotated-set.js":9}],9:[function(require,module,exports){
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

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9kaWZmLXRyZWUuanMiLCJsaWIvcmVmdXRlLmpzIiwibGliL3JlZnV0ZS9jb25kL2FycmF5LmpzIiwibGliL3JlZnV0ZS9jb25kL2Jhc2ljLmpzIiwibGliL3JlZnV0ZS9jb25kL2RlZXAuanMiLCJsaWIvcmVmdXRlL2RiYy5qcyIsImxpYi9yZWZ1dGUvcmVwb3J0LmpzIiwibGliL3JlZnV0ZS91dGlsLmpzIiwibGliL3JlZnV0ZS91dGlsL2Fubm90YXRlZC1zZXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOWhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbi8vIFRPRE8gdGhpcyBoYXMgbm90aGluZyB0byBkbyB3aXRoIHJlZnV0ZSBhbmQgc2hvdWxkIGJlIGEgc2VwYXJhdGUgcGFja2FnZVxuXG4vKlxuICogIFRoZXNlIGNsYXNzZXMgZGVzY3JpYmUgYSB0cmVlLWxpa2Ugc3RydWN0dXJlIGNvbnNpc3Rpbmcgb2YgKGluZGVudGVkKVxuICogIHN0cmluZ3MgcmVwcmVzZW50aW5nIGFjdHVhbCBhbmQgZXhwZWN0ZWQgdmFsdWVzIGFuZCB0aGVpciBjb250ZXh0LlxuICogIEEgY3Jvc3MgYmV0d2VlbiBUQVAgYW5kIGRpZmYoMSkgb3V0cHV0LlxuICovXG5cbi8qXG4gKiAgQmFzZSBjbGFzcyBmb3IgRGlmZkNvbnRlbnQgJiBEaWZmVHJlZVxuICovXG5jbGFzcyBSZW5kZXJhYmxlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHt9IC8vIHBhc3NcbiAgICByZW5kZXIoKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigncmVuZGVyKCkgdW5pbXBsZW1lbnRlZCBpbiBzdWJjbGFzcycpO1xuICAgICAgICAvLyByZXR1cm4gJ2Egc3RyaW5nJztcbiAgICB9XG59XG5cbi8qKlxuICogICBEaWZmVHJlZSBpcyBhIGNsYXNzIHRoYXQgcmVwcmVzZW50cyBhIG5lc3RlZCBpbmRlbnRlZFxuICogICBjb2xsZWN0aW9uIG9mIGFjdHVhbC9leHBlY3RlZCBsaW5lcy5cbiAqL1xuXG5jbGFzcyBEaWZmVHJlZSBleHRlbmRzIFJlbmRlcmFibGUge1xuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9sb2cgPSBbXTtcbiAgICB9XG4gICAgYXBwZW5kIChtc2cpIHtcbiAgICAgICAgaWYgKCEobXNnIGluc3RhbmNlb2YgUmVuZGVyYWJsZSkpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RpZmZUcmVlIGVudHJ5IG11c3QgYmUgYSBSZW5kZXJhYmxlJyk7XG4gICAgICAgIHRoaXMuX2xvZy5wdXNoKG1zZyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgICByZW5kZXIoZm9ybWF0LCBpbmRlbnQ9MCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbG9nLm1hcCggeD0+eC5yZW5kZXIoZm9ybWF0LCBpbmRlbnQrMSkgKS5qb2luKCcnKTtcbiAgICB9O1xufVxuXG4vKlxuICogIEFub3RoZXIgYWJzdHJhY3QgY2xhc3MgLSBhbiBhY3R1YWwgbGluZSBvZiBkaWZmIGluZm9ybWF0aW9uLlxuICogIFJlcXVpcmVzIHByZWRlZmluZWQgbWV0YWluZm9ybWF0aW9uIHRvIGZ1bmN0aW9uIGNvcnJlY3RseS5cbiAqL1xuXG5jbGFzcyBEaWZmTGluZSBleHRlbmRzIFJlbmRlcmFibGUge1xuICAgIGNvbnN0cnVjdG9yKCB0ZXh0LCBtZXRhICkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl90ZXh0ID0gdGV4dDtcbiAgICAgICAgdGhpcy5fbWV0YSA9IG1ldGE7XG4gICAgfVxuICAgIHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWV0YS5wcmVmaXggKyB0aGlzLl90ZXh0O1xuICAgIH1cbiAgICByZW5kZXIoZm9ybWF0PXt9LCBpbmRlbnQ9MSkge1xuICAgICAgICAvLyBUT0RPIGFjdHVhbGx5IHV0aWxpemUgZm9ybWF0XG4gICAgICAgIHJldHVybiAnICAgICcucmVwZWF0KGluZGVudC0xKSt0aGlzLl9tZXRhLnByZWZpeCArIHRoaXMuX3RleHQgKyAnXFxuJztcbiAgICB9XG59XG5cbmNvbnN0IERJRkZfQ09OVEVOVF9UWVBFUyA9IHtcbiAgICBhY3R1YWw6IHtcbiAgICAgICAgbGV2ZWw6IDMsXG4gICAgICAgIHByZWZpeDogJy0gJyxcbiAgICAgICAgY29sb3I6ICdyZWQnLFxuICAgIH0sXG4gICAgZXhwZWN0ZWQ6IHtcbiAgICAgICAgbGV2ZWw6IDMsXG4gICAgICAgIHByZWZpeDogJysgJyxcbiAgICAgICAgY29sb3I6ICdncmVlbicsXG4gICAgfSxcbiAgICBsb2NhdGlvbjoge1xuICAgICAgICBsZXZlbDogMyxcbiAgICAgICAgcHJlZml4OiAnYXQgJywgLy8gVE9ETyBAXG4gICAgICAgIGNvbG9yOiAnZ3JheScsXG4gICAgfSxcbiAgICBjb250ZXh0OiB7XG4gICAgICAgIGxldmVsOiAzLFxuICAgICAgICBwcmVmaXg6ICcgICcsXG4gICAgICAgIGNvbG9yOiAnZ3JheScsXG4gICAgfSxcbiAgICBub3RlOiB7XG4gICAgICAgIGxldmVsOiA3LFxuICAgICAgICBwcmVmaXg6ICcnLFxuICAgICAgICBjb2xvcjogJ2dyYXknLFxuICAgIH0sXG59O1xuZm9yKCBsZXQgbmFtZSBpbiBESUZGX0NPTlRFTlRfVFlQRVMgKVxuICAgIERJRkZfQ09OVEVOVF9UWVBFU1tuYW1lXS5uYW1lPW5hbWU7XG5cbmNsYXNzIERpZmZDb250ZW50IGV4dGVuZHMgRGlmZkxpbmUge1xuICAgIGNvbnN0cnVjdG9yKCB0ZXh0LCB0eXBlICkge1xuICAgICAgICBpZiAoIURJRkZfQ09OVEVOVF9UWVBFU1t0eXBlXSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBEaWZmQ29udGVudCB0eXBlOiAnK3R5cGUpO1xuXG4gICAgICAgIHN1cGVyKCB0ZXh0LCBESUZGX0NPTlRFTlRfVFlQRVNbdHlwZV0gKTtcbiAgICB9XG59XG5cbmNvbnN0IERJRkZfQ0hFQ0tfVFlQRVMgPSB7XG4gICAgcGFzczoge1xuICAgICAgICBsZXZlbDogMixcbiAgICAgICAgcHJlZml4OiAnb2sgJyxcbiAgICAgICAgY29sb3I6ICdncmVlbicsXG4gICAgfSxcbiAgICBmYWlsOiB7XG4gICAgICAgIGxldmVsOiAxLFxuICAgICAgICBwcmVmaXg6ICchZmFpbCAnLFxuICAgICAgICBjb2xvcjogJ3JlZCcsXG4gICAgfSxcbiAgICBwbGFuOiB7XG4gICAgICAgIGxldmVsOiAxLFxuICAgICAgICBwcmVmaXg6ICdwbGFuICcsIC8vIFRPRE8gYmV0dGVyXG4gICAgICAgIGNvbG9yOiAnZ3JlZW4nLFxuICAgIH0sXG59O1xuZm9yKCBsZXQgbmFtZSBpbiBESUZGX0NIRUNLX1RZUEVTIClcbiAgICBESUZGX0NIRUNLX1RZUEVTW25hbWVdLm5hbWU9bmFtZTtcblxuLy8gVE9ETyBiZXR0ZXIgbmFtZSEhXG4vLyBUT0RPIHRoaXMgaXMgYSBjb3B5cGFzdGUgb2YgRGlmZkNvbnRlbnQsIHVuaWZ5IGJldHRlclxuY2xhc3MgRGlmZkNoZWNrIGV4dGVuZHMgRGlmZkxpbmUge1xuICAgIGNvbnN0cnVjdG9yKCB0ZXh0LCB0eXBlICkge1xuICAgICAgICBpZiAoIURJRkZfQ0hFQ0tfVFlQRVNbdHlwZV0pXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gRGlmZkNvbnRlbnQgdHlwZTogJyt0eXBlKTtcblxuICAgICAgICBzdXBlciggdGV4dCwgRElGRl9DSEVDS19UWVBFU1t0eXBlXSApO1xuICAgIH1cbn1cblxuY29uc3Qgb3V0ID0geyBSZW5kZXJhYmxlLCBEaWZmVHJlZSwgRGlmZkxpbmUsIERpZmZDb250ZW50IH07XG5cbk9iamVjdC5rZXlzKCBESUZGX0NPTlRFTlRfVFlQRVMgKS5mb3JFYWNoKCBpID0+IG91dFtpXSA9IG1zZyA9PiBuZXcgRGlmZkNvbnRlbnQgKG1zZywgaSkpO1xuT2JqZWN0LmtleXMoIERJRkZfQ0hFQ0tfVFlQRVMgKS5mb3JFYWNoKCBpID0+IG91dFtpXSA9IG1zZyA9PiBuZXcgRGlmZkNoZWNrIChtc2csIGkpKTtcblxub3V0LmxvZyA9ICgpID0+IG5ldyBEaWZmVHJlZSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG91dDtcbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gdGhlIGNvcmUgKHNob3VsZCBleHBsYWluIGV2ZW4gYmUgdGhlcmU/KVxuY29uc3QgeyBSZXBvcnQsIGFkZENvbmRpdGlvbiwgZXhwbGFpbiB9ID0gcmVxdWlyZSAoJy4vcmVmdXRlL3JlcG9ydC5qcycpO1xuXG4vLyBlaWZmZWwtc3R5bGUgZGVzaWduLWJ5LWNvbnRyYWN0XG5jb25zdCB7IERCQyB9ID0gcmVxdWlyZSggJy4vcmVmdXRlL2RiYy5qcycgKTtcblxuLy8gaW1wb3J0IGRlZmF1bHQgY29uZGl0aW9uIGFyc2VuYWxcbnJlcXVpcmUoICcuL3JlZnV0ZS9jb25kL2Jhc2ljLmpzJyApO1xucmVxdWlyZSggJy4vcmVmdXRlL2NvbmQvYXJyYXkuanMnICk7XG5yZXF1aXJlKCAnLi9yZWZ1dGUvY29uZC9kZWVwLmpzJyApO1xuXG5jb25zdCBnZXRSZXBvcnQgPSAoLi4uYXJncykgPT4gbmV3IFJlcG9ydCgpLnJ1biguLi5hcmdzKS5kb25lKCk7XG5cbi8vIEFsbG93IGNyZWF0aW5nIG11bHRpcGxlIHBhcmFsbGVsIGNvbmZpZ3VyYXRpb25zIG9mIHJlZnV0ZVxuLy8gZS5nLiBvbmUgc3RyaWN0ICh0aHJvd2luZyBlcnJvcnMpIGFuZCBvdGhlciBsYXggKGp1c3QgZGVidWdnaW5nIHRvIGNvbnNvbGUpXG5mdW5jdGlvbiBzZXR1cCggb3B0aW9ucz17fSwgb3JpZyApIHtcbiAgICAvLyBUT0RPIHZhbGlkYXRlIG9wdGlvbnNcbiAgICBjb25zdCBvbkZhaWwgPSBvcHRpb25zLm9uRmFpbCB8fCAocmVwID0+IHsgdGhyb3cgbmV3IEVycm9yKHJlcC5nZXRUYXAoKSkgfSk7XG5cbiAgICBjb25zdCByZWZ1dGUgPSBvcHRpb25zLnNraXBcbiAgICAgICAgPyAoKT0+e31cbiAgICAgICAgOiAoLi4uYXJncykgPT4ge1xuICAgICAgICAgICAgY29uc3Qgb2sgPSBuZXcgUmVwb3J0KCk7XG4gICAgICAgICAgICBvay5vbkRvbmUoIHggPT4geyBpZiggIXguZ2V0UGFzcygpICkgb25GYWlsKHgsIGFyZ3MpIH0gKTtcbiAgICAgICAgICAgIG9rLnJ1biguLi5hcmdzKTtcbiAgICAgICAgICAgIG9rLmRvbmUoKTtcbiAgICAgICAgfTtcblxuICAgIC8vIHJlZXhwb3J0IGFsbCBmcm9tIHJlcG9ydC5qc1xuICAgIHJlZnV0ZS5SZXBvcnQgPSBSZXBvcnQ7XG4gICAgcmVmdXRlLmV4cGxhaW4gPSBleHBsYWluO1xuICAgIHJlZnV0ZS5hZGRDb25kaXRpb24gPSBhZGRDb25kaXRpb247XG5cbiAgICAvLyBzaG9ydGN1dCB0byB2YWxpZGF0aW5nICYgcmV0dXJuaW5nIGEgZnJlc2ggY29udHJhY3RcbiAgICAvLyBUT0RPIHJlbmFtZSB0byBhdm9pZCBuYW1lIGNsYXNoIHdpdGggdGhlIGNsYXNzXG4gICAgLy8gKGV2YWw/KVxuICAgIHJlZnV0ZS5yZXBvcnQgPSBnZXRSZXBvcnQ7XG5cbiAgICAvLyByZWZ1dGUuY29uZih7Li4ufSkgd2lsbCBnZW5lcmF0ZSBhIF9uZXdfIHJlZnV0ZVxuICAgIHJlZnV0ZS5jb25maWcgPSB1cGRhdGUgPT4gc2V0dXAoIHsgLi4ub3B0aW9ucywgLi4udXBkYXRlIH0sIHJlZnV0ZSApO1xuXG4gICAgLy8gYWRkIGRlc2lnbi1ieS1jb250cmFjdFxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSggcmVmdXRlLCAnZGJjJywgeyBnZXQ6ICgpPT5uZXcgREJDKCkgfSApO1xuXG4gICAgLy8gVE9ETyB0aGlzIGlzIHN0dXBpZCwgY29tZSB1cCB3aXRoIHNtdGggYmV0dGVyXG4gICAgLy8gd2hlbiBpbiBicm93c2VyLCB3aW5kb3cucmVmdXRlLmNvbmZpZygpIHVwZGF0ZXMgd2luZG93LnJlZnV0ZSBpdHNlbGZcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgb3JpZyA9PT0gd2luZG93LnJlZnV0ZSlcbiAgICAgICAgd2luZG93LnJlZnV0ZSA9IHJlZnV0ZTtcblxuICAgIHJldHVybiByZWZ1dGU7XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJylcbiAgICBtb2R1bGUuZXhwb3J0cyA9IHNldHVwKCk7XG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgd2luZG93LnJlZnV0ZSA9IHNldHVwKCk7IC8vIFRPRE8gY2hlY2sgcHJlZXhpc3RpbmdcblxuLyoqXG4gKiAgIEBjYWxsYmFjayBDb250cmFjdFxuICogICBAZGVzYyBBIGNvZGUgYmxvY2sgY29udGFpbmluZyBvbmUgb3IgbW9yZSBjb25kaXRpb24gY2hlY2tzLlxuICogICBBIGNoZWNrIGlzIHBlcmZvcm1lZCBieSBjYWxsaW5nIG9uZSBvZiBhIGZldyBzcGVjaWFsIG1ldGhvZHNcbiAqICAgKGVxdWFsLCBtYXRjaCwgZGVlcEVxdWFsLCB0eXBlIGV0YylcbiAqICAgb24gdGhlIFJlcG9ydCBvYmplY3QuXG4gKiAgIENvbnRyYWN0cyBtYXkgYmUgbmVzdGVkIHVzaW5nIHRoZSAnbmVzdGVkJyBtZXRob2Qgd2hpY2ggYWNjZXB0c1xuICogICBhbm90aGVyIGNvbnRyYWN0IGFuZCByZWNvcmRzIGEgcGFzcy9mYWlsdXJlIGluIHRoZSBwYXJlbnQgYWNjb3JkaW5nbHkucVxuICogICBBIGNvbnRyYWN0IGlzIGFsd2F5cyBleGVjdXRlZCB0byB0aGUgZW5kLlxuICogICBAcGFyYW0ge1JlcG9ydH0gb2sgQW4gb2JqZWN0IHRoYXQgcmVjb3JkcyBjaGVjayByZXN1bHRzLlxuICogICBAcGFyYW0ge0FueX0gWy4uLmxpc3RdIEFkZGl0aW9uYWwgcGFyYW1ldGVyc1xuICogICAoZS5nLiBkYXRhIHN0cnVjdHVyZSB0byBiZSB2YWxpZGF0ZWQpXG4gKiAgIEByZXR1cm5zIHt2b2lkfSBSZXR1cm5lZCB2YWx1ZSBpcyBpZ25vcmVkLlxuICovXG5cbi8qKlxuICogICBAcHVibGljXG4gKiAgIEBmdW5jdGlvbiByZWZ1dGVcbiAqICAgQHBhcmFtIHtBbnl9IFsuLi5saXN0XSBEYXRhIHRvIGZlZWQgdG8gdGhlIGNhbGxiYWNrXG4gKiAgIEBwYXJhbSB7Q29udHJhY3R9IGNvbnRyYWN0IEEgY29kZSBibG9jayB3aXRoIGNoZWNrcy5cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH0gUmV0dXJuIHZhbHVlIGlzIGlnbm9yZWQuXG4gKiAgIEB0aHJvd3Mge0Vycm9yfSBJZiBvbmUgb3IgbW9yZSBjaGVja3MgYXJlIGZhaWxpbmcsIGFuIGV4Y2VwdGlvbiBpcyB0aHJvd25cbiAqICAgd2l0aCBkZXRhaWxzIGFib3V0IGFsbCBwYXNzaW5nL2ZhaWxpbmcgY2hlY2tzLlxuICogICBUaGlzIGFjdGlvbiBjYW4gYmUgY2hhbmdlZCB2aWEgcmVmdXRlLmNvbmZpZygpIGNhbGwuXG4gKlxuICovXG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIFJlcG9ydCB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcblxuLy8gVE9ETyByZW5hbWUgZm9yRWFjaCBvciBzbXRoLlxuYWRkQ29uZGl0aW9uKFxuICAgICdtYXAnLFxuICAgIHtmdW46MSxhcmdzOjJ9LFxuICAgIChsaXN0LCBjb250cmFjdCkgPT4ge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobGlzdCkpXG4gICAgICAgICAgICByZXR1cm4gJ0V4cGVjdGVkIGEgbGlzdCwgZm91bmQgYSAnLnR5cGVvZihsaXN0KTtcbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoIDwgMSlcbiAgICAgICAgICAgIHJldHVybiAwOyAvLyBhdXRvLXBhc3NcblxuICAgICAgICBjb25zdCBvayA9IG5ldyBSZXBvcnQoKTtcbiAgICAgICAgbGlzdC5mb3JFYWNoKCAoaXRlbSwgaW5kZXgpID0+IG9rLm5lc3RlZCggXCJpdGVtIFwiK2luZGV4LCBpdGVtLCBjb250cmFjdCApICk7XG4gICAgICAgIHJldHVybiBvay5kb25lKCk7XG4gICAgfVxuKTtcblxuLy8gVE9ETyB0aGlzIGlzIGNhbGxlZCBcImNvbXBsaWFudCBjaGFpblwiIGJ1dCBiZXR0ZXIganVzdCBzYXkgaGVyZVxuLy8gXCJvaCB3ZSdyZSBjaGVja2luZyBlbGVtZW50IG9yZGVyXCJcbmFkZENvbmRpdGlvbihcbiAgICAnb3JkZXJlZCcsIC8vIFRPRE8gYmV0dGVyIG5hbWU/XG4gICAge2Z1bjoxLGFyZ3M6Mn0sXG4gICAgKGxpc3QsIGNvbnRyYWN0KSA9PiB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShsaXN0KSlcbiAgICAgICAgICAgIHJldHVybiAnRXhwZWN0ZWQgYSBsaXN0LCBmb3VuZCBhICcudHlwZW9mKGxpc3QpO1xuICAgICAgICBpZiAobGlzdC5sZW5ndGggPCAyKVxuICAgICAgICAgICAgcmV0dXJuIDA7IC8vIGF1dG8tcGFzc1xuXG4gICAgICAgIGNvbnN0IG9rID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICBmb3IgKGxldCBuID0gMDsgbiA8IGxpc3QubGVuZ3RoLTE7IG4rKykge1xuICAgICAgICAgICAgb2submVzdGVkKCBcIml0ZW1zIFwiK24rXCIsIFwiKyhuKzEpLCBsaXN0W25dLCBsaXN0W24rMV0sIGNvbnRyYWN0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb2suZG9uZSgpO1xuICAgIH1cbik7XG5cbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgeyBhZGRDb25kaXRpb24sIHJlcG9ydCwgZXhwbGFpbiB9ID0gcmVxdWlyZSggJy4uL3JlcG9ydC5qcycgKTtcbmNvbnN0IE9LID0gZmFsc2U7XG5cbmNvbnN0IG51bUNtcCA9IHtcbiAgICAnPCcgOiAoeCx5KT0+KHggIDwgeSksXG4gICAgJz4nIDogKHgseSk9Pih4ICA+IHkpLFxuICAgICc8PSc6ICh4LHkpPT4oeCA8PSB5KSxcbiAgICAnPj0nOiAoeCx5KT0+KHggPj0geSksXG4gICAgJz09JzogKHgseSk9Pih4ID09PSB5KSxcbiAgICAnIT0nOiAoeCx5KT0+KHggIT09IHkpLFxufTtcblxuLy8gdXNlICE9IGFuZCBub3QgIT09IGRlbGliZXJhdGVseSB0byBmaWx0ZXIgb3V0IG51bGwgJiB1bmRlZmluZWRcbmNvbnN0IHN0ckNtcCA9IHtcbiAgICAnPCcgOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggIDwgJycreSksXG4gICAgJz4nIDogKHgseSk9PnggIT0gdW5kZWZpbmVkICYmIHkgIT0gdW5kZWZpbmVkICYmICgnJyt4ICA+ICcnK3kpLFxuICAgICc8PSc6ICh4LHkpPT54ICE9IHVuZGVmaW5lZCAmJiB5ICE9IHVuZGVmaW5lZCAmJiAoJycreCA8PSAnJyt5KSxcbiAgICAnPj0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPj0gJycreSksXG5cbiAgICAnPT0nOiAoeCx5KT0+eCAhPSB1bmRlZmluZWQgJiYgeSAhPSB1bmRlZmluZWQgJiYgKCcnK3ggPT09ICcnK3kpLFxuICAgICchPSc6ICh4LHkpPT4oKHggPT0gdW5kZWZpbmVkKV4oeSA9PSB1bmRlZmluZWQpKSB8fCAoJycreCAhPT0gJycreSksXG59O1xuXG5hZGRDb25kaXRpb24oXG4gICAgJ251bUNtcCcsXG4gICAge2FyZ3M6M30sXG4gICAgKHgsb3AseSkgPT4gbnVtQ21wW29wXSh4LHkpPzA6W3gsXCJpcyBub3QgXCIrb3AseV1cbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ3N0ckNtcCcsXG4gICAge2FyZ3M6M30sXG4gICAgKHgsb3AseSkgPT4gc3RyQ21wW29wXSh4LHkpPzA6W3gsXCJpcyBub3QgXCIrb3AseV1cbik7XG5cbmNvbnN0IHR5cGVDaGVjayA9IHtcbiAgICB1bmRlZmluZWQ6IHggPT4geCA9PT0gdW5kZWZpbmVkLFxuICAgIG51bGw6ICAgICAgeCA9PiB4ID09PSBudWxsLFxuICAgIG51bWJlcjogICAgeCA9PiB0eXBlb2YgeCA9PT0gJ251bWJlcicgJiYgIU51bWJlci5pc05hTih4KSxcbiAgICBpbnRlZ2VyOiAgIHggPT4gTnVtYmVyLmlzSW50ZWdlcih4KSxcbiAgICBuYW46ICAgICAgIHggPT4gTnVtYmVyLmlzTmFOKHgpLFxuICAgIHN0cmluZzogICAgeCA9PiB0eXBlb2YgeCA9PT0gJ3N0cmluZycsXG4gICAgZnVuY3Rpb246ICB4ID0+IHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nLFxuICAgIGJvb2xlYW46ICAgeCA9PiB0eXBlb2YgeCA9PT0gJ2Jvb2xlYW4nLFxuICAgIG9iamVjdDogICAgeCA9PiB4ICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh4KSxcbiAgICBhcnJheTogICAgIHggPT4gQXJyYXkuaXNBcnJheSh4KSxcbn07XG5mdW5jdGlvbiB0eXBlRXhwbGFpbiAoeCkge1xuICAgIGlmICh0eXBlb2YgeCA9PT0gJ3N0cmluZycpXG4gICAgICAgIHJldHVybiB4O1xuICAgIGlmICh0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgcmV0dXJuICdpbnN0YW5jZW9mICcrKHgubmFtZSB8fCB4KTtcbn07XG5cbmFkZENvbmRpdGlvbihcbiAgICAndHlwZScsXG4gICAge2FyZ3M6IDJ9LFxuICAgIChnb3QsIGV4cCk9PntcbiAgICAgICAgaWYgKCAhQXJyYXkuaXNBcnJheShleHApIClcbiAgICAgICAgICAgIGV4cCA9IFtleHBdO1xuXG4gICAgICAgIGZvciAobGV0IHZhcmlhbnQgb2YgZXhwKSB7XG4gICAgICAgICAgICAvLyBrbm93biB0eXBlXG4gICAgICAgICAgICBpZiggdHlwZW9mIHZhcmlhbnQgPT09ICdzdHJpbmcnICYmIHR5cGVDaGVja1t2YXJpYW50XSApIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZUNoZWNrW3ZhcmlhbnRdKGdvdCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBPSztcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIGluc3RhbmNlb2ZcbiAgICAgICAgICAgIGlmKCB0eXBlb2YgdmFyaWFudCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgZ290ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGlmKCBnb3QgaW5zdGFuY2VvZiB2YXJpYW50IClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE9LO1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gZG9uJ3Qga25vdyB3aGF0IHlvdSdyZSBhc2tpbmcgZm9yXG4gICAgICAgICAgICByZXR1cm4gJ3Vua25vd24gdmFsdWUgdHlwZSBzcGVjOiAnK2V4cGxhaW4odmFyaWFudCwgMSk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAnLSAnK2V4cGxhaW4oZ290LCAxKSxcbiAgICAgICAgICAgICcrICcrZXhwLm1hcCggdHlwZUV4cGxhaW4gKS5qb2luKFwiIG9yIFwiKSxcbiAgICAgICAgXTtcbiAgICB9XG4pO1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgYWRkQ29uZGl0aW9uLCBleHBsYWluLCBkaWZmIH0gPSByZXF1aXJlKCAnLi4vcmVwb3J0LmpzJyApO1xuY29uc3QgeyBBbm5vdGF0ZWRTZXQgfSA9IHJlcXVpcmUoICcuLi91dGlsL2Fubm90YXRlZC1zZXQuanMnICk7XG5cbmFkZENvbmRpdGlvbiggJ2RlZXBFcXVhbCcsIHtcImFyZ3NcIjoyLGhhc09wdGlvbnM6dHJ1ZX0sIGRlZXAgKTtcblxuZnVuY3Rpb24gZGVlcCggZ290LCBleHAsIG9wdGlvbnM9e30gKSB7XG4gICAgaWYgKCFvcHRpb25zLm1heClcbiAgICAgICAgb3B0aW9ucy5tYXggPSA1O1xuICAgIG9wdGlvbnMuZGlmZiA9IFtdO1xuICAgIF9kZWVwKCBnb3QsIGV4cCwgb3B0aW9ucyApO1xuICAgIGlmICghb3B0aW9ucy5kaWZmLmxlbmd0aClcbiAgICAgICAgcmV0dXJuIDA7XG5cbiAgICBjb25zdCByZXQgPSBbXTtcbiAgICBmb3IgKGxldCBpdGVtIG9mIG9wdGlvbnMuZGlmZikge1xuICAgICAgICByZXQucHVzaCggXG4gICAgICAgICAgICBkaWZmLmxvYyhpdGVtWzBdKSxcbiAgICAgICAgICAgIGRpZmYuZ290KGl0ZW1bM10gPyBpdGVtWzFdIDogZXhwbGFpbiggaXRlbVsxXSwgMiApKSxcbiAgICAgICAgICAgIGRpZmYuZXhwKGl0ZW1bM10gPyBpdGVtWzJdIDogZXhwbGFpbiggaXRlbVsyXSwgMiApKSxcbiAgICAgICAgKTtcbiAgICB9O1xuICAgIHJldHVybiByZXQ7XG59O1xuXG4vLyByZXN1bHQgaXMgc3RvcmVkIGluIG9wdGlvbnMuZGlmZj1bXSwgcmV0dXJuIHZhbHVlIGlzIGlnbm9yZWRcbi8vIGlmIHNhaWQgZGlmZiBleGNlZWRzIG1heCwgcmV0dXJuIGltbWVkaWF0ZWx5ICYgZG9uJ3Qgd2FzdGUgdGltZVxuZnVuY3Rpb24gX2RlZXAoIGdvdCwgZXhwLCBvcHRpb25zPXt9LCBwYXRoPSckJywgc2Vlbkw9bmV3IEFubm90YXRlZFNldCgpLCBzZWVuUj1uZXcgQW5ub3RhdGVkU2V0KCkgKSB7XG4gICAgaWYgKGdvdCA9PT0gZXhwIHx8IG9wdGlvbnMubWF4IDw9IG9wdGlvbnMuZGlmZi5sZW5ndGgpXG4gICAgICAgIHJldHVybjtcbiAgICBpZiAodHlwZW9mIGdvdCAhPT0gdHlwZW9mIGV4cClcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuXG4gICAgLy8gcmVjdXJzZSBieSBleHBlY3RlZCB2YWx1ZSAtIGNvbnNpZGVyIGl0IG1vcmUgcHJlZGljdGFibGVcbiAgICBpZiAodHlwZW9mIGV4cCAhPT0gJ29iamVjdCcgfHwgZXhwID09PSBudWxsICkge1xuICAgICAgICAvLyBub24tb2JqZWN0cyAtIHNvIGNhbid0IGRlc2NlbmRcbiAgICAgICAgLy8gYW5kIGNvbXBhcmlzb24gYWxyZWFkeSBkb25lIGF0IHRoZSBiZWdpbm5uaW5nXG4gICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcbiAgICB9XG5cbiAgICAvLyBtdXN0IGRldGVjdCBsb29wcyBiZWZvcmUgZ29pbmcgZG93blxuICAgIGNvbnN0IHBhdGhMID0gc2VlbkwuaGFzKGdvdCk7XG4gICAgY29uc3QgcGF0aFIgPSBzZWVuUi5oYXMoZXhwKTtcbiAgICBpZiAocGF0aEwgfHwgcGF0aFIpIHtcbiAgICAgICAgLy8gTG9vcCBkZXRlY3RlZCA9IG9ubHkgY2hlY2sgdG9wb2xvZ3lcbiAgICAgICAgaWYgKHBhdGhMID09PSBwYXRoUilcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbXG4gICAgICAgICAgICBwYXRoICsgJyAoY2lyY3VsYXIpJyxcbiAgICAgICAgICAgIHBhdGhMID8gJ0NpcmN1bGFyPScrcGF0aEwgOiBleHBsYWluKGdvdCwgMiksXG4gICAgICAgICAgICBwYXRoUiA/ICdDaXJjdWxhcj0nK3BhdGhSIDogZXhwbGFpbihleHAsIDIpLFxuICAgICAgICAgICAgdHJ1ZSAvLyBkb24ndCBzdHJpbmdpZnlcbiAgICAgICAgXSk7XG4gICAgfTtcbiAgICBzZWVuTCA9IHNlZW5MLmFkZChnb3QsIHBhdGgpO1xuICAgIHNlZW5SID0gc2VlblIuYWRkKGV4cCwgcGF0aCk7XG5cbiAgICAvLyBjb21wYXJlIG9iamVjdCB0eXBlc1xuICAgIC8vIChpZiBhIHVzZXIgaXMgc3R1cGlkIGVub3VnaCB0byBvdmVycmlkZSBjb25zdHJ1Y3RvciBmaWVsZCwgd2VsbCB0aGUgdGVzdFxuICAgIC8vIHdvdWxkIGZhaWwgbGF0ZXIgYW55d2F5KVxuICAgIGlmIChnb3QuY29uc3RydWN0b3IgIT09IGV4cC5jb25zdHJ1Y3RvcilcbiAgICAgICAgcmV0dXJuIG9wdGlvbnMuZGlmZi5wdXNoKCBbcGF0aCwgZ290LCBleHAgXSApO1xuXG4gICAgLy8gYXJyYXlcbiAgICBpZiAoQXJyYXkuaXNBcnJheShleHApKSB7XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShnb3QpIHx8IGdvdC5sZW5ndGggIT09IGV4cC5sZW5ndGgpXG4gICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5kaWZmLnB1c2goIFtwYXRoLCBnb3QsIGV4cCBdICk7XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBleHAubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIF9kZWVwKCBnb3RbaV0sIGV4cFtpXSwgb3B0aW9ucywgcGF0aCsnWycraSsnXScsIHNlZW5MLCBzZWVuUiApO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMubWF4PD1vcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm47XG4gICAgfTtcblxuICAgIC8vIGNvbXBhcmUga2V5cyAtICsxIGZvciBleHAsIC0xIGZvciBnb3QsIG5vbnplcm8ga2V5IGF0IGVuZCBtZWFucyBrZXlzIGRpZmZlclxuICAgIGNvbnN0IHVuaXEgPSB7fTtcbiAgICBPYmplY3Qua2V5cyhleHApLmZvckVhY2goIHggPT4gdW5pcVt4XSA9IDEgKTtcbiAgICBPYmplY3Qua2V5cyhnb3QpLmZvckVhY2goIHggPT4gdW5pcVt4XSA9ICh1bmlxW3hdIHx8IDApIC0gMSApO1xuICAgIGZvciAobGV0IHggaW4gdW5pcSkge1xuICAgICAgICBpZiAodW5pcVt4XSAhPT0gMClcbiAgICAgICAgICAgIHJldHVybiBvcHRpb25zLmRpZmYucHVzaCggW3BhdGgsIGdvdCwgZXhwIF0gKTtcbiAgICB9XG4gICAgXG4gICAgLy8gbm93IHR5cGVvZiwgb2JqZWN0IHR5cGUsIGFuZCBvYmplY3Qga2V5cyBhcmUgdGhlIHNhbWUuXG4gICAgLy8gcmVjdXJzZS5cbiAgICBmb3IgKGxldCBpIGluIGV4cCkge1xuICAgICAgICBfZGVlcCggZ290W2ldLCBleHBbaV0sIG9wdGlvbnMsIHBhdGgrJ1snK2V4cGxhaW4oaSkrJ10nLCBzZWVuTCwgc2VlblIgKTtcbiAgICAgICAgaWYgKG9wdGlvbnMubWF4PD1vcHRpb25zLmRpZmYubGVuZ3RoKVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgfTtcbiAgICByZXR1cm47XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgUmVwb3J0IH0gPSByZXF1aXJlICggJy4vcmVwb3J0LmpzJyApO1xuY29uc3Qgbm9vcCA9ICgpPT57fTtcblxuY2xhc3MgREJDIHtcbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5fcHJlICAgID0gbm9vcDtcbiAgICAgICAgdGhpcy5fcG9zdCAgID0gbm9vcDtcbiAgICAgICAgdGhpcy5fb25mYWlsID0gcmVwb3J0ID0+IHJlcG9ydC5nZXRUaHJvd24oKTtcbiAgICAgICAgdGhpcy5fb25wb3N0ID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBwb3N0KGNvZGUpIHtcbiAgICAgICAgaWYgKGNvZGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Bvc3Q7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiggdHlwZW9mIGNvZGUgIT09ICdmdW5jdGlvbicgKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncG9zdC1jb25kaXRpb24gbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgICAgICB0aGlzLl9wb3N0ID0gY29kZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgfVxuICAgIHByZShjb2RlKSB7XG4gICAgICAgIGlmIChjb2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcmU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiggdHlwZW9mIGNvZGUgIT09ICdmdW5jdGlvbicgKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigncHJlLWNvbmRpdGlvbiBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgICAgIHRoaXMuX3ByZSA9IGNvZGU7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH1cbiAgICBkZWNvcmF0ZShvcmlnKSB7XG4gICAgICAgIC8vIGNsb3NlIGFyb3VuZCB0aGVzZSB2YXJzXG4gICAgICAgIGNvbnN0IHByZSAgICA9IHRoaXMuX3ByZTtcbiAgICAgICAgY29uc3QgcG9zdCAgID0gdGhpcy5fcG9zdDtcbiAgICAgICAgY29uc3Qgb25mYWlsID0gdGhpcy5fb25mYWlsO1xuICAgICAgICBjb25zdCBvbnBvc3QgPSB0aGlzLl9vbnBvc3QgfHwgdGhpcy5fb25mYWlsO1xuXG4gICAgICAgIC8vIG5vIGFycm93IGZ1bmN0aW9uIHRvIGdldCBjb3JyZWN0ICd0aGlzJyBvYmplY3RcbiAgICAgICAgY29uc3QgY29kZSA9IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gICAgICAgICAgICBjb25zdCByUHJlID0gbmV3IFJlcG9ydCgpO1xuICAgICAgICAgICAgcHJlLmFwcGx5KCB0aGlzLCBbIHJQcmUsIHVuZGVmaW5lZCwgLi4uYXJncyBdICk7XG4gICAgICAgICAgICBpZighclByZS5nZXRQYXNzKCkpXG4gICAgICAgICAgICAgICAgb25mYWlsKHJQcmUuc2V0VGl0bGUoJ3ByZS1jb25kaXRpb24gZmFpbGVkJykpO1xuICAgICAgICAgICAgY29uc3QgcmV0ID0gb3JpZy5hcHBseSggdGhpcywgYXJncyApO1xuICAgICAgICAgICAgY29uc3QgclBvc3QgPSBuZXcgUmVwb3J0KCk7XG4gICAgICAgICAgICBwb3N0LmFwcGx5KCB0aGlzLCBbIHJQb3N0LCByZXQsIC4uLmFyZ3MgXSApO1xuICAgICAgICAgICAgaWYoIXJQb3N0LmdldFBhc3MoKSlcbiAgICAgICAgICAgICAgICBvbnBvc3QoclBvc3Quc2V0VGl0bGUoJ3Bvc3QtY29uZGl0aW9uIGZhaWxlZCcpKTtcbiAgICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH1cblxuICAgICAgICBjb2RlLm9yaWcgPSBvcmlnO1xuICAgICAgICBjb2RlLnByZSAgPSBwcmU7XG4gICAgICAgIGNvZGUucG9zdCA9IHBvc3Q7XG5cbiAgICAgICAgcmV0dXJuIGNvZGU7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgREJDIH07XG4iLCIndXNlIHN0cmljdCc7XG5cbmNvbnN0IHsgY2FsbGVySW5mbywgZXhwbGFpbiwgbWFrZUVycm9yIH0gPSByZXF1aXJlKCAnLi91dGlsLmpzJyApO1xuY29uc3QgZHQgPSByZXF1aXJlKCAnLi4vZGlmZi10cmVlLmpzJyApOyAvLyBUT0RPIHNob3VsZCBiZSBleHRlcm5hbCBwYWNrYWdlXG5cbi8vIFRPRE8gYmV0dGVyIG5hbWVzLCBhbmQgZGlmZi10cmVlIHNob3VsZCBleHBvcnQgdGhvc2UgZnJvbSB0aGUgc3RhcnRcbmNvbnN0IGRpZmYgPSB7XG4gICAgZ290OiBkdC5hY3R1YWwsXG4gICAgZXhwOiBkdC5leHBlY3RlZCxcbiAgICBjdHg6IGR0LmNvbnRleHQsXG4gICAgbG9jOiBkdC5sb2NhdGlvbixcbiAgICBub3RlOiBkdC5ub3RlLFxufTtcblxuLy8gVE9ETyBpdCdzIGEgdGVzdFxuZm9yKCBsZXQgaSBpbiBkaWZmIClcbiAgICBpZiggdHlwZW9mIGRpZmZbaV0gIT09ICdmdW5jdGlvbicgKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IgKCdub3QgYSBmdW5jdGlvbjogJy5pKTtcblxuLyoqXG4gKiBAcHVibGljXG4gKiBAY2xhc3NkZXNjXG4gKiBUaGUgY29yZSBvZiB0aGUgcmVmdXRlIGxpYnJhcnksIHRoZSByZXBvcnQgb2JqZWN0IGNvbnRhaW5zIGluZm9cbiAqIGFib3V0IHBhc3NpbmcgYW5kIGZhaWxpbmcgY29uZGl0aW9ucy5cbiAqL1xuY2xhc3MgUmVwb3J0IHtcbiAgICAvLyBzZXR1cFxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9jb3VudCAgICAgPSAwO1xuICAgICAgICB0aGlzLl9mYWlsQ291bnQgPSAwO1xuICAgICAgICB0aGlzLl9kZXNjciAgICAgPSBbXTtcbiAgICAgICAgdGhpcy5fZXZpZGVuY2UgID0gW107XG4gICAgICAgIHRoaXMuX3doZXJlICAgICA9IFtdO1xuICAgICAgICB0aGlzLl9jb25kTmFtZSAgPSBbXTtcbiAgICAgICAgdGhpcy5faW5mbyAgICAgID0gW107XG4gICAgICAgIHRoaXMuX25lc3RlZCAgICA9IFtdO1xuICAgICAgICB0aGlzLl9wZW5kaW5nICAgPSBuZXcgU2V0KCk7XG4gICAgICAgIHRoaXMuX29uRG9uZSAgICA9IFtdO1xuICAgICAgICB0aGlzLl9kb25lICAgICAgPSBmYWxzZTtcbiAgICAgICAgLy8gVE9ETyBhZGQgY2FsbGVyIGluZm8gYWJvdXQgdGhlIHJlcG9ydCBpdHNlbGZcbiAgICB9XG5cbiAgICAvLyBzZXR1cCAtIG11c3QgYmUgY2hhaW5hYmxlXG4gICAgc2V0VGl0bGUoc3RyKSB7XG4gICAgICAgIHRoaXMuX3RpdGxlID0gc3RyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuXG4gICAgb25Eb25lKGZuKSB7XG4gICAgICAgIHRoaXMuX29uRG9uZS5wdXNoKGZuKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuICAgIC8vIHJ1bm5pbmdcbiAgICAvLyBUT0RPIGVpdGhlciBhc3luYygpIHNob3VsZCBzdXBwb3J0IGFkZGl0aW9uYWwgYXJncywgb3IgcnVuKCkgc2hvdWxkbid0XG4gICAgcnVuKC4uLmFyZ3MpIHtcbiAgICAgICAgdGhpcy5fbG9jaygpO1xuICAgICAgICBjb25zdCBibG9jayA9IGFyZ3MucG9wKCk7XG4gICAgICAgIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0xhc3QgYXJndW1lbnQgb2YgcnVuKCkgbXVzdCBiZSBhIGZ1bmN0aW9uLCBub3QgJyt0eXBlb2YoYmxvY2spKTtcbiAgICAgICAgYmxvY2soIHRoaXMsIC4uLmFyZ3MgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gVE9ETyBlaXRoZXIgYXN5bmMoKSBzaG91bGQgc3VwcG9ydCBhZGRpdGlvbmFsIGFyZ3MsIG9yIHJ1bigpIHNob3VsZG4ndFxuICAgIGFzeW5jKHRpbWVvdXQsIGJsb2NrKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSggKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KFxuICAgICAgICAgICAgICAgICgpID0+IHJlamVjdChuZXcgRXJyb3IoXCJDb250cmFjdCBleGVjdXRpb24gdG9vayB0b28gbG9uZ1wiKSksXG4gICAgICAgICAgICAgICAgdGltZW91dFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHRoaXMub25Eb25lKGFyZyA9PiB7Y2xlYXJUaW1lb3V0KHRpbWVyKTsgcmVzb2x2ZShhcmcpfSk7XG4gICAgICAgICAgICBibG9jayh0aGlzKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gSW4gdGhlb3J5LCBoYXZpbmcgY29uc3Qgbj1uZXh0KCk7IHNldFJlc3VsdChuLiAuLi4pXG4gICAgLy8gc2hvdWxkIGFsbG93IGZvciBhc3luYyBjb25kaXRpb25zIGluIHRoZSBmdXR1cmVcbiAgICAvLyBpZiBhdCBhbGwgcG9zc2libGUgd2l0aG91dCBncmVhdCBzYWNyaWZpY2VzLlxuICAgIG5leHQoKSB7XG4gICAgICAgIHRoaXMuX2xvY2soKTtcbiAgICAgICAgcmV0dXJuICsrdGhpcy5fY291bnQ7XG4gICAgfVxuXG4gICAgc2V0UmVzdWx0IChuLCBldmlkZW5jZSwgZGVzY3IsIGNvbmROYW1lLCB3aGVyZSkge1xuICAgICAgICBpZighdGhpcy5fcGVuZGluZy5oYXMobikpXG4gICAgICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIHRoaXMuX3BlbmRpbmcuZGVsZXRlKG4pO1xuICAgICAgICBpZiAobiA+IHRoaXMuX2NvdW50KVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yICgnQXR0ZW1wdCB0byBzZXQgY29uZGl0aW9uIGJleW9uZCBjaGVjayBjb3VudCcpO1xuICAgICAgICBpZiAoZGVzY3IpXG4gICAgICAgICAgICB0aGlzLl9kZXNjcltuXSA9IGRlc2NyO1xuICAgICAgICAvLyBwYXNzIC0gcmV0dXJuIEFTQVBcbiAgICAgICAgaWYgKCFldmlkZW5jZSlcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAvLyBuZXN0ZWQgcmVwb3J0IG5lZWRzIHNwZWNpYWwgaGFuZGxpbmdcbiAgICAgICAgaWYgKGV2aWRlbmNlIGluc3RhbmNlb2YgUmVwb3J0KSB7XG4gICAgICAgICAgICB0aGlzLl9uZXN0ZWRbbl0gPSBldmlkZW5jZTtcbiAgICAgICAgICAgIGlmIChldmlkZW5jZS5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXZpZGVuY2UuZ2V0UGFzcygpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIHNob3J0LWNpcmN1aXQgaWYgcG9zc2libGVcbiAgICAgICAgICAgICAgICBldmlkZW5jZSA9IFtdOyAvLyBoYWNrIC0gZmFpbGluZyB3aXRob3V0IGV4cGxhbmF0aW9uXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIG5lc3RlZCBjb250cmFjdCBpcyBpbiBhc3luYyBtb2RlIC0gY29lcmNlIGludG8gYSBwcm9taXNlXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycnkgPSBldmlkZW5jZTtcbiAgICAgICAgICAgICAgICBldmlkZW5jZSA9IG5ldyBQcm9taXNlKCBkb25lID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY3Vycnkub25Eb25lKCBkb25lICk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBwZW5kaW5nIC0gd2UncmUgaW4gYXN5bmMgbW9kZVxuICAgICAgICBpZiAoZXZpZGVuY2UgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICB0aGlzLl9wZW5kaW5nLmFkZChuKTtcbiAgICAgICAgICAgIHdoZXJlID0gd2hlcmUgfHwgY2FsbGVySW5mbygyKTsgLy8gbXVzdCByZXBvcnQgYWN0dWFsIGNhbGxlciwgbm90IHRoZW5cbiAgICAgICAgICAgIGV2aWRlbmNlLnRoZW4oIHggPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0UmVzdWx0KG4sIHgsIGRlc2NyLCBjb25kTmFtZSwgd2hlcmUgKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXREb25lKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgY2Igb2YgdGhpcy5fb25Eb25lKVxuICAgICAgICAgICAgICAgICAgICAgICAgY2IodGhpcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjb2VyY2UgZXZpZGVuY2UgaW50byBhIGxpc3Qgb2YgZGlmZi10cmVlIG9iamVjdHNcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGV2aWRlbmNlKSlcbiAgICAgICAgICAgIGV2aWRlbmNlID0gWyBldmlkZW5jZSBdO1xuICAgICAgICB0aGlzLl9ldmlkZW5jZVtuXSA9IGV2aWRlbmNlLm1hcChcbiAgICAgICAgICAgIHg9PnggaW5zdGFuY2VvZiBkdC5EaWZmQ29udGVudCA/IHggOiBkaWZmLm5vdGUoIF9leHBsYWluKHgsIEluZmluaXR5KSApICk7XG4gICAgICAgIHRoaXMuX3doZXJlW25dICAgID0gd2hlcmUgfHwgY2FsbGVySW5mbygyKTtcbiAgICAgICAgdGhpcy5fY29uZE5hbWVbbl0gPSBjb25kTmFtZTtcbiAgICAgICAgdGhpcy5fZmFpbENvdW50Kys7XG5cbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEBkZXNjIEFwcGVuZCBhbiBpbmZvcm1hdGlvbmFsIG1lc3NhZ2UgdG8gdGhlIHJlcG9ydC5cbiAgICAgKiBOb24tc3RyaW5nIHZhbHVlcyB3aWxsIGJlIHN0cmluZ2lmaWVkIHZpYSBleHBsYWluKCkuXG4gICAgICogQHBhcmFtIHtBbnl9IG1lc3NhZ2VcbiAgICAgKiBAcmV0dXJucyB7UmVwb3J0fSBjaGFpbmFibGVcbiAgICAgKi9cbiAgICBpbmZvKCAuLi5tZXNzYWdlICkge1xuICAgICAgICB0aGlzLl9sb2NrKCk7XG4gICAgICAgIGlmICghdGhpcy5faW5mb1t0aGlzLl9jb3VudF0pXG4gICAgICAgICAgICB0aGlzLl9pbmZvW3RoaXMuX2NvdW50XSA9IFtdO1xuICAgICAgICB0aGlzLl9pbmZvW3RoaXMuX2NvdW50XS5wdXNoKCBkaWZmLm5vdGUoIG1lc3NhZ2UubWFwKCBzPT5fZXhwbGFpbihzKSApLmpvaW4oXCIgXCIpICkgKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgZG9uZSgpIHtcbiAgICAgICAgaWYgKCF0aGlzLl9kb25lKSB7XG4gICAgICAgICAgICB0aGlzLl9kb25lID0gdHJ1ZTtcbiAgICAgICAgICAgIGlmICghdGhpcy5fcGVuZGluZy5zaXplKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgY2Igb2YgdGhpcy5fb25Eb25lKVxuICAgICAgICAgICAgICAgICAgICBjYih0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gcXVlcnlpbmdcbiAgICBnZXRUaXRsZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RpdGxlOyAvL0pGWUlcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogICBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBnZXREb25lKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZG9uZSAmJiAhdGhpcy5fcGVuZGluZy5zaXplOyAvLyBpcyBpdCBldmVuIG5lZWRlZD9cbiAgICB9XG5cbiAgICBfbG9jayAoKSB7XG4gICAgICAgIGlmICh0aGlzLl9kb25lKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdHRlbXB0IHRvIG1vZGlmeSBhIGZpbmlzaGVkIGNvbnRyYWN0Jyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBXaXRob3V0IGFyZ3VtZW50IHJldHVybnMgd2hldGhlciB0aGUgY29udHJhY3Qgd2FzIGZ1bGZpbGxlZC5cbiAgICAgKiAgIEFzIGEgc3BlY2lhbCBjYXNlLCBpZiBubyBjaGVja3Mgd2VyZSBydW4gYW5kIHRoZSBjb250cmFjdCBpcyBmaW5pc2hlZCxcbiAgICAgKiAgIHJldHVybnMgZmFsc2UsIGFzIGluIFwic29tZW9uZSBtdXN0IGhhdmUgZm9yZ290dGVuIHRvIGV4ZWN1dGVcbiAgICAgKiAgIHBsYW5uZWQgY2hlY2tzLiBVc2UgcGFzcygpIGlmIG5vIGNoZWNrcyBhcmUgcGxhbm5lZC5cbiAgICAgKlxuICAgICAqICAgSWYgYSBwYXJhbWV0ZXIgaXMgZ2l2ZW4sIHJldHVybiB0aGUgc3RhdHVzIG9mIG4tdGggY2hlY2sgaW5zdGVhZC5cbiAgICAgKiAgIEBwYXJhbSB7aW50ZWdlcn0gblxuICAgICAqICAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgZ2V0UGFzcyhuKSB7XG4gICAgICAgIGlmIChuID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZmFpbENvdW50ID09PSAwICYmICghdGhpcy5nZXREb25lKCkgfHwgdGhpcy5fY291bnQgPiAwKTtcbiAgICAgICAgcmV0dXJuIChuID4gMCAmJiBuIDw9IHRoaXMuX2NvdW50KSA/ICF0aGlzLl9ldmlkZW5jZVtuXSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgcGVyZm9ybWVkLlxuICAgICAqICAgQHJldHVybnMge251bWJlcn1cbiAgICAgKi9cbiAgICBnZXRDb3VudCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICBAZGVzYyBXaGV0aGVyIHRoZSBsYXN0IGNoZWNrIHdhcyBhIHN1Y2Nlc3MuXG4gICAgICogIFRoaXMgaXMganVzdCBhIHNob3J0Y3V0IGZvciBmb28uZ2V0RGV0YWlscyhmb28uZ2V0Q291bnQpLnBhc3NcbiAgICAgKiAgQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgbGFzdCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvdW50ID8gIXRoaXMuX2V2aWRlbmNlW3RoaXMuX2NvdW50XSA6IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgIEBkZXNjIE51bWJlciBvZiBjaGVja3MgZmFpbGluZy5cbiAgICAgKiAgIEByZXR1cm5zIHtudW1iZXJ9XG4gICAgICovXG4gICAgZ2V0RmFpbENvdW50KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZmFpbENvdW50O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqICAgQGRlc2MgUmV0dXJuIGEgc3RyaW5nIG9mIGZhaWxpbmcvcGFzc2luZyBjaGVja3MuXG4gICAgICogICBUaGlzIG1heSBiZSB1c2VmdWwgZm9yIHZhbGlkYXRpbmcgY3VzdG9tIGNvbmRpdGlvbnMuXG4gICAgICogICBDb25zZWN1dGl2ZSBwYXNzaW5nIGNoZWNrYSBhcmUgcmVwcmVzZW50ZWQgYnkgbnVtYmVycy5cbiAgICAgKiAgIEEgY2FwaXRhbCBsZXR0ZXIgaW4gdGhlIHN0cmluZyByZXByZXNlbnRzIGZhaWx1cmUuXG4gICAgICogICBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqICAgQGV4YW1wbGVcbiAgICAgKiAgIC8vIDEwIHBhc3NpbmcgY2hlY2tzXG4gICAgICogICBcInIoMTApXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyAxMCBjaGVja3Mgd2l0aCAxIGZhaWx1cmUgaW4gdGhlIG1pZGRsZVxuICAgICAqICAgXCJyKDUsTiw0KVwiXG4gICAgICogICBAZXhhbXBsZVxuICAgICAqICAgLy8gMTAgY2hlY2tzIGluY2x1ZGluZyBhIG5lc3RlZCBjb250cmFjdFxuICAgICAqICAgXCJyKDMscigxLE4pLDYpXCJcbiAgICAgKiAgIEBleGFtcGxlXG4gICAgICogICAvLyBubyBjaGVja3Mgd2VyZSBydW4gLSBhdXRvLWZhaWxcbiAgICAgKiAgIFwicihaKVwiXG4gICAgICovXG4gICAgZ2V0R2hvc3QoKSB7XG4gICAgICAgIGNvbnN0IGdob3N0ID0gW107XG4gICAgICAgIGxldCBzdHJlYWsgPSAwO1xuICAgICAgICBmb3IgKGxldCBpPTE7IGkgPD0gdGhpcy5fY291bnQ7IGkrKykge1xuICAgICAgICAgICAgaWYgKHRoaXMuX2V2aWRlbmNlW2ldIHx8IHRoaXMuX25lc3RlZFtpXSkge1xuICAgICAgICAgICAgICAgIGlmIChzdHJlYWspIGdob3N0LnB1c2goc3RyZWFrKTtcbiAgICAgICAgICAgICAgICBzdHJlYWsgPSAwO1xuICAgICAgICAgICAgICAgIGdob3N0LnB1c2goIHRoaXMuX25lc3RlZFtpXSA/IHRoaXMuX25lc3RlZFtpXS5nZXRHaG9zdCgpIDogJ04nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RyZWFrKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0cmVhaykgZ2hvc3QucHVzaChzdHJlYWspO1xuICAgICAgICBpZiAoZ2hvc3QubGVuZ3RoID09PSAwICYmICF0aGlzLmdldFBhc3MoKSlcbiAgICAgICAgICAgIGdob3N0LnB1c2goJ1onKTtcbiAgICAgICAgcmV0dXJuICdyKCcrZ2hvc3Quam9pbignLCcpKycpJztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgcmV0dXJucyBhIHBsYWluIHNlcmlhbGl6YWJsZSBvYmplY3RcbiAgICAgKiAgQHJldHVybnMge09iamVjdH1cbiAgICAgKi9cbiAgICB0b0pTT04oKSB7XG4gICAgICAgIGNvbnN0IG4gPSB0aGlzLmdldENvdW50KCk7XG4gICAgICAgIGNvbnN0IGRldGFpbHMgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGk8PW47IGkrKykge1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuZ2V0RGV0YWlscyhpKTtcbiAgICAgICAgICAgIC8vIHN0cmlwIGV4dHJhIGtleXNcbiAgICAgICAgICAgIGZvciggbGV0IGtleSBpbiBub2RlICkge1xuICAgICAgICAgICAgICAgIGlmIChub2RlW2tleV0gPT09IHVuZGVmaW5lZCB8fCAoQXJyYXkuaXNBcnJheShub2RlW2tleV0pICYmIG5vZGVba2V5XS5sZW5ndGggPT09IDApKVxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgbm9kZVtrZXldO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChub2RlKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHBhc3M6ICB0aGlzLmdldFBhc3MoKSxcbiAgICAgICAgICAgIGNvdW50OiB0aGlzLmdldENvdW50KCksXG4gICAgICAgICAgICB0aXRsZTogdGhpcy5nZXRUaXRsZSgpLFxuICAgICAgICAgICAgZGV0YWlscyxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICB0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0VGFwKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogIEBkZXNjIFJldHVybnMgcmVwb3J0IHN0cmluZ2lmaWVkIGFzIFRBUCBmb3JtYXRcbiAgICAgKiAgQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXRUYXAobikge1xuICAgICAgICBjb25zdCB0YXAgPSBuID09PSB1bmRlZmluZWQgPyB0aGlzLmdldFRhcExpbmVzKCkgOiB0aGlzLmdldFRhcEVudHJ5KG4pO1xuICAgICAgICB0YXAucHVzaCgnJyk7XG4gICAgICAgIHJldHVybiB0YXAuam9pbignXFxuJyk7XG4gICAgfVxuXG4gICAgZ2V0VGFwTGluZXMobikge1xuICAgICAgICAvLyBUQVAgZm9yIG5vdywgdXNlIGFub3RoZXIgZm9ybWF0IGxhdGVyIGJlY2F1c2UgXCJwZXJsIGlzIHNjYXJ5XCJcbiAgICAgICAgY29uc3QgdGFwID0gWyAnMS4uJyt0aGlzLl9jb3VudCBdO1xuICAgICAgICBpZiAodGhpcy5nZXRUaXRsZSgpKVxuICAgICAgICAgICAgdGFwLnB1c2goJyMgJyt0aGlzLmdldFRpdGxlKCkpO1xuICAgICAgICAvLyBUT0RPIGluZm9bMF1cbiAgICAgICAgY29uc3QgcHJlZmFjZSA9IHRoaXMuZ2V0RGV0YWlscygwKTtcbiAgICAgICAgdGFwLnB1c2goIC4uLnByZWZhY2UuaW5mby5tYXAoIHMgPT4gJyMgJytzICkgKTtcbiAgICAgICAgZm9yKCBsZXQgaSA9IDE7IGkgPD0gdGhpcy5fY291bnQ7IGkrKyApXG4gICAgICAgICAgICB0YXAucHVzaCggLi4uIHRoaXMuZ2V0VGFwRW50cnkoaSkgKTtcbiAgICAgICAgaWYgKCF0aGlzLmdldFBhc3MoKSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0Q291bnQoKSA+IDApXG4gICAgICAgICAgICAgICAgdGFwLnB1c2goJyMgRmFpbGVkICcrdGhpcy5nZXRGYWlsQ291bnQoKSsnLycrdGhpcy5nZXRDb3VudCgpKyAnIGNvbmRpdGlvbnMnKTtcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICB0YXAucHVzaCgnIyBObyBjaGVja3Mgd2VyZSBydW4sIGNvbnNpZGVyIHVzaW5nIHBhc3MoKSBpZiB0aGF0XFwncyBkZWxpYmVyYXRlJyk7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB0YXA7XG4gICAgfVxuXG4gICAgZ2V0VGFwRW50cnkobikge1xuICAgICAgICBjb25zdCBkYXRhID0gdHlwZW9mKG4pID09PSAnb2JqZWN0JyA/IG4gOiB0aGlzLmdldERldGFpbHMobik7XG4gICAgICAgIGNvbnN0IHRhcCA9IFtdO1xuICAgICAgICBpZiAoZGF0YS5uZXN0ZWQpIHtcbiAgICAgICAgICAgIHRhcC5wdXNoKCAnIyBzdWJjb250cmFjdDonKyhkYXRhLm5hbWU/JyAnK2RhdGEubmFtZTonJykgKTtcbiAgICAgICAgICAgIHRhcC5wdXNoKCAuLi4gZGF0YS5uZXN0ZWQuZ2V0VGFwTGluZXMoKS5tYXAoIHMgPT4gJyAgICAnK3MgKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEucGVuZGluZykge1xuICAgICAgICAgICAgdGFwLnB1c2goICdwZW5kaW5nICcrZGF0YS5uKycgPC4uLj4nICk7XG4gICAgICAgICAgICByZXR1cm4gdGFwO1xuICAgICAgICB9XG4gICAgICAgIHRhcC5wdXNoKChkYXRhLnBhc3M/Jyc6J25vdCAnKSArICdvayAnICsgZGF0YS5uXG4gICAgICAgICAgICArIChkYXRhLm5hbWUgPyAnIC0gJytkYXRhLm5hbWUgOiAnJykpO1xuICAgICAgICBpZiAoIWRhdGEucGFzcylcbiAgICAgICAgICAgIHRhcC5wdXNoKCcjIENvbmRpdGlvbicrKGRhdGEuY29uZCA/ICcgJytkYXRhLmNvbmQgOiAnJykrJyBmYWlsZWQgYXQgJytkYXRhLndoZXJlKTtcbiAgICAgICAgdGFwLnB1c2goLi4uZGF0YS5ldmlkZW5jZS5tYXAocz0+JyMgJytzKSk7XG4gICAgICAgIHRhcC5wdXNoKC4uLmRhdGEuaW5mby5tYXAocz0+JyMgJytzKSk7XG4gICAgICAgIHJldHVybiB0YXA7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogICBAZGVzYyBSZXR1cm5zIGRldGFpbGVkIHJlcG9ydCBvbiBhIHNwZWNpZmljIGNoZWNrXG4gICAgICogICBAcGFyYW0ge2ludGVnZXJ9IG4gLSBjaGVjayBudW1iZXIsIG11c3QgYmUgPD0gZ2V0Q291bnQoKVxuICAgICAqICAgQHJldHVybnMge29iamVjdH1cbiAgICAgKi9cbiAgICBnZXREZXRhaWxzKG4pIHtcbiAgICAgICAgLy8gVE9ETyB2YWxpZGF0ZSBuXG5cbiAgICAgICAgLy8gdWdseSBidXQgd2hhdCBjYW4gSSBkb1xuICAgICAgICBpZiAobiA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuOiAgICAwLFxuICAgICAgICAgICAgICAgIGluZm86IHRoaXMuX2luZm9bMF0gfHwgW10sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGV2aWRlbmNlID0gdGhpcy5fZXZpZGVuY2Vbbl07XG4gICAgICAgIGlmIChldmlkZW5jZSAmJiAhQXJyYXkuaXNBcnJheShldmlkZW5jZSkpXG4gICAgICAgICAgICBldmlkZW5jZSA9IFtldmlkZW5jZV07XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG46ICAgICAgICBuLFxuICAgICAgICAgICAgbmFtZTogICAgIHRoaXMuX2Rlc2NyW25dIHx8ICcnLFxuICAgICAgICAgICAgcGFzczogICAgICFldmlkZW5jZSxcbiAgICAgICAgICAgIGV2aWRlbmNlOiBldmlkZW5jZSB8fCBbXSxcbiAgICAgICAgICAgIHdoZXJlOiAgICB0aGlzLl93aGVyZVtuXSxcbiAgICAgICAgICAgIGNvbmQ6ICAgICB0aGlzLl9jb25kTmFtZVtuXSxcbiAgICAgICAgICAgIGluZm86ICAgICB0aGlzLl9pbmZvW25dIHx8IFtdLFxuICAgICAgICAgICAgbmVzdGVkOiAgIHRoaXMuX25lc3RlZFtuXSxcbiAgICAgICAgICAgIHBlbmRpbmc6ICB0aGlzLl9wZW5kaW5nLmhhcyhuKSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiAgQGRlc2MgQ29udmVydCByZXBvcnQgdG8gYW4gQXNzZXJ0aW9uRXJyb3IgKGlmIGF2YWlsYWJsZSkgb3IganVzdCBFcnJvci5cbiAgICAgKiAgQHBhcmFtIHtudW1iZXJ9IFtuXSBOdW1iZXIgb2YgY2hlY2sgdG8gY29udmVydCB0byBleGNlcHRpb24uXG4gICAgICogIEN1cnJlbnQgZXJyb3IgZm9ybWF0IGlzIFRBUCwgdGhpcyBtYXkgY2hhbmdlIGluIHRoZSBmdXR1cmUuXG4gICAgICogIElmIDAgb3IgdW5zcGVjaWZpZWQsIGNvbnZlcnQgdGhlIHdob2xlIHJlcG9ydC5cbiAgICAgKiAgQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXVxuICAgICAqICBAcGFyYW0ge2Jvb2xlYW59IG9wdGlvbnMucGFzcyBJZiBmYWxzZSAodGhlIGRlZmF1bHQpLCByZXR1cm4gbm90aGluZ1xuICAgICAqICBpZiB0aGUgcmVwb3J0IGlzIHBhc3NpbmcuXG4gICAgICogIEByZXR1cm5zIHtFcnJvcnx1bmRlZmluZWR9XG4gICAgICovXG4gICAgZ2V0RXJyb3Iobiwgb3B0aW9ucz17fSkge1xuICAgICAgICBpZiAoIW4pIHtcbiAgICAgICAgICAgIC8vIG5vIGVudHJ5IGdpdmVuXG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMucGFzcyAmJiB0aGlzLmdldFBhc3MoKSlcbiAgICAgICAgICAgICAgICByZXR1cm47XG5cbiAgICAgICAgICAgIHJldHVybiBtYWtlRXJyb3Ioe1xuICAgICAgICAgICAgICAgIGFjdHVhbDogICB0aGlzLmdldFRhcCgpLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkOiAnJyxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAgdGhpcy5nZXRUaXRsZSgpLFxuICAgICAgICAgICAgICAgIG9wZXJhdG9yOiAnY29udHJhY3QnLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgZGF0YSA9IHR5cGVvZiBuID09PSAnb2JqZWN0JyA/IG4gOiB0aGlzLmdldERldGFpbHMobik7XG5cbiAgICAgICAgLy8gbm8gZXJyb3JcbiAgICAgICAgaWYgKCFvcHRpb25zLnBhc3MgJiYgZGF0YS5wYXNzKVxuICAgICAgICAgICAgcmV0dXJuO1xuXG4gICAgICAgIHJldHVybiBtYWtlRXJyb3Ioe1xuICAgICAgICAgICAgYWN0dWFsOiAgIHRoaXMuZ2V0VGFwRW50cnkoZGF0YSkuam9pbignXFxuJyksXG4gICAgICAgICAgICBleHBlY3RlZDogJycsXG4gICAgICAgICAgICBtZXNzYWdlOiAgZGF0YS5uYW1lLFxuICAgICAgICAgICAgb3BlcmF0b3I6IGRhdGEuY29uZCxcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0VGhyb3duKG4sIG9wdGlvbnM9e30pIHtcbiAgICAgICAgLy8gVE9ETyByZW5hbWUgdG8ganVzdCB0aHJvdz9cbiAgICAgICAgY29uc3QgZXJyID0gdGhpcy5nZXRFcnJvcihuLCBvcHRpb25zKTtcbiAgICAgICAgaWYgKGVycilcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICB9XG59XG5cbi8vIHRoaXMgaXMgZm9yIHN0dWZmIGxpa2UgYG9iamVjdCBmb28gPSB7XCJmb29cIjo0Mn1gXG4vLyB3ZSBkb24ndCB3YW50IHRoZSBleHBsYW5hdGlvbiB0byBiZSBxdW90ZWQhXG5mdW5jdGlvbiBfZXhwbGFpbiggaXRlbSwgZGVwdGggKSB7XG4gICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJyApXG4gICAgICAgIHJldHVybiBpdGVtO1xuICAgIHJldHVybiBleHBsYWluKCBpdGVtLCBkZXB0aCApO1xufTtcblxuUmVwb3J0LnByb3RvdHlwZS5leHBsYWluID0gZXhwbGFpbjsgLy8gYWxzbyBtYWtlIGF2YWlsYWJsZSB2aWEgcmVwb3J0XG5cbi8qKlxuICogIEBkZXNjIENyZWF0ZSBuZXcgY2hlY2sgbWV0aG9kIGF2YWlsYWJsZSB2aWEgYWxsIFJlcG9ydCBpbnN0YW5jZXNcbiAqICBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lIG9mIHRoZSBuZXcgY29uZGl0aW9uLlxuICogIE11c3Qgbm90IGJlIHByZXNlbnQgaW4gUmVwb3J0IGFscmVhZHksIGFuZCBzaG91bGQgTk9UIHN0YXJ0IHdpdGhcbiAqICBnZXQuLi4sIHNldC4uLiwgb3IgYWRkLi4uICh0aGVzZSBhcmUgcmVzZXJ2ZWQgZm9yIFJlcG9ydCBpdHNlbGYpXG4gKiAgQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgQ29uZmlndXJpbmcgdGhlIGNoZWNrJ3MgaGFuZGxpbmcgb2YgYXJndW1lbnRzXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBvcHRpb25zLmFyZ3MgVGhlIHJlcXVpcmVkIG51bWJlciBvZiBhcmd1bWVudHNcbiAqICBAcGFyYW0ge2ludGVnZXJ9IFtvcHRpb25zLm1pbkFyZ3NdIE1pbmltdW0gbnVtYmVyIG9mIGFyZ3VtZW50IChkZWZhdWx0cyB0byBhcmdzKVxuICogIEBwYXJhbSB7aW50ZWdlcn0gW29wdGlvbnMubWF4QXJnc10gTWF4aW11bSBudW1iZXIgb2YgYXJndW1lbnQgKGRlZmF1bHRzIHRvIGFyZ3MpXG4gKiAgQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5oYXNPcHRpb25zXSBJZiB0cnVlLCBhbiBvcHRpb25hbCBvYmplY3RcbmNhbiBiZSBzdXBwbGllZCBhcyBsYXN0IGFyZ3VtZW50LiBJdCB3b24ndCBpbnRlcmZlcmUgd2l0aCBkZXNjcmlwdGlvbi5cbiAqICBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmZ1bl0gVGhlIGxhc3QgYXJndW1lbnQgaXMgYSBjYWxsYmFja1xuICogIEBwYXJhbSB7RnVuY3Rpb259IGltcGxlbWVudGF0aW9uIC0gYSBjYWxsYmFjayB0aGF0IHRha2VzIHthcmdzfSBhcmd1bWVudHNcbiAqICBhbmQgcmV0dXJucyBhIGZhbHNleSB2YWx1ZSBpZiBjb25kaXRpb24gcGFzc2VzXG4gKiAgKFwibm90aGluZyB0byBzZWUgaGVyZSwgbW92ZSBhbG9uZ1wiKSxcbiAqICBvciBldmlkZW5jZSBpZiBpdCBmYWlsc1xuICogIChlLmcuIHR5cGljYWxseSBhIGdvdC9leHBlY3RlZCBkaWZmKS5cbiAqL1xuY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbmZ1bmN0aW9uIGFkZENvbmRpdGlvbiAobmFtZSwgb3B0aW9ucywgaW1wbCkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ29uZGl0aW9uIG5hbWUgbXVzdCBiZSBhIHN0cmluZycpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eKF98Z2V0W19BLVpdfHNldFtfQS1aXSkvKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gbmFtZSBtdXN0IG5vdCBzdGFydCB3aXRoIGdldF8sIHNldF8sIG9yIF8nKTtcbiAgICAvLyBUT0RPIG11c3QgZG8gc29tZXRoaW5nIGFib3V0IG5hbWUgY2xhc2hlcywgYnV0IGxhdGVyXG4gICAgLy8gYmVjYXVzZSBldmFsIGluIGJyb3dzZXIgbWF5IChraW5kIG9mIGxlZ2ltaXRlbHkpIG92ZXJyaWRlIGNvbmRpdGlvbnNcbiAgICBpZiAoIXNlZW4uaGFzKG5hbWUpICYmIFJlcG9ydC5wcm90b3R5cGVbbmFtZV0pXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTWV0aG9kIGFscmVhZHkgZXhpc3RzIGluIFJlcG9ydDogJytuYW1lKTtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBvcHRpb25zJyk7XG4gICAgaWYgKHR5cGVvZiBpbXBsICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2JhZCBpbXBsZW1lbnRhdGlvbicpO1xuXG4gICAgY29uc3QgbWluQXJncyAgICA9IG9wdGlvbnMubWluQXJncyB8fCBvcHRpb25zLmFyZ3M7XG4gICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFyZ3MpIHx8IG1pbkFyZ3MgPCAwKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2FyZ3MvbWluQXJncyBtdXN0IGJlIG5vbm5lZ2F0aXZlIGludGVnZXInKTtcbiAgICBjb25zdCBtYXhBcmdzICAgID0gb3B0aW9ucy5tYXhBcmdzIHx8IG9wdGlvbnMuYXJncyB8fCBJbmZpbml0eTtcbiAgICBpZiAobWF4QXJncyAhPT0gSW5maW5pdHkgJiYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFyZ3MpIHx8IG1heEFyZ3MgPCBtaW5BcmdzKSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdtYXhBcmdzIG11c3QgYmUgaW50ZWdlciBhbmQgZ3JlYXRlciB0aGFuIG1pbkFyZ3MsIG9yIEluZmluaXR5Jyk7XG4gICAgY29uc3QgZGVzY3JGaXJzdCAgICA9IG9wdGlvbnMuZGVzY3JGaXJzdCB8fCBvcHRpb25zLmZ1biB8fCBtYXhBcmdzID4gMTA7XG4gICAgY29uc3QgaGFzT3B0aW9ucyAgICA9ICEhb3B0aW9ucy5oYXNPcHRpb25zO1xuICAgIGNvbnN0IG1heEFyZ3NSZWFsICAgPSBtYXhBcmdzICsgKGhhc09wdGlvbnMgPyAxIDogMCk7XG5cbiAgICAvLyBUT0RPIGFsZXJ0IHVua25vd24gb3B0aW9uc1xuXG4gICAgLy8gVE9ETyB0aGlzIGNvZGUgaXMgY2x1dHRlcmVkLCByZXdyaXRlXG4gICAgY29uc3QgY29kZSA9IGZ1bmN0aW9uKC4uLmFyZ3MpIHtcbiAgICAgICAgY29uc3QgZGVzY3IgPSBkZXNjckZpcnN0XG4gICAgICAgICAgICA/IGFyZ3Muc2hpZnQoKVxuICAgICAgICAgICAgOiAoIChhcmdzLmxlbmd0aCA+IG1heEFyZ3MgJiYgdHlwZW9mIGFyZ3NbYXJncy5sZW5ndGgtMV0gPT09ICdzdHJpbmcnKSA/IGFyZ3MucG9wKCkgOiB1bmRlZmluZWQpO1xuICAgICAgICBpZiAoYXJncy5sZW5ndGggPiBtYXhBcmdzUmVhbCB8fCBhcmdzLmxlbmd0aCA8IG1pbkFyZ3MpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbmRpdGlvbiAnK25hbWUrJyBtdXN0IGhhdmUgJyttaW5BcmdzKycuLicrbWF4QXJnc1JlYWwrJyBhcmd1bWVudHMgJyk7IC8vIFRPRE9cblxuICAgICAgICBjb25zdCBuID0gdGhpcy5uZXh0KCk7IC8vIFRPRE8gY2FsbCBpdCBhZHZhbmNlKCkgb3Igc210aC5cbiAgICAgICAgY29uc3QgZXZpZGVuY2UgPSBpbXBsKCAuLi5hcmdzICk7XG4gICAgICAgIHJldHVybiB0aGlzLnNldFJlc3VsdCggbiwgZXZpZGVuY2UsIGRlc2NyLCBuYW1lICk7XG4gICAgfTtcblxuICAgIHNlZW4uYWRkKG5hbWUpO1xuICAgIFJlcG9ydC5wcm90b3R5cGVbbmFtZV0gPSBjb2RlO1xufVxuXG4vKipcbiAqICAgQGZ1bmN0aW9uIGNoZWNrXG4gKiAgIEBtZW1iZXJPZiBSZXBvcnRcbiAqICAgQHBhcmFtIGV2aWRlbmNlIElmIGZhbHNlLCB0aGUgY2hlY2sgaXMgYXNzdW1lZCB0byBwYXNzLlxuICogICBBIHRydWUgdmFsdWUgbWVhbnMgdGhlIGNoZWNrIGZhaWxlZC5cbiAqICAgQHBhcmFtIHtzdHJpbmd9IFtkZXNjcmlwdGlvbl1cbiAqICAgQHJldHVybnMge3VuZGVmaW5lZH1cbiAqL1xuXG4vLyB0aGVzZSBjb25kaXRpb25zIGNvdWxkIGJlIHVuZGVyIHRoZSBjb25kaXRpb24gbGlicmFyeVxuLy8gYnV0IHdlJ2xsIG5lZWQgdGhlbSB0byB2ZXJpZnkgdGhlIFJlcG9ydCBjbGFzcyBpdHNlbGYuXG5cbmFkZENvbmRpdGlvbihcbiAgICAnY2hlY2snLFxuICAgIHthcmdzOjF9LFxuICAgIHg9Pnhcbik7XG5hZGRDb25kaXRpb24oXG4gICAgJ3Bhc3MnLFxuICAgIHthcmdzOjB9LFxuICAgICgpPT4wXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdmYWlsJyxcbiAgICB7YXJnczowfSxcbiAgICAoKT0+J2ZhaWxlZCBkZWxpYmVyYXRlbHknXG4pO1xuYWRkQ29uZGl0aW9uKFxuICAgICdlcXVhbCcsXG4gICAge2FyZ3M6Mn0sXG4gICAgKGEsYikgPT4gYSA9PT0gYiA/IDAgOiBbICctICcrZXhwbGFpbihhKSwgJysgJyArIGV4cGxhaW4oYikgXVxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnbWF0Y2gnLFxuICAgIHthcmdzOjJ9LFxuICAgIChhLHJleCkgPT4gKCcnK2EpLm1hdGNoKHJleCkgPyAwIDogW1xuICAgICAgICAnU3RyaW5nICAgICAgICAgOiAnK2EsXG4gICAgICAgICdEb2VzIG5vdCBtYXRjaCA6ICcrcmV4XG4gICAgXVxuKTtcbmFkZENvbmRpdGlvbihcbiAgICAnbmVzdGVkJyxcbiAgICB7ZnVuOjEsbWluQXJnczoxfSxcbiAgICAoLi4uYXJncykgPT4gbmV3IFJlcG9ydCgpLnJ1biguLi5hcmdzKS5kb25lKClcbik7XG5cbi8qKlxuICogICBAZXhwb3J0cyBSZXBvcnRcbiAqICAgQGV4cG9ydHMgcmVwb3J0XG4gKiAgIEBleHBvcnRzIGFkZENvbmRpdGlvblxuICogICBAZXhwb3J0cyBleHBsYWluXG4gKi9cblxuLy8gVE9ETyByZW5hbWUgZGlmZiB0byBzb21ldGhpbmcgYmV0dGVyXG5cbm1vZHVsZS5leHBvcnRzID0geyBSZXBvcnQsIGFkZENvbmRpdGlvbiwgZXhwbGFpbiwgZGlmZiB9O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5jb25zdCB7IEFubm90YXRlZFNldCB9ID0gcmVxdWlyZSggJy4vdXRpbC9hbm5vdGF0ZWQtc2V0LmpzJyApO1xuXG4vKiBEZXRlcm1pbmUgbi10aCBjYWxsZXIgdXAgdGhlIHN0YWNrICovXG4vKiBJbnNwaXJlZCBieSBQZXJsJ3MgQ2FycCBtb2R1bGUgKi9cbmNvbnN0IGluU3RhY2sgPSAvKFteOlxccygpXSs6XFxkKyg/OjpcXGQrKT8pXFxXKihcXG58JCkvZztcblxuLyoqXG4gKiAgQHB1YmxpY1xuICogIEBmdW5jdGlvblxuICogIEBkZXNjIFJldHVybnMgc291cmNlIHBvc2l0aW9uIG4gZnJhbWVzIHVwIHRoZSBzdGFja1xuICogIEBleGFtcGxlXG4gKiAgXCIvZm9vL2Jhci5qczoyNToxMVwiXG4gKiAgQHBhcmFtIHtpbnRlZ2VyfSBkZXB0aCBIb3cgbWFueSBmcmFtZXMgdG8gc2tpcFxuICogIEByZXR1cm5zIHtzdHJpbmd9IHNvdXJjZSBmaWxlLCBsaW5lLCBhbmQgY29sdW1uLCBzZXBhcmF0ZWQgYnkgY29sb24uXG4gKi9cbmZ1bmN0aW9uIGNhbGxlckluZm8obikge1xuICAgIC8qIGEgdGVycmlibGUgcmV4IHRoYXQgYmFzaWNhbGx5IHNlYXJjaGVzIGZvciBmaWxlLmpzOm5ubjpubm4gc2V2ZXJhbCB0aW1lcyovXG4gICAgcmV0dXJuIChuZXcgRXJyb3IoKS5zdGFjay5tYXRjaChpblN0YWNrKVtuKzFdLnJlcGxhY2UoL1xcbiQvLCAnJykgfHwgJycpXG59XG5cbi8qKlxuICogIEBwdWJsaWNcbiAqICBAZnVuY3Rpb25cbiAqICBAZGVzYyBTdHJpbmdpcnkgb2JqZWN0cyByZWN1cnNpdmVseSB3aXRoIGxpbWl0ZWQgZGVwdGhcbiAqICBhbmQgY2lyY3VsYXIgcmVmZXJlbmNlIHRyYWNraW5nLlxuICogIEdlbmVyYWxseSBKU09OLnN0cmluZ2lmeSBpcyB1c2VkIGFzIHJlZmVyZW5jZTpcbiAqICBzdHJpbmdzIGFyZSBlc2NhcGVkIGFuZCBkb3VibGUtcXVvdGVkOyBudW1iZXJzLCBib29sZWFuLCBhbmQgbnVsbHMgYXJlXG4gKiAgc3RyaW5naWZpZWQgXCJhcyBpc1wiOyBvYmplY3RzIGFuZCBhcnJheXMgYXJlIGRlc2NlbmRlZCBpbnRvLlxuICogIFRoZSBkaWZmZXJlbmNlcyBmb2xsb3c6XG4gKiAgdW5kZWZpbmVkIGlzIHJlcG9ydGVkIGFzICc8dW5kZWY+Jy5cbiAqICBPYmplY3RzIHRoYXQgaGF2ZSBjb25zdHJ1Y3RvcnMgYXJlIHByZWZpeGVkIHdpdGggY2xhc3MgbmFtZXMuXG4gKiAgT2JqZWN0IGFuZCBhcnJheSBjb250ZW50IGlzIGFiYnJldmlhdGVkIGFzIFwiLi4uXCIgYW5kIFwiQ2lyY3VsYXJcIlxuICogIGluIGNhc2Ugb2YgZGVwdGggZXhoYXVzdGlvbiBhbmQgY2lyY3VsYXIgcmVmZXJlbmNlLCByZXNwZWN0aXZlbHkuXG4gKiAgRnVuY3Rpb25zIGFyZSBuYWl2ZWx5IHN0cmluZ2lmaWVkLlxuICogIEBwYXJhbSB7QW55fSB0YXJnZXQgT2JqZWN0IHRvIHNlcmlhbGl6ZS5cbiAqICBAcGFyYW0ge2ludGVnZXJ9IGRlcHRoPTMgRGVwdGggbGltaXQuXG4gKiAgQHJldHVybnMge3N0cmluZ31cbiAqL1xuZnVuY3Rpb24gZXhwbGFpbiggaXRlbSwgZGVwdGg9Mywgb3B0aW9ucz17fSwgcGF0aD0nJCcsIHNlZW49bmV3IEFubm90YXRlZFNldCgpICkge1xuICAgIC8vIHNpbXBsZSB0eXBlc1xuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpXG4gICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShpdGVtKTsgLy8gZG9uJ3Qgd2FudCB0byBzcGVuZCB0aW1lIHFvdXRpbmdcbiAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdudW1iZXInIHx8IHR5cGVvZiBpdGVtID09PSAnYm9vbGVhbicgfHwgaXRlbSA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuICcnK2l0ZW07XG4gICAgaWYgKGl0ZW0gPT09IHVuZGVmaW5lZCkgcmV0dXJuICc8dW5kZWY+JztcbiAgICBpZiAodHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnKSAvLyBtYXliZSBmdW5jdGlvblxuICAgICAgICByZXR1cm4gJycraXRlbTsgLy8gVE9ETyBkb24ndCBwcmludCBvdXQgYSBsb25nIGZ1bmN0aW9uJ3MgYm9keVxuXG4gICAgLy8gcmVjdXJzZVxuICAgIGNvbnN0IHdoZXJlU2VlbiA9IHNlZW4uaGFzKGl0ZW0pO1xuICAgIGlmICh3aGVyZVNlZW4pIHtcbiAgICAgICAgY29uc3Qgbm90ZSA9ICdDaXJjdWxhcj0nK3doZXJlU2VlbjtcbiAgICAgICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoaXRlbSk/J1sgJytub3RlKycgXSc6J3sgJytub3RlKycgfSc7XG4gICAgfTtcbiAgICBzZWVuID0gc2Vlbi5hZGQoIGl0ZW0sIHBhdGggKTsgLy8gY2xvbmVzIHNlZW5cblxuICAgIGlmIChBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICAgIGlmIChkZXB0aCA8IDEpXG4gICAgICAgICAgICByZXR1cm4gJ1suLi5dJztcbiAgICAgICAgc2Vlbi5hZGQoaXRlbSk7XG4gICAgICAgIC8vIFRPRE8gPHggZW1wdHkgaXRlbXM+XG4gICAgICAgIGNvbnN0IGxpc3QgPSBpdGVtLm1hcChcbiAgICAgICAgICAgICh2YWwsIGluZGV4KSA9PiBleHBsYWluKHZhbCwgZGVwdGgtMSwgb3B0aW9ucywgcGF0aCsnWycraW5kZXgrJ10nLCBzZWVuKVxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gJ1snK2xpc3Quam9pbignLCAnKSsnXSc7IC8vIFRPRE8gY29uZmlndXJhYmxlIHdoaXRlc3BhY2VcbiAgICB9XG5cbiAgICBjb25zdCB0eXBlID0gaXRlbS5jb25zdHJ1Y3RvciAmJiBpdGVtLmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgY29uc3QgcHJlZml4ID0gdHlwZSAmJiB0eXBlICE9PSAnT2JqZWN0JyA/IHR5cGUgKyAnICcgOiAnJztcbiAgICBpZiAoZGVwdGggPCAxKVxuICAgICAgICByZXR1cm4gcHJlZml4ICsgJ3suLi59JztcbiAgICBjb25zdCBsaXN0ID0gT2JqZWN0LmtleXMoaXRlbSkuc29ydCgpLm1hcCgga2V5ID0+IHtcbiAgICAgICAgY29uc3QgaW5kZXggPSBKU09OLnN0cmluZ2lmeShrZXkpO1xuICAgICAgICByZXR1cm4gaW5kZXgrXCI6XCIrZXhwbGFpbihpdGVtW2tleV0sIGRlcHRoLTEsIG9wdGlvbnMsIHBhdGgrJ1snK2luZGV4KyddJywgc2Vlbik7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByZWZpeCArICd7JyArIGxpc3Quam9pbihcIiwgXCIpICsgJ30nO1xuXG4gICAgLy8gZHVubm8gd2hhdCBpdCBpcywgbWF5YmUgYSBmdW5jdGlvblxuICAgIHJldHVybiAnJytpdGVtO1xufVxuXG4vLyBNdXN0IHdvcmsgZXZlbiB3aXRob3V0IGFzc2VydFxuY29uc3QgaGFzQXNzZXJ0ID0gdHlwZW9mIGFzc2VydCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IgPT09ICdmdW5jdGlvbic7XG5cbmNvbnN0IG1ha2VFcnJvciA9IGhhc0Fzc2VydFxuICAgID8gZW50cnkgPT4gbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcihlbnRyeSlcbiAgICA6IGVudHJ5ID0+IG5ldyBFcnJvciggZW50cnkuYWN0dWFsICk7XG5cbi8qKlxuICogICBAZXhwb3J0cyBjYWxsZXJJbmZvXG4gKiAgIEBleHBvcnRzIGV4cGxhaW5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHsgY2FsbGVySW5mbywgZXhwbGFpbiwgbWFrZUVycm9yIH07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIFNlZSBhbHNvIG5vdGVkLXNldC5qc1xuXG5jbGFzcyBBbm5vdGF0ZWRTZXQge1xuICAgIGNvbnN0cnVjdG9yKGFsbD1uZXcgU2V0KCksIG5vdGVzPVtdKSB7XG4gICAgICAgIHRoaXMuYWxsICAgPSBhbGw7XG4gICAgICAgIHRoaXMubm90ZXMgPSBub3RlcztcbiAgICB9XG4gICAgYWRkKCBpdGVtLCBub3RlICkge1xuICAgICAgICBpZiAodGhpcy5hbGwuaGFzKGl0ZW0pKVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIHJldHVybiBuZXcgQW5ub3RhdGVkU2V0KFxuICAgICAgICAgICAgbmV3IFNldCh0aGlzLmFsbCkuYWRkKGl0ZW0pLFxuICAgICAgICAgICAgWyAuLi50aGlzLm5vdGVzLCBbIGl0ZW0sIG5vdGUgXSBdXG4gICAgICAgICk7XG4gICAgfVxuICAgIGhhcyggaXRlbSApIHtcbiAgICAgICAgaWYgKCF0aGlzLmFsbC5oYXMoIGl0ZW0gKSlcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgZm9yIChsZXQgcGFpciBvZiB0aGlzLm5vdGVzKSB7XG4gICAgICAgICAgICBpZiAocGFpclswXSA9PT0gaXRlbSlcbiAgICAgICAgICAgICAgICByZXR1cm4gcGFpclsxXTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd3dGYsIHVucmVhY2hhYmxlJyk7XG4gICAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0geyBBbm5vdGF0ZWRTZXQgfTtcbiJdfQ==
