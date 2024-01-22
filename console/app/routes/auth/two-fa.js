import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

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
     * Query parameters for the route.
     *
     * @var {Object}
     */
    queryParams = {
        token: {
            refreshModel: false,
            replace: true,
        },
        clientToken: {
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
        let { token, clientToken } = transition.to.queryParams;

        return this.session.store.restore().then(({ identity }) => {
            if (!identity) {
                this.notifications.error('2FA failed to initialize.');
                return this.router.transitionTo('auth.login');
            }

            return this.fetch
                .post('two-fa/validate', { token, identity, clientToken })
                .then(({ clientToken, expired }) => {
                    // handle when code expired
                    if (expired === true) {
                        return this.invalidateTwoFaSession(token, identity);
                    }

                    // clear session data after validated 2fa session
                    this.session.store.persist({
                        identity,
                        token,
                        clientToken,
                    });
                })
                .catch((error) => {
                    this.notifications.serverError(error);
                    return this.router.transitionTo('auth.login');
                });
        });
    }

    /**
     * Sets up the controller, including client token and session expiration details.
     *
     * @param {Object} controller - The controller for the route.
     */
    setupController(controller) {
        super.setupController(...arguments);

        this.session.store.restore().then(({ clientToken, identity }) => {
            controller.clientToken = clientToken;
            controller.identity = identity;
            controller.twoFactorSessionExpiresAfter = controller.getExpirationDateFromClientToken(clientToken);
            controller.countdownReady = true;
        });
    }

    invalidateTwoFaSession(token, identity) {
        this.notifications.error('2FA authentication session has expired.');
        return this.fetch
            .post('two-fa/invalidate', {
                token,
                identity,
            })
            .then(() => {
                return this.router.transitionTo('auth.login');
            });
    }
}
