import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import pathToRoute from '@fleetbase/ember-core/utils/path-to-route';

/**
 * Error codes the API can put in the callback fragment, or return from the exchange,
 * mapped to translation keys. Anything unrecognised falls back to a generic message —
 * the console never renders a raw server string here.
 */
const ERROR_KEYS = {
    access_denied: 'auth.login.oauth.errors.access-denied',
    provider_error: 'auth.login.oauth.errors.provider-error',
    provider_disabled: 'auth.login.oauth.errors.provider-disabled',
    invalid_state: 'auth.login.oauth.errors.invalid-state',
    missing_code: 'auth.login.oauth.errors.invalid-state',
    exchange_failed: 'auth.login.oauth.errors.exchange-failed',
    invalid_exchange_code: 'auth.login.oauth.errors.expired',
    hosted_domain_mismatch: 'auth.login.oauth.errors.hosted-domain',
    registration_disabled: 'auth.login.oauth.errors.registration-disabled',
    link_required: 'auth.login.oauth.errors.link-required',
    customer_login_not_allowed: 'auth.login.oauth.errors.customer-account',
    not_verified: 'auth.login.oauth.errors.not-verified',
    rate_limited: 'auth.login.oauth.errors.rate-limited',
    already_linked: 'auth.login.oauth.errors.already-linked',
    identity_already_linked: 'auth.login.oauth.errors.identity-already-linked',
};

export default class AuthOauthCallbackController extends Controller {
    @service session;
    @service router;
    @service fetch;
    @service intl;
    @service notifications;
    @service oauth;

    /**
     * Shown in place of the spinner when the handshake could not be completed.
     *
     * @var {String|null}
     */
    @tracked error = null;

    @tracked isExchanging = true;

    /**
     * Redeem the handoff code and route the user onward.
     *
     * @param {Object} payload
     * @return {Promise<void>}
     */
    async start(payload = {}) {
        const { handoff, error, returnTo, intent } = payload;

        if (intent === 'link') {
            return this.finishLink(handoff, error);
        }

        if (error) {
            return this.fail(error);
        }

        if (!handoff) {
            return this.fail('invalid_state');
        }

        let response;

        try {
            // rawError: without it the fetch service unwraps the body to
            // `new Error(errors[0])` and discards `code`, leaving nothing to map to
            // copy. The installation service reads server codes the same way.
            response = await this.fetch.post('auth/oauth/exchange', { code: handoff }, { rawError: true });
        } catch (serverError) {
            return this.fail(this.codeFrom(serverError));
        }

        return this.handle(response, returnTo);
    }

    /**
     * Finish linking a provider to the signed-in user.
     *
     * Goes through the protected endpoint, never the public exchange: the API checks
     * that the signed-in user is the one who started the link. Either way the user is
     * returned to their account page, where the result shows.
     *
     * @param {String|null} handoff
     * @param {String|null} error
     * @return {Promise<void>}
     */
    async finishLink(handoff, error) {
        const destination = 'console.account.auth';

        if (error || !handoff) {
            this.isExchanging = false;
            this.notifications.error(this.intl.t(ERROR_KEYS[error] ?? 'auth.login.oauth.errors.link-failed'));

            return this.router.transitionTo(destination);
        }

        try {
            await this.oauth.completeLink(handoff);
            this.notifications.success(this.intl.t('auth.login.oauth.linked'));
        } catch (serverError) {
            const code = this.codeFrom(serverError);
            this.notifications.error(this.intl.t(code === 'invalid_exchange_code' ? 'auth.login.oauth.errors.link-failed' : (ERROR_KEYS[code] ?? 'auth.login.oauth.errors.link-failed')));
        }

        this.isExchanging = false;

        return this.router.transitionTo(destination);
    }

    /**
     * Route on one of the exchange's outcomes.
     *
     * @param {Object} response
     * @param {String|null} returnTo
     * @return {Promise<void>}
     */
    async handle(response = {}, returnTo = null) {
        // 2FA is not waived for a provider sign-in — the server issues no token until
        // the second factor is satisfied.
        if (response.isEnabled === true && response.twoFaSession) {
            this.isExchanging = false;
            return this.router.transitionTo('auth.two-fa', { queryParams: { token: response.twoFaSession } });
        }

        if (response.status === 'registration_required') {
            this.oauth.setRegistration({ intent: response.intent, prefill: response.prefill ?? {} });
            this.isExchanging = false;
            this.notifications.info(this.intl.t('auth.login.oauth.finish-signup'));

            return this.router.transitionTo('onboard');
        }

        if (response.token) {
            this.setRedirect(returnTo);

            // Establishes the session and, through the session service's
            // handleAuthentication(), performs the transition itself.
            return this.session.manuallyAuthenticate(response.token);
        }

        return this.fail('exchange_failed');
    }

    /**
     * Point the post-authentication transition at the originally requested page.
     *
     * The path was validated server side before it was ever echoed back, and is
     * converted to a route name the same way the password login path does it.
     *
     * @param {String|null} returnTo
     * @return {void}
     */
    setRedirect(returnTo) {
        if (!returnTo || typeof returnTo !== 'string' || !returnTo.startsWith('/')) {
            return;
        }

        const route = pathToRoute(returnTo);

        if (route) {
            this.session.setRedirect(route);
        }
    }

    /**
     * Render a message and send the user back to sign in.
     *
     * @param {String} code
     * @return {Promise<void>}
     */
    @action fail(code) {
        const key = ERROR_KEYS[code] ?? 'auth.login.oauth.errors.generic';

        this.error = this.intl.t(key);
        this.isExchanging = false;
        this.notifications.error(this.error);

        return this.router.transitionTo('auth.login');
    }

    /**
     * Pull the machine code out of an API error, ignoring any human-readable text.
     *
     * @param {Object|Error} error
     * @return {String}
     */
    codeFrom(error) {
        if (!error) {
            return 'exchange_failed';
        }

        // With rawError the rejection IS the parsed body, so `code` is at the top
        // level. The fallbacks cover a non-raw rejection slipping through.
        const code = error.code ?? error?.payload?.code ?? error?.json?.code;

        return typeof code === 'string' ? code : 'exchange_failed';
    }
}
