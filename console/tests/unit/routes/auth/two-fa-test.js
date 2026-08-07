import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

// Backs session.store.restore()/persist() with a plain object so the route's
// two-phase session handling can be driven directly.
function registerSession(owner, restored) {
    const persisted = [];
    class SessionStub extends Service {
        store = {
            restore() {
                return Promise.resolve(restored);
            },
            persist(data) {
                persisted.push(data);
                return Promise.resolve();
            },
        };
    }
    owner.register('service:session', SessionStub);
    return persisted;
}

class NotificationsStub extends Service {
    errors = [];
    error(message) {
        this.errors.push(message);
    }
    serverError(error) {
        this.errors.push(error);
    }
}

module('Unit | Route | auth/two-fa', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:notifications', NotificationsStub);
    });

    test('neither query param refreshes the model and both replace history', function (assert) {
        const route = this.owner.lookup('route:auth/two-fa');

        assert.deepEqual(Object.keys(route.queryParams), ['token', 'clientToken']);
        Object.entries(route.queryParams).forEach(([key, options]) => {
            assert.false(options.refreshModel, `${key} does not refresh the model`);
            assert.true(options.replace, `${key} replaces history`);
        });
    });

    test('beforeModel redirects to login when the session has no identity', async function (assert) {
        registerSession(this.owner, { identity: null });

        const route = this.owner.lookup('route:auth/two-fa');
        let transitionedTo;
        Object.defineProperty(route.router, 'transitionTo', {
            configurable: true,
            value: (routeName) => (transitionedTo = routeName),
        });

        await route.beforeModel({ to: { queryParams: {} } });

        assert.strictEqual(transitionedTo, 'auth.login');
        assert.deepEqual(route.notifications.errors, ['2FA failed to initialize.']);
    });

    test('beforeModel persists the refreshed client token when validation succeeds', async function (assert) {
        const persisted = registerSession(this.owner, { identity: 'ron@fleetbase.io' });

        let posted;
        class FetchStub extends Service {
            post(path, payload) {
                posted = { path, payload };
                return Promise.resolve({ clientToken: 'fresh-client-token', expired: false });
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const route = this.owner.lookup('route:auth/two-fa');
        await route.beforeModel({ to: { queryParams: { token: 'tok', clientToken: 'stale' } } });

        assert.deepEqual(posted, {
            path: 'two-fa/validate',
            payload: { token: 'tok', identity: 'ron@fleetbase.io', clientToken: 'stale' },
        });
        assert.deepEqual(persisted, [{ identity: 'ron@fleetbase.io', token: 'tok', clientToken: 'fresh-client-token' }]);
    });

    test('beforeModel invalidates an expired two-factor session', async function (assert) {
        registerSession(this.owner, { identity: 'ron@fleetbase.io' });

        const posts = [];
        class FetchStub extends Service {
            post(path, payload) {
                posts.push({ path, payload });
                return Promise.resolve(path === 'two-fa/validate' ? { expired: true } : {});
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const route = this.owner.lookup('route:auth/two-fa');
        let transitionedTo;
        Object.defineProperty(route.router, 'transitionTo', {
            configurable: true,
            value: (routeName) => (transitionedTo = routeName),
        });

        await route.beforeModel({ to: { queryParams: { token: 'tok' } } });

        assert.deepEqual(posts.at(-1), { path: 'two-fa/invalidate', payload: { token: 'tok', identity: 'ron@fleetbase.io' } });
        assert.strictEqual(transitionedTo, 'auth.login');
        assert.deepEqual(route.notifications.errors, ['2FA authentication session has expired.']);
    });

    test('beforeModel reports a validation failure and returns to login', async function (assert) {
        registerSession(this.owner, { identity: 'ron@fleetbase.io' });

        class FetchStub extends Service {
            post() {
                return Promise.reject(new Error('boom'));
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const route = this.owner.lookup('route:auth/two-fa');
        let transitionedTo;
        Object.defineProperty(route.router, 'transitionTo', {
            configurable: true,
            value: (routeName) => (transitionedTo = routeName),
        });

        await route.beforeModel({ to: { queryParams: { token: 'tok' } } });

        assert.strictEqual(route.notifications.errors.length, 1, 'the failure is surfaced');
        assert.strictEqual(transitionedTo, 'auth.login');
    });

    test('setupController seeds the controller from the stored session', async function (assert) {
        registerSession(this.owner, { identity: 'ron@fleetbase.io', clientToken: 'client-token' });

        const route = this.owner.lookup('route:auth/two-fa');
        const controller = {
            getExpirationDateFromClientToken(token) {
                return `expires:${token}`;
            },
        };

        // setupController kicks off restore() without awaiting it, so let the
        // continuation run before asserting.
        route.setupController(controller);
        await new Promise((resolve) => setTimeout(resolve, 0));

        assert.strictEqual(controller.identity, 'ron@fleetbase.io');
        assert.strictEqual(controller.clientToken, 'client-token');
        assert.strictEqual(controller.twoFactorSessionExpiresAfter, 'expires:client-token');
        assert.true(controller.countdownReady);
    });
});
