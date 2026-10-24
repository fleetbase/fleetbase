import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Controller | oauth/authorize', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const self = this;
        this.requests = [];
        this.left = [];
        this.responses = {};

        class FetchStub extends Service {
            get(path, query) {
                self.requests.push(['get', path, query]);
                return self.responses.get();
            }
            post(path, body) {
                self.requests.push(['post', path, body]);
                return self.responses.post();
            }
            delete(path, body) {
                self.requests.push(['delete', path, body]);
                return self.responses.delete();
            }
        }

        class OauthAuthorizationStub extends Service {
            saved = null;
            save(params) {
                this.saved = params;
            }
            clear() {}
            leaveTo(url) {
                self.left.push(url);
            }
        }

        class SessionStub extends Service {
            invalidated = false;
            invalidateWithLoader() {
                this.invalidated = true;
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:oauth-authorization', OauthAuthorizationStub);
        this.owner.register('service:session', SessionStub);
    });

    const PARAMS = { client_id: 'c1', redirect_uri: 'https://app.example.com/cb', scope: 'openid organization:read', response_type: 'code' };
    const DETAILS = {
        client: { id: 'c1', name: 'AppHelm', official: true },
        user: { name: 'Olive', email: 'olive@example.com' },
        scopes: [
            { scope: 'openid', description: 'Sign you in with your Fleetbase account', organization: false },
            { scope: 'organization:read', description: "See {organization}'s name, logo, currency and country", organization: true },
        ],
        requires_organization: true,
        organizations: [
            { id: 'org_a', name: 'Acme', can_share: true },
            { id: 'org_b', name: 'Bravo', can_share: false },
        ],
        selected_organization: 'org_a',
        skip_consent: false,
    };

    test('it names the organization picked in each scope line, and only allows one the user administers', async function (assert) {
        const controller = this.owner.lookup('controller:oauth/authorize');
        this.responses.get = () => Promise.resolve(DETAILS);

        await controller.load.perform(PARAMS);

        assert.deepEqual(
            controller.scopeLines.map((line) => line.text),
            ['Sign you in with your Fleetbase account', "See Acme's name, logo, currency and country"]
        );
        assert.true(controller.canApprove);

        controller.selectOrganization('org_b');
        assert.false(controller.canApprove, 'an organization the user does not administer cannot be shared');
    });

    test('allowing sends the chosen organization and leaves for the app', async function (assert) {
        const controller = this.owner.lookup('controller:oauth/authorize');
        this.responses.get = () => Promise.resolve(DETAILS);
        this.responses.post = () => Promise.resolve({ redirect: 'https://app.example.com/cb?code=abc&state=s' });

        await controller.load.perform(PARAMS);
        await controller.approve.perform();

        assert.deepEqual(this.requests[1], ['post', 'oauth-server/authorization', { ...PARAMS, organization: 'org_a' }]);
        assert.deepEqual(this.left, ['https://app.example.com/cb?code=abc&state=s']);
    });

    test('cancelling sends the user back to the app with access_denied', async function (assert) {
        const controller = this.owner.lookup('controller:oauth/authorize');
        this.responses.get = () => Promise.resolve(DETAILS);
        this.responses.delete = () => Promise.resolve({ redirect: 'https://app.example.com/cb?error=access_denied&state=s' });

        await controller.load.perform(PARAMS);
        await controller.deny.perform();

        assert.deepEqual(this.left, ['https://app.example.com/cb?error=access_denied&state=s']);
    });

    test('an already approved sign-in skips the screen', async function (assert) {
        const controller = this.owner.lookup('controller:oauth/authorize');
        this.responses.get = () => Promise.resolve({ ...DETAILS, requires_organization: false, organizations: [], skip_consent: true });
        this.responses.post = () => Promise.resolve({ redirect: 'https://app.example.com/cb?code=abc' });

        await controller.load.perform({ ...PARAMS, scope: 'openid' });

        assert.deepEqual(this.left, ['https://app.example.com/cb?code=abc']);
    });

    test('an error the app can receive goes back to it; any other is shown', async function (assert) {
        const controller = this.owner.lookup('controller:oauth/authorize');

        this.responses.get = () => Promise.reject({ error: 'invalid_scope', redirect: 'https://app.example.com/cb?error=invalid_scope' });
        await controller.load.perform(PARAMS);
        assert.deepEqual(this.left, ['https://app.example.com/cb?error=invalid_scope']);

        this.responses.get = () => Promise.reject({ error: 'invalid_client', redirect: null });
        await controller.load.perform(PARAMS);
        assert.ok(controller.error, 'shows a message');
        assert.strictEqual(this.left.length, 1, 'and never redirects to an unverified URI');
    });

    test('it signs the user in again when the app asks for a fresh sign-in', async function (assert) {
        const controller = this.owner.lookup('controller:oauth/authorize');
        this.responses.get = () => Promise.resolve({ reauthenticate: true });

        await controller.load.perform({ ...PARAMS, prompt: 'login' });

        assert.true(this.owner.lookup('service:session').invalidated);
        assert.deepEqual(this.owner.lookup('service:oauth-authorization').saved, { ...PARAMS, prompt: 'login' }, 'keeping the request to come back to');
    });
});
