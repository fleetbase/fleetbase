'use strict';

/**
 * Aggregated (would-)denials since the server started, reported on /stats so an admin can
 * see which clients would lose which kinds of channels before switching to `enforce`.
 *
 * Each row is keyed by client tag, channel prefix and reason. Rows never hold a token, a
 * subject or company id, or a full channel name: the prefix is the channel up to its first
 * '.', and only when that looks like a channel family (`order`, `company`, ...); anything
 * else is reported as `other`. The number of distinct rows is capped, because the client
 * tag and the channel come from the client.
 */

const DEFAULT_MAX_ENTRIES = 1000;
const DEFAULT_TOP = 50;
const PREFIX_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/i;
const REASON_PATTERN = /^[a-z0-9_]{1,64}$/;

function channelPrefix(channel) {
    if (typeof channel !== 'string' || channel === '') {
        return null;
    }
    const dot = channel.indexOf('.');
    if (dot === -1) {
        return 'other';
    }
    const prefix = channel.slice(0, dot);
    return PREFIX_PATTERN.test(prefix) ? prefix.toLowerCase() : 'other';
}

class Denials {
    constructor({ max = DEFAULT_MAX_ENTRIES, now = () => Date.now() } = {}) {
        this.max = max;
        this.now = now;
        this.rows = new Map();
    }

    get size() {
        return this.rows.size;
    }

    /**
     * @param {{ client: string|null, channel: string|null, reason: string }} denial
     */
    record({ client = null, channel = null, reason }) {
        const row = {
            client: typeof client === 'string' && client !== '' ? client : null,
            prefix: channelPrefix(channel),
            reason: typeof reason === 'string' && REASON_PATTERN.test(reason) ? reason : 'other',
        };
        const key = JSON.stringify([row.client, row.prefix, row.reason]);
        const existing = this.rows.get(key);
        if (existing) {
            existing.count += 1;
            existing.lastAt = this.now();
            return;
        }
        if (this.rows.size >= this.max) {
            this.evict();
        }
        this.rows.set(key, { ...row, count: 1, lastAt: this.now() });
    }

    /** Drops the row with the lowest count (the oldest among equals). */
    evict() {
        let victim = null;
        let lowest = Infinity;
        for (const [key, row] of this.rows) {
            if (row.count < lowest) {
                lowest = row.count;
                victim = key;
            }
        }
        this.rows.delete(victim);
    }

    /**
     * @returns {{ client: string|null, prefix: string|null, reason: string, count: number, last_at: string }[]}
     */
    top(limit = DEFAULT_TOP) {
        return [...this.rows.values()]
            .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
            .slice(0, limit)
            .map((row) => ({
                client: row.client,
                prefix: row.prefix,
                reason: row.reason,
                count: row.count,
                last_at: new Date(row.lastAt).toISOString(),
            }));
    }
}

module.exports = { Denials, channelPrefix, DEFAULT_MAX_ENTRIES, DEFAULT_TOP };
