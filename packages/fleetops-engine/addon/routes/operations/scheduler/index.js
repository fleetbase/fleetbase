import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { isNone } from '@ember/utils';
import createFullCalendarEventFromOrder from '../../../utils/create-full-calendar-event-from-order';
import createFullCalendarEventFromLeave from '../../../utils/create-full-calendar-event-from-leave';
import ENV from '@fleetbase/console/config/environment';
import { action, set } from '@ember/object';
import isNestedRouteTransition from '@fleetbase/ember-core/utils/is-nested-route-transition';
import { tracked } from '@glimmer/tracking';

export default class OperationsSchedulerIndexRoute extends Route {
    @service store;
    @service notifications;
    @service hostRouter;
    @service abilities;
    @service intl;
   
    
    // Cache configuration
    CACHE_CONFIG = {
        duration: 2 * 60 * 1000, // 15 minutes
        threshold: 0.75 // Refresh when 75% of cache duration has passed
    };

    // Batch configuration
    BATCH_CONFIG = {
        size: 100,
        concurrent: 3,
        delay: 50
    };

    // Request configuration
    REQUEST_CONFIG = {
        calendarLimit: 500,
        listLimit: 30,
        minimalFields: {
            orders: 'id,driver_assigned_uuid,public_id,scheduled_at,scheduled_end,status'
        }
    };
    @tracked _lockedPagination=null;
    
    _cache = {
        calendar: null,
        unavailability: null,
        lastFetch: 0,
        inProgress: false
    };
    
    queryParams = {
        ref: {
            refreshModel: true
        },
        page: { 
            refreshModel: true 
        },
        order_id_filter: {
            refreshModel: false,
            replace: true 
         },
        driver_filter: {
            refreshModel: false,
            replace: true,
         },
        status_filter: {
             refreshModel: false,
             replace: true 
         }
    };

    @action 
    willTransition(transition) {
       
        const shouldReset = typeof transition.to.name === 'string' && !transition.to.name.includes('operations.orders');

        if (this.controller && shouldReset && typeof this.controller.resetView === 'function') {
            this.controller.resetView(transition);
        }

        const isPaginationTransition = transition.to.name === transition.from.name && 
                                   transition.to.queryParams.page !== transition.from.queryParams.page;

        if (isNestedRouteTransition(transition) && !isPaginationTransition) {
            set(this.queryParams, 'page.refreshModel', false);
        } else {
            // this._cache.calendar = null;
            // this._cache.lastFetch = 0;
            // this._cache.inProgress = false;
            // this._needCalendarRefresh =true;
            set(this.queryParams, 'page.refreshModel', true);
            // Force a data refresh when returning to the scheduler
            // if (transition.to.name && transition.to.name.includes('operations.scheduler')) {
            //     // Clear store cache for orders
            //     this.store.unloadAll('order');
            // }
        }
        // if (transition.to.name !== this.routeName) {
        //     // Flag that we left the scheduler
        //     this._leftScheduler = true;
        // }
        
    }
    // @action
    // didTransition() {
    //     // If we're coming back to the scheduler after leaving
    //     if (this._leftScheduler) {
    //         this._leftScheduler = false;
            
    //         // Force refresh of driver unavailability cache
    //         this._cache.unavailability = null;
    //         this._cache.lastUnavailabilityFetch = 0;
            
    //         // Schedule a refresh once the controller is set up
    //         setTimeout(() => {
    //             if (this.controller) {
    //                 this.controller.refreshLeaveEvents();
    //             }
    //         }, 100);
    //     }
    // }

    beforeModel() {

        // this.controllerFor('application').set('page', 1);
        if (this.abilities.cannot('fleet-ops list order')) {
            this.notifications.warning(this.intl.t('common.unauthorized-access'));
            return this.hostRouter.transitionTo('console.fleet-ops');
        }

        // Pre-fetch calendar data if cache is empty or expired
        this._prefetchCalendarData();
    }

    async _prefetchCalendarData() {
        if (this._cache.inProgress) return;
        
        const now = Date.now();
        if (this._cache.calendar && (now - this._cache.lastFetch) < this.CACHE_CONFIG.duration) {
            return;
        }

        this._cache.inProgress = true;
        
        try {
            const calendarOrders = await this._fetchCalendarOrdersBatched();
            this._cache.calendar = calendarOrders;
            this._cache.lastFetch = now;
        } catch (error) {
            console.error('Calendar prefetch failed:', error);
        } finally {
            this._cache.inProgress = false;
        }
    }

