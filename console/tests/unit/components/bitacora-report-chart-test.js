import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

const sampleData = {
    labels: ['IAM', 'Chat'],
    datasets: [
        {
            label: 'Actividades',
            data: [120, 80],
        },
    ],
};

module('Unit | Component | bitacora-report-chart', function (hooks) {
    setupTest(hooks);

    let originalSetTimeout;

    hooks.beforeEach(function () {
        originalSetTimeout = window.setTimeout;
        window.setTimeout = () => ({});
    });

    hooks.afterEach(function () {
        window.setTimeout = originalSetTimeout;
    });

    function instantiateComponent(additionalArgs = {}) {
        return this.owner.factoryFor('component:bitacora-report-chart').create({
            args: {
                data: sampleData,
                type: 'horizontalBar',
                options: {
                    responsive: false,
                    scales: {
                        x: {
                            ticks: {
                                color: '#000',
                            },
                        },
                    },
                },
                tickColor: '#112233',
                ariaLabel: 'Mi gráfica',
                ...additionalArgs,
            },
        });
    }

    test('basic getters reflect args and defaults', function (assert) {
        const component = instantiateComponent.call(this);

        assert.strictEqual(component.chartType, 'horizontalBar', 'Uses provided chart type');
        assert.deepEqual(component.chartData, sampleData, 'Propaga data correctamente');
        assert.true(component.hasData, 'Detecta datasets disponibles');
        assert.strictEqual(component.ariaLabel, 'Mi gráfica', 'Expone aria-label custom');

        const chartVersion = JSON.parse(component.chartVersion);
        assert.strictEqual(chartVersion.type, 'horizontalBar');
        assert.deepEqual(chartVersion.data, sampleData);
        assert.strictEqual(chartVersion.options, component.args.options);
    });

    test('chartOptions merge defaults with overrides', function (assert) {
        const component = instantiateComponent.call(this);
        const options = component.chartOptions;

        assert.false(options.responsive, 'Hereda override de opciones');
        assert.strictEqual(options.scales.x.ticks.color, '#000', 'Usa color personalizado');
        assert.strictEqual(options.scales.y.ticks.color, '#112233', 'Usa tickColor even sin override');
        assert.strictEqual(options.plugins.legend.display, false, 'Legend refleja showLegend falso');
    });

    test('hasData false cuando no hay datasets válidos', function (assert) {
        const component = instantiateComponent.call(this, {
            data: { labels: [], datasets: [] },
        });

        assert.false(component.hasData, 'Devuelve false si no hay datasets');
    });

    test('destroyChart limpia la instancia', function (assert) {
        const component = instantiateComponent.call(this);
        let destroyed = false;
        component.chartInstance = {
            destroy() {
                destroyed = true;
            },
        };

        component.destroyChart();
        assert.true(destroyed, 'Llama destroy() cuando hay instancia');
        assert.strictEqual(component.chartInstance, null, 'Resetea la referencia');
    });
});

