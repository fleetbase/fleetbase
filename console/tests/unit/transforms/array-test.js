import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Transform | array', function (hooks) {
    setupTest(hooks);

    test('deserialize returns [] for null/undefined', function (assert) {
        const transform = this.owner.lookup('transform:array');
        assert.deepEqual(transform.deserialize(null), []);
        assert.deepEqual(transform.deserialize(undefined), []);
    });

    test('deserialize passes through arrays unchanged', function (assert) {
        const transform = this.owner.lookup('transform:array');
        const arr = [1, 2, 3];
        assert.strictEqual(transform.deserialize(arr), arr);
    });

    test('deserialize parses JSON array strings', function (assert) {
        const transform = this.owner.lookup('transform:array');
        assert.deepEqual(transform.deserialize('[1,2,3]'), [1, 2, 3]);
    });

    test('deserialize returns [] for malformed JSON strings', function (assert) {
        const transform = this.owner.lookup('transform:array');
        assert.deepEqual(transform.deserialize('[1,2'), []);
    });

    test('deserialize converts non-string iterables via Array.from', function (assert) {
        const transform = this.owner.lookup('transform:array');
        assert.deepEqual(transform.deserialize(new Set([1, 2])), [1, 2]);
    });

    test('serialize mirrors deserialize behavior', function (assert) {
        const transform = this.owner.lookup('transform:array');
        assert.deepEqual(transform.serialize(undefined), []);
        const arr = ['a', 'b'];
        assert.strictEqual(transform.serialize(arr), arr);
        assert.deepEqual(transform.serialize('["x"]'), ['x']);
        assert.deepEqual(transform.serialize('bad'), []);
    });
});

module('Unit | Transform | array | iterables', function (hooks) {
    setupTest(hooks);

    test('a non-string iterable is copied into a real array', function (assert) {
        const transform = this.owner.lookup('transform:array');

        assert.deepEqual(transform.deserialize(new Set(['a', 'b', 'a'])), ['a', 'b'], 'a Set is flattened to its members');
    });

    test('any other iterable is spread into an array too', function (assert) {
        const transform = this.owner.lookup('transform:array');

        assert.deepEqual(transform.deserialize(new Map([['a', 1]])), [['a', 1]], 'a Map deserializes to its entries');
    });
});

module('Unit | Transform | array | serializing iterables', function (hooks) {
    setupTest(hooks);

    test('a non-string iterable is spread into an array on the way out too', function (assert) {
        const transform = this.owner.lookup('transform:array');

        assert.deepEqual(transform.serialize(new Set(['a', 'b'])), ['a', 'b'], 'a Set is sent as a list');
        assert.deepEqual(transform.serialize(new Map([['k', 1]])), [['k', 1]], 'and so is a Map');
    });
});
