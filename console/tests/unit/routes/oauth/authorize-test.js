import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import window from 'ember-window-mock';

const REQUEST = '?response_type=code&client_id=c1&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcb&scope=openid&state=s';
const PARAMS = { response_type: 'code', client_id: 'c1', redirect_uri: 'https://app.example.com/cb', scope: 'openid', state: 's' };

module('Unit | Route | oauth/authorize', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const self = this;
        this.calls = [];

        class SessionStub extends Service {
            isAuthenticated = true;
            promiseCurrentUser(transition) {
                self.calls.push(['promiseCurrentUser', transition]);
                return Promise.resolve();
            }
        }
        class OauthAuthorizationStub extends Service {
            paramsFrom(search) {
                const query = new URLSearchParams(search);
                return query.get('client_id') ? Object.fromEntries(query.entries()) : null;
            }
            save(params) {
                self.calls.push(['save', params]);
            }
            clear() {
                self.calls.push(['clear']);
            }
        }

        this.owner.register('service:session', SessionStub);
        this.owner.register('service:oauth-authorization', OauthAuthorizationStub);

        this.visit = (search) => {
            window.location.href = `http://localhost/oauth/authorize${search}`;
        };
    });

    test('an error the API sent instead of a request is shown', async function (assert) {
        this.visit('?error=invalid_client');
        const route = this.owner.lookup('route:oauth/authorize');

        assert.deepEqual(await route.model({}, {}), { error: 'invalid_client' });
        assert.deepEqual(this.calls, [], 'nothing is saved or loaded');
    });

    test('a query without an app is an invalid request', async function (assert) {
        this.visit('?utm_source=mail');
        const route = this.owner.lookup('route:oauth/authorize');

        assert.deepEqual(await route.model({}, {}), { error: 'invalid_request' });
    });

    test('a signed-out user is sent to sign in, with the request kept', async function (assert) {
        this.visit(REQUEST);
        this.owner.lookup('service:session').isAuthenticated = false;
        const router = this.owner.lookup('service:router');
        const transitions = [];
        Object.defineProperty(router, 'transitionTo', {
            configurable: true,
            value: (name) => {
                transitions.push(name);
                return 'redirected';
            },
        });
        const route = this.owner.lookup('route:oauth/authorize');

        assert.strictEqual(await route.model({}, {}), 'redirected');
        assert.deepEqual(transitions, ['auth.login']);
        assert.deepEqual(this.calls, [['save', PARAMS]]);
    });

    test('a signed-in user gets the request, and nothing stays saved', async function (assert) {
        this.visit(REQUEST);
        const route = this.owner.lookup('route:oauth/authorize');
        const transition = { to: 'oauth.authorize' };

        assert.deepEqual(await route.model({}, transition), { params: PARAMS });
        assert.deepEqual(this.calls, [['clear'], ['promiseCurrentUser', transition]]);
    });

    test('setupController shows an error, or loads the request', function (assert) {
        const route = this.owner.lookup('route:oauth/authorize');
        const log = [];
        const controller = {
            showError: (code) => log.push(['showError', code]),
            load: { perform: (params) => log.push(['load', params]) },
        };

        route.setupController(controller, { error: 'invalid_client' });
        route.setupController(controller, { params: PARAMS });
        route.setupController(controller, {});
        route.setupController(controller, null);

        assert.deepEqual(log, [
            ['showError', 'invalid_client'],
            ['load', PARAMS],
        ]);
        assert.strictEqual(controller.model, null, 'the model is still set on the controller');
    });
});
