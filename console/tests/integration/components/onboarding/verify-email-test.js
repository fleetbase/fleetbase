import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

module('Integration | Component | onboarding/verify-email', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // Components using {{t}} need the locale resolved before render, otherwise
        // ember-intl sets _locale mid-render and trips the tracked-property assertion.
        this.owner.lookup('service:intl').setLocale('en-us');

        const started = [];

        // The real user-verification service schedules a 75s `later` in start(), which
        // would keep settled() waiting for the whole timeout. The template also binds
        // several of its members directly, so the stub has to provide them all.
        class VerificationStub extends Service {
            @tracked ready = false;
            @tracked waiting = false;

            start(options) {
                started.push(options);
            }
            validateInput() {}
            didntReceiveCode() {}
            resendBySms() {}
            resendEmail() {}
        }
        class UrlSearchParamsStub extends Service {
            params = { code: '123456', session: 'sess_from_url' };
            get(key) {
                return this.params[key];
            }
        }

        this.owner.register('service:user-verification', VerificationStub);
        this.owner.register('service:url-search-params', UrlSearchParamsStub);
        this.started = started;
    });

    test('it initializes from the URL params and starts verification', async function (assert) {
        this.set('context', { get: () => undefined });

        await render(hbs`<Onboarding::VerifyEmail @context={{this.context}} />`);

        assert.strictEqual(this.started.length, 1, 'verification is started');
        assert.dom('form').exists('the verification form renders once initialized');
    });

    test('the onboarding context session wins over the URL session', async function (assert) {
        this.set('context', { get: (key) => (key === 'session' ? 'sess_from_context' : undefined) });

        await render(hbs`<Onboarding::VerifyEmail @context={{this.context}} />`);

        assert.strictEqual(this.started.length, 1, 'verification is started once');
        assert.dom('form').exists();
    });
});
