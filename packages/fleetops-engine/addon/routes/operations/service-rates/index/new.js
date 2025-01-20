import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class OperationsServiceRatesIndexNewRoute extends Route {
    @service store;

    async setupController(controller) {
        super.setupController(...arguments);
        controller.orderConfigs = await this.store.findAll('order-config');
        controller.serviceAreas = await this.store.findAll('service-area');
    }
}
