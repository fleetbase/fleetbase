import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | configure/notification-channels', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Configure::NotificationChannels />`);

        assert.dom(this.element).hasText('');

        // Template block usage:
        await render(hbs`
      <Configure::NotificationChannels>
        template block text
      </Configure::NotificationChannels>
    `);

        assert.dom(this.element).hasText('template block text');
    });
});
