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

    test('with no organization picked, scope lines name "your organization" and fall back to the scope id', async function (assert) {
        const controller = this.owner.lookup('controller:oauth/authorize');
        this.responses.get = () =>
            Promise.resolve({
                ...DETAILS,
                selected_organization: null,
                organizations: [{ id: 'org_b', name: 'Bravo', can_share: false }],
                scopes: [{ scope: 'organization:read', description: 'See {organization}' }, { scope: 'profile' }],
            });

        await controller.load.perform(PARAMS);

        assert.strictEqual(controller.selectedOrganization, null, 'no organization the user can share');
        assert.strictEqual(controller.organization, null);
        assert.false(controller.canApprove);
        const [first, second] = controller.scopeLines.map((line) => line.text);
        assert.notOk(first.includes('{organization}'), 'the placeholder is filled in');
        assert.strictEqual(second, 'profile');
    });

    test('it picks the first organization the user can share when the API does not choose one', async function (assert) {
        const controller = this.owner.lookup('controller:oauth/authorize');
        this.responses.get = () =>
            Promise.resolve({
                ...DETAILS,
                selected_organization: null,
                organizations: [
                    { id: 'org_b', name: 'Bravo', can_share: false },
                    { id: 'org_c', name: 'Charlie', can_share: true },
                ],
            });

        await controller.load.perform(PARAMS);

        assert.strictEqual(controller.selectedOrganization, 'org_c');
        assert.deepEqual(
            controller.shareableOrganizations.map((organization) => organization.id),
            ['org_c']
        );

        controller.selectOrganization({ target: { value: 'org_b' } });
        assert.strictEqual(controller.selectedOrganization, 'org_b', 'a select change event works too');
    });

    test('a sign-in-only request can be approved without an organization', async function (assert) {
        const controller = this.owner.lookup('controller:oauth/authorize');
        this.responses.get = () => Promise.resolve({ ...DETAILS, requires_organization: false, organizations: [], selected_organization: null });

        assert.false(controller.canApprove, 'nothing to approve before the request loads');
        assert.deepEqual(controller.organizations, []);
        assert.deepEqual(controller.scopeLines, []);

        await controller.load.perform(PARAMS);

        assert.true(controller.canApprove);
    });

    test('approving or cancelling a request the API refuses shows the error', async function (assert) {
        const controller = this.owner.lookup('controller:oauth/authorize');
        this.responses.get = () => Promise.resolve(DETAILS);
        this.responses.post = () => Promise.reject({ error: 'something_new' });
        this.responses.delete = () => Promise.reject(undefined);

        await controller.load.perform(PARAMS);
        await controller.approve.perform();

        assert.strictEqual(controller.details, null);
        assert.ok(controller.error, 'an unknown code still shows a message');

        controller.error = null;
        await controller.deny.perform();

        assert.ok(controller.error, 'so does a failure with no body');
        assert.deepEqual(this.left, [], 'neither leaves the console');
    });

    test('approving after the session aged out signs the user in again', async function (assert) {
        const controller = this.owner.lookup('controller:oauth/authorize');
        this.responses.get = () => Promise.resolve(DETAILS);
        this.responses.post = () => Promise.reject({ reauthenticate: true });

        await controller.load.perform(PARAMS);
        await controller.approve.perform();

        assert.true(this.owner.lookup('service:session').invalidated);
        assert.deepEqual(this.owner.lookup('service:oauth-authorization').saved, PARAMS);
    });

    test('switching account signs out and keeps the request', function (assert) {
        const controller = this.owner.lookup('controller:oauth/authorize');
        controller.params = PARAMS;

        controller.switchAccount();

        assert.true(this.owner.lookup('service:session').invalidated);
        assert.deepEqual(this.owner.lookup('service:oauth-authorization').saved, PARAMS);
    });

    test('it starts with nothing loaded', function (assert) {
        // Tracked defaults run lazily on first read; read them fresh to pin them.
        const controller = Object.create(this.owner.factoryFor('controller:oauth/authorize').class.prototype);

        assert.strictEqual(controller.params, null);
        assert.strictEqual(controller.details, null);
        assert.strictEqual(controller.error, null);
        assert.strictEqual(controller.selectedOrganization, null);
    });
});
