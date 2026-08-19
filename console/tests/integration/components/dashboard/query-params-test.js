import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import DashboardQueryParamsComponent from '@fleetbase/console/components/dashboard/query-params';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

module('Integration | Component | dashboard/query-params', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a labelled control for each param', async function (assert) {
        this.set('params', {
            status: { component: 'input' },
            driver_name: { component: 'input' },
        });

        await render(hbs`<Dashboard::QueryParams @params={{this.params}} />`);

        // humanize() only upper-cases the first character: driver_name -> "Driver name".
        assert.dom(this.element).containsText('Status');
        assert.dom(this.element).containsText('Driver name', 'param keys are humanized into labels');
    });

    test('it renders nothing for an empty param set', async function (assert) {
        this.set('params', {});

        await render(hbs`<Dashboard::QueryParams @params={{this.params}} />`);

        assert.dom(this.element).hasText('');
    });
});

/**
 * onChange is wired to third-party controls (selects and a date picker), so drive it on
 * the captured instance.
 */
module('Integration | Component | dashboard/query-params | onChange', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.changes = [];
        this.set('onChange', (params) => this.changes.push(params));
        this.set('params', {
            range: { label: 'Range', component: 'select', options: ['7d', '30d'] },
            start: { label: 'Start', component: 'date-picker' },
        });

        const captured = captureComponent(this.owner, 'dashboard/query-params', DashboardQueryParamsComponent);
        this.build = async () => {
            await render(hbs`<Dashboard::QueryParams @params={{this.params}} @onChange={{this.onChange}} />`);
            return captured.instance;
        };
        this.buildBare = async () => {
            await render(hbs`<Dashboard::QueryParams @params={{this.params}} />`);
            return captured.instance;
        };
    });

    test('a plain param change is accumulated and reported', async function (assert) {
        const component = await this.build();

        component.onChange('range', '30d');

        assert.deepEqual(component.changedParams, { range: '30d' });
        assert.deepEqual(this.changes, [{ range: '30d' }], 'the caller receives the whole set');
    });

    test('a date picker change is reduced to its formatted date', async function (assert) {
        const component = await this.build();

        component.onChange('start', { formattedDate: '2026-01-01', date: new Date() });

        assert.deepEqual(component.changedParams, { start: '2026-01-01' }, 'only the formatted date is kept');
    });

    test('successive changes accumulate rather than replace', async function (assert) {
        const component = await this.build();

        component.onChange('range', '7d');
        component.onChange('start', { formattedDate: '2026-02-01' });
        component.onChange('range', '30d');

        assert.deepEqual(component.changedParams, { range: '30d', start: '2026-02-01' }, 'the latest value of each param is kept');
        assert.strictEqual(this.changes.length, 3, 'every change is reported');
    });

    test('it works without an onChange listener', async function (assert) {
        const component = await this.buildBare();

        component.onChange('range', '7d');

        assert.deepEqual(component.changedParams, { range: '7d' }, 'state still updates with nothing listening');
    });
});
