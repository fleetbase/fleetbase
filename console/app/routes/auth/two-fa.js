import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class AuthTwoFaRoute extends Route {
    @service fetch;

    queryParams = {
        token: {
            refreshModel: false
        }
    }

    beforeModel(transition) {
        // validate 2fa session with server
        const { token } = transition.params;

        return this.fetch.post('two-fa/validate-session', { token }).catch((error) => {
            this.notifications.serverError(error);
            return this.redirect('auth.login');
        });
    }
}
