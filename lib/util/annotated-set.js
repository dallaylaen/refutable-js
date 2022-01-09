'use strict';

/* TODO this has nothing to do with refute and should be a separate project */

class AnnotatedSet {
    constructor (all = new Set(), notes = []) {
        this.all   = all;
        this.notes = notes;
    }

    add ( item, note ) {
        if (this.all.has(item))
            return this;
        return new AnnotatedSet(
            new Set(this.all).add(item),
            [...this.notes, [item, note]]
        );
    }

    has ( item ) {
        if (!this.all.has( item ))
            return;
        for (const pair of this.notes) {
            if (pair[0] === item)
                return pair[1];
        }
        throw new Error('wtf, unreachable');
    }
}

module.exports = { AnnotatedSet };
