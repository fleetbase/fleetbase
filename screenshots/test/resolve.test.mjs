import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { assertFixturesAgree, resolveAll, resolvePublicId } from '../src/resolve.mjs';

const API = { apiHost: 'http://api.test', namespace: 'int/v1', token: 'tok' };
const SPEC = { resource: 'drivers', query: 'Amara Chen', match: { field: 'name', value: 'Amara Chen' } };

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
});

function stubFetch(handler) {
    const calls = [];
    globalThis.fetch = async (url, init) => {
        calls.push(url);
        const body = handler(url);
        return {
            ok: body.ok ?? true,
            status: body.status ?? 200,
            statusText: body.statusText ?? 'OK',
            json: async () => body.json,
        };
    };
    return calls;
}

test('resolves a unique match to its public_id', async () => {
    stubFetch(() => ({ json: { data: [{ name: 'Amara Chen', public_id: 'driver_abc123' }] } }));
    assert.equal(await resolvePublicId(API, SPEC), 'driver_abc123');
});

test('accepts a bare array response as well as { data: [...] }', async () => {
    stubFetch(() => ({ json: [{ name: 'Amara Chen', public_id: 'driver_abc123' }] }));
    assert.equal(await resolvePublicId(API, SPEC), 'driver_abc123');
});

test('falls back to an unfiltered page when ?query= returns nothing', async () => {
    // Not every internal index endpoint honours ?query=. Concluding "no such record" from an
    // empty first response would fail runs for resources that simply ignore the parameter.
    const calls = stubFetch((url) =>
        url.includes('query=')
            ? { json: { data: [] } }
            : { json: { data: [{ name: 'Amara Chen', public_id: 'driver_abc123' }] } }
    );

    assert.equal(await resolvePublicId(API, SPEC), 'driver_abc123');
    assert.equal(calls.length, 2);
    assert.match(calls[1], /limit=200/);
});

test('aborts when no record matches', async () => {
    stubFetch(() => ({ json: { data: [{ name: 'Someone Else', public_id: 'driver_zzz' }] } }));
    await assert.rejects(() => resolvePublicId(API, SPEC), /expected exactly 1 record.*got 0/s);
});

test('aborts when more than one record matches', async () => {
    // The case this exists for: a screenshot of the wrong record survives review, because
    // nothing about it looks broken.
    stubFetch(() => ({
        json: {
            data: [
                { name: 'Amara Chen', public_id: 'driver_a' },
                { name: 'Amara Chen', public_id: 'driver_b' },
            ],
        },
    }));
    await assert.rejects(() => resolvePublicId(API, SPEC), /got 2/);
});

test('aborts when the matched record has no public_id', async () => {
    stubFetch(() => ({ json: { data: [{ name: 'Amara Chen' }] } }));
    await assert.rejects(() => resolvePublicId(API, SPEC), /no public_id/);
});

test('surfaces a transport error with the url', async () => {
    stubFetch(() => ({ ok: false, status: 401, statusText: 'Unauthorized', json: {} }));
    await assert.rejects(() => resolvePublicId(API, SPEC), /401 Unauthorized/);
});

test('resolveAll only touches entries that declare a resolve block', async () => {
    stubFetch(() => ({ json: { data: [{ name: 'Amara Chen', public_id: 'driver_abc123' }] } }));

    const ids = await resolveAll(API, [
        { id: 'drivers-list', url: '/fleet-ops/manage/drivers' },
        { id: 'driver-details', resolve: SPEC, url: ({ publicId }) => `/x/${publicId}` },
    ]);

    assert.deepEqual(ids, { 'driver-details': 'driver_abc123' });
});

test('assertFixturesAgree passes when the seeder and the resolver agree', () => {
    assert.doesNotThrow(() =>
        assertFixturesAgree({ 'driver-details': 'driver_abc' }, { 'driver-details': 'driver_abc' })
    );
});

test('assertFixturesAgree throws when they disagree', () => {
    assert.throws(
        () => assertFixturesAgree({ 'driver-details': 'driver_abc' }, { 'driver-details': 'driver_xyz' }),
        /disagree with SEEDED_FIXTURES/
    );
});

test('assertFixturesAgree is a no-op when the seeder reported nothing', () => {
    // Local runs have no SEEDED_FIXTURES; the cross-check is a CI affordance, not a gate.
    assert.doesNotThrow(() => assertFixturesAgree({ 'driver-details': 'driver_abc' }, undefined));
    assert.doesNotThrow(() => assertFixturesAgree({ 'driver-details': 'driver_abc' }, {}));
});
