import getPermissionResource from '@fleetbase/console/utils/get-permission-resource';
import { module, test } from 'qunit';

module('Unit | Utility | get-permission-resource', function () {
    test('returns "N/A" for auth permissions', function (assert) {
        assert.strictEqual(getPermissionResource('auth:login'), 'N/A');
        assert.strictEqual(getPermissionResource('authenticate:whatever'), 'N/A');
    });

    test('derives a classified, singularized resource name for non-auth permissions', function (assert) {
        const result = getPermissionResource('fleet-ops:list-orders');
        assert.strictEqual(typeof result, 'string');
        assert.true(result.length > 0);
        // Singularized: no trailing "s" from the pluralized resource segment.
        assert.notOk(/orders$/i.test(result), 'resource is singularized');
    });

    test('defaults to an empty permission name without throwing', function (assert) {
        assert.strictEqual(typeof getPermissionResource(), 'string');
    });
});
