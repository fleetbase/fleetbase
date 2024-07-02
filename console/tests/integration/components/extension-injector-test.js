import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | extension-injector', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<ExtensionInjector />`);

        assert.dom().hasText('');

        // Template block usage:
        await render(hbs`
      <ExtensionInjector>
        template block text
      </ExtensionInjector>
    `);

        assert.dom().hasText('template block text');
    });
});
