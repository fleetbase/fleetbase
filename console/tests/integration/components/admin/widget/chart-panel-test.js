import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import AdminWidgetChartPanelComponent from '@fleetbase/console/components/admin/widget/chart-panel';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

module('Integration | Component | admin/widget/chart-panel', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.requested = [];
        this.getResponse = { labels: ['Jan', 'Feb'], datasets: [{ label: 'Orders', data: [1, 2] }] };
        const context = this;

        class FetchStub extends Service {
            async get(endpoint) {
                context.requested.push(endpoint);
                return context.getResponse;
            }
        }

        this.owner.register('service:fetch', FetchStub);

        const captured = captureComponent(this.owner, 'admin/widget/chart-panel', AdminWidgetChartPanelComponent);
        this.build = async () => {
            await render(hbs`<Admin::Widget::ChartPanel @options={{this.options}} />`);
            return captured.instance;
        };
    });

    test('the platform-growth widget is served by its own endpoint', async function (assert) {
        this.set('options', { slug: 'platform-growth' });
        const component = await this.build();

        assert.strictEqual(component.endpoint, 'metrics/admin/growth', 'growth has a dedicated endpoint');
        assert.deepEqual(this.requested, ['metrics/admin/growth']);
    });

    test('any other slug falls back to the generic widget endpoint', async function (assert) {
        this.set('options', { slug: 'order-volume' });
        const component = await this.build();

        assert.strictEqual(component.endpoint, 'metrics/admin/widgets/order-volume', 'inherited from the list panel');
        assert.deepEqual(this.requested, ['metrics/admin/widgets/order-volume']);
    });

    test('it exposes the loaded labels and datasets to the chart', async function (assert) {
        this.set('options', { slug: 'platform-growth' });
        const component = await this.build();

        assert.deepEqual(component.chartLabels, ['Jan', 'Feb']);
        // The rendered chart normalises the dataset objects it receives, so assert their
        // shape rather than deep-equalling the literal the stub handed over.
        assert.strictEqual(component.chartDatasets.length, 1);
        assert.strictEqual(component.chartDatasets[0].label, 'Orders');
        assert.deepEqual(component.chartDatasets[0].data, [1, 2]);
    });

    test('a response with no chart data yields empty labels and no datasets', async function (assert) {
        this.getResponse = {};
        this.set('options', { slug: 'platform-growth' });
        const component = await this.build();

        assert.deepEqual(component.chartLabels, [], 'labels default to empty');
        assert.strictEqual(component.chartDatasets, null, 'a missing dataset reads as null so the chart can hide');
    });

    test('the chart options pin the legend and axes', async function (assert) {
        this.set('options', { slug: 'platform-growth' });
        const component = await this.build();
        const options = component.chartOptions;

        assert.true(options.responsive);
        assert.false(options.maintainAspectRatio, 'the chart fills its panel rather than keeping a ratio');
        assert.deepEqual(options.plugins.legend, { display: true, position: 'bottom' });
        assert.false(options.scales.x.grid.display, 'the x gridlines are hidden');
        assert.true(options.scales.y.beginAtZero);
    });
});
