import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';
import { scheduleOnce } from '@ember/runloop';

export default class ManagementIssuesIndexRoute extends Route {
    @service store;
    @service loader;

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
        const shouldReset = typeof transition.to.name === 'string' && !transition.to.name.includes('operations.orders');

        // Check if controller exists and has resetView function before calling it
        if (this.controller && shouldReset && typeof this.controller.resetView === 'function') {
            this.controller.resetView(transition);
        }

        const isPaginationTransition = transition.to.name === transition.from.name && 
                                    transition.to.queryParams.page !== transition.from.queryParams.page;

        if (isNestedRouteTransition(transition) && !isPaginationTransition) {
            set(this.queryParams, 'page.refreshModel', false);
            set(this.queryParams, 'sort.refreshModel', false);
        } else {
            set(this.queryParams, 'page.refreshModel', true);
            set(this.queryParams, 'sort.refreshModel', true);
        }
    }
     

    model(params) {
        // Show loader while fetching issues
        this.loader.show();
        return this.store.query('issue', { ...params, with: ['driver', 'vehicle', 'assignee', 'reporter'] });
    }
    
    // Remove loader after the table and DOM have rendered
    setupController(controller, model) {
        super.setupController(...arguments);
        scheduleOnce('afterRender', this, () => this.loader.remove());
    }
    resetController(controller, isExiting) {
        if (isExiting) {
            controller.set('page', 1);
        }
    }
}
