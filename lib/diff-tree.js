'use strict';

// TODO this has nothing to do with refute and should be a separate package

/*
 *  These classes describe a tree-like structure consisting of (indented)
 *  strings representing actual and expected values and their context.
 *  A cross between TAP and diff(1) output.
 */

/*
 *  Base class for DiffLine & DiffTree
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

const DIFF_TYPES = {
    actual: {
        level: 3,
        prefix: '-',
        color: 'red',
    },
    expected: {
        level: 3,
        prefix: '+',
        color: 'green',
    },
    location: {
        level: 3,
        prefix: '+',
        color: 'gray',
    },
    context: {
        level: 3,
        prefix: '@',
        color: 'gray',
    },
    note: {
        level: 7,
        prefix: ';',
        color: 'gray',
    },
};

class DiffLine extends Renderable {
    constructor( text, type ) {
        super();
        if (!DIFF_TYPES[type])
            throw new Error('Unknown DiffLine type: '+type);

        this._text = text;
        this._type = type;
    }
    toString() {
        return this._text;
    }
    render(format, indent=1) {
        // TODO actually utilize format
        return '    '.repeat(indent-1)+DIFF_TYPES[ this._type ].prefix + ' ' + this._text + '\n';
    }
}

const out = { Renderable, DiffLine, DiffTree };

for( let i in DIFF_TYPES ) {
    const closed = i;
    out[i] = msg => new DiffLine (msg, closed);
    DiffTree.prototype[i] = function(msg) {
        this.append(new DiffLine (msg, closed));
        return this;
    }
};

out.log = () => new DiffTree();

module.exports = out;
