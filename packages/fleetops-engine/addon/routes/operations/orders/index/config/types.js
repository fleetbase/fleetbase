import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class OperationsOrdersIndexConfigTypesRoute extends Route {
    /**
     * Inject the fetch service
     *
     * @var {Service}
     */
    @service fetch;

    async setupController(controller) {
        super.setupController(...arguments);
        // load all configurable order types
        const types = await this.fetch.get('orders/types');
        controller.types = types;
    }
}
