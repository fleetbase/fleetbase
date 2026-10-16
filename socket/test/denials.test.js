'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Denials, channelPrefix, DEFAULT_TOP } = require('../lib/denials');

test('channelPrefix keeps the channel family and never an id', () => {
    assert.equal(channelPrefix('order.order_abc123'), 'order');
    assert.equal(channelPrefix('Company.x'), 'company');
    assert.equal(channelPrefix('install.company-uuid.ext'), 'install');
    assert.equal(channelPrefix('fleetbase.install'), 'fleetbase');
    assert.equal(channelPrefix('order_abc123'), 'other', 'no dot: the whole name may be an id');
    assert.equal(channelPrefix(`${'a'.repeat(40)}.x`), 'other');
    assert.equal(channelPrefix('9abc.x'), 'other');
    assert.equal(channelPrefix('.x'), 'other');
    assert.equal(channelPrefix(''), null);
    assert.equal(channelPrefix(null), null);
    assert.equal(channelPrefix(42), null);
});

test('denials are aggregated by client, prefix and reason', () => {
    let clock = Date.UTC(2026, 9, 15);
    const denials = new Denials({ now: () => clock });
    denials.record({ client: 'console/1.0', channel: 'order.a', reason: 'not_found' });
    clock += 1000;
    denials.record({ client: 'console/1.0', channel: 'order.b', reason: 'not_found' });
    denials.record({ client: 'console/1.0', channel: 'company.c', reason: 'not_found' });
    denials.record({ client: null, channel: null, reason: 'bad_iss' });
    denials.record({ client: '', channel: 'x.y', reason: 'Not A Reason!' });
    denials.record({ channel: 'x.y', reason: 'no_token' });

    assert.equal(denials.size, 5);
    const [first, ...rest] = denials.top();
    assert.deepEqual(first, { client: 'console/1.0', prefix: 'order', reason: 'not_found', count: 2, last_at: new Date(clock).toISOString() });
    assert.equal(rest.length, 4);
    assert.ok(rest.some((row) => row.client === null && row.prefix === null && row.reason === 'bad_iss'));
    assert.ok(rest.some((row) => row.client === null && row.prefix === 'x' && row.reason === 'other'));
});

test('top() sorts by count, then most recent, and is limited', () => {
    let clock = 0;
    const denials = new Denials({ now: () => ++clock });
    for (let i = 0; i < DEFAULT_TOP + 10; i += 1) {
        denials.record({ client: `c${i}`, channel: 'order.x', reason: 'not_found' });
    }
    denials.record({ client: 'c3', channel: 'order.x', reason: 'not_found' });
    const top = denials.top();
    assert.equal(top.length, DEFAULT_TOP);
    assert.equal(top[0].client, 'c3');
    assert.equal(top[1].client, `c${DEFAULT_TOP + 9}`, 'ties: most recent first');
    assert.equal(denials.top(2).length, 2);
});

test('the number of rows is capped by evicting the least frequent', () => {
    const denials = new Denials({ max: 3 });
    denials.record({ client: 'a', channel: 'order.x', reason: 'r' });
    denials.record({ client: 'a', channel: 'order.x', reason: 'r' });
    denials.record({ client: 'b', channel: 'order.x', reason: 'r' });
    denials.record({ client: 'c', channel: 'order.x', reason: 'r' });
    denials.record({ client: 'c', channel: 'order.x', reason: 'r' });
    denials.record({ client: 'd', channel: 'order.x', reason: 'r' });
    assert.equal(denials.size, 3);
    assert.deepEqual(denials.top().map((row) => row.client).sort(), ['a', 'c', 'd']);
});
