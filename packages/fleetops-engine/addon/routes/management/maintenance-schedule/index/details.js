import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementMaintenanceScheduleIndexDetailsRoute extends Route {
    @service store;
    @service notifications;
    @service hostRouter;
    @service abilities;
    @service intl;

    @action error(error) {
        this.notifications.serverError(error);
        if (typeof error.message === 'string' && error.message.endsWith('not found')) {
            return this.hostRouter.transitionTo('console.fleet-ops.management.maintenance-schedule.index');
        }
    }

    beforeModel() {
        if (this.abilities.cannot('fleet-ops view leave-request')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.fleet-ops.management.maintenance-schedule.index');
        }
    }

    queryParams = {
        view: { refreshModel: false },
    };

    model(paramOrRecord) {
        // If a full record instance was passed from the controller, use it directly to avoid refetching
        if (paramOrRecord && typeof paramOrRecord === 'object' && paramOrRecord.constructor) {
            return paramOrRecord;
        }

        // Otherwise, fall back to fetching by public_id
        const { public_id } = paramOrRecord || {};
        return this.store.queryRecord('leave-request', { public_id, single: true, with: ['vehicle_assigned'] });
    }
}
