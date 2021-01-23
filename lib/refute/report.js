'use strict';

const { callerInfo } = require( './util.js' );

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

    setResult (reason, descr, condName) {
        // TODO die if done
        const n = ++this._count;
        if (descr)
            this._descr[n] = descr;
        if (!reason) {
            // TODO log something
            return 1;
        }
        if (reason instanceof Report) {
            this._nested[n] = reason;
            if (reason.isPassing())
                return 1;
            reason = [];
        }

        this._failed[n] = reason;
        this._where[n]  = callerInfo(2);
        this._condName[n] = condName;
        this._failCount++;
        // TODO explanation et al

        return 0;
    }

    diag( ...message ) {
        // TODO preprocess message
        if (!this._diag[this._count])
            this._diag[this._count] = [];
        this._diag[this._count].push( message.map( s=>_explain(s) ).join(" ") );
    }

    stop() {
        this._done = true;
    }

    // querying
    isDone() {
        return this._done; // is it even needed?
    }

    isPassing() {
        return this._failCount === 0;
    }

    getCount() {
        return this._count;
    }

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

// TODO better name to avoid clash with Report class name
function report (...args) {
    const block = args.pop();
    const contract = new Report();
    block(contract, ...args);
    contract.stop();
    return contract;
}

function _explain( item ) {
    if (typeof item === 'string' )
        return item;
    return explain( item, 5 );
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

module.exports = { Report, report, addCondition, explain };
