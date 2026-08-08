import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

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
});
