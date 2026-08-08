import getServiceName from '@fleetbase/console/utils/get-service-name';
import { module, test } from 'qunit';

module('Unit | Utility | get-service-name', function () {
    test('maps fleet* to "Fleet Ops"', function (assert) {
        assert.strictEqual(getServiceName('fleet-ops'), 'Fleet Ops');
        assert.strictEqual(getServiceName('fleetops'), 'Fleet Ops');
        assert.strictEqual(getServiceName('FLEET'), 'Fleet Ops', 'is case-insensitive');
    });

    test('maps iam/identity to "IAM"', function (assert) {
        assert.strictEqual(getServiceName('iam'), 'IAM');
        assert.strictEqual(getServiceName('identity-and-access'), 'IAM');
    });

    test('maps auth* to "Auth"', function (assert) {
        assert.strictEqual(getServiceName('auth'), 'Auth');
        assert.strictEqual(getServiceName('authentication'), 'Auth');
    });

    test('maps developers* to "Developers Console"', function (assert) {
        assert.strictEqual(getServiceName('developers'), 'Developers Console');
        assert.strictEqual(getServiceName('developers-hub'), 'Developers Console');
    });

    test('returns "N/A" for unknown services', function (assert) {
        assert.strictEqual(getServiceName('storefront'), 'N/A');
        assert.strictEqual(getServiceName('unknown'), 'N/A');
    });

    test('throws when given no service name', function (assert) {
        assert.throws(() => getServiceName());
    });
});
