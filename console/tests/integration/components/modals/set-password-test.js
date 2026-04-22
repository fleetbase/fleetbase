import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/set-password', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Modals::SetPassword />`);

        assert.dom().hasText('');

        // Template block usage:
        await render(hbs`
      <Modals::SetPassword>
        template block text
      </Modals::SetPassword>
    `);

        assert.dom().hasText('template block text');
    });
});
