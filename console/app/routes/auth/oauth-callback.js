import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import window from 'ember-window-mock';
import removeBootLoader from '../../utils/remove-boot-loader';

/**
 * Where the API returns the browser after a provider handshake.
 *
 * The API puts the one-time handoff code in the URL FRAGMENT rather than the query
 * string, so it is never sent to the console's web server and cannot land in an
 * access log or a Referer header. This route reads it, clears it out of the address
 * bar before anything else happens, and hands it to the controller to redeem.
 */
export default class AuthOauthCallbackRoute extends Route {
    @service session;
    @service oauth;

    beforeModel() {
        removeBootLoader();

        // Do not prohibitAuthentication() here: an already-signed-in user landing on
        // this route should be let through to the controller, which redirects them
        // rather than erroring.
    }

    model() {
        return this.readFragment();
    }

    setupController(controller, model) {
        super.setupController(controller, model);

        // Not awaited: the template renders its spinner immediately and the
        // controller updates it when the exchange settles.
        controller.start(model);
    }

    /**
     * Read and immediately clear the fragment.
     *
     * Clearing it first means a reload, a bookmark or a shared URL cannot replay the
     * code — and the code is single-use server side regardless.
     *
     * @return {Object}
     */
    readFragment() {
        const hash = window.location.hash.replace(/^#/, '');
        const params = new URLSearchParams(hash);

        const payload = {
            handoff: params.get('handoff'),
            error: params.get('error'),
            returnTo: params.get('return_to'),
            intent: params.get('intent'),
        };

        if (hash) {
            this.clearFragment();
        }

        return payload;
    }

    /**
     * @return {void}
     */
    clearFragment() {
        // replaceState is preferred: it drops the fragment without leaving a bare '#'
        // behind and without adding a history entry.
        try {
            const { pathname, search } = window.location;
            window.history.replaceState(null, '', `${pathname}${search}`);
        } catch (error) {
            // Can throw in some embedding contexts; the fallback below still runs.
        }

        // replaceState does not always take effect — notably it does not touch
        // ember-window-mock's mocked location. Assigning is the reliable floor, and in
        // a real browser the check above has already cleared the hash so this is a
        // no-op rather than a second history entry.
        if (window.location.hash.replace(/^#/, '') !== '') {
            window.location.hash = '';
        }
    }
}
