import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | onboarding/yield', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Onboarding::Yield />`);

        assert.dom().hasText('');

        // Template block usage:
        await render(hbs`
      <Onboarding::Yield>
        template block text
      </Onboarding::Yield>
    `);

        assert.dom().hasText('template block text');
    });
});
