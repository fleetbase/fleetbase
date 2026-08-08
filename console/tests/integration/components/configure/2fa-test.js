import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | configure/2fa', function (hooks) {
    setupRenderingTest(hooks);

    test('it yields its block content', async function (assert) {
        await render(hbs`
            <Configure::2fa>
                <span class="yielded">two factor settings</span>
            </Configure::2fa>
        `);

        assert.dom('.yielded').exists('the block is yielded');
        assert.dom(this.element).hasText('two factor settings');
    });

    test('it renders nothing without a block', async function (assert) {
        await render(hbs`<Configure::2fa />`);

        assert.dom(this.element).hasText('');
    });
});
