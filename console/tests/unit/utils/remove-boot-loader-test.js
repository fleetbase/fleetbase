import removeBootLoader from '@fleetbase/console/utils/remove-boot-loader';
import { module, test } from 'qunit';

module('Unit | Utility | remove-boot-loader', function (hooks) {
    hooks.afterEach(function () {
        document.getElementById('boot-loader')?.remove();
    });

    test('removes the #boot-loader element when present', function (assert) {
        const el = document.createElement('div');
        el.id = 'boot-loader';
        document.body.appendChild(el);
        assert.ok(document.getElementById('boot-loader'), 'precondition: boot loader exists');

        removeBootLoader();

        assert.strictEqual(document.getElementById('boot-loader'), null, 'boot loader removed');
    });

    test('does nothing (and does not throw) when there is no boot loader', function (assert) {
        assert.strictEqual(document.getElementById('boot-loader'), null);
        removeBootLoader();
        assert.ok(true, 'no error thrown');
    });
});
