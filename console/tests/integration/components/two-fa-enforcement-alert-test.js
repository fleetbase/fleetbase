import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

function registerFetch(owner, response) {
    class FetchStub extends Service {
        get() {
            return Promise.resolve(response);
        }
    }
    owner.register('service:fetch', FetchStub);
}

module('Integration | Component | two-fa-enforcement-alert', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // Components using {{t}} need the locale resolved before render, otherwise
        // ember-intl sets _locale mid-render and trips the tracked-property assertion.
        this.owner.lookup('service:intl').setLocale('en-us');
    });

    test('it renders the alert when 2FA is enforced', async function (assert) {
        registerFetch(this.owner, { shouldEnforce: true });

        await render(hbs`<TwoFaEnforcementAlert />`);

        assert.dom('.two-fa-enforcement-alert').exists('the alert is shown');
        assert.dom('#two-fa-setup-button').exists('the setup button is offered');
    });

    test('it renders nothing when 2FA is not enforced', async function (assert) {
        registerFetch(this.owner, { shouldEnforce: false });

        await render(hbs`<TwoFaEnforcementAlert />`);

        assert.dom('.two-fa-enforcement-alert').doesNotExist();
    });

    test('it renders nothing when the enforcement check returns nothing', async function (assert) {
        registerFetch(this.owner, null);

        await render(hbs`<TwoFaEnforcementAlert />`);

        assert.dom('.two-fa-enforcement-alert').doesNotExist();
    });

    test('the setup button transitions to the account auth settings', async function (assert) {
        registerFetch(this.owner, { shouldEnforce: true });

        await render(hbs`<TwoFaEnforcementAlert />`);

        // RouterService can't be swapped via owner.register; patch the instance the
        // component resolves.
        let transitionedTo;
        const router = this.owner.lookup('service:router');
        Object.defineProperty(router, 'transitionTo', {
            configurable: true,
            value: (routeName) => (transitionedTo = routeName),
        });

        await click('#two-fa-setup-button');

        assert.strictEqual(transitionedTo, 'console.account.auth');
    });
});

module('Integration | Component | two-fa-enforcement-alert | failure', function (hooks) {
    setupRenderingTest(hooks);

    test('an enforcement check that fails is reported and the alert stays hidden', async function (assert) {
        const failure = new Error('enforcement endpoint unavailable');
        const serverErrors = [];

        class FetchStub extends Service {
            get() {
                return Promise.reject(failure);
            }
        }
        class NotificationsStub extends Service {
            serverError(error) {
                serverErrors.push(error);
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        await render(hbs`<TwoFaEnforcementAlert />`);

        assert.deepEqual(serverErrors, [failure]);
        assert.dom('.two-fa-enforcement-alert').doesNotExist('nothing is demanded of the user when the check could not run');
    });
});
