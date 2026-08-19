import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

const CONTEXT_PREFIX = 'onboarding:context:';
const KEYS_INDEX = `${CONTEXT_PREFIX}__keys__`;

class AppCacheStub extends Service {
    store = new Map();
    set(key, value) {
        if (value === undefined) {
            this.store.delete(key);
            return;
        }
        this.store.set(key, value);
    }
    get(key) {
        return this.store.get(key);
    }
}

class QuotaCacheStub extends Service {
    set() {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
    }
    get() {
        return undefined;
    }
}

/**
 * Reports a quota failure the Firefox way — a legacy name that carries no numeric code —
 * so _isQuotaError() has to fall all the way through its name checks.
 */
class LegacyQuotaCacheStub extends Service {
    set() {
        throw new DOMException('storage is full', 'NS_ERROR_DOM_QUOTA_REACHED');
    }
    get() {
        return undefined;
    }
}

/**
 * Fails for a reason that is not about storage limits, which must not be swallowed.
 */
class BrokenCacheStub extends Service {
    set() {
        throw new Error('cache backend unavailable');
    }
    get() {
        return undefined;
    }
}

/**
 * Writes succeed but reads blow up, standing in for a corrupted cache bucket.
 */
class UnreadableCacheStub extends Service {
    store = new Map();
    set(key, value) {
        this.store.set(key, value);
    }
    get() {
        throw new Error('cache read failed');
    }
}

class NotificationsStub extends Service {
    warnings = [];
    warning(message, options) {
        this.warnings.push([message, options]);
    }
}

