import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | company', function (hooks) {
    setupTest(hooks);

    test('statusLabel defaults to active when status is unset', function (assert) {
        const store = this.owner.lookup('service:store');

        assert.strictEqual(store.createRecord('company', {}).statusLabel, 'active');
        assert.strictEqual(store.createRecord('company', { status: 'suspended' }).statusLabel, 'suspended');
    });

    test('toJSON serializes the record attributes', function (assert) {
        const store = this.owner.lookup('service:store');
        const json = store.createRecord('company', { name: 'Acme' }).toJSON();

        assert.strictEqual(json.name, 'Acme');
    });
});
