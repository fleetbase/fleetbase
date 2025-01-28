import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementVendorsIndexDetailsRoute extends Route {
    @service store;
    @service notifications;
    @service hostRouter;
    @service abilities;
    @service intl;

    @action error(error) {
        this.notifications.serverError(error);
        if (typeof error.message === 'string' && error.message.endsWith('not found')) {
            return this.hostRouter.transitionTo('console.fleet-ops.management.vendors.index');
        }
    }

    beforeModel() {
        if (this.abilities.cannot('fleet-ops view vendor')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.fleet-ops.management.vendors.index');
        }
    }

    queryParams = {
        view: { refreshModel: false },
    };

    model({ public_id }) {
        const isIntegratedVendor = typeof public_id === 'string' && public_id.startsWith('integrated_vendor_');
        return this.store.findRecord(isIntegratedVendor ? 'integrated-vendor' : 'vendor', public_id);
    }
}
