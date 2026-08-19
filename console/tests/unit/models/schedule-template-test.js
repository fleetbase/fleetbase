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

module('Unit | Model | schedule-template | recurrence edge cases', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.template = (attrs) => this.owner.lookup('service:store').createRecord('schedule-template', attrs);
    });

    test('an unrecognised day code is passed through as written', function (assert) {
        const summary = this.template({ rrule: 'FREQ=WEEKLY;BYDAY=MO,XX', start_time: '09:00', end_time: '17:00' }).recurrenceSummary;

        assert.strictEqual(summary, 'Weekly on Mon, XX · 09:00–17:00', 'MO maps to Mon, XX has no mapping and survives verbatim');
    });

    test('an rrule with neither a frequency nor days summarizes to almost nothing', function (assert) {
        // A malformed or partial rule should still render rather than throw — every part of
        // the summary is optional.
        assert.strictEqual(this.template({ rrule: 'INTERVAL=2' }).recurrenceSummary, ' on ');
    });

    test('the times are omitted unless both ends are known', function (assert) {
        assert.strictEqual(this.template({ rrule: 'FREQ=DAILY', start_time: '08:00' }).recurrenceSummary, 'Daily on ', 'a start with no end is dropped');
        assert.strictEqual(this.template({ rrule: 'FREQ=DAILY', end_time: '16:00' }).recurrenceSummary, 'Daily on ', 'an end with no start is dropped');
    });

    test('the frequency is title-cased from the rrule', function (assert) {
        assert.ok(this.template({ rrule: 'FREQ=MONTHLY;BYDAY=TU,WE,TH,FR,SA,SU' }).recurrenceSummary.startsWith('Monthly on Tue, Wed, Thu, Fri, Sat, Sun'));
    });
});
