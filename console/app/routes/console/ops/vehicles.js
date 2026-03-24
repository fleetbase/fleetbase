import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleOpsVehiclesRoute extends Route {
    @service fetch;

    model() {
        return this.fetch.get('ops/vehicles');
    }

    setupController(controller, model) {
        super.setupController(controller, model);
        controller.hydrate(model);
    }
}
