import { module, test } from 'qunit';
import { initialize } from '@fleetbase/console/initializers/initialize-random-uuid-polyfill';

module('Unit | Initializer | initialize-random-uuid-polyfill', function (hooks) {
    hooks.beforeEach(function () {
        this.original = window.crypto.randomUUID;
    });

    hooks.afterEach(function () {
        window.crypto.randomUUID = this.original;
    });

    test('it installs a randomUUID polyfill when the platform lacks one', function (assert) {
        window.crypto.randomUUID = undefined;

        initialize();

        assert.strictEqual(typeof window.crypto.randomUUID, 'function', 'a polyfill is installed');

        const uuid = window.crypto.randomUUID();
        assert.strictEqual(uuid.length, 36, 'it produces a 36 character uuid');
        assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid), `it produces a valid v4 uuid (${uuid})`);
        assert.notStrictEqual(window.crypto.randomUUID(), uuid, 'successive calls differ');
    });

    test('it leaves a native randomUUID in place', function (assert) {
        const native = () => 'native-uuid';
        window.crypto.randomUUID = native;

        initialize();

        assert.strictEqual(window.crypto.randomUUID, native, 'the native implementation is not replaced');
    });
});
