import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, fillIn } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | onboarding/form', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // Components using {{t}} need the locale resolved before render, otherwise
        // ember-intl sets _locale mid-render and trips the tracked-property assertion.
        this.owner.lookup('service:intl').setLocale('en-us');
    });

    test('it renders the onboarding form with a disabled submit button', async function (assert) {
        await render(hbs`<Onboarding::Form />`);

        assert.dom('form').exists('the signup form renders');
        // The submit button is bound to {{not this.filled}}, so an empty form is disabled.
        assert.dom('button[type="submit"]').isDisabled('submitting is blocked until every field is filled');
    });

    test('the phone number is required before the form can be submitted', async function (assert) {
        await render(hbs`<Onboarding::Form />`);

        // Every text field is filled here, but `phone` is bound through PhoneInput's
        // @onInput rather than a plain value binding, so typing into the DOM inputs alone
        // leaves it blank — and `filled` requires all six values.
        const inputs = [...this.element.querySelectorAll('form input')];
        assert.ok(inputs.length >= 6, 'precondition: the form renders all of its fields');

        for (const input of inputs) {
            await fillIn(input, input.type === 'email' ? 'ron@fleetbase.io' : 'a-value');
        }

        assert.dom('button[type="submit"]').isDisabled('submitting stays blocked until the phone number is captured');
    });

    test('it renders the brand logo when a brand is supplied', async function (assert) {
        await render(hbs`<Onboarding::Form @brand={{hash logo_url="/images/fleetbase-logo-svg.svg"}} />`);

        assert.dom('img').exists('the brand logo renders');
    });
});
