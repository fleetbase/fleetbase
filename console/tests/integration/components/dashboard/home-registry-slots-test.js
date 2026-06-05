import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Component from '@glimmer/component';
import { setComponentTemplate } from '@ember/component';

class BeforeDashboardSlotComponent extends Component {}
class AfterDashboardSlotComponent extends Component {}

setComponentTemplate(hbs`<div data-test-before-dashboard-slot>Before dashboard</div>`, BeforeDashboardSlotComponent);
setComponentTemplate(hbs`<div data-test-after-dashboard-slot>After dashboard</div>`, AfterDashboardSlotComponent);

module('Integration | Component | dashboard home registry slots', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        const registryService = this.owner.lookup('service:universe/registry-service');
        registryService.createRegistries(['console:home:before-dashboard', 'console:home:after-dashboard']);
        registryService.registerRenderableComponent('console:home:before-dashboard', BeforeDashboardSlotComponent);
        registryService.registerRenderableComponent('console:home:after-dashboard', AfterDashboardSlotComponent);
    });

    test('it renders registered home slot components around the dashboard', async function (assert) {
        await render(hbs`
            <RegistryYield @registry="console:home:before-dashboard" as |RegistryComponent|>
                <RegistryComponent @position="before-dashboard" />
            </RegistryYield>
            <div data-test-dashboard-anchor>Dashboard</div>
            <RegistryYield @registry="console:home:after-dashboard" as |RegistryComponent|>
                <RegistryComponent @position="after-dashboard" />
            </RegistryYield>
        `);

        assert.dom('[data-test-before-dashboard-slot]').exists();
        assert.dom('[data-test-dashboard-anchor]').exists();
        assert.dom('[data-test-after-dashboard-slot]').exists();

        const before = this.element.querySelector('[data-test-before-dashboard-slot]');
        const dashboard = this.element.querySelector('[data-test-dashboard-anchor]');
        const after = this.element.querySelector('[data-test-after-dashboard-slot]');

        assert.true(Boolean(before.compareDocumentPosition(dashboard) & Node.DOCUMENT_POSITION_FOLLOWING), 'before slot renders before dashboard');
        assert.true(Boolean(dashboard.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING), 'after slot renders after dashboard');
    });
});
