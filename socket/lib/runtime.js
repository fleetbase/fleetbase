'use strict';

/**
 * The part of the configuration that can change while the server runs: whether socket auth
 * is switched on, the mode, and the allowed origins.
 *
 * The environment gives the starting values. When a key is configured the server polls the
 * API's socket config endpoint (lib/config-poller.js) and every good answer replaces them;
 * when the API cannot be reached the last good answer stays in force. Listeners registered
 * with onChange() apply a change to SocketCluster and the auth policy (see lib/app.js).
 */

const { MODES, envOrigins } = require('./config');

const MAX_ORIGINS_LENGTH = 4096;

/**
 * Validates a config response from the API: `{enabled, mode, origins, updated_at}`.
 * `mode` and `origins` may be null, meaning "use the socket server's environment".
 *
 * @returns {{ ok: true, value: { enabled: boolean, mode: string|null, origins: string|null } } | { ok: false }}
 */
function parseRemoteConfig(payload) {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
        return { ok: false };
    }
    if (typeof payload.enabled !== 'boolean') {
        return { ok: false };
    }
    let mode = null;
    if (payload.mode !== undefined && payload.mode !== null) {
        if (typeof payload.mode !== 'string' || !MODES.includes(payload.mode)) {
            return { ok: false };
        }
        mode = payload.mode;
    }
    let origins = null;
    if (payload.origins !== undefined && payload.origins !== null) {
        // eslint-disable-next-line no-control-regex
        if (typeof payload.origins !== 'string' || payload.origins.length > MAX_ORIGINS_LENGTH || /[\u0000-\u001f\u007f]/.test(payload.origins)) {
            return { ok: false };
        }
        origins = payload.origins.trim() === '' ? null : payload.origins.trim();
    }
    return { ok: true, value: { enabled: payload.enabled, mode, origins } };
}

function sameOrigins(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}

class RuntimeConfig {
    /**
     * @param {ReturnType<import('./config').loadConfig>} config
     * @param {{ now?: () => number }} [options]
     */
    constructor(config, { now = () => Date.now() } = {}) {
        this.now = now;
        this.keyConfigured = config.authKey !== null;
        this.requestedMode = config.requestedMode || null;
        this.envOrigins = envOrigins(config);
        this.state = Object.freeze({ enabled: config.authEnabled, mode: config.mode, origins: this.envOrigins });
        this.source = 'env';
        this.lastSyncAt = null;
        this.lastSyncError = null;
        this.listeners = [];
    }

    get enabled() {
        return this.state.enabled;
    }

    get mode() {
        return this.state.mode;
    }

    get origins() {
        return this.state.origins;
    }

    /**
     * @param {(next: object, previous: object) => void} listener
     */
    onChange(listener) {
        this.listeners.push(listener);
    }

    /**
     * Applies a validated remote config. Auth can only be on when this server has a key;
     * a remote `mode` of null falls back to SOCKETCLUSTER_AUTH_MODE, then `enforce`.
     *
     * @returns {boolean} whether anything changed
     */
    applyRemote(remote) {
        const enabled = this.keyConfigured && remote.enabled === true;
        const mode = enabled ? remote.mode || this.requestedMode || 'enforce' : 'off';
        const origins = remote.origins === null ? this.envOrigins : remote.origins;

        this.source = 'api';
        this.lastSyncAt = this.now();
        this.lastSyncError = null;

        const previous = this.state;
        if (previous.enabled === enabled && previous.mode === mode && sameOrigins(previous.origins, origins)) {
            return false;
        }
        this.state = Object.freeze({ enabled, mode, origins });
        for (const listener of this.listeners) {
            listener(this.state, previous);
        }
        return true;
    }

    /**
     * Records a failed sync. The current values (env or the last good remote config) stay.
     */
    recordFailure(reason) {
        this.lastSyncError = reason;
    }

    snapshot() {
        return {
            enabled: this.state.enabled,
            mode: this.state.mode,
            origins: this.state.origins,
            source: this.source,
            last_sync_at: this.lastSyncAt === null ? null : new Date(this.lastSyncAt).toISOString(),
            last_sync_error: this.lastSyncError,
        };
    }
}

module.exports = { RuntimeConfig, parseRemoteConfig, MAX_ORIGINS_LENGTH };
