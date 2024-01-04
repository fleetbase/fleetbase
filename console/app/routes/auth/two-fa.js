import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class AuthTwoFaRoute extends Route {
    @service fetch;
    @service notifications;
    @service session;

    queryParams = {
        token: {
            refreshModel: false,
        },
    };

    // beforeModel(transition) {
    //     // validate 2fa session with server
    //     const { token } = transition.params;

    //     return this.fetch.post('two-fa/validate-session', { token }).catch((error) => {
    //         this.notifications.serverError(error);
    //         return this.redirect('auth.login');
    //     });
    // }

    async beforeModel(transition) {
        // Validate 2fa session with the server
        const { token } = transition.to.queryParams;

        try {
            // Make a request to validate the 2FA session
            await this.fetch.post('two-fa/validate-session', { token });

            // If the session is valid, do nothing, and the transition will continue
        } catch (error) {
            // If the session is not valid, show an error notification
            this.notifications.serverError(error);

            // Redirect to the login route
            this.transitionTo('auth.login');
        }
    }
}
