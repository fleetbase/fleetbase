import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | two-fa-enforcement-alert', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<TwoFaEnforcementAlert />`);

        assert.dom().hasText('');

        // Template block usage:
        await render(hbs`
      <TwoFaEnforcementAlert>
        template block text
      </TwoFaEnforcementAlert>
    `);

        assert.dom().hasText('template block text');
    });
});
