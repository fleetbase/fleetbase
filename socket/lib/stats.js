'use strict';

/**
 * In-process counters, exposed (with live gauges) on the internal GET /stats endpoint.
 */
class Stats {
    constructor(now = () => Date.now()) {
        this.now = now;
        this.startedAt = now();
        this.counters = Object.create(null);
    }

    increment(name, by = 1) {
        this.counters[name] = (this.counters[name] || 0) + by;
    }

    get(name) {
        return this.counters[name] || 0;
    }

    snapshot(gauges = {}) {
        return {
            started_at: new Date(this.startedAt).toISOString(),
            uptime_seconds: Math.floor((this.now() - this.startedAt) / 1000),
            ...gauges,
            counters: { ...this.counters },
        };
    }
}

module.exports = { Stats };
