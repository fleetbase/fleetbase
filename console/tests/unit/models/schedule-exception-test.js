import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | schedule-exception', function (hooks) {
    setupTest(hooks);

    test('status getters reflect the status attribute', function (assert) {
        const store = this.owner.lookup('service:store');
        const rec = store.createRecord('schedule-exception', { status: 'approved' });

        assert.true(rec.isApproved);
        assert.false(rec.isPending);
        assert.false(rec.isRejected);

        rec.status = 'rejected';
        assert.true(rec.isRejected);
        assert.false(rec.isApproved);
    });

    test('typeLabel maps known types and falls back to the raw value', function (assert) {
        const store = this.owner.lookup('service:store');
        const rec = store.createRecord('schedule-exception', { type: 'sick_leave' });

        assert.strictEqual(rec.typeLabel, 'Sick Leave');

        rec.type = 'unmapped';
        assert.strictEqual(rec.typeLabel, 'unmapped', 'falls back to the raw type');
    });
});
