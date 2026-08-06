import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

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
