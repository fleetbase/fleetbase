'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TtlLruCache } = require('../lib/cache');

function clock(start = 1000) {
    const state = { now: start };
    return { now: () => state.now, advance: (ms) => (state.now += ms) };
}

test('stores and returns values until their ttl passes', () => {
    const c = clock();
    const cache = new TtlLruCache({ max: 10, now: c.now });
    cache.set('a', 1, 100);
    assert.equal(cache.get('a'), 1);
    c.advance(99);
    assert.equal(cache.get('a'), 1);
    c.advance(1);
    assert.equal(cache.get('a'), undefined);
    assert.equal(cache.size, 0);
});

test('a non-positive ttl stores nothing and clears an existing entry', () => {
    const cache = new TtlLruCache({ max: 10 });
    cache.set('a', 1, 0);
    assert.equal(cache.get('a'), undefined);
    cache.set('b', 2, 1000);
    cache.set('b', 3, -1);
    assert.equal(cache.get('b'), undefined);
});

test('evicts the least recently used entry when full', () => {
    const cache = new TtlLruCache({ max: 2 });
    cache.set('a', 1, 1000);
    cache.set('b', 2, 1000);
    cache.set('c', 3, 1000);
    assert.equal(cache.get('a'), undefined);
    assert.equal(cache.get('b'), 2);
    assert.equal(cache.get('c'), 3);
});

test('reading an entry makes it most recently used', () => {
    const cache = new TtlLruCache({ max: 2 });
    cache.set('a', 1, 1000);
    cache.set('b', 2, 1000);
    assert.equal(cache.get('a'), 1);
    cache.set('c', 3, 1000);
    assert.equal(cache.get('a'), 1);
    assert.equal(cache.get('b'), undefined);
});

test('delete and clear', () => {
    const cache = new TtlLruCache({ max: 5 });
    cache.set('a', 1, 1000);
    cache.set('b', 2, 1000);
    assert.equal(cache.delete('a'), true);
    assert.equal(cache.get('a'), undefined);
    cache.clear();
    assert.equal(cache.size, 0);
});

test('rejects an invalid max', () => {
    assert.throws(() => new TtlLruCache({ max: 0 }), TypeError);
    assert.throws(() => new TtlLruCache({ max: 1.5 }), TypeError);
});
