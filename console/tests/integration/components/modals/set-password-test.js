import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/set-password', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // Components using {{t}} need the locale resolved before render, otherwise
        // ember-intl sets _locale mid-render and trips the tracked-property assertion.
        this.owner.lookup('service:intl').setLocale('en-us');
    });

    test('it renders the set-password modal body', async function (assert) {
        this.set('options', { title: 'Set Password' });

        await render(hbs`<Modals::SetPassword @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.dom('.modal-body-container').exists('the modal body renders');
        assert.dom('input[type="password"]').exists({ count: 2 }, 'a password and confirmation field are offered');
    });
});
