import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | extension', function (hooks) {
    setupTest(hooks);

    test('toJSON emits a plain object of the model attributes', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('extension', { name: 'fleet-ops', display_name: 'Fleet Ops' }).toJSON();

        assert.strictEqual(json.name, 'fleet-ops');
        assert.strictEqual(json.display_name, 'Fleet Ops');
    });
});
