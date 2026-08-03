import getPermissionAction from '@fleetbase/console/utils/get-permission-action';
import { module, test } from 'qunit';

module('Unit | Utility | get-permission-action', function () {
    test('returns the last segment verbatim for auth permissions', function (assert) {
        assert.strictEqual(getPermissionAction('auth:login'), 'login');
        assert.strictEqual(getPermissionAction('authenticate:refresh-token'), 'refresh-token');
    });

    test('returns "All" for wildcard actions', function (assert) {
        assert.strictEqual(getPermissionAction('fleet-ops:*'), 'All');
    });

    test('classifies known action prefixes', function (assert) {
        assert.strictEqual(getPermissionAction('fleet-ops:create'), 'Create');
        assert.strictEqual(getPermissionAction('fleet-ops:update-order'), 'Update');
        assert.strictEqual(getPermissionAction('iam:delete-user'), 'Delete');
        assert.strictEqual(getPermissionAction('fleet-ops:deactivate-driver'), 'Deactivate');
        assert.strictEqual(getPermissionAction('iam:list-user'), 'List');
    });

    test('returns "N/A" for unknown actions', function (assert) {
        assert.strictEqual(getPermissionAction('fleet-ops:frobnicate'), 'N/A');
    });

    test('throws when given no permission name', function (assert) {
        assert.throws(() => getPermissionAction());
    });
});
