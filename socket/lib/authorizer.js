'use strict';

/**
 * Channel authorizer: local rules first, then an LRU cache, then the API's authorize
 * endpoint. Every failure to get a clear answer from the API is a deny (fail closed).
 */

const crypto = require('crypto');
const { TtlLruCache } = require('./cache');
const { localDecision } = require('./rules');
const { signRequest } = require('./signing');

const DEFAULT_TIMEOUT_MS = 2000;
const ALLOW_TTL_SECONDS = 300;
const DENY_TTL_SECONDS = 30;
const DEFAULT_CACHE_SIZE = 10000;

function sanitizeReason(value, fallback) {
    return typeof value === 'string' && /^[a-z0-9_]{1,64}$/.test(value) ? value : fallback;
}

function tokenFingerprint(signedToken) {
    return crypto.createHash('sha256').update(signedToken).digest('hex');
}

class Authorizer {
    /**
     * @param {object} options
     * @param {string} options.url the API authorize endpoint
     * @param {string} options.authorizeKey key derived for the "authorize" purpose
     * @param {number} [options.timeoutMs]
     * @param {TtlLruCache} [options.cache]
     * @param {typeof fetch} [options.fetch]
     * @param {() => number} [options.now] milliseconds clock
     * @param {import('./stats').Stats} [options.stats]
     */
    constructor({ url, authorizeKey, timeoutMs = DEFAULT_TIMEOUT_MS, cache, fetch: fetchImpl, now = () => Date.now(), stats } = {}) {
        if (!url) {
            throw new TypeError('Authorizer requires a url');
        }
        if (!authorizeKey) {
            throw new TypeError('Authorizer requires an authorizeKey');
        }
        this.url = url;
        this.authorizeKey = authorizeKey;
        this.timeoutMs = timeoutMs;
        this.now = now;
        this.cache = cache || new TtlLruCache({ max: DEFAULT_CACHE_SIZE, now });
        this.fetch = fetchImpl || ((input, init) => globalThis.fetch(input, init));
        this.stats = stats || null;
        this.inflight = new Map();
    }

    count(name) {
        if (this.stats) {
            this.stats.increment(name);
        }
    }

    nowSeconds() {
        return Math.floor(this.now() / 1000);
    }

    /**
     * Cache key: the token's jti (unique per token) plus the channel. Tokens without a jti
     * fall back to a hash of the signed token so two tokens never share decisions.
     */
    cacheKey(claims, signedToken, channel) {
        if (!claims) {
            return `anon|${channel}`;
        }
        if (typeof claims.jti === 'string' && claims.jti !== '') {
            return `jti:${claims.jti}|${channel}`;
        }
        return `sig:${tokenFingerprint(signedToken || '')}|${channel}`;
    }

    /**
     * @param {{ claims: object|null, signedToken: string|null, channel: string }} input
     * @returns {Promise<{ allow: boolean, reason: string, source: 'local'|'cache'|'remote' }>}
     */
    async authorize({ claims, signedToken, channel }) {
        const local = localDecision(claims || null, channel, this.nowSeconds());
        if (local) {
            return { ...local, source: 'local' };
        }

        const key = this.cacheKey(claims, signedToken, channel);
        const cached = this.cache.get(key);
        if (cached) {
            this.count('authorize_cache_hits');
            return { ...cached, source: 'cache' };
        }

        const pending = this.inflight.get(key);
        if (pending) {
            this.count('authorize_inflight_joins');
            return pending;
        }

        const request = this.requestDecision(claims ? signedToken : null, channel, claims)
            .then((decision) => {
                if (decision.ttlSeconds > 0) {
                    this.cache.set(key, { allow: decision.allow, reason: decision.reason }, decision.ttlSeconds * 1000);
                }
                return { allow: decision.allow, reason: decision.reason, source: 'remote' };
            })
            .finally(() => {
                this.inflight.delete(key);
            });
        this.inflight.set(key, request);
        return request;
    }

    /**
     * Calls the API. Never throws: transport errors, timeouts and malformed responses all
     * come back as an uncached deny.
     */
    async requestDecision(token, channel, claims) {
        this.count('authorize_requests');
        const body = JSON.stringify({ token: token || null, channel });
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await this.fetch(this.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...signRequest(this.authorizeKey, body),
                },
                body,
                signal: controller.signal,
            });

            if (!response.ok) {
                this.count('authorize_errors');
                // Drain the body so the connection can be reused.
                await response.text().catch(() => {});
                return { allow: false, reason: `authorize_http_${response.status}`, ttlSeconds: 0 };
            }

            let payload;
            try {
                payload = await response.json();
            } catch (error) {
                if (controller.signal.aborted) {
                    throw error;
                }
                this.count('authorize_errors');
                return { allow: false, reason: 'authorize_bad_response', ttlSeconds: 0 };
            }

            if (payload === null || typeof payload !== 'object' || typeof payload.allow !== 'boolean') {
                this.count('authorize_errors');
                return { allow: false, reason: 'authorize_bad_response', ttlSeconds: 0 };
            }

            return this.normalizeDecision(payload, claims);
        } catch (error) {
            if (controller.signal.aborted) {
                this.count('authorize_timeouts');
                return { allow: false, reason: 'authorize_timeout', ttlSeconds: 0 };
            }
            this.count('authorize_errors');
            return { allow: false, reason: 'authorize_unreachable', ttlSeconds: 0 };
        } finally {
            clearTimeout(timer);
        }
    }

    /**
     * Applies the cache-lifetime caps: allow at most 300 s and never past the token's exp,
     * deny at most 30 s. A missing or invalid ttl from the API uses the cap.
     */
    normalizeDecision(payload, claims) {
        const cap = payload.allow ? ALLOW_TTL_SECONDS : DENY_TTL_SECONDS;
        let ttl = typeof payload.ttl === 'number' && Number.isFinite(payload.ttl) && payload.ttl >= 0 ? Math.floor(payload.ttl) : cap;
        ttl = Math.min(ttl, cap);
        if (payload.allow && claims && typeof claims.exp === 'number') {
            ttl = Math.min(ttl, Math.max(0, claims.exp - this.nowSeconds()));
        }
        return {
            allow: payload.allow,
            reason: sanitizeReason(payload.reason, payload.allow ? 'allowed' : 'denied'),
            ttlSeconds: ttl,
        };
    }
}

module.exports = {
    Authorizer,
    DEFAULT_TIMEOUT_MS,
    ALLOW_TTL_SECONDS,
    DENY_TTL_SECONDS,
};
