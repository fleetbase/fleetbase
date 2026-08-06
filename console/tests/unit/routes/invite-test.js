import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | invite', function (hooks) {
    setupTest(hooks);

    test('activate removes the boot loader element', function (assert) {
        const bootLoader = document.createElement('div');
        bootLoader.id = 'boot-loader';
        document.body.appendChild(bootLoader);

        try {
            this.owner.lookup('route:invite').activate();
            assert.strictEqual(document.getElementById('boot-loader'), null, 'the boot loader is removed');
        } finally {
            bootLoader.remove();
        }
    });

    test('activate is a no-op when there is no boot loader', function (assert) {
        assert.strictEqual(document.getElementById('boot-loader'), null, 'precondition: no boot loader');

        this.owner.lookup('route:invite').activate();

        assert.ok(true, 'activate does not throw');
    });
});
