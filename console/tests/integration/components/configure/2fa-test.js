import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | configure/2fa', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Configure::2fa />`);

        assert.dom(this.element).hasText('');

        // Template block usage:
        await render(hbs`
      <Configure::2fa>
        template block text
      </Configure::2fa>
    `);

        assert.dom(this.element).hasText('template block text');
    });
});
