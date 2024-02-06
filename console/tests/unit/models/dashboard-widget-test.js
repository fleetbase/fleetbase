import { module, test } from 'qunit';

import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | dashboard widget', function (hooks) {
    setupTest(hooks);

    // Replace this with your real tests.
    test('it exists', function (assert) {
        let store = this.owner.lookup('service:store');
        let model = store.createRecord('dashboard-widget', {});
        assert.ok(model);
    });
});
