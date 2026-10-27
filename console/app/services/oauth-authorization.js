import Service from '@ember/service';
import window from 'ember-window-mock';
import config from '@fleetbase/console/config/environment';

/**
 * Keeps an app's "Continue with Fleetbase" request while the user signs in.
 *
 * The consent page saves the request before sending a signed-out user to log in. Login,
 * two-factor, OAuth sign-in, sign-up and Cloud onboarding all finish on the `console` route,
 * which calls resume() and brings the user back to the consent page. Saving it in
 * localStorage (not the session) keeps it across the email verification tab.
 *
 * The parameters are the app's own authorization request. Nothing here is trusted: the API
 * checks them again on every call.
 */
export const STORAGE_KEY = 'fleetbase:oauth-authorization';
export const PENDING_TTL_MS = 30 * 60 * 1000;
export const PARAMS = ['response_type', 'client_id', 'redirect_uri', 'scope', 'state', 'nonce', 'code_challenge', 'code_challenge_method', 'prompt', 'max_age', 'login_hint', 'ui_locales'];

export default class OauthAuthorizationService extends Service {
    /**
     * The authorization request's own parameters from a query string, or null.
     *
     * @param {String} search
     * @return {Object|null}
     */
    paramsFrom(search = '') {
        const query = new URLSearchParams(search);
        const params = {};
        for (const key of PARAMS) {
            if (query.has(key)) {
                params[key] = query.get(key);
            }
        }

        return params.client_id ? params : null;
    }

    save(params) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ params, savedAt: Date.now() }));
        } catch (error) {
            // Private mode or blocked storage: the user starts again from the app after signing in.
        }
    }

    /**
     * The saved request, if there is one and it isn't stale.
     *
     * @return {Object|null}
     */
    pending() {
        try {
            const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
            if (!saved || !saved.params?.client_id || Date.now() - saved.savedAt > PENDING_TTL_MS) {
                this.clear();
                return null;
            }

            return saved.params;
        } catch (error) {
            return null;
        }
    }

    clear() {
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            // Nothing saved, or storage blocked.
        }
    }

    /**
     * Go back to the consent page if a request is waiting.
     *
     * A full navigation rather than a route transition, so the request is back in the address
     * bar and a reload of the consent page still works.
     *
     * @return {Boolean} whether it navigated
     */
    resume() {
        const params = this.pending();
        if (!params) {
            return false;
        }

        this.clear();
        window.location.assign(this.consentUrl(params));

        return true;
    }

    consentUrl(params) {
        const rootURL = (config.rootURL ?? '/').replace(/\/$/, '');

        return `${rootURL}/oauth/authorize?${new URLSearchParams(params).toString()}`;
    }

    /**
     * Leave the console for the app (or its error page). A full navigation, never a route.
     *
     * @param {String} url
     */
    leaveTo(url) {
        this.clear();
        window.location.assign(url);
    }
}
