import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import window from 'ember-window-mock';

module('Unit | Route | auth/oauth-callback', function (hooks) {
    setupTest(hooks);

    test('it reads the handoff code out of the fragment', function (assert) {
        window.location.hash = '#handoff=abc123&return_to=%2Fdashboard';
        const route = this.owner.lookup('route:auth/oauth-callback');

        const payload = route.model();

        assert.strictEqual(payload.handoff, 'abc123');
        assert.strictEqual(payload.returnTo, '/dashboard');
        assert.strictEqual(payload.error, null);
    });

    test('it clears the fragment before the code is used', function (assert) {
        window.location.hash = '#handoff=abc123';
        const route = this.owner.lookup('route:auth/oauth-callback');

        route.model();

        // The code must not survive in the address bar, in history, or in anything
        // the user might copy and share.
        assert.notOk(String(window.location.hash).includes('abc123'), 'the code is gone from the url');
    });

    test('it reads an error carried in the fragment', function (assert) {
        window.location.hash = '#error=access_denied';
        const route = this.owner.lookup('route:auth/oauth-callback');

        const payload = route.model();

        assert.strictEqual(payload.error, 'access_denied');
        assert.strictEqual(payload.handoff, null);
    });

    test('an empty fragment yields nothing rather than throwing', function (assert) {
        window.location.hash = '';
        const route = this.owner.lookup('route:auth/oauth-callback');

        const payload = route.model();

        assert.deepEqual(payload, { handoff: null, error: null, returnTo: null, intent: null });
    });

    test('it reads a link intent out of the fragment', function (assert) {
        window.location.hash = '#handoff=abc123&intent=link';
        const route = this.owner.lookup('route:auth/oauth-callback');

        assert.strictEqual(route.model().intent, 'link');
    });
});
