import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/edit-organization', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // Components using {{t}} need the locale resolved before render, otherwise
        // ember-intl sets _locale mid-render and trips the tracked-property assertion.
        this.owner.lookup('service:intl').setLocale('en-us');
    });

    test('it renders the organization fields bound to the modal options', async function (assert) {
        this.set('options', {
            title: 'Edit Organization',
            organization: { name: 'Acme', description: 'Movers', phone: '+15550000', currency: 'USD' },
        });

        await render(hbs`<Modals::EditOrganization @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.dom(this.element).containsText('Organization name');
        assert.dom(this.element).containsText('Organization description');

        // The inputs receive their value as a property, not a value="" attribute, so an
        // attribute selector would not match.
        const values = [...this.element.querySelectorAll('input')].map((input) => input.value);
        assert.ok(values.includes('Acme'), 'the organization name is bound');
        assert.ok(values.includes('Movers'), 'the organization description is bound');
    });
});
