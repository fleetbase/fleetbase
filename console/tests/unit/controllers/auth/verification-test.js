import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Controller | auth/verification', function (hooks) {
    setupTest(hooks);

    // TODO: Replace this with your real tests.
    test('it exists', function (assert) {
        let controller = this.owner.lookup('controller:auth/verification');
        assert.ok(controller);
    });
});
