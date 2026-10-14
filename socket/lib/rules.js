'use strict';

/**
 * Pure rules: token claim validation and the channel decisions the socket server can make
 * from a token's claims alone, without asking the API.
 */

const TOKEN_ISSUER = 'fleetbase-api';
const TOKEN_AUDIENCE = 'fleetbase-socket';
const MAX_TOKEN_LIFETIME_SECONDS = 3600;
const KINDS = Object.freeze(['user', 'api', 'driver', 'customer', 'checkout', 'system', 'tracking']);
const KINDS_WITHOUT_COMPANY = Object.freeze(['system', 'tracking', 'checkout']);
const COMPANY_SCOPED_KINDS = Object.freeze(['user', 'api']);
const INSTALL_CHANNEL = 'fleetbase.install';
const MAX_CHANNEL_LENGTH = 255;

function isNonEmptyString(value) {
    return typeof value === 'string' && value !== '';
}

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Checks the claims of a token whose signature SocketCluster has already verified.
 *
 * @returns {string|null} null when the claims are acceptable, otherwise a short reason
 */
function validateClaims(claims) {
    if (claims === null || typeof claims !== 'object' || Array.isArray(claims)) {
        return 'bad_claims';
    }
    if (claims.iss !== TOKEN_ISSUER) {
        return 'bad_iss';
    }
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(TOKEN_AUDIENCE)) {
        return 'bad_aud';
    }
    if (!isFiniteNumber(claims.exp)) {
        return 'bad_exp';
    }
    if (!isFiniteNumber(claims.iat)) {
        return 'bad_iat';
    }
    if (claims.exp <= claims.iat) {
        return 'bad_exp';
    }
    if (claims.exp - claims.iat > MAX_TOKEN_LIFETIME_SECONDS) {
        return 'lifetime_too_long';
    }
    if (!KINDS.includes(claims.kind)) {
        return 'bad_kind';
    }
    if (!KINDS_WITHOUT_COMPANY.includes(claims.kind) && !isNonEmptyString(claims.cid)) {
        return 'missing_cid';
    }
    return null;
}

/**
 * A channel name must be a non-empty string of at most 255 characters with no whitespace.
 */
function isValidChannel(channel) {
    return typeof channel === 'string' && channel !== '' && channel.length <= MAX_CHANNEL_LENGTH && !/\s/.test(channel);
}

function allow(reason) {
    return { allow: true, reason };
}

function deny(reason) {
    return { allow: false, reason };
}

function ownIds(claims) {
    return Array.isArray(claims.ids) ? claims.ids.filter(isNonEmptyString) : [];
}

/**
 * Decides what can be decided locally.
 *
 * @param {object|null} claims verified token claims, or null for an anonymous socket
 * @param {string} channel
 * @param {number} nowSeconds
 * @returns {{allow: boolean, reason: string}|null} a decision, or null when the API must decide
 */
function localDecision(claims, channel, nowSeconds) {
    if (!isValidChannel(channel)) {
        return deny('invalid_channel');
    }

    if (!claims) {
        // Only the installer channel is open to anonymous sockets, and only while the
        // instance has no users - which only the API knows.
        return channel === INSTALL_CHANNEL ? null : deny('no_token');
    }

    if (!isFiniteNumber(claims.exp) || claims.exp <= nowSeconds) {
        return deny('token_expired');
    }

    if (Array.isArray(claims.scp)) {
        return claims.scp.includes(channel) ? allow('scope') : deny('out_of_scope');
    }

    if (claims.kind === 'system') {
        return allow('system');
    }

    if (COMPANY_SCOPED_KINDS.includes(claims.kind)) {
        if ((isNonEmptyString(claims.cid) && channel === `company.${claims.cid}`) || (isNonEmptyString(claims.cpid) && channel === `company.${claims.cpid}`)) {
            return allow('own_company');
        }
    }

    if (claims.kind === 'api' && isNonEmptyString(claims.sub) && channel === `api.${claims.sub}`) {
        return allow('own_api');
    }

    for (const id of ownIds(claims)) {
        if (channel === `user.${id}` || channel === `driver.${id}`) {
            return allow('own_channel');
        }
    }

    if (claims.kind === 'user' && isNonEmptyString(claims.cid)) {
        for (const prefix of [`install.${claims.cid}.`, `uninstall.${claims.cid}.`]) {
            if (channel.length > prefix.length && channel.startsWith(prefix)) {
                return allow('own_install');
            }
        }
    }

    return null;
}

module.exports = {
    TOKEN_ISSUER,
    TOKEN_AUDIENCE,
    MAX_TOKEN_LIFETIME_SECONDS,
    KINDS,
    INSTALL_CHANNEL,
    MAX_CHANNEL_LENGTH,
    validateClaims,
    isValidChannel,
    localDecision,
};
