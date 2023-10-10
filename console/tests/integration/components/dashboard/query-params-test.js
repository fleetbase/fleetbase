import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | dashboard/query-params', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Dashboard::QueryParams />`);

        assert.dom(this.element).hasText('');

        // Template block usage:
        await render(hbs`
      <Dashboard::QueryParams>
        template block text
      </Dashboard::QueryParams>
    `);

        assert.dom(this.element).hasText('template block text');
    });
});
