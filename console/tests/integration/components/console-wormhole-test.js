import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | console-wormhole', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<ConsoleWormhole />`);

        assert.dom().hasText('');

        // Template block usage:
        await render(hbs`
      <ConsoleWormhole>
        template block text
      </ConsoleWormhole>
    `);

        assert.dom().hasText('template block text');
    });
});
