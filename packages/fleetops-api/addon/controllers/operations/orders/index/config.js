import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { action } from '@ember/object';

export default class OperationsOrdersIndexConfigController extends BaseController {
    /**
     * Uses router service to transition back to `orders.index`
     *
     * @void
     */
    @action transitionBack() {
        return this.transitionToRoute('operations.orders.index');
    }
}
