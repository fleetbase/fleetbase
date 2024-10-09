import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/leave-organization', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Modals::LeaveOrganization />`);

        assert.dom().hasText('');

        // Template block usage:
        await render(hbs`
      <Modals::LeaveOrganization>
        template block text
      </Modals::LeaveOrganization>
    `);

        assert.dom().hasText('template block text');
    });
});
