import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { isValid as isValidDate } from 'date-fns';
import { isNone } from '@ember/utils';
import createFullCalendarEventFromOrder from '../../../utils/create-full-calendar-event-from-order';
import createFullCalendarEventFromLeave from '../../../utils/create-full-calendar-event-from-leave';
import ENV from '@fleetbase/console/config/environment';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';

const getUnscheduledOrder = (order) => {
    return isNone(order.driver_assigned_uuid) && isNone(order.vehicle_assigned_uuid);
};

const getScheduledOrder = (order) => {
    if (!order || typeof order !== "object") {
        console.log("Order is undefined, null, or not an object:", order);
        return false;
    }
    const scheduledOrder = !isNone(order.driver_assigned_uuid);
    // order.vehicle_assigned && !isNone(order.vehicle_assigned.uuid);
    return scheduledOrder;
};


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
        page: { refreshModel: true }
      };
    @action 
      willTransition(transition) {
              const shouldReset = typeof transition.to.name === 'string' && !transition.to.name.includes('operations.orders');
      
              // Check if controller exists and has resetView function before calling it
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
        const orders = await this.store.query('order', { 
            status: 'created', 
            with: ['payload', 'driverAssigned.vehicle'], 
            limit: 30, //To do: need to change the limit & do pagination for the scroll
            sort: '-created_at',
            page: page
        });
        const meta = orders.meta || {};
        const total = meta.total || orders.length;
        const currentPage = meta.current_page || parseInt(page);
        const totalPages = meta.last_page || Math.ceil(total / limit);
        let driverUnavailability = null; // Initialize with a default value
          // Fetch driver unavailability
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

            // Check the response status and log it
            if (response.ok) {
                const data = await response.json();
                console.log('Driver Unavailability Data:', data);
                driverUnavailability = data;
            } else {
                console.error('Failed to fetch driver unavailability. Status:', response.status);
            }

            
        }
        else {
                console.error("No valid token found in session.");
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
        this.refresh(); // This will trigger the model hook again and reload data
    }
    setupController(controller, model) {
        const orders = model.orders;
        const driverUnavailability = model.driverUnavailability;
        // set unscheduled orders
        controller.unscheduledOrders = orders.filter(getUnscheduledOrder);
        // set scheduled orders
        controller.scheduledOrders = orders.filter(getScheduledOrder);
        controller.events = controller.scheduledOrders.map(order => createFullCalendarEventFromOrder(order));
        let driverUnavailabilityData = Array.isArray(driverUnavailability?.data) ? driverUnavailability.data : [];

        if (driverUnavailabilityData.length > 0) {
            const leaveEvents = driverUnavailabilityData.map((leave) => 
                createFullCalendarEventFromLeave(leave, this.intl) // Pass intl here
            );
            controller.events = [...controller.events, ...leaveEvents];
        }
        controller.totalRecords = model.pagination.total;
        controller.totalPages = model.pagination.totalPages;
        controller.currentPage = model.pagination.currentPage;
        controller.itemsPerPage = model.pagination.limit;
        
        // Add load more method
        controller.loadPage = this.loadPage.bind(this);
        
    }
    async loadPage(page) {
        // Implement page loading logic here
        const controller = this.controller;
        controller.currentPageUnscheduled = page;
        controller.currentPageScheduled = page;
        console.log(controller.currentPageScheduled);
        // Redirect to route with new page parameter
        this.hostRouter.transitionTo('console.fleet-ops.operations.scheduler.index', { 
            queryParams: { page: page } 
        });
    }
}
