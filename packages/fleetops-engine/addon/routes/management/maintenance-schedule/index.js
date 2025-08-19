import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';
import ENV from '@fleetbase/console/config/environment';

export default class ManagementMaintenanceScheduleIndexRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        per_page: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        public_id: { refreshModel: true },
        vehicle: { refreshModel: true },
        status: { refreshModel: true },
        created_by: { refreshModel: true },
        created_at: { refreshModel: true },
        start_date: { refreshModel: true },
        end_date: { refreshModel: true },
        reason: { refreshModel: true }
    };

     @action willTransition(transition) {
        const shouldReset = typeof transition.to.name === 'string' && !transition.to.name.includes('management.maintenance-schedule');

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
     

        async model(params) {
            try {
                const authSession = JSON.parse(localStorage.getItem('ember_simple_auth-session'));
                if (!authSession?.authenticated?.token) {
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
    
                const searchParams = new URLSearchParams();
                searchParams.append('page', params.page || 1);
                searchParams.append('per_page', params.per_page || 25);
                // ensure pagination context for unavailability
                searchParams.append('unavailability_page', '1');
                // filter to vehicle unavailability leave-requests
                searchParams.append('unavailability_type', 'vehicle');
                if (params.sort) searchParams.append('sort', params.sort);
                if (params.query) searchParams.append('query', params.query);
                if (params.public_id) searchParams.append('public_id', params.public_id);
                if (params.vehicle) searchParams.append('vehicle_uuid', params.vehicle);
                if (params.status) searchParams.append('status', params.status);
                if (params.created_by) searchParams.append('created_by', params.created_by);
                // if (params.created_at) searchParams.append('created_at', params.created_at);
                if (params.start_date) searchParams.append('start_date', params.start_date);
                if (params.end_date) searchParams.append('end_date', params.end_date);
                if (params.reason) searchParams.append('reason', params.reason);
    
                // Always include vehicle_assigned relation for table rendering
                // searchParams.append('with[]', 'vehicle_assigned');
    
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
    
                // Fix: ensure data is always an array and vehicle_assigned is always an object (not null)
                const data = (result.data || []).map(item => {
                    let vehicleName = '';
                    let vehicleAssigned = item.vehicle_assigned;
                    if (vehicleAssigned && typeof vehicleAssigned === 'object') {
                        vehicleName = vehicleAssigned.display_name || vehicleAssigned.name || '';
                    } else {
                        vehicleAssigned = {};
                    }
                    return {
                        ...item,
                        vehicle_assigned: vehicleAssigned,
                        'vehicle_assigned.display_name': vehicleName,
                        vehicle_name: vehicleName,
                        created_by_name: item.created_by_name || item.created_by || '',
                        created_at: item.created_at,
                        start_date: item.start_date,
                        end_date: item.end_date,
                        reason: item.reason,
                        public_id: item.public_id,
                    };
                });
    
                if (result.success && result.pagination) {
                    return {
                        data,
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
                    const total = result.total || data.length || 0;
                    const perPage = params.per_page || 25;
                    const currentPage = params.page || 1;
                    const lastPage = Math.ceil(total / perPage);
                    const from = ((currentPage - 1) * perPage) + 1;
                    const to = Math.min(currentPage * perPage, total);
    
                    return {
                        data,
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
                console.error('Error fetching maintenance schedule:', error);
                
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
