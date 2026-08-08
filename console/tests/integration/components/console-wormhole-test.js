import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | console-wormhole', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the console wormhole destination element', async function (assert) {
        await render(hbs`<ConsoleWormhole />`);

        assert.dom('#console-wormhole').exists('other components can wormhole into this element');
    });
});
