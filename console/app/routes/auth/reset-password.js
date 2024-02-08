import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class AuthResetPasswordRoute extends Route {
    @service store;

    async model(params) {
        return params;
    }

    async setupController(controller) {
        super.setupController(...arguments);

        // set brand to controller
        controller.brand = await this.store.findRecord('brand', 1);
    }
}
