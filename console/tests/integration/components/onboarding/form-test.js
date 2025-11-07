import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | onboarding/form', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Onboarding::Form />`);

        assert.dom().hasText('');

        // Template block usage:
        await render(hbs`
      <Onboarding::Form>
        template block text
      </Onboarding::Form>
    `);

        assert.dom().hasText('template block text');
    });
});
