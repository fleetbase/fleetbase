import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';

export default class ManagementIssuesIndexRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        priority: { refreshModel: true },
        status: { refreshModel: true },
        vehicle: { refreshModel: true },
        driver: { refreshModel: true },
        assignee: { refreshModel: true },
        reporter: { refreshModel: true },
        type: { refreshModel: true },
        category: { refreshModel: true },
        updatedAt: { refreshModel: true },
        createdAt: { refreshModel: true },
    };

    @action willTransition(transition) {
        if (isNestedRouteTransition(transition)) {
            set(this.queryParams, 'page.refreshModel', false);
            set(this.queryParams, 'sort.refreshModel', false);
        }
    }

    model(params) {
        return this.store.query('issue', { ...params, with: ['driver', 'vehicle', 'assignee', 'reporter'] });
    }
}
