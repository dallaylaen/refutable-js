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
        return this._text;
    }
    render(format, indent=1) {
        // TODO actually utilize format
        return '    '.repeat(indent-1)+this._meta.prefix + ' ' + this._text + '\n';
    }
}

const DIFF_CONTENT_TYPES = {
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
        prefix: 'ok',
        color: 'green',
    },
    fail: {
        level: 1,
        prefix: '!fail',
        color: 'red',
    },
    plan: {
        level: 1,
        prefix: 'plan', // TODO better
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
