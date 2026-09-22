import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, fillIn, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import OnboardingFormComponent from '@fleetbase/console/components/onboarding/form';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

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

/**
 * The onboard task runs behind a submit button that stays disabled until every field is
 * filled, and `phone` is only reachable through PhoneInput's @onInput, so drive the task
 * on the captured instance instead of through the DOM.
 */
module('Integration | Component | onboarding/form | onboard', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.lookup('service:intl').setLocale('en-us');

        this.posted = [];
        this.postResponse = { status: 'success', session: 'session-token' };
        this.postRejectsWith = null;
        this.persisted = [];
        this.orchestratorCalls = [];
        const context = this;

        class FetchStub extends Service {
            async post(path, payload) {
                context.posted.push({ path, payload });

                if (context.postRejectsWith) {
                    throw context.postRejectsWith;
                }

                return context.postResponse;
            }
        }
        class NotificationsStub extends Service {
            errors = [];
            successes = [];
            serverErrors = [];
            error(message) {
                this.errors.push(message);
            }
            success(message) {
                this.successes.push(message);
            }
            serverError(error) {
                this.serverErrors.push(error);
            }
        }
        class SessionStub extends Service {
            authenticated = [];
            isOnboarding() {
                return {
                    manuallyAuthenticate: (token) => this.authenticated.push(token),
                };
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:session', SessionStub);

        this.set('context', { persist: (key, value) => this.persisted.push([key, value]) });
        this.set('orchestrator', {
            current: { id: 'verify-email' },
            next: () => this.orchestratorCalls.push('next'),
        });

        const captured = captureComponent(this.owner, 'onboarding/form', OnboardingFormComponent);
        this.build = async () => {
            await render(hbs`<Onboarding::Form @context={{this.context}} @orchestrator={{this.orchestrator}} />`);
            const component = captured.instance;

            // The router is built in and cannot be swapped through owner.register.
            this.transitions = [];
            Object.defineProperty(component.router, 'transitionTo', {
                configurable: true,
                value: (routeName) => {
                    this.transitions.push(routeName);
                    return Promise.resolve(routeName);
                },
            });
            this.urlParams = [];
            Object.defineProperty(component.urlSearchParams, 'setParamsToCurrentUrl', {
                configurable: true,
                value: (params) => this.urlParams.push(params),
            });

            return component;
        };

        this.fillValidly = (component) => {
            component.name = 'Ron Richardson';
            component.email = 'ron@fleetbase.io';
            component.phone = '+15551234567';
            component.organization_name = 'Fleetbase';
            component.password = 'super-secret-password';
            component.password_confirmation = 'super-secret-password';
        };
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('filled only reports true once every field has a value', async function (assert) {
        const component = await this.build();

        assert.false(component.filled, 'an empty form is not ready');

        this.fillValidly(component);
        assert.true(component.filled);

        component.phone = '';
        assert.false(component.filled, 'a blank phone number blocks submission');
    });

    test('onboard reports the first validation failure and sends nothing', async function (assert) {
        const component = await this.build();

        await component.onboard.perform();

        assert.deepEqual(this.posted, [], 'no account is created');
        assert.strictEqual(this.notifications().errors.length, 1, 'a validation message is shown');
        assert.ok(this.notifications().errors[0], 'the message is not empty');
    });

    test('onboard rejects a password confirmation that does not match', async function (assert) {
        const component = await this.build();
        this.fillValidly(component);
        component.password_confirmation = 'something-else';

        await component.onboard.perform();

        assert.deepEqual(this.posted, [], 'no account is created');
        assert.strictEqual(this.notifications().errors.length, 1);
    });

    test('onboard prevents the default form submission', async function (assert) {
        const component = await this.build();
        let prevented = false;

        await component.onboard.perform({ preventDefault: () => (prevented = true) });

        assert.true(prevented, 'the browser does not navigate away');
    });

    test('onboard posts the account with the resolved timezone and advances the flow', async function (assert) {
        const component = await this.build();
        this.fillValidly(component);

        await component.onboard.perform();

        const { path, payload } = this.posted.at(-1);
        assert.strictEqual(path, 'onboard/create-account');
        assert.strictEqual(payload.email, 'ron@fleetbase.io');
        assert.strictEqual(payload.organization_name, 'Fleetbase');
        assert.strictEqual(payload.timezone, Intl.DateTimeFormat().resolvedOptions().timeZone, 'the browser timezone is sent along');
        assert.deepEqual(this.persisted, [['session', 'session-token']], 'the session is persisted for the next step');
        assert.deepEqual(this.orchestratorCalls, ['next'], 'the onboarding flow advances');
        assert.deepEqual(this.urlParams, [{ step: 'verify-email', session: 'session-token' }], 'the URL records where the flow is up to');
        assert.deepEqual(this.transitions, [], 'the user stays in the onboarding flow');
    });

    test('onboard signs the user straight in when verification is skipped', async function (assert) {
        this.postResponse = { status: 'success', session: 'session-token', skipVerification: true, token: 'auth-token' };
        const component = await this.build();
        this.fillValidly(component);

        await component.onboard.perform();

        assert.deepEqual(this.owner.lookup('service:session').authenticated, ['auth-token']);
        assert.deepEqual(this.transitions, ['console'], 'the user lands in the console');
        assert.deepEqual(this.notifications().successes, ['Welcome to Fleetbase!']);
        assert.deepEqual(this.orchestratorCalls, [], 'the onboarding flow is not advanced');
    });

    test('onboard stays in the flow when a token is missing despite skipVerification', async function (assert) {
        this.postResponse = { status: 'success', session: 'session-token', skipVerification: true };
        const component = await this.build();
        this.fillValidly(component);

        await component.onboard.perform();

        assert.deepEqual(this.transitions, [], 'without a token there is nothing to authenticate with');
        assert.deepEqual(this.orchestratorCalls, ['next'], 'so the verification step is used instead');
    });

    test('onboard reports an unsuccessful status and stops', async function (assert) {
        this.postResponse = { status: 'failed' };
        const component = await this.build();
        this.fillValidly(component);

        await component.onboard.perform();

        assert.deepEqual(this.notifications().errors, ['Onboard failed']);
        assert.deepEqual(this.persisted, [], 'no session is stored');
        assert.deepEqual(this.orchestratorCalls, []);
    });

    test('onboard surfaces a failed request as a server error', async function (assert) {
        const failure = new Error('signup service unavailable');
        this.postRejectsWith = failure;
        const component = await this.build();
        this.fillValidly(component);

        await component.onboard.perform();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
    });

    test('a signup started from a provider drops the password fields and prefills the identity', async function (assert) {
        const oauth = this.owner.lookup('service:oauth');
        oauth.setRegistration({ intent: 'rti_abc', prefill: { name: 'Ada Lovelace', email: 'ada@example.com', email_verified: true } });

        await render(hbs`<Onboarding::Form />`);

        // The provider identity IS the credential, so no password is collected.
        assert.dom('input[type="password"]').doesNotExist('no password fields are rendered');
        assert.dom('input[type="email"]').hasValue('ada@example.com', 'the provider email is prefilled');
        assert.dom('input[type="email"]').isDisabled('the email is locked to the address the provider verified');
    });

    test('an email the provider did not verify stays editable', async function (assert) {
        const oauth = this.owner.lookup('service:oauth');
        oauth.setRegistration({ intent: 'rti_abc', prefill: { name: 'Ada Lovelace', email: 'ada@example.com', email_verified: false } });

        await render(hbs`<Onboarding::Form />`);

        // Only a suggestion: they may use another address, verified by code as usual.
        assert.dom('input[type="email"]').hasValue('ada@example.com');
        assert.dom('input[type="email"]').isNotDisabled();
    });

    test('a provider signup can be submitted without a password', async function (assert) {
        const oauth = this.owner.lookup('service:oauth');
        oauth.setRegistration({ intent: 'rti_abc', prefill: { name: 'Ada Lovelace', email: 'ada@example.com' } });

        const captured = captureComponent(this.owner, 'onboarding/form', OnboardingFormComponent);
        await render(hbs`<Onboarding::Form />`);

        const component = captured.instance;
        component.phone = '+15555550123';
        component.organization_name = 'Compiler Logistics';

        assert.true(component.hasOauthIntent, 'the component picked up the intent');
        assert.true(component.filled, 'a password is not required to submit');
        assert.deepEqual(component.requiredFields, ['name', 'email', 'phone', 'organization_name']);
    });

    test('a password signup still requires a password', async function (assert) {
        const captured = captureComponent(this.owner, 'onboarding/form', OnboardingFormComponent);
        await render(hbs`<Onboarding::Form />`);

        const component = captured.instance;
        component.name = 'Ada Lovelace';
        component.email = 'ada@example.com';
        component.phone = '+15555550123';
        component.organization_name = 'Compiler Logistics';

        assert.false(component.hasOauthIntent);
        assert.false(component.filled, 'the password fields are still required');

        component.password = 'correct horse battery staple';
        component.password_confirmation = 'correct horse battery staple';
        assert.true(component.filled);
    });

    test('the intent is sent with the signup and cleared once spent', async function (assert) {
        const posted = [];

        class FetchStub extends Service {
            post(path, body) {
                posted.push({ path, body });
                return Promise.resolve({ status: 'success', session: 'sess', skipVerification: false });
            }
        }

        this.owner.register('service:fetch', FetchStub);

        const oauth = this.owner.lookup('service:oauth');
        oauth.setRegistration({ intent: 'rti_abc', prefill: { name: 'Ada Lovelace', email: 'ada@example.com' } });

        this.noop = () => {};

        const captured = captureComponent(this.owner, 'onboarding/form', OnboardingFormComponent);
        await render(hbs`<Onboarding::Form @context={{hash persist=this.noop}} @orchestrator={{hash next=this.noop}} />`);

        const component = captured.instance;
        component.phone = '+15555550123';
        component.organization_name = 'Compiler Logistics';

        await component.onboard.perform();

        assert.strictEqual(posted.length, 1, 'the account was created');
        assert.strictEqual(posted[0].body.oauth_intent, 'rti_abc', 'the intent is sent in place of a password');
        assert.notOk(posted[0].body.password, 'no password is sent');
        // Single use: it is spent server side and must not be replayed.
        assert.strictEqual(oauth.registration, null, 'the intent is cleared afterwards');
    });

    test('the intent is never written to the onboarding context', async function (assert) {
        const context = this.owner.lookup('service:onboarding-context');

        context.set('oauth_intent', 'rti_abc', { persist: true });
        context.merge({ oauth_intent: 'rti_def', organization_name: 'Compiler Logistics' }, { persist: true });

        // It is a single-use bearer credential proving a verified identity; it belongs
        // in memory for the length of the wizard, not in localStorage.
        assert.notOk(context.data.oauth_intent, 'the intent is not held in the context');
        assert.strictEqual(context.data.organization_name, 'Compiler Logistics', 'other values still merge');
    });

    test('it offers the provider buttons when sign-ups through a provider are open', async function (assert) {
        const oauth = this.owner.lookup('service:oauth');
        oauth.providers = [
            { id: 'google', label: 'Google', icon: 'google' },
            { id: 'github', label: 'GitHub', icon: 'github' },
        ];
        oauth.allowsRegistration = true;
        const started = [];
        oauth.startAuthorization = (id, options) => started.push([id, options]);

        await render(hbs`<Onboarding::Form />`);

        assert.dom('[data-test-oauth-signup] [data-test-oauth-provider]').exists({ count: 2 });
        assert.dom('[data-test-oauth-signup]').containsText('Continue with Google');
        assert.dom(this.element).containsText('Or sign up with email');

        await click('[data-test-oauth-provider="google"]');

        assert.deepEqual(started, [['google', { intent: 'signup' }]], 'the handshake is marked as a sign-up');
    });

    test('it leaves the provider buttons out when sign-ups are closed', async function (assert) {
        const oauth = this.owner.lookup('service:oauth');
        oauth.providers = [{ id: 'google', label: 'Google', icon: 'google' }];
        oauth.allowsRegistration = false;

        await render(hbs`<Onboarding::Form />`);

        assert.dom('[data-test-oauth-signup]').doesNotExist();
        assert.dom(this.element).doesNotContainText('Or sign up with email');
    });

    test('it leaves the provider buttons out once the form is prefilled from a provider', async function (assert) {
        const oauth = this.owner.lookup('service:oauth');
        oauth.providers = [{ id: 'google', label: 'Google', icon: 'google' }];
        oauth.allowsRegistration = true;
        oauth.setRegistration({ intent: 'rti_abc', prefill: { name: 'Ada Lovelace', email: 'ada@example.com' } });

        await render(hbs`<Onboarding::Form />`);

        assert.dom('[data-test-oauth-signup]').doesNotExist();
    });

    test('a second press while leaving for the provider does nothing', async function (assert) {
        const captured = captureComponent(this.owner, 'onboarding/form', OnboardingFormComponent);
        const oauth = this.owner.lookup('service:oauth');
        const started = [];
        oauth.startAuthorization = (id) => started.push(id);

        await render(hbs`<Onboarding::Form />`);
        captured.instance.continueWithProvider({ id: 'google' });
        captured.instance.continueWithProvider({ id: 'google' });
        captured.instance.continueWithProvider(null);

        assert.deepEqual(started, ['google']);
    });

    test('a sign-up starts with no provider intent, nothing started and no verified email', function (assert) {
        // Tracked defaults run lazily on first read. Each of these is assigned before it is
        // ever read in normal use, so read them fresh here to pin the defaults.
        const component = Object.create(OnboardingFormComponent.prototype);

        assert.strictEqual(component.oauthIntent, null);
        assert.false(component.isStartingProvider);
        assert.false(component.emailVerifiedByProvider);
    });

    test('an intent without a prefill starts empty and unlocked', async function (assert) {
        const captured = captureComponent(this.owner, 'onboarding/form', OnboardingFormComponent);
        this.owner.lookup('service:oauth').setRegistration({ intent: 'rti_abc' });

        await render(hbs`<Onboarding::Form />`);

        assert.strictEqual(captured.instance.name, null);
        assert.strictEqual(captured.instance.email, null);
        assert.false(captured.instance.emailVerifiedByProvider);
        assert.false(captured.instance.isEmailLocked);
    });
});