    async _fetchCalendarOrdersBatched() {
        const { size: batchSize, concurrent, delay } = this.BATCH_CONFIG;
        const { calendarLimit } = this.REQUEST_CONFIG;
        const batches = Math.ceil(calendarLimit / batchSize);
        let allOrders = [];

        // Process batches in concurrent groups
        for (let i = 0; i < batches; i += concurrent) {
            const batchPromises = [];
            
            // Create promises for current concurrent batch group
            for (let j = 0; j < concurrent && (i + j) < batches; j++) {
                const page = i + j + 1;
                batchPromises.push(
                    this.store.query('order', {
                        with: ['driverAssigned', 'fleet'],
                        fields: this.REQUEST_CONFIG.minimalFields,
                        filter: {
                            deleted_at: null
                        },
                        limit: batchSize,
                        page,
                        sort: '-created_at'
                    })
                );
            }

            try {
                // Execute current batch group
                const results = await Promise.all(batchPromises);
                const newOrders = results.flatMap(result => result.toArray());
                allOrders.push(...newOrders);

                // Break if we have enough records
                if (allOrders.length >= calendarLimit) {
                    allOrders = allOrders.slice(0, calendarLimit);
                    break;
                }

                // Small delay between batch groups
                if (i + concurrent < batches) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } catch (error) {
                console.error(`Error fetching batch group ${i}:`, error);
                // Continue with next batch group
            }
        }

        return allOrders;
    }

