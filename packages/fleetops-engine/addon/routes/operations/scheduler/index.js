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
    refreshRoute() {
        this.refresh();
    }
    
    // async model(params = {}) {
    //     const startTime = performance.now();
    //     console.log("Inside model")
    //     const page = params.page || 1;
    //     const listLimit = 30; // Limit for paginated list view
    //     const calendarLimit = 500; // Limit for calendar view
        
    //     // API call for paginated list view (30 records per page)
    //     const paginatedOrders = await this.store.query('order', { 
    //         status: 'created', 
    //         with: ['payload', 'driverAssigned.vehicle'], 
    //         limit: listLimit,
    //         sort: '-created_at',
    //         page: page
    //     });
        
    //     // Separate API call for calendar (500 records)
    //     const calendarOrders = await this.store.query('order', { 
    //         status: 'created', 
    //         with: ['payload', 'driverAssigned.vehicle'], 
    //         limit: calendarLimit,
    //         sort: '-created_at',
            
    //     });
        
    //     const meta = paginatedOrders.meta || {};
    //     const total = meta.total || paginatedOrders.length;
    //     const currentPage = meta.current_page || parseInt(page);
    //     const totalPages = meta.last_page || Math.ceil(total / listLimit);
        
    //     // Fetch driver unavailability
    //     let driverUnavailability = null;
    //     const authSession = JSON.parse(localStorage.getItem('ember_simple_auth-session'));
    //     if (authSession && authSession.authenticated && authSession.authenticated.token) {
    //         const apiBaseURL = `${ENV.API.host}`;
    //         const token = authSession.authenticated.token;
    //         const response = await fetch(`${apiBaseURL}/api/v1/leave-requests/list`, {
    //             method: 'GET',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'Authorization': `Bearer ${token}`,
    //             },
    //         });

    //         if (response.ok) {
    //             const data = await response.json();
    //             driverUnavailability = data;
    //         } else {
    //             console.error('Failed to fetch driver unavailability. Status:', response.status);
    //         }
    //     }
    //     const endTime = performance.now();
    //     console.log(`model execution time: ${endTime - startTime} milliseconds`);
    //     return { 
    //         paginatedOrders, 
    //         calendarOrders,
    //         driverUnavailability,
    //         pagination: {
    //             currentPage: currentPage,
    //             totalPages: totalPages,
    //             limit: meta.per_page || listLimit,
    //             total: total
    //         }
    //     };
    // }
    async model(params = {}) {
        const startTime = performance.now();
        const page = params.page || 1;
        const listLimit = 30; // Limit for paginated list view
        const calendarLimit = 500; // Limit for calendar view
        
        // Add timestamp for cache busting if needed
        const timestamp = Date.now();
        
        // Check if we have cached calendar orders and they're not too old
        const cachedCalendar = this._getCachedCalendarData();
        
        // Only fetch paginated orders and driver unavailability initially
        const [paginatedOrders, driverUnavailability] = await Promise.all([
            // API call for paginated list view
            this.store.query('order', { 
                status: 'created', 
                with: ['payload', 'driverAssigned.vehicle'], 
                limit: listLimit,
                sort: '-created_at',
                page: page
            }),
            
            // Fetch driver unavailability in parallel
            this._cachedDriverUnavailability ? 
                Promise.resolve(this._cachedDriverUnavailability) : 
                this.fetchDriverUnavailability()
        ]);
        
        let calendarOrders;
        
        // If we have recently cached calendar data, use it instead of fetching
        if (cachedCalendar) {
            calendarOrders = cachedCalendar;
        } else {
            // Fetch calendar orders with minimal fields for efficiency
            calendarOrders = await this.store.query('order', { 
                status: 'created',
                // Only fetch fields needed for calendar display
                with: ['driverAssigned'], // Reduced relations - only what's needed for calendar
                fields: {
                    orders: 'id,driver_assigned_uuid,public_id,scheduled_at,scheduled_end,status'
                },
                limit: calendarLimit,
                sort: '-created_at'
            });
            
            // Cache the calendar orders for future use
            this._cacheCalendarData(calendarOrders);
        }
        
        // Cache driver unavailability for future calls
        if (driverUnavailability && !this._cachedDriverUnavailability) {
            this._cachedDriverUnavailability = driverUnavailability;
            
            // Clear cache after 5 minutes
            setTimeout(() => {
                this._cachedDriverUnavailability = null;
            }, 5 * 60 * 1000);
        }
        
        const meta = paginatedOrders.meta || {};
        const total = meta.total || paginatedOrders.length;
        const currentPage = meta.current_page || parseInt(page);
        const totalPages = meta.last_page || Math.ceil(total / listLimit);
        
        const endTime = performance.now();
        
        return { 
            paginatedOrders, 
            calendarOrders,
            driverUnavailability,
            pagination: {
                currentPage: currentPage,
                totalPages: totalPages,
                limit: meta.per_page || listLimit,
                total: total
            }
        };
    }
    
    // Cache helpers for calendar data
    _cacheCalendarData(calendarOrders) {
        // Store the data and timestamp
        this._calendarOrdersCache = {
            data: calendarOrders,
            timestamp: Date.now()
        };
        
        // Set up cache expiration (15 minutes)
        if (!this._calendarCacheTimer) {
            this._calendarCacheTimer = setTimeout(() => {
                this._calendarOrdersCache = null;
                this._calendarCacheTimer = null;
            }, 15 * 60 * 1000);
        }
    }

    _getCachedCalendarData() {
        // Return cached data if available and not expired
        if (this._calendarOrdersCache) {
            const now = Date.now();
            const cacheAge = now - this._calendarOrdersCache.timestamp;
            
            // Cache is valid for 15 minutes
            if (cacheAge < 15 * 60 * 1000) {
                return this._calendarOrdersCache.data;
            }
        }
        
        return null;
    }
    
    // Separate method to fetch driver unavailability data
    // This improves readability and allows for easier caching if needed
    async fetchDriverUnavailability() {
        try {
            const authSession = JSON.parse(localStorage.getItem('ember_simple_auth-session'));
            if (!authSession?.authenticated?.token) {
                return null;
            }
            
            const apiBaseURL = `${ENV.API.host}`;
            const token = authSession.authenticated.token;
            
            const response = await fetch(`${apiBaseURL}/api/v1/leave-requests/list`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                // Add cache control headers to leverage browser caching
                cache: 'default'
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                console.error('Failed to fetch driver unavailability. Status:', response.status);
                return null;
            }
        } catch (error) {
            console.error('Error fetching driver unavailability:', error);
            return null;
        }
    }
    
    setupController(controller, model) {
        const paginatedOrders = model.paginatedOrders;
        const calendarOrders = model.calendarOrders;
        const driverUnavailability = model.driverUnavailability;
        
        // Set the pagination data
        controller.page = model.pagination.currentPage;
        controller.totalPages = model.pagination.totalPages;
        controller.itemsPerPage = model.pagination.limit;
        
        // Split paginated orders into scheduled and unscheduled for the list view
        controller.unscheduledOrders = paginatedOrders.filter(order => 
            isNone(order.driver_assigned_uuid) && isNone(order.vehicle_assigned_uuid)
        );
        
        controller.scheduledOrders = paginatedOrders.filter(order => 
            !isNone(order.driver_assigned_uuid)
        );
        controller.calscheduledOrders = calendarOrders.filter(order => 
            !isNone(order.driver_assigned_uuid)
        );
        
        // Use all 500 calendar orders for events
        const scheduledCalendarOrders = calendarOrders.filter(order => 
            !isNone(order.driver_assigned_uuid)
        );
        
        // Set up events from the 500 calendar orders
        controller.events = scheduledCalendarOrders.map(order => 
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
        // controller.updateCalendar();
    }
    
    resetController(controller, isExiting) {
        if (isExiting) {
            controller.page = 1;
        }
    }
}