import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | catch', function (hooks) {
    setupTest(hooks);

    test('it exists', function (assert) {
        let route = this.owner.lookup('route:catch');
        assert.ok(route);
    });
});
