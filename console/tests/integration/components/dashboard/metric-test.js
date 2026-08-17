import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import MetricComponent from '@fleetbase/console/components/dashboard/metric';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

module('Integration | Component | dashboard/metric', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.requests = [];
        this.getResponse = [];
        this.getRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            async get(endpoint, params, options) {
                context.requests.push({ endpoint, params, options });

                if (context.getRejectsWith) {
                    throw context.getRejectsWith;
                }

                return context.getResponse;
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.set('options', { endpoint: 'metrics/orders' });

        const captured = captureComponent(this.owner, 'dashboard/metric', MetricComponent);
        this.build = async () => {
            await render(hbs`<Dashboard::Metric @options={{this.options}} />`);
            return captured.instance;
        };
    });

    test('it loads its dashboard from the configured endpoint on construction', async function (assert) {
        this.getResponse = [{ name: 'Orders' }, { name: 'Ignored' }];

        const component = await this.build();

        assert.deepEqual(this.requests, [{ endpoint: 'metrics/orders', params: undefined, options: { namespace: '' } }], 'the endpoint is called with an empty namespace');
        assert.deepEqual(component.dashboard, { name: 'Orders' }, 'the first dashboard in the response is used');
        assert.false(component.isLoading, 'loading is cleared once the request settles');
    });

    test('a response that is not a list leaves the dashboard unset', async function (assert) {
        this.getResponse = { name: 'not-a-list' };

        const component = await this.build();

        assert.strictEqual(component.dashboard, undefined);
        assert.false(component.isLoading);
    });

    test('a failed request stops loading instead of spinning forever', async function (assert) {
        this.getRejectsWith = new Error('metrics unavailable');

        const component = await this.build();

        assert.strictEqual(component.dashboard, undefined, 'nothing is shown');
        assert.false(component.isLoading, 'the metric does not stay stuck on its loading state');
    });

    test('onQueryParamsChanged reloads the dashboard with the new params', async function (assert) {
        this.getResponse = [{ name: 'Orders' }];
        const component = await this.build();

        this.getResponse = [{ name: 'Filtered' }];
        // The action kicks off the task without returning it, so await settled() rather
        // than awaiting the action itself.
        component.onQueryParamsChanged({ range: '30d' });
        await settled();

        assert.strictEqual(this.requests.length, 2, 'a second request is made');
        assert.deepEqual(this.requests.at(-1).params, { range: '30d' }, 'the changed params are forwarded');
        assert.deepEqual(component.dashboard, { name: 'Filtered' });
    });
});
