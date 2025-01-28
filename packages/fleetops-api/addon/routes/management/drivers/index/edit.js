import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementDriversIndexEditRoute extends Route {
    @service store;
    @service notifications;
    @service hostRouter;
    @service abilities;
    @service intl;

    @action error(error) {
        this.notifications.serverError(error);
        if (typeof error.message === 'string' && error.message.endsWith('not found')) {
            return this.hostRouter.transitionTo('console.fleet-ops.management.drivers.index');
        }
    }

    beforeModel() {
        if (this.abilities.cannot('fleet-ops update driver')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.fleet-ops.management.drivers.index');
        }
    }

    model({ public_id }) {
        return this.store.findRecord('driver', public_id);
    }

    async setupController(controller, model) {
        super.setupController(...arguments);
        controller.driver = model;
    }
}
