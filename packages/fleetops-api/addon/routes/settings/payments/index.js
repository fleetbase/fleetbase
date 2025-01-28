import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class SettingsPaymentsIndexRoute extends Route {
    @service fetch;
    @service notifications;
    @service hostRouter;
    @service abilities;
    @service intl;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
    };

    beforeModel() {
        if (this.abilities.cannot('fleet-ops list purchase-rate')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.fleet-ops');
        }
    }

    model() {
        return this.fetch.get('fleet-ops/payments/payments-received', { sort: '-created_at' });
    }

    setupController(controller) {
        super.setupController(...arguments);
        controller.lookupStripeConnectAccount.perform();
    }
}
