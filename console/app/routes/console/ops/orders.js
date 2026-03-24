import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleOpsOrdersRoute extends Route {
    @service fetch;

    model() {
        return this.fetch.get('ops/orders');
    }

    setupController(controller, model) {
        super.setupController(controller, model);
        controller.hydrate(model);
    }
}
