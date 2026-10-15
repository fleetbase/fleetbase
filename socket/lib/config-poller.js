'use strict';

/**
 * Polls the API's socket config endpoint (`GET SOCKETCLUSTER_CONFIG_URL`, signed with the
 * authorize key, empty body) and hands every good answer to the RuntimeConfig. Polls run
 * one after another, never overlapping; the first runs as soon as the server starts.
 *
 * A failed poll (unreachable, timeout, non-200, malformed body) never changes the config:
 * the last good one stays in force and the reason is reported on /stats.
 */

const { signRequest } = require('./signing');
const { parseRemoteConfig } = require('./runtime');
const { describeError } = require('./logger');

const DEFAULT_TIMEOUT_MS = 2000;

class ConfigPoller {
    /**
     * @param {object} options
     * @param {string} options.url
     * @param {string} options.authorizeKey key derived for the "authorize" purpose
     * @param {number} options.intervalMs
     * @param {import('./runtime').RuntimeConfig} options.runtime
     * @param {object} options.logger
     * @param {number} [options.timeoutMs]
     * @param {typeof fetch} [options.fetch]
     * @param {import('./stats').Stats} [options.stats]
     */
    constructor({ url, authorizeKey, intervalMs, runtime, logger, timeoutMs = DEFAULT_TIMEOUT_MS, fetch: fetchImpl, stats } = {}) {
        if (!url) {
            throw new TypeError('ConfigPoller requires a url');
        }
        if (!authorizeKey) {
            throw new TypeError('ConfigPoller requires an authorizeKey');
        }
        if (!(intervalMs > 0)) {
            throw new TypeError('ConfigPoller requires a positive intervalMs');
        }
        this.url = url;
        this.authorizeKey = authorizeKey;
        this.intervalMs = intervalMs;
        this.runtime = runtime;
        this.logger = logger;
        this.timeoutMs = timeoutMs;
        this.fetch = fetchImpl || ((input, init) => globalThis.fetch(input, init));
        this.stats = stats || null;
        this.timer = null;
        this.running = false;
        this.current = null;
    }

    count(name) {
        if (this.stats) {
            this.stats.increment(name);
        }
    }

    /**
     * One poll. Never throws.
     *
     * @returns {Promise<{ ok: true, changed: boolean } | { ok: false, reason: string }>}
     */
    async poll() {
        this.count('config_polls');
        const result = await this.request();
        if (!result.ok) {
            this.count('config_poll_errors');
            if (this.runtime.lastSyncError !== result.reason) {
                this.logger.warn({ event: 'socket_config_sync_failed', reason: result.reason, source: this.runtime.source });
            }
            this.runtime.recordFailure(result.reason);
            return result;
        }
        const recovered = this.runtime.lastSyncError !== null;
        const previous = this.runtime.snapshot();
        const changed = this.runtime.applyRemote(result.value);
        if (changed) {
            const next = this.runtime.snapshot();
            this.logger.info({
                event: 'socket_config_applied',
                enabled: next.enabled,
                mode: next.mode,
                origins: next.origins,
                previous_enabled: previous.enabled,
                previous_mode: previous.mode,
                source: next.source,
            });
        } else if (recovered) {
            this.logger.info({ event: 'socket_config_sync_recovered' });
        }
        return { ok: true, changed };
    }

    async request() {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await this.fetch(this.url, {
                method: 'GET',
                headers: { Accept: 'application/json', ...signRequest(this.authorizeKey, '') },
                signal: controller.signal,
            });
            if (!response.ok) {
                await response.text().catch(() => {});
                return { ok: false, reason: `http_${response.status}` };
            }
            let payload;
            try {
                payload = await response.json();
            } catch (error) {
                if (controller.signal.aborted) {
                    throw error;
                }
                return { ok: false, reason: 'bad_response' };
            }
            const parsed = parseRemoteConfig(payload);
            return parsed.ok ? parsed : { ok: false, reason: 'bad_response' };
        } catch (error) {
            if (controller.signal.aborted) {
                return { ok: false, reason: 'timeout' };
            }
            this.logger.debug({ event: 'socket_config_request_error', error: describeError(error) });
            return { ok: false, reason: 'unreachable' };
        } finally {
            clearTimeout(timer);
        }
    }

    start() {
        if (this.running) {
            return;
        }
        this.running = true;
        this.tick();
    }

    tick() {
        this.current = this.poll().finally(() => {
            this.current = null;
            if (this.running) {
                this.timer = setTimeout(() => this.tick(), this.intervalMs);
                if (typeof this.timer.unref === 'function') {
                    this.timer.unref();
                }
            }
        });
        return this.current;
    }

    async stop() {
        this.running = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.current) {
            await this.current;
        }
    }
}

module.exports = { ConfigPoller, DEFAULT_TIMEOUT_MS };
