import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';

export default class ManagementVendorsIndexRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        country: { refreshModel: true },
        status: { refreshModel: true },
        name: { refreshModel: true },
        email: { refreshModel: true },
        address: { refreshModel: true },
        phone: { refreshModel: true },
        type: { refreshModel: true },
        createdAt: { refreshModel: true },
        updatedAt: { refreshModel: true },
        website_url: { refreshModel: true },
    };

    @action willTransition(transition) {
        if (isNestedRouteTransition(transition)) {
            set(this.queryParams, 'page.refreshModel', false);
            set(this.queryParams, 'sort.refreshModel', false);
        }
    }

    model(params) {
        return this.store.query('vendor', { ...params });
    }

    // async setupController(controller, model) {
    //     super.setupController(...arguments);

    //     // load integrated vendors
    //     const integratedVendors = await this.store.findAll('integrated-vendor');

    //     // append integrated vendors
    //     controller.rows = [...model.toArray(), ...integratedVendors.toArray()];
    // }
}
