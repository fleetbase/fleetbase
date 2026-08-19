import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import AdminOverviewWidgetComponent from '@fleetbase/console/components/admin/overview-widget';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

module('Integration | Component | admin/overview-widget', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.requested = [];
        this.kpis = {
            'metrics/admin/kpis/users-total': { value: 42 },
            'metrics/admin/kpis/organizations-total': { value: 7 },
            'metrics/admin/kpis/active-admins': { value: 3 },
            'metrics/admin/kpis/organizations-attention': { value: 1 },
        };
        this.getRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            async get(endpoint) {
                context.requested.push(endpoint);

                if (context.getRejectsWith) {
                    throw context.getRejectsWith;
                }

                return context.kpis[endpoint];
            }
        }

        this.owner.register('service:fetch', FetchStub);

        const captured = captureComponent(this.owner, 'admin/overview-widget', AdminOverviewWidgetComponent);
        this.build = async () => {
            await render(hbs`<Admin::OverviewWidget />`);
            return captured.instance;
        };
    });

    test('it loads all four KPIs and exposes them as labelled items', async function (assert) {
        const component = await this.build();

        assert.deepEqual(
            this.requested.slice().sort(),
            ['metrics/admin/kpis/active-admins', 'metrics/admin/kpis/organizations-attention', 'metrics/admin/kpis/organizations-total', 'metrics/admin/kpis/users-total'],
            'every KPI endpoint is requested'
        );
        assert.strictEqual(component.title, 'Admin Overview');
        assert.deepEqual(component.items, [
            { label: 'Users', value: 42 },
            { label: 'Organizations', value: 7 },
            { label: 'Active admins', value: 3 },
            { label: 'Needs attention', value: 1 },
        ]);
        assert.strictEqual(component.error, null, 'no error is recorded on success');
    });

    test('a KPI with no value falls back to zero', async function (assert) {
        this.kpis = {};

        const component = await this.build();

        assert.deepEqual(
            component.items.map((item) => item.value),
            [0, 0, 0, 0],
            'missing metrics read as zero rather than undefined'
        );
    });

    test('a failed load is surfaced as an error message and the items stay at zero', async function (assert) {
        this.getRejectsWith = new Error('metrics endpoint down');

        const component = await this.build();

        assert.strictEqual(component.error, 'metrics endpoint down', "the failure's own message is shown");
        assert.deepEqual(
            component.items.map((item) => item.value),
            [0, 0, 0, 0]
        );
    });

    test('a failure with no message falls back to a generic one', async function (assert) {
        this.getRejectsWith = {};

        const component = await this.build();

        assert.strictEqual(component.error, 'Unable to load admin overview.');
    });
});
