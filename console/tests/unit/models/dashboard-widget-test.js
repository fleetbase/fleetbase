import { module, test } from 'qunit';

import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Model | dashboard widget', function (hooks) {
    setupTest(hooks);

    // Replace this with your real tests.
    test('it exists', function (assert) {
        let store = this.owner.lookup('service:store');
        let model = store.createRecord('dashboard-widget', {});
        assert.ok(model);
    });
});

module('Unit | Model | dashboard-widget | updateProperties', function (hooks) {
    setupTest(hooks);

    test('updateProperties applies the changes and persists them', async function (assert) {
        const store = this.owner.lookup('service:store');
        const widget = store.push({ data: { id: 'w_1', type: 'dashboard-widget' } });
        let saved = 0;
        widget.save = () => {
            saved++;
            return Promise.resolve(widget);
        };

        const result = await widget.updateProperties({ name: 'Earnings', component: 'kpi-tile' });

        assert.strictEqual(widget.name, 'Earnings');
        assert.strictEqual(widget.component, 'kpi-tile');
        assert.strictEqual(saved, 1, 'the widget is saved once');
        assert.strictEqual(result, widget, 'the saved record is handed back');
    });

    test('updateProperties with no changes still saves', async function (assert) {
        const store = this.owner.lookup('service:store');
        const widget = store.push({ data: { id: 'w_2', type: 'dashboard-widget' } });
        let saved = 0;
        widget.save = () => {
            saved++;
            return Promise.resolve(widget);
        };

        await widget.updateProperties();

        assert.strictEqual(saved, 1);
    });
});
