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

const types = {
    bailout: {
        level: 1,
        prefix: '!',
        color: 'red',
    },
    fail: {
        level: 2,
        prefix: '!',
        color: 'red',
    },
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
    plan: {
        level: 4,
        prefix: ' ',
        color: 'gray',
    },
    ok: {
        level: 4,
        prefix: 'o',
        color: 'green',
    },
    note: {
        level: 7,
        prefix: ';',
        color: 'gray',
    },
};

// alias
types.exp = types.expected;
types.got = types.actual;

class DiffLine extends Renderable {
    constructor( text, type ) {
        super();
        if (!types[type])
            throw new Error('Unknown DiffLine type: '+type);

        this._text = text;
        this._type = type;
    }
    toString() {
        return this._text;
    }
    render(context, indent=1) {
        // TODO actually utilize context
        return '    '.repeat(indent-1)+types[ this._type ].prefix + ' ' + this._text + '\n';
    }
}

class DiffTree extends Renderable {
    constructor() {
        super();
        this._log = [];
    }
    append (msg) {
        if (!(typeof msg === 'object' && msg instanceof Renderable))
            throw new Error('DiffTree entry must be a DiffLine or a DiffTree');
        this._log.push(msg);
        return this;
    }
    render(context, indent=0) {
        // TODO trailing '\n'?
        return this._log.map( x=>x.render(context, indent+1) ).join('');
    };
}

const out = { DiffLine, DiffTree };

for( let i in types ) {
    const closed = i;
    out[i] = msg => new DiffLine (msg, closed);
    DiffTree.prototype[i] = function(msg) {
        this.append(new DiffLine (msg, closed));
        return this;
    }
};

out.log = () => new DiffTree();

module.exports = out;
