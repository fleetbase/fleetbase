import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Transform | object', function (hooks) {
    setupTest(hooks);

    test('deserialize returns {} for falsy input', function (assert) {
        const transform = this.owner.lookup('transform:object');
        assert.deepEqual(transform.deserialize(null), {});
        assert.deepEqual(transform.deserialize(undefined), {});
        assert.deepEqual(transform.deserialize(''), {});
        assert.deepEqual(transform.deserialize(0), {});
    });

    test('deserialize passes through plain objects unchanged', function (assert) {
        const transform = this.owner.lookup('transform:object');
        const obj = { a: 1, b: 'two' };
        assert.strictEqual(transform.deserialize(obj), obj);
    });

    test('deserialize parses JSON object strings', function (assert) {
        const transform = this.owner.lookup('transform:object');
        assert.deepEqual(transform.deserialize('{"a":1}'), { a: 1 });
    });

    test('deserialize returns {} for malformed JSON', function (assert) {
        const transform = this.owner.lookup('transform:object');
        assert.deepEqual(transform.deserialize('{not valid'), {});
    });

    test('serialize mirrors deserialize behavior', function (assert) {
        const transform = this.owner.lookup('transform:object');
        assert.deepEqual(transform.serialize(null), {});
        const obj = { c: 3 };
        assert.strictEqual(transform.serialize(obj), obj);
        assert.deepEqual(transform.serialize('{"d":4}'), { d: 4 });
        assert.deepEqual(transform.serialize('nope'), {});
    });
});
