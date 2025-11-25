import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | bitacora-report-chart', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders with valid data', async function (assert) {
        this.set('chartData', {
            labels: ['IAM', 'Chat', 'Notifications'],
            datasets: [
                {
                    label: 'Actividades',
                    data: [145, 89, 67],
                    backgroundColor: '#1D9A6C',
                    borderRadius: 6,
                    barThickness: 16,
                },
            ],
        });

        this.set('chartOptions', {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
        });

        await render(hbs`<BitacoraReportChart @data={{this.chartData}} @options={{this.chartOptions}} />`);

        await waitFor('.bitacora-report-chart', { timeout: 2000 });

        assert.dom('.bitacora-report-chart').exists('Chart container is rendered');
        assert.dom('canvas').exists('Canvas element is rendered');
    });

    test('it displays empty state when no data', async function (assert) {
        this.set('chartData', {
            labels: [],
            datasets: [],
        });

        await render(hbs`<BitacoraReportChart @data={{this.chartData}} />`);

        assert.dom('.bitacora-report-chart--empty').exists('Empty state is displayed');
        assert.dom('.bitacora-report-chart--empty').hasText('Sin datos suficientes para graficar.', 'Empty message is correct');
    });

    test('it has correct aria-label for accessibility', async function (assert) {
        this.set('chartData', {
            labels: ['IAM'],
            datasets: [
                {
                    label: 'Actividades',
                    data: [145],
                    backgroundColor: '#1D9A6C',
                },
            ],
        });

        this.set('ariaLabel', 'Gráfica de actividades por sección');

        await render(hbs`<BitacoraReportChart @data={{this.chartData}} @ariaLabel={{this.ariaLabel}} />`);

        await waitFor('canvas', { timeout: 2000 });

        assert.dom('canvas').hasAttribute('aria-label', 'Gráfica de actividades por sección', 'Canvas has correct aria-label');
    });

    test('it renders horizontal bar chart by default', async function (assert) {
        this.set('chartData', {
            labels: ['IAM', 'Chat'],
            datasets: [
                {
                    label: 'Actividades',
                    data: [145, 89],
                    backgroundColor: '#1D9A6C',
                },
            ],
        });

        await render(hbs`<BitacoraReportChart @data={{this.chartData}} />`);

        await waitFor('canvas', { timeout: 2000 });

        // Chart should be rendered (we can't easily test Chart.js internals, but we can verify the canvas exists)
        assert.dom('canvas').exists('Canvas for horizontal bar chart exists');
    });

    test('it accepts custom chart type', async function (assert) {
        this.set('chartData', {
            labels: ['IAM', 'Chat'],
            datasets: [
                {
                    label: 'Actividades',
                    data: [145, 89],
                },
            ],
        });

        await render(hbs`<BitacoraReportChart @data={{this.chartData}} @type="line" />`);

        await waitFor('canvas', { timeout: 2000 });

        assert.dom('canvas').exists('Canvas for custom chart type exists');
    });

    test('it handles data updates', async function (assert) {
        this.set('chartData', {
            labels: ['IAM'],
            datasets: [
                {
                    label: 'Actividades',
                    data: [145],
                    backgroundColor: '#1D9A6C',
                },
            ],
        });

        await render(hbs`<BitacoraReportChart @data={{this.chartData}} />`);

        await waitFor('canvas', { timeout: 2000 });

        assert.dom('canvas').exists('Initial chart rendered');

        // Update data
        this.set('chartData', {
            labels: ['IAM', 'Chat'],
            datasets: [
                {
                    label: 'Actividades',
                    data: [145, 89],
                    backgroundColor: '#1D9A6C',
                },
            ],
        });

        // Chart should still be rendered
        assert.dom('canvas').exists('Chart still rendered after data update');
    });

    test('it cleans up chart instance on destroy', async function (assert) {
        this.set('chartData', {
            labels: ['IAM'],
            datasets: [
                {
                    label: 'Actividades',
                    data: [145],
                    backgroundColor: '#1D9A6C',
                },
            ],
        });

        this.set('showChart', true);

        await render(hbs`
            {{#if this.showChart}}
                <BitacoraReportChart @data={{this.chartData}} />
            {{/if}}
        `);

        await waitFor('canvas', { timeout: 2000 });

        assert.dom('canvas').exists('Chart is rendered');

        // Hide chart (should trigger willDestroy)
        this.set('showChart', false);

        assert.dom('canvas').doesNotExist('Chart is destroyed');
    });
});

