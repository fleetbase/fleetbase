import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | oauth', function (hooks) {
    setupTest(hooks);

    test('it takes down the boot loader on entry', function (assert) {
        const element = document.createElement('div');
        element.id = 'boot-loader';
        document.body.appendChild(element);
        const route = this.owner.lookup('route:oauth');

        try {
            route.beforeModel();

            assert.strictEqual(document.getElementById('boot-loader'), null, 'the boot loader is gone');
        } finally {
            document.getElementById('boot-loader')?.remove();
        }
    });
});
