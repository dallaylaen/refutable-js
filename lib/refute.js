'use strict';

function refute (block) {
    const contract = new Contract();
    block(contract);
    contract.stop();
    if (!contract.isPassing())
        throw new Error(contract.getReport());
}

class Contract {
    constructor() {
        this.currentCheck = 0;
        this.failed = {};
    }

    isPassing() {
        return Object.keys(this.failed).length === 0;
    }

    getReport() {
        return ""; // TODO
    }

    setNextCheck (reason /*, comment */ ) {
        // TODO die if done
        const n = ++this.currentCheck;
        if (!reason) {
            // TODO log something
            return 1;
        }

        this.failed[n] = reason;
        // TODO explanation et al

        return 0;
    }

    getSignature() {
        const sign = ['t'];
        let streak = 0;
        for (let i=1; i <= this.currentCheck; i++) {
            if (this.failed[i]) {
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

    stop() {
        this.isDone = true;
    }
}

refute.addCondition = function(name, options, impl) {
    if (Contract.prototype[name])
        throw new Error('name taken: '+name);
    if (typeof options !== 'object')
        throw new Error('bad options');
    if (typeof impl !== 'function')
        throw new Error('bad implementation');

    Contract.prototype[name] = function(...args) {
        const reason = impl.apply( this, args );
        return this.setNextCheck( reason );
    };
};

refute.addCondition(
    'equals', 
    {args:2}, 
    (a,b) => a === b ? 0 : [ 'Expected: '+a, 'Got     :' + b ] 
);

refute.Contract = Contract;
module.exports = refute;
