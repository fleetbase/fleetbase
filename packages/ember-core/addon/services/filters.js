import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import { computed, action, set, get } from '@ember/object';
import { getOwner } from '@ember/application';
import { format } from 'date-fns';
import getWithDefault from '../utils/get-with-default';

export default class FiltersService extends Service {
    @service router;
    @service urlSearchParams;
    @tracked pendingQueryParams = {};
    @tracked managedQueryParams = ['limit', 'offset', 'sort', 'query', 'page', 'layout', 'view'];
    @tracked lastRouteName = null;

    constructor() {
        super(...arguments);
        this.setupRouteListener();
    }

    /**
     * Setup listener to clear pending params on route changes
     */
    setupRouteListener() {
        this.router.on('routeDidChange', () => {
            const currentRoute = this.router.currentRouteName;
            
            // If route changed, clear pending params to prevent stale filter application
            if (this.lastRouteName && this.lastRouteName !== currentRoute) {
                this.pendingQueryParams = {};
            }
            
            this.lastRouteName = currentRoute;
        });
    }

    @computed('managedQueryParams', 'pendingQueryParams') get activeFilters() {
        const queryParams = this.getQueryParams();
        const activeQueryParams = [];

        for (let queryParam in queryParams) {
            const value = get(queryParams, queryParam);

            if (isBlank(value) || this.managedQueryParams.includes(queryParam)) {
                continue;
            }

            activeQueryParams.pushObject({ queryParam, label: queryParam, value });
        }

        return activeQueryParams;
    }

    @action set(queryParam, value) {
        if (value instanceof InputEvent) {
            value = value.target.value;
        }

        // special case for status
        if (queryParam === 'status' && value === 'all') {
            value = null;
        }

        // serialize query param value
        value = this.serializeQueryParamValue(queryParam, value);

        if (isBlank(value)) {
            return this.clear(queryParam);
        }

        this.pendingQueryParams = {
            ...this.pendingQueryParams,
            [queryParam]: value,
        };
    }

    @action mutate(queryParam, value, controller) {
        this.set(queryParam, value);
        this.apply(controller);
    }

    @action serializeQueryParamValue(queryParam, value) {
        if (value instanceof Date) {
            return format(value, 'yyyy-MM-dd HH:mm');
        }

        if (isArray(value)) {
            return value
                .filter((value) => !isBlank(value))
                .map((value) => this.serializeQueryParamValue(queryParam, value))
                .join(',');
        }

        return value;
    }

    @action apply(controller) {
        // Clear stale pending params first, then get fresh current state
        // this.clearStalePendingParams(controller);

        const currentQueryParams = this.getQueryParams(controller);
        const updatableQueryParams = { ...currentQueryParams, ...this.pendingQueryParams };

        for (let queryParam in updatableQueryParams) {
            set(controller, queryParam, get(updatableQueryParams, queryParam));
        }

        // reset pagination to first page
        set(controller, 'page', 1);

        this.notifyPropertyChange('activeFilters');
    }

     /**
     * Clear pending params that don't match current URL state
     */
     @action clearStalePendingParams(controller) {
        const currentQueryParams = this.getQueryParams(controller);
        const freshPendingParams = {};
        
        // Only keep pending params that align with current URL state or are genuinely new
        for (let param in this.pendingQueryParams) {
            const pendingValue = this.pendingQueryParams[param];
            const currentValue = currentQueryParams[param];
            
            // Keep pending param if:
            // 1. It has a non-blank value AND
            // 2. Either there's no current value OR the current value matches
            if (!isBlank(pendingValue) && (isBlank(currentValue) || currentValue === pendingValue)) {
                freshPendingParams[param] = pendingValue;
            }
        }
        
        this.pendingQueryParams = freshPendingParams;
    }

    @action reset(controller) {
        const queryParams = this.getQueryParams(controller);

        Object.keys(queryParams).forEach((queryParam) => {
            this.removeFromController(controller, queryParam, undefined);
        });

        // Reset pagination to first page after clearing filters
        if (controller && typeof controller.page === 'number') {
            controller.set('page', 1);
        }
    }

    @action clear(callback, queryParam = []) {
        const currentQueryParams = this.getQueryParams();
        const callbackIsQp = typeof callback === 'string' || isArray(callback);
        const qpIsCallback = typeof queryParam === 'function' || isBlank(queryParam);

        // handle reversed arguments
        if (callbackIsQp && qpIsCallback) {
            return this.clear(queryParam, callback);
        }

        if (isBlank(queryParam) && Object.keys(currentQueryParams).length > 0) {
            return Object.keys(currentQueryParams).forEach((qp) => this.clear(callback, qp));
        }

        if (isArray(queryParam) && !isBlank(queryParam)) {
            return queryParam.forEach((qp) => this.clear(callback, qp));
        }

        if (typeof queryParam === 'string') {
            set(this.pendingQueryParams, queryParam, undefined);
        }

        if (typeof callback == 'function') {
            callback(queryParam);
        }

        this.notifyPropertyChange('activeFilters');
    }

    @action removeFromController(controller, queryParam, newValue) {
        set(controller, queryParam, newValue);

        this.set(queryParam, newValue);
        this.notifyPropertyChange('activeFilters');
    }

    @action lookupCurrentController() {
        const currentRoute = this.lookupCurrentRoute();
        const currentController = currentRoute.controller;

        return currentController;
    }

    @action lookupCurrentRoute() {
        const owner = getOwner(this); // ApplicationInstance
        const router = owner.lookup('router:main'); // Router
        const routerMicrolib = router._routerMicrolib; // PrivateRouter
        const currentRouteInfos = routerMicrolib.currentRouteInfos; // Array
        const currentRouteInfo = currentRouteInfos[currentRouteInfos.length - 1]; // ResolvedRouteInfo

        return currentRouteInfo._route;
    }

    @action getRouteQueryParams() {
        const currentRoute = this.lookupCurrentRoute();
        return currentRoute.queryParams;
    }

    @action getQueryParams(controller) {
        const queryParams = {};

        if (controller) {
            const controllerQueryParams = getWithDefault(controller, 'queryParams', []);

            if (isArray(controllerQueryParams)) {
                for (let i = 0; i < controllerQueryParams.length; i++) {
                    const qp = controllerQueryParams.objectAt(i);

                    if (this.managedQueryParams.includes(qp)) {
                        continue;
                    }

                    queryParams[qp] = get(controller, qp);
                }

                return queryParams;
            }
        }

        const currentRoute = this.lookupCurrentRoute();
        const currentRouteQueryParams = Object.keys(currentRoute.queryParams);

        for (let i = 0; i < currentRouteQueryParams.length; i++) {
            const queryParam = currentRouteQueryParams.objectAt(i);
            const value = this.urlSearchParams.get(queryParam);

            if (this.managedQueryParams.includes(queryParam)) {
                continue;
            }

            if (value) {
                queryParams[queryParam] = value;
            }
        }

        return queryParams;
    }

    @action resetQueryParams() {
        if (!isBlank(this.activeFilters)) {
            this.clear();
            // Clear pending params when resetting
            this.pendingQueryParams = {};
            this.router.transitionTo({ queryParams: {} });
        }
    }

    willDestroy() {
        super.willDestroy();
        // Clean up route listener
        if (this.router.off) {
            this.router.off('routeDidChange');
        }
    }
}