module('Unit | Service | onboarding-context', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:app-cache', AppCacheStub);
        this.owner.register('service:notifications', NotificationsStub);
    });

    test('set stores a value in memory and get reads it back', function (assert) {
        const service = this.owner.lookup('service:onboarding-context');
        service.set('name', 'Ron');
        assert.strictEqual(service.get('name'), 'Ron');
    });

    test('set and merge strip sensitive fields', function (assert) {
        const service = this.owner.lookup('service:onboarding-context');
        service.set('password', 'secret');
        assert.strictEqual(service.get('password'), undefined, 'password not stored');

        service.merge({ email: 'a@b.co', password_confirmation: 'secret' });
        assert.strictEqual(service.get('email'), 'a@b.co');
        assert.strictEqual(service.get('password_confirmation'), undefined);
    });

    test('persist writes through to the cache', function (assert) {
        const service = this.owner.lookup('service:onboarding-context');
        service.persist('org', 'Fleetbase');
        assert.strictEqual(service.getFromCache('org'), 'Fleetbase');
    });

    test('del removes a value and reset clears everything', function (assert) {
        const service = this.owner.lookup('service:onboarding-context');
        service.set('a', 1, { persist: true });
        service.del('a');
        assert.strictEqual(service.get('a'), undefined);

        service.set('b', 2, { persist: true });
        service.reset();
        assert.strictEqual(service.get('b'), undefined);
        assert.deepEqual(service.data, {});
    });

    test('falls back to in-memory storage on a quota error', function (assert) {
        this.owner.register('service:app-cache', QuotaCacheStub);
        const service = this.owner.lookup('service:onboarding-context');

        service.set('big', 'x', { persist: true });

        const status = service.getStorageStatus();
        assert.true(status.quotaExceeded, 'quota flagged');
        assert.true(status.usingMemoryFallback, 'using memory fallback');
        assert.strictEqual(service.get('big'), 'x', 'value still readable from memory');
    });

    test('it reports clean storage status before anything is written', function (assert) {
        const service = this.owner.lookup('service:onboarding-context');

        // Reads the tracked defaults before any write flips them.
        assert.deepEqual(service.getStorageStatus(), {
            quotaExceeded: false,
            usingMemoryFallback: false,
            memoryItemCount: 0,
        });
    });

    test('it warns the user once when it starts falling back to memory', function (assert) {
        this.owner.register('service:app-cache', QuotaCacheStub);
        const service = this.owner.lookup('service:onboarding-context');
        const notifications = this.owner.lookup('service:notifications');

        service.set('a', 1, { persist: true });
        service.set('b', 2, { persist: true });

        assert.strictEqual(notifications.warnings.length, 1, 'the storage warning is not repeated per key');

        const [message, options] = notifications.warnings[0];
        assert.ok(message.includes('browser storage is full'));
        assert.deepEqual(options, { timeout: 10000, clearDuration: 300 });
        assert.strictEqual(service.getStorageStatus().memoryItemCount, 3, 'both values plus the key index live in memory');
    });

    test('it recognises a quota error reported only by its legacy name', function (assert) {
        this.owner.register('service:app-cache', LegacyQuotaCacheStub);
        const service = this.owner.lookup('service:onboarding-context');

        service.set('a', 1, { persist: true });

        assert.true(service.getStorageStatus().quotaExceeded, 'NS_ERROR_DOM_QUOTA_REACHED counts as a quota error');
        assert.strictEqual(service.getFromCache('a'), 1, 'and the value is served from the memory fallback');
    });

    test('it falls back to memory even when there is no notifications service to warn through', function (assert) {
        this.owner.register('service:app-cache', QuotaCacheStub);
        const service = this.owner.lookup('service:onboarding-context');

        Object.defineProperty(service, 'notifications', { configurable: true, value: null });

        service.set('a', 1, { persist: true });

        assert.true(service.getStorageStatus().quotaExceeded, 'the fallback still engages');
        assert.strictEqual(service.getFromCache('a'), 1, 'and the value survives in memory');
    });

    test('a cache failure that is not about quota is not swallowed', function (assert) {
        this.owner.register('service:app-cache', BrokenCacheStub);
        const service = this.owner.lookup('service:onboarding-context');

        assert.throws(() => service.set('a', 1, { persist: true }), /cache backend unavailable/, 'a genuine backend failure propagates');
        assert.false(service.getStorageStatus().quotaExceeded, 'and is not mistaken for a quota problem');
    });

    test('an unreadable cache degrades to undefined rather than throwing', function (assert) {
        this.owner.register('service:app-cache', UnreadableCacheStub);
        const service = this.owner.lookup('service:onboarding-context');

        service.set('a', 1, { persist: true });

        assert.strictEqual(service.getFromCache('a'), undefined, 'the read error is contained');
        assert.strictEqual(service.get('a'), 1, 'the in-memory value is still served');
    });

    test('restore returns an empty object when nothing was ever persisted', function (assert) {
        const service = this.owner.lookup('service:onboarding-context');

        assert.deepEqual(service.restore(), {}, 'a missing key index is treated as no keys');
    });

    test('restore reads every persisted key back and skips ones that went missing', function (assert) {
        const service = this.owner.lookup('service:onboarding-context');
        service.merge({ email: 'a@b.co', org: 'Fleetbase' }, { persist: true });

        // Add a key to the index whose value was never written, as an evicted entry would look.
        const cache = this.owner.lookup('service:app-cache');
        cache.set(KEYS_INDEX, [...cache.get(KEYS_INDEX), 'ghost']);

        assert.deepEqual(service.restore(), { email: 'a@b.co', org: 'Fleetbase' }, 'the ghost key is skipped rather than stored as undefined');
    });

    test('merge persists every non-sensitive key it merged', function (assert) {
        const service = this.owner.lookup('service:onboarding-context');

        service.merge({ email: 'a@b.co', org: 'Fleetbase', password: 'secret' }, { persist: true });

        assert.strictEqual(service.getFromCache('email'), 'a@b.co');
        assert.strictEqual(service.getFromCache('org'), 'Fleetbase');
        assert.strictEqual(service.getFromCache('password'), undefined, 'sensitive fields are never persisted');
        assert.deepEqual(this.owner.lookup('service:app-cache').get(KEYS_INDEX).sort(), ['email', 'org'], 'the key index tracks exactly what was written');
    });

    test('merge ignores anything that is not an object', function (assert) {
        const service = this.owner.lookup('service:onboarding-context');
        service.set('keep', 'me');

        service.merge();
        service.merge(null);
        service.merge('not-an-object');

        assert.deepEqual(service.data, { keep: 'me' }, 'existing context is left untouched');
    });

    test('del copes with a missing key index', function (assert) {
        const service = this.owner.lookup('service:onboarding-context');
        service.set('a', 1);

        service.del('a');

        assert.strictEqual(service.get('a'), undefined, 'del works without a persisted key index');
    });

    test('reset copes with a missing key index', function (assert) {
        // Deliberately a separate test from the del() case: del() writes an empty key index
        // on its way out, which would stop reset() from ever taking its own missing-index path.
        const service = this.owner.lookup('service:onboarding-context');
        service.set('a', 1);

        service.reset();

        assert.deepEqual(service.data, {}, 'reset works without a persisted key index');
        assert.strictEqual(service.get('a'), undefined);
    });
});
