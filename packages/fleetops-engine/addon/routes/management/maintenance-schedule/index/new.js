import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ManagementMaintenanceScheduleIndexNewRoute extends Route {
    @service notifications;
    @service hostRouter;
    @service abilities;
    @service intl;
    @service store;

    beforeModel() {
        if (this.abilities.cannot('fleet-ops create leave-request')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.fleet-ops.management.maintenance-schedule.index');
        }
    }

    model() {
        // Return a dummy object for testing
        return {};
    }
}
