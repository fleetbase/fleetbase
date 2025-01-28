import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class OperationsOrdersIndexNewRoute extends Route {
    @service store;
    @service notifications;
    @service hostRouter;
    @service abilities;
    @service intl;

    @action willTransition() {
        if (this.controller) {
            this.controller.resetForm();
        }
    }

    beforeModel() {
        if (this.abilities.cannot('fleet-ops create order')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.fleet-ops.operations.orders.index');
        }
    }

    async setupController(controller) {
        super.setupController(...arguments);
        controller.orderConfigs = await this.store.findAll('order-config');
    }
}
