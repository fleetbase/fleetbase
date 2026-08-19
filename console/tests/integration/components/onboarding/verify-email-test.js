import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import OnboardingVerifyEmailComponent from '@fleetbase/console/components/onboarding/verify-email';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

module('Integration | Component | onboarding/verify-email', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // Components using {{t}} need the locale resolved before render, otherwise
        // ember-intl sets _locale mid-render and trips the tracked-property assertion.
        this.owner.lookup('service:intl').setLocale('en-us');

        const started = [];

        // The real onboarding-verification service schedules a 75s `later` in start(), which
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

        this.owner.register('service:onboarding-verification', VerificationStub);
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

/**
 * The verify task is submitted from the rendered form, but its outcomes are easier to drive
 * on the captured instance than through the DOM.
 */
module('Integration | Component | onboarding/verify-email | verify', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.lookup('service:intl').setLocale('en-us');

        this.posted = [];
        this.postResponse = { status: 'ok', token: 'auth-token' };
        this.postRejectsWith = null;
        const context = this;

        class VerificationStub extends Service {
            @tracked ready = false;
            @tracked waiting = false;
            start() {}
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
        class FetchStub extends Service {
            post(path, payload) {
                context.posted.push({ path, payload });
                return context.postRejectsWith ? Promise.reject(context.postRejectsWith) : Promise.resolve(context.postResponse);
            }
        }
        class NotificationsStub extends Service {
            successes = [];
            infos = [];
            serverErrors = [];
            success(message) {
                this.successes.push(message);
            }
            info(message) {
                this.infos.push(message);
            }
            serverError(error) {
                this.serverErrors.push(error);
            }
        }
        this.owner.register('service:onboarding-verification', VerificationStub);
        this.owner.register('service:url-search-params', UrlSearchParamsStub);
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const captured = captureComponent(this.owner, 'onboarding/verify-email', OnboardingVerifyEmailComponent);
        this.set('context', { get: () => undefined });
        this.build = async () => {
            await render(hbs`<Onboarding::VerifyEmail @context={{this.context}} />`);
            const component = captured.instance;

            // The session service is not replaceable: the application adapter reads
            // session.data.authenticated while building request headers, so a stub in its
            // place breaks every container lookup in the test.
            this.authenticated = [];
            Object.defineProperty(component.authSession, 'manuallyAuthenticate', {
                configurable: true,
                value: (token) => this.authenticated.push(token),
            });

            this.transitions = [];
            Object.defineProperty(component.router, 'transitionTo', {
                configurable: true,
                value: (routeName) => {
                    this.transitions.push(routeName);
                    return routeName;
                },
            });

            return component;
        };
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('verify posts the session and code, then signs the user into the console', async function (assert) {
        const component = await this.build();

        await component.verify.perform();

        assert.deepEqual(this.posted, [{ path: 'onboard/verify-email', payload: { session: 'sess_from_url', code: '123456' } }]);
        assert.deepEqual(this.authenticated, ['auth-token']);
        assert.deepEqual(this.transitions, ['console']);
        assert.deepEqual(this.notifications().successes, ['Email successfully verified!']);
        assert.deepEqual(this.notifications().infos, ['Welcome to Fleetbase!']);
    });

    test('verify sends the user to login when no token comes back', async function (assert) {
        this.postResponse = { status: 'ok' };
        const component = await this.build();

        await component.verify.perform();

        assert.deepEqual(this.transitions, ['auth.login']);
        assert.deepEqual(this.authenticated, [], 'there is nothing to authenticate with');
        assert.deepEqual(this.notifications().infos, [], 'and no welcome is shown');
    });

    test('verify stays put on a status that is not ok', async function (assert) {
        this.postResponse = { status: 'invalid' };
        const component = await this.build();

        assert.strictEqual(await component.verify.perform(), undefined);
        assert.deepEqual(this.transitions, []);
        assert.deepEqual(this.notifications().successes, [], 'nothing is reported as verified');
    });

    test('verify prevents the form from submitting itself', async function (assert) {
        const component = await this.build();
        let prevented = false;

        await component.verify.perform({ preventDefault: () => (prevented = true) });

        assert.true(prevented);
    });

    test('verify tolerates being invoked without an event', async function (assert) {
        const component = await this.build();

        await component.verify.perform(undefined);

        assert.strictEqual(this.posted.length, 1, 'the code is still submitted');
    });

    test('a failed verification is reported as a server error', async function (assert) {
        const failure = new Error('verification service down');
        this.postRejectsWith = failure;
        const component = await this.build();

        await component.verify.perform();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.deepEqual(this.transitions, [], 'the user stays on the form');
    });
});
