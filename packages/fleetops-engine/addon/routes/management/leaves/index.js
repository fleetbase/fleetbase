import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';
import ENV from '@fleetbase/console/config/environment';

export default class ManagementLeavesIndexRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        per_page: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        public_id: { refreshModel: true },
        driver: { refreshModel: true },
        status: { refreshModel: true },
        leave_type: { refreshModel: true },
        processed_by: { refreshModel: true },
        created_at: { refreshModel: true },
        start_date: { refreshModel: true },
        end_date: { refreshModel: true },
    };

    @action willTransition(transition) {
        const shouldReset = typeof transition.to.name === 'string' && !transition.to.name.includes('management.leaves');

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

    async model(params) {
        try {
            // Get authentication token
            const authSession = JSON.parse(localStorage.getItem('ember_simple_auth-session'));
            if (!authSession?.authenticated?.token) {
                console.error('No authentication token found');
                return {
                    data: [],
                    meta: {
                        current_page: 1,
                        last_page: 1,
                        total: 0,
                        per_page: params.per_page || 25,
                        from: 0,
                        to: 0
                    }
                };
            }

            // Build query string
            const searchParams = new URLSearchParams();
            
            // Add pagination
            searchParams.append('page', params.page || 1);
            searchParams.append('per_page', params.per_page || 25);
            
            // Add sorting
            if (params.sort) {
                searchParams.append('sort', params.sort);
            }
            
            // Add search
            if (params.query) {
                searchParams.append('query', params.query);
            }
            
            // Add filters
            if (params.public_id) {
                searchParams.append('public_id', params.public_id);
            }
            if (params.driver) {
                searchParams.append('driver_uuid', params.driver);
            }
            if (params.status) {
                searchParams.append('status', params.status);
            }
            if (params.leave_type) {
                searchParams.append('leave_type', params.leave_type);
            }
            if (params.processed_by) {
                searchParams.append('processed_by', params.processed_by);
            }
            if (params.created_at) {
                searchParams.append('created_at', params.created_at);
            }
            if (params.start_date) {
                searchParams.append('start_date', params.start_date);
            }
            if (params.end_date) {
                searchParams.append('end_date', params.end_date);
            }

            // Make API request
            const response = await fetch(`${ENV.API.host}/api/v1/leave-requests/list?${searchParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authSession.authenticated.token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Handle response
            if (result.success && result.pagination) {
                // Paginated response
                return {
                    data: result.data || [],
                    meta: {
                        current_page: result.pagination.current_page,
                        last_page: result.pagination.last_page,
                        total: result.pagination.total,
                        per_page: result.pagination.per_page,
                        from: result.pagination.from,
                        to: result.pagination.to
                    }
                };
            } else if (result.success) {
                // Non-paginated response - create pagination meta
                const total = result.total || result.data?.length || 0;
                const perPage = params.per_page || 25;
                const currentPage = params.page || 1;
                const lastPage = Math.ceil(total / perPage);
                const from = ((currentPage - 1) * perPage) + 1;
                const to = Math.min(currentPage * perPage, total);

                return {
                    data: result.data || [],
                    meta: {
                        current_page: currentPage,
                        last_page: lastPage,
                        total: total,
                        per_page: perPage,
                        from: total > 0 ? from : 0,
                        to: total > 0 ? to : 0
                    }
                };
            } else {
                throw new Error(result.message || 'API request failed');
            }

        } catch (error) {
            console.error('Error fetching leaves:', error);
            
            // Return empty result on error
            return {
                data: [],
                meta: {
                    current_page: 1,
                    last_page: 1,
                    total: 0,
                    per_page: params.per_page || 30,
                    from: 0,
                    to: 0
                }
            };
        }
    }

    resetController(controller, isExiting) {
        if (isExiting) {
            controller.set('page', 1);
        }
    }
}