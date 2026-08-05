import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Serializer | two-fa-settings', function (hooks) {
    setupTest(hooks);

    // No two-fa-settings model exists, so exercise the serializer's inherited configuration directly.
    test('inherits the uuid primary key from the application serializer', function (assert) {
        assert.strictEqual(this.owner.lookup('serializer:two-fa-settings').primaryKey, 'uuid');
    });
});
