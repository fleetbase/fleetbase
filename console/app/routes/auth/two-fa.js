import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import removeBootLoader from '../../utils/remove-boot-loader';

export default class AuthTwoFaRoute extends Route {
    @service fetch;
    @service notifications;
    @service router;
    @service session;

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

    @action activate() {
        removeBootLoader();
    }

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

    setupController(controller) {
        super.setupController(...arguments);

        this.session.store.restore().then(({ clientToken, identity }) => {
            controller.clientToken = clientToken;
            controller.identity = identity;
            controller.twoFactorSessionExpiresAfter = controller.getExpirationDateFromClientToken(clientToken);
            controller.countdownReady = true;
        });
    }

    async invalidateTwoFaSession(token, identity) {
        this.notifications.error('2FA authentication session has expired.');
        await this.fetch.post('two-fa/invalidate', {
            token,
            identity,
        });

        return this.router.transitionTo('auth.login');
    }
}
