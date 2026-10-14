'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateClaims, localDecision, isValidChannel } = require('../lib/rules');

const NOW = 1700000000;

function claims(overrides = {}) {
    return {
        iss: 'fleetbase-api',
        aud: 'fleetbase-socket',
        iat: NOW,
        nbf: NOW,
        exp: NOW + 900,
        jti: 'jti-1',
        kind: 'user',
        sub: 'user-uuid',
        cid: 'company-uuid',
        cpid: 'company_pub',
        env: 'live',
        ids: ['user-uuid', 'user_pub'],
        adm: false,
        ...overrides,
    };
}

test('validateClaims accepts a well-formed token', () => {
    assert.equal(validateClaims(claims()), null);
    assert.equal(validateClaims(claims({ aud: ['other', 'fleetbase-socket'] })), null);
    assert.equal(validateClaims(claims({ exp: NOW + 3600 })), null);
});

test('validateClaims requires issuer, audience, iat/exp and a known kind', () => {
    assert.equal(validateClaims(null), 'bad_claims');
    assert.equal(validateClaims('string'), 'bad_claims');
    assert.equal(validateClaims(claims({ iss: 'someone-else' })), 'bad_iss');
    assert.equal(validateClaims(claims({ aud: 'other' })), 'bad_aud');
    assert.equal(validateClaims(claims({ aud: undefined })), 'bad_aud');
    assert.equal(validateClaims(claims({ exp: undefined })), 'bad_exp');
    assert.equal(validateClaims(claims({ exp: '123' })), 'bad_exp');
    assert.equal(validateClaims(claims({ iat: undefined })), 'bad_iat');
    assert.equal(validateClaims(claims({ exp: NOW })), 'bad_exp');
    assert.equal(validateClaims(claims({ kind: 'admin' })), 'bad_kind');
    assert.equal(validateClaims(claims({ kind: undefined })), 'bad_kind');
});

test('validateClaims caps the token lifetime at one hour', () => {
    assert.equal(validateClaims(claims({ exp: NOW + 3601 })), 'lifetime_too_long');
});

test('validateClaims requires cid except for system, tracking and checkout tokens', () => {
    for (const kind of ['user', 'api', 'driver', 'customer']) {
        assert.equal(validateClaims(claims({ kind, cid: undefined })), 'missing_cid', kind);
        assert.equal(validateClaims(claims({ kind, cid: '' })), 'missing_cid', kind);
    }
    for (const kind of ['system', 'tracking', 'checkout']) {
        assert.equal(validateClaims(claims({ kind, cid: undefined })), null, kind);
    }
});

test('isValidChannel', () => {
    assert.equal(isValidChannel('order.order_abc'), true);
    assert.equal(isValidChannel('x'.repeat(255)), true);
    assert.equal(isValidChannel('x'.repeat(256)), false);
    assert.equal(isValidChannel(''), false);
    assert.equal(isValidChannel('has space'), false);
    assert.equal(isValidChannel('tab\there'), false);
    assert.equal(isValidChannel(undefined), false);
    assert.equal(isValidChannel(42), false);
});

test('anonymous sockets: only fleetbase.install goes to the API, everything else is no_token', () => {
    assert.equal(localDecision(null, 'fleetbase.install', NOW), null);
    assert.deepEqual(localDecision(null, 'company.company-uuid', NOW), { allow: false, reason: 'no_token' });
});

test('invalid channels are denied before anything else', () => {
    assert.deepEqual(localDecision(null, 'a b', NOW), { allow: false, reason: 'invalid_channel' });
    assert.deepEqual(localDecision(claims({ kind: 'system' }), undefined, NOW), { allow: false, reason: 'invalid_channel' });
});

test('an expired token is denied', () => {
    assert.deepEqual(localDecision(claims({ exp: NOW }), 'user.user-uuid', NOW), { allow: false, reason: 'token_expired' });
    assert.deepEqual(localDecision(claims({ exp: NOW - 1 }), 'user.user-uuid', NOW), { allow: false, reason: 'token_expired' });
});

