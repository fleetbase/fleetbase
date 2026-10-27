import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import window from 'ember-window-mock';
import { STORAGE_KEY, PENDING_TTL_MS } from '@fleetbase/console/services/oauth-authorization';
import config from '@fleetbase/console/config/environment';

module('Unit | Service | oauth-authorization', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        window.localStorage.removeItem(STORAGE_KEY);
    });

    // No afterEach cleanup: setupWindowMock gives every test a fresh localStorage, and one test
    // below leaves a key that cannot be removed.

    const REQUEST =
        '?response_type=code&client_id=c1&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcb&scope=openid%20organization%3Aread&state=s&code_challenge=x&code_challenge_method=S256&utm_source=mail';

    test('it reads only the authorization request parameters', function (assert) {
        const service = this.owner.lookup('service:oauth-authorization');

        assert.deepEqual(service.paramsFrom(REQUEST), {
            response_type: 'code',
            client_id: 'c1',
            redirect_uri: 'https://app.example.com/cb',
            scope: 'openid organization:read',
            state: 's',
            code_challenge: 'x',
            code_challenge_method: 'S256',
        });
        assert.strictEqual(service.paramsFrom('?error=invalid_client'), null, 'no client, no request');
    });

    test('it keeps a request while the user signs in, then sends them back to it once', function (assert) {
        const service = this.owner.lookup('service:oauth-authorization');
        const params = service.paramsFrom(REQUEST);

        assert.false(service.resume(), 'nothing waiting');

        service.save(params);
        assert.deepEqual(service.pending(), params);

        assert.true(service.resume());
        assert.ok(window.location.href.includes('/oauth/authorize?'), 'navigates to the consent page');
        assert.ok(window.location.href.includes('client_id=c1'), 'with the request in the address bar');
        assert.strictEqual(service.pending(), null, 'and forgets it, so the console does not bounce back again');
    });

    test('it drops a stale request', function (assert) {
        const service = this.owner.lookup('service:oauth-authorization');

        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ params: { client_id: 'c1' }, savedAt: Date.now() - PENDING_TTL_MS - 1000 }));

        assert.strictEqual(service.pending(), null);
        assert.strictEqual(window.localStorage.getItem(STORAGE_KEY), null);
    });

    test('it reads nothing from an empty query', function (assert) {
        const service = this.owner.lookup('service:oauth-authorization');

        assert.strictEqual(service.paramsFrom(), null);
    });

    test('unreadable or blocked storage never breaks sign-in', function (assert) {
        const service = this.owner.lookup('service:oauth-authorization');

        window.localStorage.setItem(STORAGE_KEY, '{not json');
        assert.strictEqual(service.pending(), null, 'a corrupt entry reads as nothing waiting');

        // Storage that refuses writes and deletes, as in some private modes.
        window.localStorage.removeItem(STORAGE_KEY);
        Object.defineProperty(window.localStorage, STORAGE_KEY, { value: 'locked', enumerable: true, writable: false, configurable: false });

        service.save({ client_id: 'c1' });
        service.clear();

        assert.strictEqual(window.localStorage.getItem(STORAGE_KEY), 'locked', 'neither throws');
    });

    test('leaving for the app forgets the request and navigates away', function (assert) {
        const service = this.owner.lookup('service:oauth-authorization');
        service.save({ client_id: 'c1' });

        service.leaveTo('https://app.example.com/cb?code=abc');

        assert.strictEqual(window.location.href, 'https://app.example.com/cb?code=abc');
        assert.strictEqual(window.localStorage.getItem(STORAGE_KEY), null);
    });

    test('the consent URL works without a configured root URL', function (assert) {
        const service = this.owner.lookup('service:oauth-authorization');
        const rootURL = config.rootURL;

        try {
            config.rootURL = undefined;
            assert.strictEqual(service.consentUrl({ client_id: 'c1' }), '/oauth/authorize?client_id=c1');
        } finally {
            config.rootURL = rootURL;
        }
    });
});
