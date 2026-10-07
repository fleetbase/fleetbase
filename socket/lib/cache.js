'use strict';

/**
 * A small LRU cache with per-entry time-to-live.
 *
 * A Map keeps insertion order, so re-inserting on read moves an entry to the "most
 * recent" end and the first key is always the least recently used one.
 */
class TtlLruCache {
    /**
     * @param {{ max?: number, now?: () => number }} options
     */
    constructor({ max = 10000, now = () => Date.now() } = {}) {
        if (!Number.isInteger(max) || max < 1) {
            throw new TypeError('TtlLruCache max must be a positive integer');
        }
        this.max = max;
        this.now = now;
        this.entries = new Map();
    }

    get size() {
        return this.entries.size;
    }

    get(key) {
        const entry = this.entries.get(key);
        if (entry === undefined) {
            return undefined;
        }
        if (entry.expiresAt <= this.now()) {
            this.entries.delete(key);
            return undefined;
        }
        this.entries.delete(key);
        this.entries.set(key, entry);
        return entry.value;
    }

    /**
     * Stores a value for ttlMs milliseconds. A non-positive ttl stores nothing (and drops
     * any previous value for the key).
     */
    set(key, value, ttlMs) {
        this.entries.delete(key);
        if (!(ttlMs > 0)) {
            return;
        }
        this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
        while (this.entries.size > this.max) {
            this.entries.delete(this.entries.keys().next().value);
        }
    }

    delete(key) {
        return this.entries.delete(key);
    }

    clear() {
        this.entries.clear();
    }
}

module.exports = { TtlLruCache };
