'use strict';

/**
 * SocketCluster inbound middleware and socket auth-state handling.
 *
 * Modes:
 *   off     - every action is allowed. Tokens are still verified (signature by
 *             SocketCluster, claims here), so a socket is only "authenticated" with a
 *             genuine token, but nothing is denied on the strength of it.
 *   log     - every decision is made and every would-deny is logged as one JSON line,
 *             but the action is allowed.
 *   enforce - would-denies are blocked.
 *
 * The inbound middleware stream is consumed sequentially per socket, and every action is
 * settled (allow or block) exactly once, including when a handler throws.
 */

const { AuthError, AuthTokenInvalidError } = require('sc-errors');
const { validateClaims } = require('./rules');
const { describeError } = require('./logger');

const MAX_CLIENT_TAG_LENGTH = 100;

/**
 * Reads the non-secret `client` query parameter from the handshake URL, e.g.
 * `console/0.3.26`, used to attribute denials to a client app and version.
 */
function clientTag(socket) {
    const url = socket && socket.request && socket.request.url;
    if (typeof url !== 'string') {
        return null;
    }
    let value;
    try {
        value = new URL(url, 'http://localhost').searchParams.get('client');
    } catch (error) {
        return null;
    }
    if (!value) {
        return null;
    }
    // eslint-disable-next-line no-control-regex
    return value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, MAX_CLIENT_TAG_LENGTH) || null;
}

function settle(action, outcome, error) {
    if (action.outcome) {
        return;
    }
    if (outcome === 'allow') {
        action.allow();
    } else {
        action.block(error);
    }
}

function authError(message, reason) {
    const error = new AuthError(message);
    error.reason = reason;
    return error;
}

function claimsOf(token) {
    return token && typeof token === 'object' ? token : null;
}

class SocketAuthPolicy {
    /**
     * @param {object} options
     * @param {{ mode: string, authEnabled: boolean }} options.config
     * @param {import('./authorizer').Authorizer|null} options.authorizer null when auth is disabled
     * @param {object} options.logger
     * @param {import('./stats').Stats} options.stats
     */
    constructor({ config, authorizer, logger, stats }) {
        this.mode = config.mode;
        this.authEnabled = config.authEnabled;
        this.authorizer = authorizer;
        this.logger = logger;
        this.stats = stats;
        this.clientTags = new WeakMap();
        this.identities = new WeakMap();
    }

    clientOf(socket) {
        if (!socket || typeof socket !== 'object') {
            return null;
        }
        if (!this.clientTags.has(socket)) {
            this.clientTags.set(socket, clientTag(socket));
        }
        return this.clientTags.get(socket);
    }

    /**
     * One JSON line per (would-)denial. Never includes the token.
     */
    logDeny({ socket, claims, channel = null, reason, action }) {
        this.stats.increment(this.mode === 'enforce' ? 'denied' : 'would_deny');
        this.logger.info({
            event: 'socket_auth_deny',
            kind: claims ? claims.kind || null : null,
            sub: claims ? claims.sub || null : null,
            cid: claims ? claims.cid || null : null,
            channel,
            reason,
            client: this.clientOf(socket),
            mode: this.mode,
            action,
        });
    }

    /**
     * Returns the inbound middleware function to register with
     * agServer.setMiddleware(agServer.MIDDLEWARE_INBOUND, ...).
     */
    inboundMiddleware() {
        return async (middlewareStream) => {
            for await (const action of middlewareStream) {
                try {
                    await this.handle(action);
                } catch (error) {
                    this.stats.increment('middleware_errors');
                    this.logger.error({ event: 'socket_middleware_error', action: action.type, error: describeError(error) });
                    if (this.mode === 'enforce') {
                        settle(action, 'block', authError('Socket authorization failed', 'internal_error'));
                    } else {
                        settle(action, 'allow');
                    }
                } finally {
                    // Belt and braces: an action must never be left pending, or the socket's
                    // inbound stream stalls. Fail closed in enforce mode.
                    if (!action.outcome) {
                        if (this.mode === 'enforce') {
                            settle(action, 'block', authError('Socket authorization failed', 'internal_error'));
                        } else {
                            settle(action, 'allow');
                        }
                    }
                }
            }
        };
    }

    async handle(action) {
        switch (action.type) {
            case action.AUTHENTICATE:
                return this.handleAuthenticate(action);
            case action.SUBSCRIBE:
                return this.handleSubscribe(action);
            case action.PUBLISH_IN:
                return this.handleClientEmit(action, 'client_publish_disabled', action.channel);
            case action.TRANSMIT:
                return this.handleClientEmit(action, 'client_transmit_disabled', null);
            case action.INVOKE:
                return this.handleClientEmit(action, 'client_invoke_disabled', null);
            default:
                return settle(action, 'allow');
        }
    }

