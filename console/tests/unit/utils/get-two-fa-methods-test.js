import getTwoFaMethods from '@fleetbase/console/utils/get-two-fa-methods';
import { module, test } from 'qunit';

module('Unit | Utility | get-two-fa-methods', function () {
    test('returns the SMS and Email methods', function (assert) {
        const methods = getTwoFaMethods();

        assert.strictEqual(methods.length, 2);
        assert.deepEqual(
            methods.map((m) => m.key),
            ['sms', 'email']
        );
    });

    test('each method exposes key, name, and description', function (assert) {
        for (const method of getTwoFaMethods()) {
            assert.strictEqual(typeof method.key, 'string');
            assert.strictEqual(typeof method.name, 'string');
            assert.strictEqual(typeof method.description, 'string');
        }
    });
});
