import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import window from 'ember-window-mock';
import config from '@fleetbase/console/config/environment';

/**
 * Discovery and kickoff for OAuth sign-in.
 *
 * The server owns the whole handshake, so this service does almost nothing: it asks
 * the API which providers an administrator has enabled, and it navigates the browser
 * to the API's redirect endpoint. No provider SDK is ever loaded, and no client id or
 * secret is ever present in the console bundle.
 */
export default class OauthService extends Service {
    @service fetch;

    /**
     * Providers the API reports as enabled: [{ id, label, icon }].
     *
     * @var {Array}
     */
    @tracked providers = [];

    /**
     * Whether an administrator allows new accounts through a provider. When they don't,
     * the sign-up page leaves its provider buttons out rather than let someone find out
     * after the round trip.
     *
     * @var {Boolean}
     */
    @tracked allowsRegistration = false;

    @tracked isLoading = false;

    /**
     * A registration intent handed back by the exchange when the provider identity
     * is not linked to any Fleetbase account.
     *
     * Deliberately in memory only. It is a bearer credential, and it is single-use
     * and short-lived, so persisting it would add real risk to buy very little —
     * a reload simply means running the provider handshake again.
     *
     * @var {Object|null}
     */
    @tracked registration = null;

    /**
     * Whether there is anything to render on the sign-in form.
     */
    get isEnabled() {
        return this.providers.length > 0;
    }

    /**
     * Whether the sign-up page should offer provider buttons.
     */
    get canSignUp() {
        return this.isEnabled && this.allowsRegistration;
    }

    /**
     * Ask the API which providers are enabled.
     *
     * Unauthenticated, and safe to call before a session exists — which is the point,
     * since it decides what the login form shows. Failure is never fatal: a console
     * that cannot reach this endpoint simply renders email/password sign-in, exactly
     * as it did before OAuth existed.
     *
     * @return {Promise<Array>}
     */
    async loadProviders() {
        if (this.isLoading) {
            return this.providers;
        }

        this.isLoading = true;

        try {
            const { providers, allow_registration } = await this.fetch.get('auth/oauth/providers');
            this.providers = Array.isArray(providers) ? providers : [];
            this.allowsRegistration = allow_registration === true;
        } catch (error) {
            this.providers = [];
            this.allowsRegistration = false;
        } finally {
            this.isLoading = false;
        }

        return this.providers;
    }

    /**
     * Begin the handshake by navigating to the API.
     *
     * A top-level navigation, not an XHR: the endpoint answers with a 302 to the
     * identity provider, and fetch() would follow that redirect cross-origin and fail
     * CORS rather than moving the browser.
     *
     * @param {String} providerId
     * @param {Object} options
     * @return {void}
     */
    startAuthorization(providerId, { intent = 'login', returnTo = null } = {}) {
        window.location.assign(this.authorizationUrl(providerId, { intent, returnTo }));
    }

    /**
     * The API URL that starts the handshake.
     *
     * @param {String} providerId
     * @param {Object} options
     * @return {String}
     */
    authorizationUrl(providerId, { intent = 'login', returnTo = null } = {}) {
        const base = [this.apiHost, config.API.namespace, `auth/oauth/${encodeURIComponent(providerId)}/redirect`].filter(Boolean).join('/');
        const params = new URLSearchParams({ intent });

        if (returnTo) {
            params.append('return_to', returnTo);
        }

        return `${base}?${params.toString()}`;
    }

    /**
     * The API origin.
     *
     * Mirrors the fallback in @fleetbase/ember-core's fetch service, which patches a
     * blank config.API.host at module load. Repeating it here rather than relying on
     * that side effect keeps this service independent of module load order.
     *
     * @return {String}
     */
    get apiHost() {
        const host = config.API.host;

        if (host) {
            return host;
        }

        return `${window.location.protocol}//${window.location.host}`;
    }

    /**
     * The signed-in user's linked identities and the providers they could link.
     *
     * @return {Promise<{identities: Array, available: Array, has_password: Boolean}>}
     */
    loadIdentities() {
        return this.fetch.get('auth/oauth/identities');
    }

    /**
     * Begin linking a provider to the signed-in user.
     *
     * The API returns the provider URL rather than redirecting, because the endpoint
     * needs the bearer token and a top-level navigation cannot carry it.
     *
     * @param {String} providerId
     * @return {Promise<void>}
     */
    async startLink(providerId) {
        const { redirect_url } = await this.fetch.post(`auth/oauth/${encodeURIComponent(providerId)}/link`, {}, { rawError: true });

        window.location.assign(redirect_url);
    }

    /**
     * Finish a link from the callback. Protected: the API checks the signed-in user
     * is the one who started it, which is what defeats account-linking CSRF.
     *
     * @param {String} code
     * @return {Promise<Object>}
     */
    completeLink(code) {
        return this.fetch.post('auth/oauth/link/complete', { code }, { rawError: true });
    }

    /**
     * @param {String} providerId
     * @return {Promise<Object>}
     */
    unlink(providerId) {
        return this.fetch.delete(`auth/oauth/${encodeURIComponent(providerId)}/unlink`, {}, { rawError: true });
    }

    /**
     * Remember a registration intent for the onboarding flow to pick up.
     *
     * @param {Object} registration
     * @return {void}
     */
    setRegistration(registration) {
        this.registration = registration ?? null;
    }

    /**
     * @return {void}
     */
    clearRegistration() {
        this.registration = null;
    }
}
