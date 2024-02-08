import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | dashboard/widget-panel', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Dashboard::WidgetPanel />`);

        assert.dom().hasText('');

        // Template block usage:
        await render(hbs`
      <Dashboard::WidgetPanel>
        template block text
      </Dashboard::WidgetPanel>
    `);

        assert.dom().hasText('template block text');
    });
});
