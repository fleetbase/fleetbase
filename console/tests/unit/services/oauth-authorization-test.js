import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import window from 'ember-window-mock';
import { STORAGE_KEY, PENDING_TTL_MS } from '@fleetbase/console/services/oauth-authorization';

module('Unit | Service | oauth-authorization', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        window.localStorage.removeItem(STORAGE_KEY);
    });

    hooks.afterEach(function () {
        window.localStorage.removeItem(STORAGE_KEY);
    });

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
});
