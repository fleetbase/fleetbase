import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import window from 'ember-window-mock';

/**
 * The consent screen for an app's "Continue with Fleetbase" request.
 *
 * The API's /oauth/authorize sends the user here with the app's request in the query string
 * (or, when the app itself is unknown, an `error`). A signed-out user is sent to sign in and
 * brought back by the console route once they are in.
 */
export default class OauthAuthorizeRoute extends Route {
    @service session;
    @service router;
    @service oauthAuthorization;

    async model(routeParams, transition) {
        const search = window.location.search;
        const query = new URLSearchParams(search);

        // The API refused the request before it reached us and could not send it back to the app.
        if (query.get('error')) {
            return { error: query.get('error') };
        }

        const params = this.oauthAuthorization.paramsFrom(search);
        if (!params) {
            return { error: 'invalid_request' };
        }

        if (!this.session.isAuthenticated) {
            // Brought back here by the console route once they are signed in.
            this.oauthAuthorization.save(params);

            return this.router.transitionTo('auth.login');
        }

        // Signed in: the request is in the address bar from here on, so nothing needs keeping.
        // (Kept, the console would bounce the user back here whenever they opened it.)
        this.oauthAuthorization.clear();
        await this.session.promiseCurrentUser(transition);

        return { params };
    }

    setupController(controller, model) {
        super.setupController(controller, model);

        if (model?.error) {
            controller.showError(model.error);
        } else if (model?.params) {
            controller.load.perform(model.params);
        }
    }
}
