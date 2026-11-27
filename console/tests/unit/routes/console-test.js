import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Route | console', function (hooks) {
    setupTest(hooks);

    test('beforeModel requires authentication then resolves the current user', async function (assert) {
        const calls = [];

        class SessionStub extends Service {
            isAuthenticated = true;
            requireAuthentication(transition, routeName) {
                calls.push(['requireAuthentication', routeName]);
            }
            promiseCurrentUser() {
                calls.push(['promiseCurrentUser']);
                return 'current-user';
            }
        }
        this.owner.register('service:session', SessionStub);

        const route = this.owner.lookup('route:console');
        const executed = [];
        route.hookService.execute = (name) => executed.push(name);

        const result = await route.beforeModel({});

        assert.deepEqual(calls, [['requireAuthentication', 'auth.login'], ['promiseCurrentUser']]);
        assert.strictEqual(result, 'current-user');
        assert.deepEqual(executed, ['console:before-model'], 'the before-model hook fires');
    });

    test('beforeModel skips loading the user when the session is unauthenticated', async function (assert) {
        class SessionStub extends Service {
            isAuthenticated = false;
            requireAuthentication() {}
            promiseCurrentUser() {
                throw new Error('should not load a user without a session');
            }
        }
        this.owner.register('service:session', SessionStub);

        const route = this.owner.lookup('route:console');
        route.hookService.execute = () => {};

        assert.strictEqual(await route.beforeModel({}), undefined);
    });

    test('beforeModel applies a ?layout= override before authenticating', async function (assert) {
        const order = [];
        class SessionStub extends Service {
            isAuthenticated = false;
            requireAuthentication() {
                order.push('requireAuthentication');
            }
        }
        this.owner.register('service:session', SessionStub);

        const route = this.owner.lookup('route:console');
        route.hookService.execute = () => {};
        route.consoleLayout.applyOverride = (value) => order.push(['applyOverride', value]);

        await route.beforeModel({ to: { queryParams: { layout: 'classic' } } });
        await route.beforeModel({});

        assert.deepEqual(order, [['applyOverride', 'classic'], 'requireAuthentication', ['applyOverride', null], 'requireAuthentication']);
    });

    test('afterModel and didTransition fire their universe hooks', async function (assert) {
        const route = this.owner.lookup('route:console');
        const executed = [];
        route.hookService.execute = (name) => executed.push(name);

        await route.afterModel({}, {});
        route.didTransition();

        assert.deepEqual(executed, ['console:after-model', 'console:did-transition']);
    });

    test('model loads the brand record', async function (assert) {
        const route = this.owner.lookup('route:console');
        route.store.findRecord = (type, id) => Promise.resolve(`${type}:${id}`);

        assert.strictEqual(await route.model(), 'brand:1');
    });

    test('afterModel goes back to a waiting OAuth request unless a hook redirected', async function (assert) {
        const route = this.owner.lookup('route:console');
        route.hookService.execute = () => {};
        let resumed = 0;
        route.oauthAuthorization.resume = () => resumed++;

        await route.afterModel({}, { isAborted: true });
        assert.strictEqual(resumed, 0, 'a hook already sent the user elsewhere');

        await route.afterModel({}, { isAborted: false });
        assert.strictEqual(resumed, 1);
    });
});
