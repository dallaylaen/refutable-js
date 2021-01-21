'use strict';

function report (...args) {
    const block = args.pop();
    const contract = new Report();
    block(contract, ...args);
    contract.stop();
    return contract;
}

function refute (...args) {
    const contract = report(...args);
    if (!contract.isPassing())
        throw new Error(contract.getTap());
}

class Report {
    // setup
    constructor() {
        this._count     = 0;
        this._failCount = 0;
        this._descr     = [];
        this._failed    = [];
        this._diag      = [];
        this._nested    = [];
        this._done      = false;
    }

    // running
    setResult (reason, descr) {
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
        this._failCount++;
        // TODO explanation et al

        return 0;
    }

    diag( ...message ) {
        // TODO preprocess message
        if (!this._diag[this._count])
            this._diag[this._count] = [];
        this._diag[this._count].push( ...message );
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
        for( let i = 1; i <= this._count; i++ ) {
            const data = this.getDetails(i);
            if (data.nested) {
                tap.push( '# subcontract:'+(data.name?' '+data.name:'') );
                tap.push( ... data.nested.getTapLines().map( s => '    '+s ));
            }
            tap.push((data.pass?'':'not ') + 'ok ' + i
                + (data.name ? ' - '+data.name : ''));
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
            diag:   this._diag[n] || [],
            nested: this._nested[n],
        };
    }
}

refute.addCondition = function(name, options, impl) {
    if (Report.prototype[name])
        throw new Error('name taken: '+name);
    if (typeof options !== 'object')
        throw new Error('bad options');
    if (typeof impl !== 'function')
        throw new Error('bad implementation');


    const minArgs    = options.minArgs || options.args;
    if (typeof minArgs !== 'number')
        throw new Error('args must be a number');
    const maxArgs    = options.maxArgs || options.args || 9 ** 9 ** 9;
    const descrFirst = options.descrFirst || options.fun || maxArgs > 10;
    const nested     = options.nested;

    // TODO alert unknown options

    let code;

    code = function(...args) {
        const descr = descrFirst
            ? args.shift()
            : (args.length > maxArgs ? args.pop() : undefined);
        if (args.length > maxArgs || args.length < minArgs)
            throw new Error('Bad argument count in condition '+name); // TODO

        if (!nested) {
            const reason = impl( ...args );
            return this.setResult( reason, descr );
        } else {
            // nested condition - run impl vs a fresh report
            const inner = new Report();
            impl( inner, ...args );
            inner.stop();
            return this.setResult( inner, descr );
        }
    };

    Report.prototype[name] = code;
};

refute.addCondition(
    'equals',
    {args:2},
    (a,b) => a === b ? 0 : [ 'Got      : '+a, 'Expected : ' + b ]
);
refute.addCondition(
    'matches',
    {args:2},
    (a,rex) => (''+a).match(rex) ? 0 : [
        'String         : '+a,
        'Does not match : '+rex
    ]
);
refute.addCondition(
    'pass',
    {args:0},
    ()=>0
);
refute.addCondition(
    'fail',
    {args:0},
    ()=>'deliberately failed'
);

refute.addCondition(
    'nested',
    {nested:1,fun:1,minArgs:1},
    (ok, ...args) => { args.pop()(ok, ...args) }
);

refute.addCondition(
    'map',
    {nested:1,fun:1,args:2},
    (ok, list, contract) => { 
        list.forEach( (item, index) => ok.nested( "item "+index, item, contract ) );
    }
);

refute.Report = Report;
refute.report   = report;

module.exports = refute;

