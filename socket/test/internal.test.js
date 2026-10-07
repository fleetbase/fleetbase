'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePublishBody } = require('../lib/internal');
const { clientTag } = require('../lib/middleware');

const parse = (value) => parsePublishBody(Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)));

test('parsePublishBody accepts channels[] or a single channel', () => {
    assert.deepEqual(parse({ channels: ['order.a', 'company.b'], data: { x: 1 } }), { ok: true, channels: ['order.a', 'company.b'], data: { x: 1 } });
    assert.deepEqual(parse({ channel: 'order.a', data: [1] }), { ok: true, channels: ['order.a'], data: [1] });
});

test('parsePublishBody de-duplicates channels and defaults data to null', () => {
    assert.deepEqual(parse({ channels: ['a.b', 'a.b', 'c.d'] }), { ok: true, channels: ['a.b', 'c.d'], data: null });
});

test('parsePublishBody rejects malformed bodies', () => {
    assert.deepEqual(parse('{nope'), { ok: false, error: 'invalid_json' });
    assert.deepEqual(parse('[]'), { ok: false, error: 'invalid_body' });
    assert.deepEqual(parse('null'), { ok: false, error: 'invalid_body' });
    assert.deepEqual(parse({ data: {} }), { ok: false, error: 'missing_channels' });
    assert.deepEqual(parse({ channels: [] }), { ok: false, error: 'missing_channels' });
    assert.deepEqual(parse({ channels: 'order.a' }), { ok: false, error: 'invalid_channels' });
    assert.deepEqual(parse({ channels: ['ok.one', ''] }), { ok: false, error: 'invalid_channel' });
    assert.deepEqual(parse({ channels: ['has space'] }), { ok: false, error: 'invalid_channel' });
    assert.deepEqual(parse({ channels: ['x'.repeat(256)] }), { ok: false, error: 'invalid_channel' });
    assert.deepEqual(parse({ channels: [42] }), { ok: false, error: 'invalid_channel' });
    assert.deepEqual(parse({ channel: null }), { ok: false, error: 'invalid_channel' });
});

test('clientTag reads the client query parameter from the handshake URL', () => {
    assert.equal(clientTag({ request: { url: '/socketcluster/?client=console%2F0.3.26' } }), 'console/0.3.26');
    assert.equal(clientTag({ request: { url: '/socketcluster/' } }), null);
    assert.equal(clientTag({ request: {} }), null);
    assert.equal(clientTag(null), null);
    assert.equal(clientTag({ request: { url: `/socketcluster/?client=${'a'.repeat(500)}` } }).length, 100);
    assert.equal(clientTag({ request: { url: '/socketcluster/?client=bad%0Avalue' } }), 'badvalue');
});
