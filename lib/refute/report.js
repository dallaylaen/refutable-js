'use strict';

const { callerInfo } = require( './util.js' );

/**
 * @public
 */
class Report {
    // setup
    constructor() {
        this._count     = 0;
        this._failCount = 0;
        this._descr     = [];
        this._failed    = [];
        this._where     = [];
        this._condName  = [];
        this._diag      = [];
        this._nested    = [];
        this._done      = false;
        // TODO add caller info about the report itself
    }

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

    setResult (reason, descr, condName) {
        if (this._done)
            throw new Error ('Attempt to modify a finished Report');
        // TODO die if done
        const n = ++this._count;
        if (descr)
            this._descr[n] = descr;
        if (!reason) {
            // TODO log something
            return true;
        }
        if (reason instanceof Report) {
            this._nested[n] = reason;
            if (reason.isPassing())
                return true;
            reason = [];
        }

        this._failed[n] = reason;
        this._where[n]  = callerInfo(2);
        this._condName[n] = condName;
        this._failCount++;
        // TODO explanation et al

        return false;
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
    /**
     *   @returns {boolean}
     */
    isDone() {
        return this._done; // is it even needed?
    }

    /**
     *   @returns {boolean}
     */
    isPassing() {
        return this._failCount === 0;
    }

    /**
     *   @desc Number of checks performed.
     *   @returns {number}
     */
    getCount() {
        return this._count;
    }

    /**
     *   @desc Return a string of failing/passing checks.
     *   This may be useful for validating custom conditions.
     *   @example
     *   // 10 passing checks
     *   "r(10)"
     *   @example
     *   // 10 checks with 1 failure in the middle
     *   "r(5,N,4)"
     *   @example
     *   // 10 checks including a nested contract
     *   "r(3,r(1,N),6)"
     *   @returns {string}
     */
    getGhost() {
        const ghost = [];
        let streak = 0;
        for (let i=1; i <= this._count; i++) {
            if (this._failed[i] || this._nested[i]) {
                if (streak) ghost.push(streak);
                streak = 0;
                ghost.push( this._nested[i] ? this._nested[i].getGhost() : 'N');
            } else {
                streak++;
            }
        }
        if (streak) ghost.push(streak);
        return 'r('+ghost.join(',')+')';
    }

    /**
     *  @desc Returns report stringified as TAP format
     *  @returns {string}
     */
    getTap() {
        const tap = this.getTapLines();
        tap.push('');
        return tap.join('\n');
    }

    getTapLines() {
        // TAP for now, use another format later because "perl is scary"
        const tap = [ '1..'+this._count ];
        // TODO diag[0]
        const preface = this.getDetails(0);
        tap.push( ...preface.diag.map( s => '# '+s ) );
        for( let i = 1; i <= this._count; i++ ) {
            const data = this.getDetails(i);
            if (data.nested) {
                tap.push( '# subcontract:'+(data.name?' '+data.name:'') );
                tap.push( ... data.nested.getTapLines().map( s => '    '+s ));
            }
            tap.push((data.pass?'':'not ') + 'ok ' + i
                + (data.name ? ' - '+data.name : ''));
            if (!data.pass)
                tap.push('# Condition'+(data.cond ? ' '+data.cond : '')+' failed at '+data.where);
            tap.push(...data.reason.map(s=>'# '+s));
            tap.push(...data.diag.map(s=>'# '+s));
        }
        if (!this.isPassing())
            tap.push('# Failed');
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
                test: 0,
                diag: this._diag[0] || [],
            };
        }

        let reason = this._failed[n];
        if (reason && !Array.isArray(reason))
            reason = [reason];

        return {
            test:   n,
            name:   this._descr[n] || '',
            pass:   !reason,
            reason: reason || [],
            where:  this._where[n],
            cond:   this._condName[n],
            diag:   this._diag[n] || [],
            nested: this._nested[n],
        };
    }
}

// this is for stuff like `object foo = {"foo":42}`
// we don't want the explanation to be quoted!
function _explain( item, depth ) {
    if (typeof item === 'string' )
        return item;
    return explain( item, depth );
};

function explain( item, depth=3, options={}, path='$', seen=new Set() ) {
    // simple types
    if (typeof item === 'string')
        return JSON.stringify(item); // don't want to spend time qouting
    if (typeof item === 'number' || typeof item === 'boolean')
        return item;
    if (item === null) return 'null';
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
Report.prototype.explain = explain; // also make available via report

function addCondition (name, options, impl) {
    if (Report.prototype[name])
        throw new Error('name taken: '+name);
    if (typeof options !== 'object')
        throw new Error('bad options');
    if (typeof impl !== 'function')
        throw new Error('bad implementation');


    const minArgs    = options.minArgs || options.args;
    if (typeof minArgs !== 'number')
        throw new Error('args must be a number');
    const maxArgs    = options.maxArgs || options.args || Infinity;
    const descrFirst = options.descrFirst || options.fun || maxArgs > 10;

    // TODO alert unknown options

    let code;

    code = function(...args) {
        const descr = descrFirst
            ? args.shift()
            : (args.length > maxArgs ? args.pop() : undefined);
        if (args.length > maxArgs || args.length < minArgs)
            throw new Error('Bad argument count in condition '+name); // TODO

        const reason = impl( ...args );
        return this.setResult( reason, descr, name );
    };

    Report.prototype[name] = code;
}

/**
 *   @function check
 *   @memberOf Report
 *   @param evidence If false, the check is assumed to pass.
 *   A true value means the check failed.
 *   @param {string} description (optional)
 *   @returns {boolean} Whether the check passed.
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
