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

/**
 * The polyfill is a port of Node's crypto.randomUUID, including its argument validators and
 * its entropy-cache option. Chrome supplies a native randomUUID, so the polyfill only runs
 * once the native one is removed — which is what makes these paths reachable at all.
 */
module('Unit | Initializer | initialize-random-uuid-polyfill | options', function (hooks) {
    hooks.beforeEach(function () {
        this.original = window.crypto.randomUUID;
        window.crypto.randomUUID = undefined;
        initialize();
        this.randomUUID = window.crypto.randomUUID;
    });

    hooks.afterEach(function () {
        window.crypto.randomUUID = this.original;
    });

    test('an explicit empty options object is accepted', function (assert) {
        const uuid = this.randomUUID({});

        assert.strictEqual(uuid.length, 36);
    });

    test('disabling the entropy cache still produces distinct valid uuids', function (assert) {
        // Takes the un-buffered path, which allocates its own 16-byte buffer on first use.
        const first = this.randomUUID({ disableEntropyCache: true });
        const second = this.randomUUID({ disableEntropyCache: true });

        assert.ok(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(first), `a valid v4 uuid (${first})`);
        assert.notStrictEqual(first, second, 'successive un-buffered calls differ');
    });

    test('a non-boolean disableEntropyCache is rejected', function (assert) {
        assert.throws(() => this.randomUUID({ disableEntropyCache: 'yes' }), /options.disableEntropyCache variable is not of type boolean/);

        try {
            this.randomUUID({ disableEntropyCache: 1 });
        } catch (error) {
            assert.strictEqual(error.code, 'ERR_INVALID_ARG_TYPE', 'it carries Node’s error code');
            assert.true(error instanceof TypeError);
        }
    });

    test('options that are not a plain object are rejected', function (assert) {
        assert.throws(() => this.randomUUID(null), /options variable is not of type Object/, 'null is not an options object');
        assert.throws(() => this.randomUUID([]), /options variable is not of type Object/, 'nor is an array');
        assert.throws(() => this.randomUUID('nope'), /options variable is not of type Object/, 'nor is a string');
    });

    test('the batched path recycles its buffer across many calls', function (assert) {
        // kBatchSize is 128; going past it forces the batch counter to wrap and refill.
        const uuids = new Set();
        for (let i = 0; i < 130; i++) {
            uuids.add(this.randomUUID());
        }

        assert.strictEqual(uuids.size, 130, 'every uuid across a full batch and beyond is distinct');
    });
});
