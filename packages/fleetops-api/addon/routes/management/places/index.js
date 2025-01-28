import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';

export default class ManagementPlacesIndexRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        country: { refreshModel: true },
        name: { refreshModel: true },
        address: { refreshModel: true },
        public_id: { refreshModel: true },
        city: { refreshModel: true },
        phone: { refreshModel: true },
        neighborhood: { refreshModel: true },
        postal_code: { refreshModel: true },
        state: { refreshModel: true },
        createdAt: { refreshModel: true },
        updatedAt: { refreshModel: true },
    };

    @action willTransition(transition) {
        if (isNestedRouteTransition(transition)) {
            // set(this.queryParams, 'page.refreshModel', false);
            set(this.queryParams, 'sort.refreshModel', false);
        }
    }

    model(params) {
        return this.store.query('place', { ...params });
    }
}
