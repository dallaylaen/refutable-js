'use strict';

class NotedSet {
    constructor() {
        this.known = new Set();
        this.nodes = [];
        this.depth = 1;
        this.size  = 0;
        this.pairs = [];
    }

    // returns depth so that caller can decide to grow
    add(obj, note) {
        if (note === undefined)
            throw new Error("note must exist");
        if (this.known.has(obj))
            throw new Error("object already present"); // TODO overwrite

        this.known.add(obj);
        this.size++;

        if (this.pairs.length < this.depth * 2 + 10) {
            this.pairs.push( [obj, note] );
            return this.depth;
        };

        if (this.nodes.length < this.depth) {
            const spawn = new NotedSet();
            spawn.add(obj, note);
            this.nodes.push(spawn);
            return this.depth;
        };

        // search for shallowest node
        let mindepth = Infinity;
        let bestnode = undefined;
        for (let node of this.nodes) {
            if (node.depth < mindepth) {
                mindepth = node.depth;
                bestnode = node;
            };
        };

        const newdepth = 1 + bestnode.add( obj, note );
        if (newdepth > this.depth)
            this.depth = newdepth;
        return this.depth;
    }

    get( obj ) {
        if (!this.known.has(obj))
            return;
        for (let pair of this.pairs) {
            if (obj === pair[0])
                return pair[1];
        }
        for (let node of this.nodes) {
            const found = node.get(obj);
            if (found) return found;
        }
        throw new Error("Unreacheable");
    }
};

module.exports = { NotedSet };
