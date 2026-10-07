'use strict';

/**
 * Request signing between the Fleetbase API and the socket server.
 *
 *   derivedKey = hex(HMAC_SHA256(key = AUTH_KEY, msg = "fleetbase-socket:<purpose>"))
 *   signature  = hex(HMAC_SHA256(key = derivedKey (the hex string's bytes), msg = timestamp + "." + rawBody))
 *
 * Headers: X-Fleetbase-Timestamp (unix seconds) and X-Fleetbase-Signature. A receiver
 * rejects a request whose timestamp is more than 60 seconds away from its own clock or
 * whose signature does not match (compared in constant time).
 */

const crypto = require('crypto');

const TIMESTAMP_HEADER = 'X-Fleetbase-Timestamp';
const SIGNATURE_HEADER = 'X-Fleetbase-Signature';
const MAX_SKEW_SECONDS = 60;

const PURPOSE_PUBLISH = 'publish';
const PURPOSE_AUTHORIZE = 'authorize';

function deriveKey(authKey, purpose) {
    if (typeof authKey !== 'string' || authKey === '') {
        throw new TypeError('deriveKey requires a non-empty auth key');
    }
    return crypto.createHmac('sha256', authKey).update(`fleetbase-socket:${purpose}`).digest('hex');
}

function toBuffer(rawBody) {
    if (rawBody === undefined || rawBody === null) {
        return Buffer.alloc(0);
    }
    return Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
}

function computeSignature(derivedKey, timestamp, rawBody) {
    return crypto.createHmac('sha256', derivedKey).update(`${timestamp}.`).update(toBuffer(rawBody)).digest('hex');
}

function nowSeconds() {
    return Math.floor(Date.now() / 1000);
}

/**
 * @returns {Record<string, string>} the two signing headers for a request body
 */
function signRequest(derivedKey, rawBody, timestamp = nowSeconds()) {
    const ts = String(timestamp);
    return {
        [TIMESTAMP_HEADER]: ts,
        [SIGNATURE_HEADER]: computeSignature(derivedKey, ts, rawBody),
    };
}

/**
 * Verifies a signed request.
 *
 * @param {string} derivedKey
 * @param {{ timestamp?: string, signature?: string, rawBody?: Buffer|string, now?: number }} input
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
function verifyRequest(derivedKey, { timestamp, signature, rawBody, now = nowSeconds() } = {}) {
    if (typeof timestamp !== 'string' || !/^\d{1,12}$/.test(timestamp)) {
        return { ok: false, reason: 'missing_timestamp' };
    }
    if (Math.abs(now - Number(timestamp)) > MAX_SKEW_SECONDS) {
        return { ok: false, reason: 'stale_timestamp' };
    }
    if (typeof signature !== 'string' || !/^[0-9a-fA-F]{64}$/.test(signature)) {
        return { ok: false, reason: 'missing_signature' };
    }
    const expected = Buffer.from(computeSignature(derivedKey, timestamp, rawBody), 'hex');
    const provided = Buffer.from(signature, 'hex');
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
        return { ok: false, reason: 'bad_signature' };
    }
    return { ok: true };
}

module.exports = {
    TIMESTAMP_HEADER,
    SIGNATURE_HEADER,
    MAX_SKEW_SECONDS,
    PURPOSE_PUBLISH,
    PURPOSE_AUTHORIZE,
    deriveKey,
    computeSignature,
    signRequest,
    verifyRequest,
};