    async _fetchDriverUnavailability() { 
        if (this._cache.unavailability) {
            return this._cache.unavailability;
        }
        // If we're coming back from another menu, ignore the cache
        // if (this._leftScheduler || !this._cache.unavailability) {
        try {
            const authSession = JSON.parse(localStorage.getItem('ember_simple_auth-session'));
            if (!authSession?.authenticated?.token) {
                return null;
            }
            
            const response = await fetch(`${ENV.API.host}/api/v1/leave-requests/list?timestamp=${Date.now()}&status=Approved&unavailability_type=vehicle`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authSession.authenticated.token}`,
                },
                cache: 'default' // Force fresh data
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
        // }
        
        // Return cached data if available
        // return this._cache.unavailability;
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
        const { listLimit } = this.REQUEST_CONFIG;
        
        try {
            // Parallel fetch of paginated orders and driver unavailability
            const [paginatedOrders, driverUnavailability] = await Promise.all([
                this.store.query('order', {
                    // status: 'created',
                    with: ['payload', 'driverAssigned.vehicle', 'fleet'],
                    limit: listLimit,
                    sort: '-created_at',
                    page: page
                }),
                this._fetchDriverUnavailability()
            ]);

            // Get calendar orders from cache or fetch if needed
            let calendarOrders;
            if (this._cache.calendar) {
                calendarOrders = this._cache.calendar;
                // Trigger background refresh if cache is getting old
                if (Date.now() - this._cache.lastFetch > this.CACHE_CONFIG.duration * this.CACHE_CONFIG.threshold) {
                    this._prefetchCalendarData();
                }
            } else {
                calendarOrders = await this._fetchCalendarOrdersBatched();
                this._cache.calendar = calendarOrders;
                this._cache.lastFetch = Date.now();
            }

            const meta = paginatedOrders.meta || {};
            const total = meta.total || paginatedOrders.length;
            const currentPage = meta.current_page || parseInt(page);
            const totalPages = meta.last_page || Math.ceil(total / listLimit);

            const endTime = performance.now();
            // console.log(`Model execution time: ${(endTime - startTime).toFixed(2)}ms`);

            return {
                paginatedOrders,
                calendarOrders,
                driverUnavailability,
                pagination: {
                    currentPage,
                    totalPages,
                    limit: meta.per_page || listLimit,
                    total
                }
            };
        } catch (error) {
            console.error('Error in model hook:', error);
            return {
                paginatedOrders: [],
                calendarOrders: this._cache.calendar || [],
                driverUnavailability: this._cache.unavailability || [],
                pagination: {
                    currentPage: page,
                    totalPages: 1,
                    limit: listLimit,
                    total: 0
                }
            };
        }
    }

    
    setupController(controller, model) { 
        const { paginatedOrders, calendarOrders, driverUnavailability } = model;
        controller.setProperties({
            page: model.pagination.currentPage,
            totalPages: model.pagination.totalPages,
            itemsPerPage: model.pagination.limit
        });
        // Set the filter properties from the query params if they exist
        if (this.paramsFor(this.routeName).driver_filter) {
            controller.driver_filter = this.paramsFor(this.routeName).driver_filter;
        }
        
        if (this.paramsFor(this.routeName).order_id_filter) {
            controller.order_id_filter = this.paramsFor(this.routeName).order_id_filter;
        }
        
        if (this.paramsFor(this.routeName).status_filter) {
            controller.status_filter = this.paramsFor(this.routeName).status_filter;
        }
        // Split orders efficiently
        controller.setProperties({
            unscheduledOrders: paginatedOrders.filter(order => 
                isNone(order.driver_assigned_uuid) && isNone(order.vehicle_assigned_uuid)
            ),
            scheduledOrders: paginatedOrders.filter(order => 
                !isNone(order.driver_assigned_uuid)
            ),
            // calscheduledOrders: calendarOrders.filter(order => 
            //     !isNone(order.driver_assigned_uuid)
            // )
            calscheduledOrders: calendarOrders
        });
        // Add a flag to refresh leaves if we came back from another menu
        // if (this._leftScheduler) {
        //     controller._needLeaveRefresh = true;
        // }
         // Apply any active filters immediately
        if (controller.driver_filter || controller.order_id_filter || controller.status_filter) {
            controller.filterScheduledAndUnscheduledOrders();
            controller.applyFilters();
        }
        // Create events efficiently
        const events = calendarOrders
            .filter(order => !isNone(order.driver_assigned_uuid))
            .map(order => createFullCalendarEventFromOrder(order,this.intl));
        
        // Add leave events if available
        if (Array.isArray(driverUnavailability?.data) && driverUnavailability.data.length > 0) {
            events.push(...driverUnavailability.data.map(leave => 
                createFullCalendarEventFromLeave(leave, this.intl)
            ));
        }
        if (controller.loadAvailableDrivers?.perform) {
            controller.loadAvailableDrivers.perform();
        }
        if (controller.getOrderStatusOptions?.perform) {
            controller.getOrderStatusOptions.perform();
        }
        
        controller.events = events;
        // controller._needCalendarRefresh = true;
    }

    resetController(controller, isExiting) {
        if (isExiting) {
            // controller.page = 1;
            controller.set('page', 1);
            // Clear filter values when navigating away
            controller.set('order_id_filter', '');
            controller.set('driver_filter', '');
            controller.set('status_filter', '');
            
            // Also clear selected values
            controller.set('selectedDriver', null);
            controller.set('selectedStatus', null);
            // Also reset query params in the URL if possible
            if (controller.refreshTimer) {
                clearInterval(controller.refreshTimer);
                controller.set('refreshTimer', null);
            }
            
            // Clear any event listeners
            if (controller.calendarEventListeners) {
                controller.calendarEventListeners.forEach(listener => {
                    if (typeof listener.teardown === 'function') {
                        listener.teardown();
                    }
                });
                controller.set('calendarEventListeners', []);
            }
            
            // Cancel any in-flight requests
            if (controller.pendingRequests) {
                controller.pendingRequests.forEach(request => {
                    if (request && typeof request.abort === 'function') {
                        request.abort();
                    }
                });
                controller.set('pendingRequests', []);
            }
            // try {
            //     this.hostRouter.transitionTo({ queryParams: { page: 1 } });
            // } catch (e) {
            //     // Ignore errors - this is just a safety measure
            // }
        }
    }
    
    refreshRoute() {
        // Clear caches
        this._cache = {
            calendar: null,
            unavailability: null,
            lastFetch: 0,
            inProgress: false
        };
        
        this.refresh();
    }

    @action
    refreshDriverUnavailability() {
        this._cache.unavailability = null;
        this.controller.refreshLeaveEvents(); // or whatever method triggers a reload in your controller
    }
}