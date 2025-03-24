import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { isNone } from '@ember/utils';
import createFullCalendarEventFromOrder from '../../../utils/create-full-calendar-event-from-order';
import createFullCalendarEventFromLeave from '../../../utils/create-full-calendar-event-from-leave';
import ENV from '@fleetbase/console/config/environment';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';

export default class OperationsSchedulerIndexRoute extends Route {
    @service store;
    @service notifications;
    @service hostRouter;
    @service abilities;
    @service intl;
    
    queryParams = {
        ref: {
            refreshModel: true
        },
        page: { 
            refreshModel: true 
        }
    };
    
    @action willTransition(transition) {
        const shouldReset = typeof transition.to.name === 'string' && !transition.to.name.includes('operations.orders');

        if (this.controller && shouldReset && typeof this.controller.resetView === 'function') {
            this.controller.resetView(transition);
        }

        const isPaginationTransition = transition.to.name === transition.from.name && 
                                   transition.to.queryParams.page !== transition.from.queryParams.page;

        if (isNestedRouteTransition(transition) && !isPaginationTransition) {
            set(this.queryParams, 'page.refreshModel', false);
        } else {
            set(this.queryParams, 'page.refreshModel', true);
        }
    }

    beforeModel() {
        if (this.abilities.cannot('fleet-ops list order')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.fleet-ops');
        }
    }

    async model(params = {}) {
        const page = params.page || 1;
        const limit = 30;
        
        // Single API call to get all orders
        const orders = await this.store.query('order', { 
            status: 'created', 
            with: ['payload', 'driverAssigned.vehicle'], 
            limit: limit,
            sort: '-created_at',
            page: page
        });
        
        const meta = orders.meta || {};
        const total = meta.total || orders.length;
        const currentPage = meta.current_page || parseInt(page);
        const totalPages = meta.last_page || Math.ceil(total / limit);
        
        // Fetch driver unavailability
        let driverUnavailability = null;
        const authSession = JSON.parse(localStorage.getItem('ember_simple_auth-session'));
        if (authSession && authSession.authenticated && authSession.authenticated.token) {
            const apiBaseURL = `${ENV.API.host}`;
            const token = authSession.authenticated.token;
            const response = await fetch(`${apiBaseURL}/api/v1/leave-requests/list`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                driverUnavailability = data;
            } else {
                console.error('Failed to fetch driver unavailability. Status:', response.status);
            }
        }
        
        return { 
            orders, 
            driverUnavailability,
            pagination: {
                currentPage: currentPage,
                totalPages: totalPages,
                limit: meta.per_page || limit,
                total: total
            }
        };
    }
    
    refreshRoute() {
        this.refresh();
    }
    
    setupController(controller, model) {
        const orders = model.orders;
        const driverUnavailability = model.driverUnavailability;
        
        // Set the pagination data
        controller.page = model.pagination.currentPage;
        controller.totalPages = model.pagination.totalPages;
        controller.itemsPerPage = model.pagination.limit;
        
        // Split orders into scheduled and unscheduled
        controller.unscheduledOrders = orders.filter(order => 
            isNone(order.driver_assigned_uuid) && isNone(order.vehicle_assigned_uuid)
        );
        
        controller.scheduledOrders = orders.filter(order => 
            !isNone(order.driver_assigned_uuid)
        );
        
        // Set up events
        controller.events = controller.scheduledOrders.map(order => 
            createFullCalendarEventFromOrder(order)
        );
        
        // Add driver unavailability events
        let driverUnavailabilityData = Array.isArray(driverUnavailability?.data) ? driverUnavailability.data : [];
        if (driverUnavailabilityData.length > 0) {
            const leaveEvents = driverUnavailabilityData.map((leave) => 
                createFullCalendarEventFromLeave(leave, this.intl)
            );
            controller.events = [...controller.events, ...leaveEvents];
        }
        controller.updateCalendar();
    }
    
    resetController(controller, isExiting) {
        if (isExiting) {
            controller.page = 1;
        }
    }
}