import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

function sessionStub(owner, email = 'ron@fleetbase.io') {
    class SessionStub extends Service {
        store = {
            restore() {
                return Promise.resolve({ email });
            },
        };
    }
    owner.register('service:session', SessionStub);
}

module('Unit | Route | auth/verification', function (hooks) {
    setupTest(hooks);

    test('none of the verification query params refresh the model', function (assert) {
        const route = this.owner.lookup('route:auth/verification');

        assert.deepEqual(Object.keys(route.queryParams), ['token', 'code', 'hello']);
        Object.entries(route.queryParams).forEach(([key, options]) => {
            assert.false(options.refreshModel, `${key} does not refresh the model`);
        });
        assert.true(route.queryParams.token.replace, 'the token is replaced rather than pushed');
    });

    test('beforeModel validates the session token and stays put when valid', async function (assert) {
        sessionStub(this.owner);

        let posted;
        class FetchStub extends Service {
            post(path, payload) {
                posted = { path, payload };
                return Promise.resolve({ valid: true });
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const route = this.owner.lookup('route:auth/verification');
        Object.defineProperty(route.router, 'transitionTo', {
            configurable: true,
            value: () => {
                throw new Error('a valid session should not redirect');
            },
        });

        await route.beforeModel({ to: { queryParams: { token: 'tok' } } });

        assert.deepEqual(posted, {
            path: 'auth/validate-verification-session',
            payload: { email: 'ron@fleetbase.io', token: 'tok' },
        });
    });

    test('beforeModel redirects to login when the session is not valid', async function (assert) {
        sessionStub(this.owner);

        class FetchStub extends Service {
            post() {
                return Promise.resolve({ valid: false });
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const route = this.owner.lookup('route:auth/verification');
        let transitionedTo;
        Object.defineProperty(route.router, 'transitionTo', {
            configurable: true,
            value: (routeName) => (transitionedTo = routeName),
        });

        await route.beforeModel({ to: { queryParams: { token: 'tok' } } });

        assert.strictEqual(transitionedTo, 'auth.login');
    });

    test('setupController exposes the restored email', async function (assert) {
        sessionStub(this.owner, 'someone@fleetbase.io');

        const route = this.owner.lookup('route:auth/verification');
        const controller = {};

        await route.setupController(controller);

        assert.strictEqual(controller.email, 'someone@fleetbase.io');
    });
});
