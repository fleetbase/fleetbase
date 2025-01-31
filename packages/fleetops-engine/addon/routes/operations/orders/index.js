import Route from '@ember/routing/route';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';

export default class OperationsOrdersIndexRoute extends Route {
    @service store;

    @tracked queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        status: { refreshModel: true },
        public_id: { refreshModel: true },
        internal_id: { refreshModel: true },
        payload: { refreshModel: true },
        tracking: { refreshModel: true },
        facilitator: { refreshModel: true },
        driver: { refreshModel: true },
        customer: { refreshModel: true },
        pickup: { refreshModel: true },
        dropoff: { refreshModel: true },
        after: { refreshModel: true },
        before: { refreshModel: true },
        type: { refreshModel: true },
        layout: { refreshModel: false },
        drawerOpen: { refreshModel: false },
        drawerTab: { refreshModel: false },
        orderPanelOpen: { refreshModel: false },
    };

    @action willTransition(transition) {
        const shouldReset = typeof transition.to.name === 'string' && !transition.to.name.includes('operations.orders');

        if (this.controller && shouldReset) {
            this.controller.resetView(transition);
        }

        if (isNestedRouteTransition(transition)) {
            set(this.queryParams, 'page.refreshModel', false);
            set(this.queryParams, 'sort.refreshModel', false);
        }
    }

    @action model(params) {
        return this.store.query('order', params);
    }
}
