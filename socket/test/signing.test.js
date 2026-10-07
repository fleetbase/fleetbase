'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
    deriveKey,
    computeSignature,
    signRequest,
    verifyRequest,
    TIMESTAMP_HEADER,
    SIGNATURE_HEADER,
    PURPOSE_PUBLISH,
    PURPOSE_AUTHORIZE,
} = require('../lib/signing');

const AUTH_KEY = 'unit-test-key-0123456789abcdefghijklmnopqrstuv';

test('deriveKey is hex(HMAC_SHA256(authKey, "fleetbase-socket:<purpose>"))', () => {
    const expected = crypto.createHmac('sha256', AUTH_KEY).update('fleetbase-socket:publish').digest('hex');
    assert.equal(deriveKey(AUTH_KEY, PURPOSE_PUBLISH), expected);
    assert.match(expected, /^[0-9a-f]{64}$/);
});

test('publish and authorize keys differ', () => {
    assert.notEqual(deriveKey(AUTH_KEY, PURPOSE_PUBLISH), deriveKey(AUTH_KEY, PURPOSE_AUTHORIZE));
});

test('deriveKey refuses an empty key', () => {
    assert.throws(() => deriveKey('', PURPOSE_PUBLISH), TypeError);
    assert.throws(() => deriveKey(undefined, PURPOSE_PUBLISH), TypeError);
});

test('the signature keys HMAC with the derived hex string bytes over "timestamp.body"', () => {
    const derived = deriveKey(AUTH_KEY, PURPOSE_PUBLISH);
    const body = '{"channels":["order.x"],"data":{"a":1}}';
    // Same as PHP: hash_hmac('sha256', $ts . '.' . $body, $derivedHex)
    const expected = crypto.createHmac('sha256', Buffer.from(derived, 'utf8')).update(`1700000000.${body}`).digest('hex');
    assert.equal(computeSignature(derived, '1700000000', body), expected);
    assert.equal(computeSignature(derived, '1700000000', Buffer.from(body)), expected);
});

test('signRequest produces both headers and verifyRequest accepts them', () => {
    const derived = deriveKey(AUTH_KEY, PURPOSE_PUBLISH);
    const headers = signRequest(derived, 'hello', 1700000000);
    assert.equal(headers[TIMESTAMP_HEADER], '1700000000');
    assert.match(headers[SIGNATURE_HEADER], /^[0-9a-f]{64}$/);
    assert.deepEqual(
        verifyRequest(derived, { timestamp: headers[TIMESTAMP_HEADER], signature: headers[SIGNATURE_HEADER], rawBody: 'hello', now: 1700000000 }),
        { ok: true }
    );
});

test('an uppercase hex signature is accepted', () => {
    const derived = deriveKey(AUTH_KEY, PURPOSE_PUBLISH);
    const headers = signRequest(derived, 'x', 1700000000);
    const verdict = verifyRequest(derived, { timestamp: '1700000000', signature: headers[SIGNATURE_HEADER].toUpperCase(), rawBody: 'x', now: 1700000000 });
    assert.equal(verdict.ok, true);
});

test('an empty body signs over "timestamp."', () => {
    const derived = deriveKey(AUTH_KEY, PURPOSE_PUBLISH);
    const headers = signRequest(derived, '', 1700000000);
    assert.equal(headers[SIGNATURE_HEADER], crypto.createHmac('sha256', derived).update('1700000000.').digest('hex'));
    assert.equal(verifyRequest(derived, { timestamp: '1700000000', signature: headers[SIGNATURE_HEADER], rawBody: undefined, now: 1700000000 }).ok, true);
});

test('verifyRequest rejects a tampered body', () => {
    const derived = deriveKey(AUTH_KEY, PURPOSE_PUBLISH);
    const headers = signRequest(derived, 'original', 1700000000);
    assert.deepEqual(verifyRequest(derived, { timestamp: '1700000000', signature: headers[SIGNATURE_HEADER], rawBody: 'tampered', now: 1700000000 }), {
        ok: false,
        reason: 'bad_signature',
    });
});

test('verifyRequest rejects a signature made with another key', () => {
    const derived = deriveKey(AUTH_KEY, PURPOSE_PUBLISH);
    const other = deriveKey(AUTH_KEY, PURPOSE_AUTHORIZE);
    const headers = signRequest(other, 'body', 1700000000);
    assert.equal(verifyRequest(derived, { timestamp: '1700000000', signature: headers[SIGNATURE_HEADER], rawBody: 'body', now: 1700000000 }).reason, 'bad_signature');
});

test('verifyRequest allows 60 seconds of clock skew and no more', () => {
    const derived = deriveKey(AUTH_KEY, PURPOSE_PUBLISH);
    const headers = signRequest(derived, 'b', 1700000000);
    const check = (now) => verifyRequest(derived, { timestamp: '1700000000', signature: headers[SIGNATURE_HEADER], rawBody: 'b', now });
    assert.equal(check(1700000060).ok, true);
    assert.equal(check(1699999940).ok, true);
    assert.deepEqual(check(1700000061), { ok: false, reason: 'stale_timestamp' });
    assert.deepEqual(check(1699999939), { ok: false, reason: 'stale_timestamp' });
});

test('verifyRequest rejects missing or malformed headers', () => {
    const derived = deriveKey(AUTH_KEY, PURPOSE_PUBLISH);
    assert.equal(verifyRequest(derived, { signature: 'a'.repeat(64), rawBody: '', now: 1 }).reason, 'missing_timestamp');
    assert.equal(verifyRequest(derived, { timestamp: '12abc', signature: 'a'.repeat(64), rawBody: '', now: 1 }).reason, 'missing_timestamp');
    assert.equal(verifyRequest(derived, { timestamp: '1', rawBody: '', now: 1 }).reason, 'missing_signature');
    assert.equal(verifyRequest(derived, { timestamp: '1', signature: 'zz', rawBody: '', now: 1 }).reason, 'missing_signature');
    assert.equal(verifyRequest(derived, { timestamp: '1', signature: 'g'.repeat(64), rawBody: '', now: 1 }).reason, 'missing_signature');
    assert.equal(verifyRequest(derived).ok, false);
});
