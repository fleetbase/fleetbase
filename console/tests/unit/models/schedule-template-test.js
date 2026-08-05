import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | schedule-template', function (hooks) {
    setupTest(hooks);

    test('recurrenceSummary summarizes the RRULE with days and times', function (assert) {
        const store = this.owner.lookup('service:store');
        const rec = store.createRecord('schedule-template', { rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR', start_time: '08:00', end_time: '16:00' });

        const summary = rec.recurrenceSummary;
        assert.ok(summary.startsWith('Weekly on Mon, Wed, Fri'), summary);
        assert.ok(summary.includes('08:00'));
        assert.ok(summary.includes('16:00'));
    });

    test('recurrenceSummary is null without an rrule', function (assert) {
        const store = this.owner.lookup('service:store');
        assert.strictEqual(store.createRecord('schedule-template', {}).recurrenceSummary, null);
    });
});