    /**
     * Claim checks run in every mode: a token that fails them is not a Fleetbase socket
     * token, so the socket stays anonymous. That never disconnects anyone.
     */
    handleAuthenticate(action) {
        const claims = claimsOf(action.authToken);
        const reason = validateClaims(claims);
        if (reason === null) {
            return settle(action, 'allow');
        }
        this.stats.increment('tokens_rejected');
        this.logger.info({
            event: 'socket_auth_deny',
            kind: claims ? claims.kind || null : null,
            sub: claims ? claims.sub || null : null,
            cid: claims ? claims.cid || null : null,
            channel: null,
            reason,
            client: this.clientOf(action.socket),
            mode: this.mode,
            action: 'authenticate',
        });
        const error = new AuthTokenInvalidError(`Socket auth token rejected: ${reason}`);
        error.isBadToken = true;
        error.reason = reason;
        return settle(action, 'block', error);
    }

    async handleSubscribe(action) {
        if (this.mode === 'off' || !this.authorizer) {
            this.stats.increment('subscribe_allowed');
            return settle(action, 'allow');
        }

        const socket = action.socket;
        const token = socket.authToken;
        const claims = claimsOf(token);
        const channel = action.channel;

        let decision = await this.authorizer.authorize({
            claims,
            signedToken: claims ? socket.signedAuthToken : null,
            channel,
        });

        // A ping/pong can expire (and deauthenticate) the token while the API call is in
        // flight; never apply a decision made for a token the socket no longer holds.
        if (decision.allow && socket.authToken !== token) {
            decision = { allow: false, reason: 'token_changed', source: 'local' };
        }

        if (decision.allow) {
            this.stats.increment('subscribe_allowed');
            return settle(action, 'allow');
        }

        this.logDeny({ socket, claims, channel: typeof channel === 'string' ? channel : null, reason: decision.reason, action: 'subscribe' });
        if (this.mode === 'enforce') {
            return settle(action, 'block', authError(`Subscription to channel denied: ${decision.reason}`, decision.reason));
        }
        return settle(action, 'allow');
    }

    /**
     * Clients never publish, transmit or invoke in Fleetbase; the API publishes through
     * the signed internal endpoint. (In enforce mode SocketCluster itself refuses client
     * #publish before middleware via allowClientPublish:false; this covers the rest.)
     */
    handleClientEmit(action, reason, channel) {
        if (this.mode === 'off') {
            return settle(action, 'allow');
        }
        const claims = claimsOf(action.socket && action.socket.authToken);
        this.logDeny({
            socket: action.socket,
            claims,
            channel: typeof channel === 'string' ? channel : null,
            reason,
            action: action.type,
        });
        if (this.mode === 'enforce') {
            return settle(action, 'block', authError('Clients cannot emit to the socket server', reason));
        }
        return settle(action, 'allow');
    }

    /**
     * Wires auth-state listeners onto the server:
     * - deauthentication (expiry detected on a packet or pong, a rejected re-auth, or the
     *   client removing its token): kick the socket out of every channel;
     * - authentication as a different principal (sub or cid changed): kick out of every
     *   channel, since those subscriptions were authorized for someone else.
     */
    attach(agServer) {
        (async () => {
            for await (const { socket, authToken } of agServer.listener('authentication')) {
                const claims = claimsOf(authToken);
                const previous = this.identities.get(socket);
                const next = claims ? { sub: claims.sub, cid: claims.cid } : null;
                this.identities.set(socket, next);
                if (previous && next && (previous.sub !== next.sub || previous.cid !== next.cid)) {
                    this.kickOutAll(socket, 'identity_changed', claims);
                }
            }
        })();

        (async () => {
            for await (const { socket, oldAuthToken } of agServer.listener('deauthentication')) {
                this.identities.delete(socket);
                const claims = claimsOf(oldAuthToken);
                const expired = claims && typeof claims.exp === 'number' && claims.exp * 1000 < Date.now();
                this.kickOutAll(socket, expired ? 'token_expired' : 'deauthenticated', claims);
            }
        })();
    }

    kickOutAll(socket, reason, claims) {
        if (this.mode === 'off' || !socket || typeof socket.subscriptions !== 'function') {
            return;
        }
        const channels = socket.subscriptions();
        if (channels.length === 0) {
            return;
        }
        for (const channel of channels) {
            this.logDeny({ socket, claims, channel, reason, action: 'kickOut' });
        }
        if (this.mode !== 'enforce') {
            return;
        }
        this.stats.increment('kick_outs', channels.length);
        Promise.resolve()
            .then(() => socket.kickOut(channels, reason))
            .catch((error) => {
                this.logger.warn({ event: 'socket_kickout_failed', reason, error: describeError(error) });
            });
    }
}

module.exports = { SocketAuthPolicy, clientTag };
