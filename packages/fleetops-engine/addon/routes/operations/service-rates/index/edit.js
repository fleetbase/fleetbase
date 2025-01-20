import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class OperationsServiceRatesIndexEditRoute extends Route {
    @service store;
    @service currentUser;
    @service notifications;

    /**
     * Re-use the new service rate form template.
     *
     * @memberof OperationsServiceRatesIndexEditRoute
     */
    templateName = 'operations.service-rates.index.new';

    /**
     * Handle any async error.
     *
     * @param {*} error
     * @return {*}
     * @memberof OperationsServiceRatesIndexEditRoute
     */
    @action error(error) {
        this.notifications.serverError(error);
        return this.transitionTo('operations.service-rates.index');
    }

    model({ public_id }) {
        return this.store.queryRecord('service-rate', {
            public_id,
            single: true,
            with: ['parcelFees', 'rateFees'],
        });
    }

    async setupController(controller, model) {
        super.setupController(...arguments);
        controller.serviceRate = model;

        if (model.isFixedMeter) {
            controller.rateFees = model.rate_fees;
        }

        if (model.isParcelService) {
            controller.parcelFees = model.parcel_fees;
        }

        controller.orderConfigs = await this.store.findAll('order-config');
        controller.serviceAreas = await this.store.findAll('service-area');
    }
}
