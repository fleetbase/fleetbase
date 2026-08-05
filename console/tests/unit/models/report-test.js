import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | report', function (hooks) {
    setupTest(hooks);

    test('countConditionsRecursively counts leaf conditions across nested groups', function (assert) {
        const store = this.owner.lookup('service:store');
        const report = store.createRecord('report', {});

        const conditions = [{ field: 'a' }, { conditions: [{ field: 'b' }, { field: 'c' }] }];

        assert.strictEqual(report.countConditionsRecursively(conditions), 3);
        assert.strictEqual(report.countConditionsRecursively(null), 0, 'non-array yields 0');
        assert.strictEqual(report.countConditionsRecursively([]), 0);
    });

    test('extractConditionsSummary flattens leaf conditions with labels', function (assert) {
        const store = this.owner.lookup('service:store');
        const report = store.createRecord('report', {});

        const summary = report.extractConditionsSummary([
            { field: { label: 'Name', table: 't1' }, operator: { label: '=' }, value: 'x' },
            { conditions: [{ field: { name: 'Age', table: 't2' }, operator: { value: '>' }, value: 18 }] },
        ]);

        assert.strictEqual(summary.length, 2);
        assert.strictEqual(summary[0].field, 'Name');
        assert.strictEqual(summary[0].operator, '=');
        assert.strictEqual(summary[1].field, 'Age', 'falls back to field name');
        assert.strictEqual(summary[1].operator, '>', 'falls back to operator value');
    });

    test('fillResult copies columns/data/meta and flags the report as generated', function (assert) {
        const store = this.owner.lookup('service:store');
        const report = store.createRecord('report', {});

        report.fillResult({ columns: ['a', 'b'], data: [[1, 2]], meta: { total_rows: 5, execution_time_ms: 12 } });

        assert.deepEqual(report.result_columns, ['a', 'b']);
        assert.strictEqual(report.row_count, 5);
        assert.strictEqual(report.execution_time, 12);
        assert.true(report.is_generated);
    });

    test('fillResult applies safe defaults when passed an empty result', function (assert) {
        const store = this.owner.lookup('service:store');
        const report = store.createRecord('report', {});

        report.fillResult();

        assert.deepEqual(report.result_columns, []);
        assert.strictEqual(report.row_count, 0);
        assert.strictEqual(report.execution_time, -1);
    });
});
