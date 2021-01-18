'use strict';

function report (...args) {
    const block = args.pop();
    const contract = new Contract();
    block(contract, ...args);
    contract.stop();
    return contract;
}

function refute (...args) {
    const contract = report(...args);
    if (!contract.isPassing())
        throw new Error(contract.getReport());
}

class Contract {
    constructor() {
        this._count     = 0;
        this._descr     = [];
        this._failed    = [];
        this._diag      = [];
        this._done      = false;
    }

    isDone() {
        return this._done; // is it even needed?
    }

    isPassing() {
        return this._failed.length === 0;
    }

    getCount() {
        return this._count;
    }

    getReport() {
        // TAP for now, use another format later because "perl is scary"
        const tap = [ '1..'+this._count ];
        // TODO diag[0]
        for( let i = 1; i <= this._count; i++ ) {
            const data = this.getDetails(i);
            tap.push((data.pass?'':'not ') + 'ok ' + i
                + (data.name ? ' - '+data.name : ''));
            tap.push(...data.reason.map(s=>'# '+s));
            tap.push(...data.diag.map(s=>'# '+s));
        }
        if (!this.isPassing())
            tap.push('# Failed');
        tap.push('');
        return tap.join('\n');
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
        };
    }

    setNextCheck (reason, descr) {
        // TODO die if done
        const n = ++this._count;
        if (descr)
            this._descr[n] = descr;
        if (!reason) {
            // TODO log something
            return 1;
        }

        this._failed[n] = reason;
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

    getSignature() {
        const sign = ['t'];
        let streak = 0;
        for (let i=1; i <= this._count; i++) {
            if (this._failed[i]) {
                if (streak) sign.push(streak);
                sign.push('N');
                streak = 0;
            } else {
                streak++;
            }
        }
        if (streak) sign.push(streak);
        sign.push('d');
        return sign.join('');
    }
}

refute.addCondition = function(name, options, impl) {
    if (Contract.prototype[name])
        throw new Error('name taken: '+name);
    if (typeof options !== 'object')
        throw new Error('bad options');
    if (typeof impl !== 'function')
        throw new Error('bad implementation');

    if (typeof options.args !== 'number')
        throw new Error('args must be a number');

    const count = options.args;

    Contract.prototype[name] = function(...args) {
        let descr;
        if (args.length > count)
            descr = args.pop();
        if (args.length != count)
            throw new Error('Expected '+count+' arguments in condition '+name+' but got '+args.length);
        const reason = impl.apply( this, args );
        return this.setNextCheck( reason, descr );
    };
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

refute.Contract = Contract;
refute.report   = report;

module.exports = refute;

