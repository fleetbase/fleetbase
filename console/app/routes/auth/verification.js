import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class AuthVerificationRoute extends Route {
    @service session;
    @service fetch;
    @service router;

    queryParams = {
        token: {
            refreshModel: false,
            replace: true,
        },
        code: {
            refreshModel: false,
        },
        hello: {
            refreshModel: false,
        },
    };

    beforeModel(transition) {
        let { token } = transition.to.queryParams;

        return this.session.store.restore().then(({ email }) => {
            return this.fetch.post('auth/validate-verification-session', { email, token }).then(({ valid }) => {
                if (!valid) {
                    return this.router.transitionTo('auth.login');
                }
            });
        });
    }

    async setupController(controller) {
        super.setupController(...arguments);
        let { email } = await this.session.store.restore();
        controller.email = email;
    }
}
