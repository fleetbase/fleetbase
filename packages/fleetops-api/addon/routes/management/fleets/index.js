import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';

export default class ManagementFleetsIndexRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        status: { refreshModel: true },
        public_id: { refreshModel: true },
        zone: { refreshModel: true },
        service_area: { refreshModel: true },
        parent_fleet_uuid: { refreshModel: true },
        task: { refreshModel: true },
        name: { refreshModel: true },
        vendor: { refreshModel: true },
        drivers_count: { refreshModel: true },
        drivers_online_count: { refreshModel: true },
        createdAt: { refreshModel: true },
        updatedAt: { refreshModel: true },
    };

    @action willTransition(transition) {
        if (isNestedRouteTransition(transition)) {
            set(this.queryParams, 'page.refreshModel', false);
            set(this.queryParams, 'sort.refreshModel', false);
        }
    }

    model(params) {
        return this.store.query('fleet', { ...params, with: ['parent_fleet', 'service_area', 'zone'] });
    }
}
