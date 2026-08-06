import { module, test } from 'qunit';
import { initialize } from '@fleetbase/console/initializers/load-socketcluster-client';

module('Unit | Initializer | load-socketcluster-client', function (hooks) {
    hooks.afterEach(function () {
        document.querySelectorAll('script[data-socketcluster-client]').forEach((node) => node.remove());
    });

    test('it injects the socketcluster client script', function (assert) {
        initialize();

        const script = document.querySelector('script[data-socketcluster-client]');
        assert.ok(script, 'the script tag is added');
        assert.ok(script.src.endsWith('/assets/socketcluster-client.min.js'), 'it points at the bundled client');
    });

    test('it does not inject the script twice', function (assert) {
        initialize();
        initialize();

        assert.strictEqual(document.querySelectorAll('script[data-socketcluster-client]').length, 1, 'only one script tag is added');
    });
});