test('scp restricts the token to exactly those channels', () => {
    const scoped = claims({ kind: 'checkout', cid: undefined, scp: ['checkout.checkout_abc'] });
    assert.deepEqual(localDecision(scoped, 'checkout.checkout_abc', NOW), { allow: true, reason: 'scope' });
    assert.deepEqual(localDecision(scoped, 'checkout.checkout_other', NOW), { allow: false, reason: 'out_of_scope' });
    // scp wins even over the self rules.
    assert.deepEqual(localDecision(claims({ scp: [] }), 'user.user-uuid', NOW), { allow: false, reason: 'out_of_scope' });
    assert.deepEqual(localDecision(claims({ kind: 'system', scp: ['a.b'] }), 'c.d', NOW), { allow: false, reason: 'out_of_scope' });
});

test('system tokens may subscribe anywhere', () => {
    assert.deepEqual(localDecision(claims({ kind: 'system', cid: undefined, sub: 'system' }), 'order.anything', NOW), { allow: true, reason: 'system' });
});

test('company-scoped tokens own their company channel by uuid or public id', () => {
    for (const kind of ['user', 'api']) {
        assert.deepEqual(localDecision(claims({ kind }), 'company.company-uuid', NOW), { allow: true, reason: 'own_company' });
        assert.deepEqual(localDecision(claims({ kind }), 'company.company_pub', NOW), { allow: true, reason: 'own_company' });
        assert.equal(localDecision(claims({ kind }), 'company.other', NOW), null);
    }
    // Drivers and customers go through the API for company channels.
    assert.equal(localDecision(claims({ kind: 'driver' }), 'company.company-uuid', NOW), null);
    assert.equal(localDecision(claims({ kind: 'customer' }), 'company.company-uuid', NOW), null);
    // An empty cpid never matches "company.".
    assert.equal(localDecision(claims({ cpid: '' }), 'company.', NOW), null);
});

test('api tokens own api.{sub}', () => {
    assert.deepEqual(localDecision(claims({ kind: 'api', sub: 'cred-uuid' }), 'api.cred-uuid', NOW), { allow: true, reason: 'own_api' });
    assert.equal(localDecision(claims({ kind: 'user', sub: 'cred-uuid' }), 'api.cred-uuid', NOW), null);
});

test('user.{id} and driver.{id} are allowed for ids in the token', () => {
    const driver = claims({ kind: 'driver', sub: 'driver-uuid', ids: ['driver-uuid', 'driver_pub', 'user-uuid'] });
    assert.deepEqual(localDecision(driver, 'driver.driver-uuid', NOW), { allow: true, reason: 'own_channel' });
    assert.deepEqual(localDecision(driver, 'driver.driver_pub', NOW), { allow: true, reason: 'own_channel' });
    assert.deepEqual(localDecision(driver, 'user.user-uuid', NOW), { allow: true, reason: 'own_channel' });
    assert.equal(localDecision(driver, 'driver.someone-else', NOW), null);
    assert.equal(localDecision(claims({ ids: undefined }), 'user.user-uuid', NOW), null);
    assert.equal(localDecision(claims({ ids: ['', null] }), 'user.', NOW), null);
});

test('user tokens own install.{cid}.* and uninstall.{cid}.*', () => {
    assert.deepEqual(localDecision(claims(), 'install.company-uuid.ext-1', NOW), { allow: true, reason: 'own_install' });
    assert.deepEqual(localDecision(claims(), 'uninstall.company-uuid.ext-1', NOW), { allow: true, reason: 'own_install' });
    assert.equal(localDecision(claims(), 'install.company-uuid.', NOW), null);
    assert.equal(localDecision(claims(), 'install.other-company.ext-1', NOW), null);
    assert.equal(localDecision(claims({ kind: 'api' }), 'install.company-uuid.ext-1', NOW), null);
});

test('anything else is left to the API', () => {
    assert.equal(localDecision(claims(), 'order.order_abc', NOW), null);
    assert.equal(localDecision(claims(), 'fleetbase.install', NOW), null);
});
