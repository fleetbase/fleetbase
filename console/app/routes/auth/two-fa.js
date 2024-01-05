import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class AuthTwoFaRoute extends Route {
    /**
     * Fetch service for making HTTP requests.
     *
     * @var {Service}
     */
    @service fetch;

    /**
     * Notifications service for handling notifications.
     *
     * @var {Service}
     */
    @service notifications;

    /**
     * Router service.
     *
     * @var {Service}
     */
    @service router;

    /**
     * Session service for managing user sessions.
     *
     * @var {Service}
     */
    @service session;

    /**
     * The current 2FA identity in memory
     */
    @tracked identity;

    /**
     * Query parameters for the route.
     *
     * @var {Object}
     */
    queryParams = {
        token: {
            refreshModel: false,
            replace: true,
        },
    };

    /**
     * Executes before the model is loaded, used for validating 2FA session with the server.
     *
     * @param {Object} transition - The transition object representing the route transition.
     * @return {Promise} A promise that resolves if the 2FA session is valid, and rejects with an error otherwise.
     */
    beforeModel(transition) {
        // validate 2fa session with server
        const { token } = transition.to.queryParams;

        return this.session.store.restore().then(({ two_fa_identity }) => {
            if (!two_fa_identity) {
                this.notifications.error('Unable to initiate 2FA.');
                return this.router.transitionTo('auth.login');
            }

            // store to current route
            this.identity = two_fa_identity;

            return this.fetch
                .post('two-fa/validate-session', { token, identity: two_fa_identity })
                .then(() => {
                    // clear session data after validated 2fa session
                    this.session.store.clear();
                })
                .catch((error) => {
                    this.notifications.serverError(error);
                    return this.router.transitionTo('auth.login');
                });
        });
    }
}
