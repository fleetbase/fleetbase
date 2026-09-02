import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | template-query | naming', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.store = this.owner.lookup('service:store');
        this.query = (attrs) => this.store.createRecord('template-query', attrs);
    });

    test('variableName slugifies the name into a token-safe identifier', function (assert) {
        assert.strictEqual(this.query({ name: 'Total Orders' }).variableName, 'total_orders');
        assert.strictEqual(this.query({ name: 'Driver / Vehicle count!' }).variableName, 'driver_vehicle_count');
        assert.strictEqual(this.query({ name: '  Leading and trailing  ' }).variableName, 'leading_and_trailing', 'padding is trimmed off the ends');
        assert.strictEqual(this.query({}).variableName, '', 'an unnamed query has no variable');
    });

    test('variableToken wraps the variable name in braces', function (assert) {
        assert.strictEqual(this.query({ name: 'Total Orders' }).variableToken, '{total_orders}');
        assert.strictEqual(this.query({}).variableToken, '{}', 'an unnamed query still yields a well-formed token');
    });

    test('resourceTypeLabel shows only the class name from a namespaced type', function (assert) {
        assert.strictEqual(this.query({ resource_type: 'Fleetbase\\FleetOps\\Models\\Order' }).resourceTypeLabel, 'Order');
        assert.strictEqual(this.query({ resource_type: 'Order' }).resourceTypeLabel, 'Order', 'an unnamespaced type is used as-is');
        assert.strictEqual(this.query({}).resourceTypeLabel, '', 'no type means no label');
    });
});
