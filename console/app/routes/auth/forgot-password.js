import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class AuthForgotPasswordRoute extends Route {
    @service store;

    queryParams = {
        email: {
            refreshModel: false,
        },
    };

    model() {
        return this.store.findRecord('brand', 1);
    }
}
