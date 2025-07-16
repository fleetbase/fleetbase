import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';
import ENV from '@fleetbase/console/config/environment';

export default class ManagementLeavesIndexRoute extends Route {
    @service store;

    // Cache configuration
    CACHE_CONFIG = {
        duration: 15 * 60 * 1000, // 15 minutes
        threshold: 0.75 // Refresh when 75% of cache duration has passed
    };
    // 
    _cache = {
        calendar: null,
        unavailability: null,
        lastFetch: 0,
        inProgress: false
    };

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

    async _fetchDriverUnavailability() {
        if (this._cache.unavailability) {
            return this._cache.unavailability;
        }

        try {
            const authSession = JSON.parse(localStorage.getItem('ember_simple_auth-session'));
            if (!authSession?.authenticated?.token) {
                return null;
            }

            const response = await fetch(`${ENV.API.host}/api/v1/leave-requests/list`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authSession.authenticated.token}`,
                },
                cache: 'default'
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const unavailability = await response.json();
            this._cache.unavailability = unavailability;

            // Clear cache after duration
            setTimeout(() => {
                this._cache.unavailability = null;
            }, this.CACHE_CONFIG.duration);

            return unavailability;
        } catch (error) {
            console.error('Error fetching driver unavailability:', error);
            return null;
        }
    }


    async model(params) {
        const leaves = await this._fetchDriverUnavailability();

        // Patch: add a meta object for pagination
        leaves.meta = {
            current_page: params.page || 1,
            last_page: Math.ceil(leaves.total / (params.limit || 25)),
            total: leaves.total,
            per_page: params.limit || 25,
        };

        return leaves;
    }
    resetController(controller, isExiting) {
        if (isExiting) {
            controller.set('page', 1);
        }
    }
}
