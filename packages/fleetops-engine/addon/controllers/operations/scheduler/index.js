import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { format, isValid as isValidDate } from 'date-fns';
import isObject from '@fleetbase/ember-core/utils/is-object';
import isJson from '@fleetbase/ember-core/utils/is-json';
import createFullCalendarEventFromOrder, { createOrderEventTitle } from '../../../utils/create-full-calendar-event-from-order';
import { isNone } from '@ember/utils';
import { task } from 'ember-concurrency-decorators';

export default class OperationsSchedulerIndexController extends BaseController {
    @service modalsManager;
    @service notifications;
    @service store;
    @service intl;
    @service fetch;
    @service hostRouter;
    @tracked scheduledOrders = [];
    @tracked unscheduledOrders = [];
    @tracked calscheduledOrders=[];
    @tracked events = [];
    @service eventBus;

    // Add filter properties
    @tracked order_id_filter = '';
    @tracked driver_filter = '';
    @tracked status_filter = '';
    @tracked showBusy = true;
    @tracked showLeave = true;
    @tracked showTripAssigned = true;
    @tracked selectedDriver = null;
    
    // Single pagination approach
    queryParams = ['ref', 'page', 'scheduled_limit', 'unscheduled_limit', 'calendar_limit'];
    ref = null;
    @tracked page = 1;
    @tracked totalPages = 1;
    @tracked itemsPerPage = 10;
    @tracked scheduled_limit = 30;
    @tracked unscheduled_limit = 30;
    @tracked calendar_limit = 500;
    @tracked calendar;
    @tracked availableDrivers = [];
    
    @tracked statusOptions = [];
    @tracked selectedStatus = null;

    constructor() {
        super(...arguments);
        this.loadAvailableDrivers();
        // this.loadOrderStatusOptions();
        this.getOrderStatusOptions.perform();
        this.eventBus.subscribe('calendar-refresh-needed', this.handleCalendarRefresh.bind(this));
        // Initialize selected values if filters are set
        this.initializeSelectedValues();
    }
    @action
    initializeSelectedValues() {
        // Wait for drivers to load before trying to select one
        this.availableDriversLoaded.then(() => {
            if (this.driver_filter) {
            this.selectedDriver = this.availableDrivers.find(driver => driver.id === this.driver_filter);
            }
        });
    
        // Set selected status based on status_filter
        if (this.status_filter) {
            this.selectedStatus = this.statusOptions.find(status => status.id === this.status_filter);
        }
    }

    // Update driver loading to return a promise for initialization
    @action
    loadAvailableDrivers() {
        this.availableDriversLoaded = this.store.findAll('driver').then(drivers => {
            // Create a copy of the drivers array to avoid modifying the store data
            const driversArray = drivers.toArray();
            
            // Add empty driver option at the beginning
            const emptyDriver = this.store.createRecord('driver', {
                id: '',
                name: this.intl.t('fleet-ops.operations.scheduler.calendar.all-drivers') || 'All Drivers'
            });
            
            // Set the availableDrivers property with the empty option first
            this.availableDrivers = [emptyDriver, ...driversArray];
            
            return this.availableDrivers;
        }).catch(error => {
            console.error('Error loading drivers:', error);
            this.notifications.error('Failed to load driver list');
            return [];
        });
        
        return this.availableDriversLoaded;
    }
    formatStatusName(status) {
        const words = status.split('_');
        return words
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
    @task
    *getOrderStatusOptions() {
        try {
            // Make the API call to get status options
            const response = yield this.fetch.get('orders/statuses');
           
            if (Array.isArray(response)) {
                // Transform the response into the format we need
                this.statusOptions = [
                    { id: '', name: `statuses.all-statuses` },
                    ...response.map(status => {
                        return { 
                            id: status, 
                            name: `statuses.${status}`
                        };
                    })
                ];
            } else {
                console.error("Unexpected response format:", response);
            }
            
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
    @action
    onOrderIdChange(value) {
        if (!value || value.trim() === '') {
            this.order_id_filter = '';
        } else {
            this.order_id_filter = value;
        }
    }

    // Action to handle status selection
    @action
    onStatusChange(selected) {
        this.selectedStatus = selected;
        this.status_filter = selected ? selected.id : '';
         // Show loading indicator
        this.isLoading = true;
        
        // Update calendar with filtered records
        requestAnimationFrame(() => {
            this._updateCalendarAsync().finally(() => {
                this.isLoading = false;
            });
        });
    }
    @action
    onDriverChange(driver) {
        this.selectedDriver = driver;
        this.driver_filter = driver ? driver.id : '';
         // Show loading indicator
        this.isLoading = true;
        
        // Update calendar with filtered records
        requestAnimationFrame(() => {
            this._updateCalendarAsync().finally(() => {
                this.isLoading = false;
            });
        });
    }

    // To initialize the selected driver based on driver_filter (add to constructor or init)
    initializeSelectedDriver() {
        if (this.driver_filter) {
            this.selectedDriver = this.availableDrivers.find(driver => driver.id === this.driver_filter);
        }
    }
    
    didReceiveAttrs() {
        super.didReceiveAttrs();
        this.fetchOrders();
    }
    
    // Fetch all orders with a single API call
    fetchOrders() {
        this.store.query('order', { 
            status: 'created',
            with: ['payload', 'driverAssigned.vehicle'],
            page: this.page,
            sort: '-created_at'
        }).then(orders => {
            // Split the orders into scheduled and unscheduled
            this.scheduledOrders = orders.filter(order => !isNone(order.driver_assigned_uuid));
            this.unscheduledOrders = orders.filter(order => isNone(order.driver_assigned_uuid));
            // If we don't have calendar orders yet, fetch them
        if (!this.calscheduledOrders || this.calscheduledOrders.length === 0) {
            this.store.query('order', { 
                status: 'created',
                with: ['payload', 'driverAssigned.vehicle'],
                limit: 500, // Larger limit for calendar
                sort: '-created_at'
            }).then(calscheduledOrders => {
                this.calscheduledOrders = calscheduledOrders;
                
                // Filter for scheduled orders in calendar view
                const scheduledCalendarOrders = calscheduledOrders.filter(order => 
                    !isNone(order.driver_assigned_uuid)
                );
                
                // Set up events from the calendar orders
                this.events = scheduledCalendarOrders.map(order => 
                    createFullCalendarEventFromOrder(order)
                );
                
                this.updateCalendar();
            });
        } else {
            this.updateCalendar();
        }
          
        });
        
    }
    

    get isFirstPage() {
        return this.page <= 1;
    }

    get isLastPage() {
        return this.page >= this.totalPages;
    }

    // Update your applyFilters method to use updateCalendarWithFilteredData instead of updateCalendar
    @action
    applyFilters() {
        return new Promise((resolve) => {
            try {
                let filteredOrders = [...this.calscheduledOrders];
        
                // Apply driver filter
                if (this.driver_filter) {
                    filteredOrders = this.filterByDriver(filteredOrders);
                }
        
                // Apply order ID filter
                if (this.order_id_filter) {
                    filteredOrders = this.filterByOrderId(filteredOrders);
                }
        
                // Apply status filter
                if (this.status_filter) {
                    filteredOrders = this.filterByStatus(filteredOrders);
                }
        
                // Update the calendar with the filtered data
                this.updateCalendarWithFilteredData(filteredOrders);
                setTimeout(() => {
                    resolve();
                }, 300); // Small delay to ensure loader is visible
            } catch (error) {
                console.error("Error applying filters:", error);
                this.notifications.error("An error occurred while applying filters.");
            }
        });
    }
    
    // Filter by driver
    filterByDriver(orders) {
        return orders.filter(order => {
            if (!order.driver_assigned) return false;
    
            const driverName = order.driver_assigned.name || '';
            const driverId = order.driver_assigned_uuid || '';
            
            // Match by driver name or ID
            const match = 
                driverName.toLowerCase().includes(this.driver_filter.toLowerCase()) ||
                driverId.toLowerCase().includes(this.driver_filter.toLowerCase());
    
            return match;
        });
    }
    
    // Filter by order ID
    filterByOrderId(orders) {
        return orders.filter(order => {
            const orderId = order.id || '';
            const publicId = order.public_id || '';
            
            // Match by order ID or public ID
            return orderId.toLowerCase().includes(this.order_id_filter.toLowerCase()) ||
                publicId.toLowerCase().includes(this.order_id_filter.toLowerCase());
        });
    }
    
    // Filter by status
    filterByStatus(orders) {
        const statusFilter = this.status_filter.toLowerCase();
    
        return orders.filter(order => {
          if (order.status && order.status.toLowerCase() === statusFilter) {
            // return true;
            return order.status==statusFilter
          }
    
        //   const statusMap = {
        //     'confirmed': order.status === 'created' && !order.isDispatched && !order.isStarted && !order.isCompleted && !order.isCanceled,
        //     'created': !order.isDispatched && !order.isCompleted && !order.isCanceled,
        //     'dispatched': !!order.isDispatched && !order.isCompleted && !order.isCanceled && !order.isStarted,
        //     'completed': !!order.isCompleted && !order.isCanceled,
        //     'cancelled': !!order.isCanceled,
        //     'canceled': !!order.isCanceled,
        //     'in_progress': !!order.isDispatched && !order.isCompleted
        //   };
    
        //   return statusMap[statusFilter] || false;
        });
      }
    

    // Updated clear filters action
    // @action
    // clearFilters() {
    //     return new Promise((resolve) => {
    //         try {
    //             // Reset filter values
    //             this.order_id_filter = '';
    //             this.driver_filter = '';
    //             this.status_filter = '';
    //             this.showBusy = true;
    //             this.showLeave = true;
    //             this.showTripAssigned = true;

    //             // Reset selected filter values
    //             this.selectedDriver = null;
    //             this.selectedStatus = null;

    //             // Reset calendar filtering to show all events
    //             this.calendarFilteredOrders = this.calscheduledOrders; // Reset to the original unsorted list
    //             this.updateCalendarWithFilteredData(this.calendarFilteredOrders);
    //             // Resolve the promise after a short delay to ensure the loading indicator is visible
    //             setTimeout(() => {
    //                 resolve();
    //             }, 300); 
    //         } catch (error) {
    //             console.error("Error clearing filters:", error);
    //             this.notifications.error("An error occurred while clearing filters.");
    //             resolve(); // Resolve even on error to ensure loading state is cleared
    //           }
    //     });
    // }
    @action
    clearFilters() {
        // Reset all filter values
        this.order_id_filter = '';
        this.driver_filter = '';
        this.status_filter = '';
        this.selectedDriver = null;
        this.selectedStatus = null;
        
        // Show loading indicator
        this.isLoading = true;
        
        // Update calendar with all records
        requestAnimationFrame(() => {
            this._updateCalendarAsync().finally(() => {
                this.isLoading = false;
            });
        });
        
        // Return a promise that resolves when the operation is complete
        return new Promise(resolve => {
            setTimeout(resolve, 100);
        });
    }

    // New method to apply filtered data to calendar without affecting sidebar
    // @action
    // updateCalendarWithFilteredData(filteredOrders) {
    //     if (!this.calendar) {
    //         console.warn("Calendar instance not available.");
    //         return;
    //     }
        
    //     console.log("Updating calendar with filtered data:", filteredOrders.length);
        
    //     try {
    //         // Create an array of valid event IDs from filtered orders
    //         const validOrderEventIds = filteredOrders.map(order => order.id);
            
    //         console.log("Valid order IDs after filtering:", validOrderEventIds);
            
    //         // Get all current calendar events
    //         const allEvents = this.calendar.getEvents();
    //         console.log("Total calendar events:", allEvents.length);
            
    //         let hiddenCount = 0;
    //         let shownCount = 0;
            
    //         // First, let's explicitly hide all non-matching events
    //         allEvents.forEach(event => {
    //             const eventId = event.id;
                
    //             // Check if this is a leave event (leave events are handled separately)
    //             const isLeaveEvent = 
    //                 (event.classNames && event.classNames.includes('leave-event')) || 
    //                 (event.extendedProps?.type === 'leave') ||
    //                 (event.title && event.title.toLowerCase().includes('leave'));
                
    //             // If it's a leave event, handle it according to the checkbox
    //             if (isLeaveEvent) {
    //                 if (this.showLeave) {
    //                     event.setProp('display', 'auto');
    //                 } else {
    //                     event.setProp('display', 'none');
    //                 }
    //                 return;
    //             }
                
    //             // For regular order events, check if in filtered results
    //             const isInFilteredResults = validOrderEventIds.includes(eventId);
                
    //             if (!isInFilteredResults) {
    //                 // This event should be hidden
    //                 event.setProp('display', 'none'); 
    //                 event.setProp('classNames', ['hidden-event']);
    //                 hiddenCount++;
    //             } else {
    //                 // This event should be shown
    //                 event.setProp('display', 'auto');
                    
    //                 // Remove any hiding classes
    //                 const classNames = event.classNames || [];
    //                 event.setProp('classNames', classNames.filter(c => c !== 'hidden-event'));
                    
    //                 shownCount++;
    //             }
    //         });
            
    //         console.log(`Calendar update complete. Hidden: ${hiddenCount}, Visible: ${shownCount}`);
            
    //         // Force re-render of the calendar
    //         this.calendar.render();
            
    //         // If we have exactly one visible event, center the calendar on it
    //         if (shownCount === 1) {
    //             const visibleEvent = allEvents.find(event => 
    //                 event.display !== 'none' && 
    //                 !event.classNames.includes('hidden-event')
    //             );
                
    //             if (visibleEvent && visibleEvent.start) {
    //                 this.calendar.gotoDate(visibleEvent.start);
    //                 console.log("Centering calendar on event:", visibleEvent.title);
    //             }
    //         }
    //     } catch (error) {
    //         console.error("Error updating calendar with filtered data:", error);
    //     }
    // }
    @action
    updateCalendarWithFilteredData(filteredOrders) {
        if (!this.calendar) {
            console.warn("Calendar instance not available.");
            return;
        }
        
        try {
            const validOrderEventIds = new Set(filteredOrders.map(order => order.id));
            const allEvents = this.calendar.getEvents();

            let hiddenCount = 0;
            let shownCount = 0;

            // Batch update: hide non-matching events, show matching events
            allEvents.forEach(event => {
                const isLeaveEvent = event.classNames?.includes('leave-event') || 
                    event.extendedProps?.type === 'leave' || 
                    (event.title && event.title.toLowerCase().includes('leave'));

                if (isLeaveEvent) {
                    event.setProp('display', this.showLeave ? 'auto' : 'none');
                    return;
                }

                const shouldDisplay = validOrderEventIds.has(event.id);
                if (shouldDisplay) {
                    event.setProp('display', 'auto');
                    event.setProp('classNames', event.classNames.filter(c => c !== 'hidden-event'));
                    shownCount++;
                } else {
                    event.setProp('display', 'none');
                    event.setProp('classNames', ['hidden-event']);
                    hiddenCount++;
                }
            });

            this.calendar.render(); // Re-render the calendar

            // Center on the first visible event if there is only one visible event
            if (shownCount === 1) {
                const visibleEvent = allEvents.find(event => event.display !== 'none');
                if (visibleEvent && visibleEvent.start) {
                    this.calendar.gotoDate(visibleEvent.start);
                }
            }
        } catch (error) {
            console.error("Error updating calendar with filtered data:", error);
        }
    }

    // Helper method to hide all order events (non-leave events)
    hideAllOrderEvents() {
        if (!this.calendar) return;
        
        const allEvents = this.calendar.getEvents();
        
        allEvents.forEach(event => {
            const isLeaveEvent = 
                (event.classNames && event.classNames.includes('leave-event')) || 
                (event.title && event.title.toLowerCase().includes('leave'));
            
            if (!isLeaveEvent) {
                event.setProp('display', 'none');
                event.setProp('classNames', ['hidden-event']);
            }
        });
        
        this.calendar.render();
    }

    // @action
    // toggleBusy() {
    //     this.showBusy = !this.showBusy;
    //     this.updateCalendarWithFilters();
    // }
    
    // @action
    // toggleLeave() {
    //     this.showLeave = !this.showLeave;
    //     this.updateCalendarWithFilters();
    // }
    
    // @action
    // toggleTripAssigned() {
    //     this.showTripAssigned = !this.showTripAssigned;
    //     this.updateCalendarWithFilters();
    // }
    

    // Remaining code remains the same...
   
    @action
    async refreshOrders() {
        const orders = await this.store.query('order', {
            status: 'created',
            with: ['payload', 'driverAssigned.vehicle'],
            page: this.page,
            limit: Math.max(this.scheduled_limit, this.unscheduled_limit, 30),
            sort: '-created_at'
        });
        this.scheduledOrders = orders.filter(order => !isNone(order.driver_assigned_uuid));
        this.unscheduledOrders = orders.filter(order => isNone(order.driver_assigned_uuid));
       
        this.updateCalendar();
        return orders;
        
    }
    // New method to apply checkbox filters
    // updateCalendarWithFilters() {
    //     if (!this.calendar) {
    //         return;
    //     }
        
    //     // Get all calendar events
    //     const allEvents = this.calendar.getEvents();
        
    //     allEvents.forEach(event => {
    //         // Get the corresponding order if available
    //         const order = this.store.peekRecord('order', event.id);
            
    //         // Determine event type
    //         const isLeaveEvent = 
    //             (event.classNames && event.classNames.includes('leave-event')) || 
    //             (event.title && event.title.toLowerCase().includes('leave'));
            
    //         const isBusyEvent = order && order.status === 'busy';
            
    //         const isTripAssignedEvent = order && !isNone(order.driver_assigned_uuid);
            
    //         // Apply filters based on event type
    //         if (isLeaveEvent) {
    //             if (this.showLeave) {
    //                 event.setProp('display', 'auto');
    //                 const classNames = event.classNames || [];
    //                 event.setProp('classNames', [...classNames.filter(c => c !== 'hidden-event'), 'leave-event', 'leave-visible']);
    //             } else {
    //                 event.setProp('display', 'none');
    //                 const classNames = event.classNames || [];
    //                 event.setProp('classNames', [...classNames.filter(c => c !== 'leave-visible'), 'leave-event', 'hidden-event']);
    //             }
    //         }
            
    //         if (isBusyEvent) {
    //             if (this.showBusy) {
    //                 event.setProp('display', 'auto');
    //                 const classNames = event.classNames || [];
    //                 event.setProp('classNames', [...classNames.filter(c => c !== 'hidden-event'), 'busy-event']);
    //             } else {
    //                 event.setProp('display', 'none');
    //                 const classNames = event.classNames || [];
    //                 event.setProp('classNames', [...classNames, 'busy-event', 'hidden-event']);
    //             }
    //         }
            
    //         if (isTripAssignedEvent) {
    //             if (this.showTripAssigned) {
    //                 event.setProp('display', 'auto');
    //                 const classNames = event.classNames || [];
    //                 event.setProp('classNames', [...classNames.filter(c => c !== 'hidden-event'), 'trip-assigned-event']);
    //             } else {
    //                 event.setProp('display', 'none');
    //                 const classNames = event.classNames || [];
    //                 event.setProp('classNames', [...classNames, 'trip-assigned-event', 'hidden-event']);
    //             }
    //         }
    //     });
        
    //     // Re-render the calendar
    //     this.calendar.render();
    // }
    
    @action setCalendarApi(calendar) {
        this.calendar = calendar;
    }
    
    @action
    handleCalendarRefresh(data) {
        const startTime = performance.now();
        
        // Reload specific order if provided
        if (data && data.orderId) {
            const order = this.store.peekRecord('order', data.orderId);
            if (order) {
                order.reload();
            }
        }
        
        // Make sure we stay on the current page when refreshing
        const currentPage = data?.currentPage || this.page;
        this.store.query('order', {
            // status: 'created',
            with: ['payload', 'driverAssigned.vehicle'],
            page: currentPage,
            sort: '-created_at'
        }).then(orders => {
            // Split the orders into scheduled and unscheduled
            this.scheduledOrders = orders.filter(order => !isNone(order.driver_assigned_uuid));
            this.unscheduledOrders = orders.filter(order => isNone(order.driver_assigned_uuid));
            
            // Make sure page is set correctly
            this.page = currentPage;
            // Update calendar again after data refreshes
            this.updateCalendar();
        });
        const endTime = performance.now();
    }
    // Add this method to the controller

    

    // High Performance Calendar Implementation

/**
 * Optimized updateCalendar method using chunking and async processing
 * to prevent UI freezing and browser "not responding" errors
 */
// Improved Calendar Implementation with Better Filtering

/**
 * Optimized updateCalendar method that applies filters BEFORE rendering
 * to prevent showing unfiltered data temporarily
 */
updateCalendar() {
    if (!this.calendar) {
        console.warn("Calendar instance not available.");
        return;
    }

    // Show loading indicator
    this.isLoading = true;
    
    // Use requestAnimationFrame to ensure browser UI responsiveness
    requestAnimationFrame(() => {
        this._updateCalendarAsync().finally(() => {
            // Hide loading indicator when all processing is complete
            this.isLoading = false;
        });
    });
}

/**
 * Get filtered orders based on current filter settings
 * @private
 * @returns {Array} Array of orders that match the current filters
 */
_getFilteredOrders() {
    // Get all orders from the calscheduledOrders array
    const allOrders = [...this.calscheduledOrders];
    
    // Check if any filters are active
    const hasOrderIdFilter = this.order_id_filter && this.order_id_filter.trim() !== '';
    const hasDriverFilter = this.driver_filter && this.driver_filter.trim() !== '';
    const hasStatusFilter = this.status_filter && this.status_filter.trim() !== '';
    
    // If no filters are active, return all orders
    if (!hasOrderIdFilter && !hasDriverFilter && !hasStatusFilter) {
        return allOrders;
    }
    
    // Apply filters based on the filter criteria
    return allOrders.filter(order => {
        // Filter by order ID if specified
        if (hasOrderIdFilter) {
            // Check if order ID contains the filter text (case insensitive)
            const orderId = order.id || '';
            if (!orderId.toLowerCase().includes(this.order_id_filter.toLowerCase())) {
                return false;
            }
        }
        
        // Filter by driver if specified
        if (hasDriverFilter) {
            // Get the driver ID from the order
            const driverId = order.driver_assigned_uuid || order.driver_assigned || '';
            if (driverId !== this.driver_filter) {
                return false;
            }
        }
        
        // Filter by status if specified
        if (hasStatusFilter) {
            // Get the status from the order
            const status = order.status || '';
            if (status !== this.status_filter) {
                return false;
            }
        }
        
        // If we get here, the order passes all filters
        return true;
    });
}
/**
 * Async implementation of calendar update with chunking to prevent UI blocking
 * and improved filtering that applies filters BEFORE rendering
 * @returns {Promise} Promise that resolves when update is complete
 */
async _updateCalendarAsync() {
    // Get filtered orders based on current filter settings
    const filteredOrders = this._getFilteredOrders();
    
    // Build efficient data structures for processing
    const orderMap = new Map();
    
    // Build order map for O(1) lookups with filtered orders only
    filteredOrders.forEach(order => {
        const eventId = createFullCalendarEventFromOrder(order).id;
        orderMap.set(eventId, order);
    });
    
    // Get current events
    const allEvents = this.calendar.getEvents();
    const validOrderEventIds = new Set(orderMap.keys());
    
    // Track leave events separately
    const leaveEventsMap = new Map();
    
    // Split processing into chunks to avoid blocking the main thread
    const CHUNK_SIZE = 50;  // Process 50 items at a time
    
    // Step 1: Identify leave events - process in chunks
    for (let i = 0; i < allEvents.length; i += CHUNK_SIZE) {
        const chunk = allEvents.slice(i, i + CHUNK_SIZE);
        
        // Process this chunk
        chunk.forEach(event => {
            const isLeaveEvent = event.classNames.includes('leave-event') || 
                               event.extendedProps?.type === 'leave' ||
                               (event.title && event.title.toLowerCase().includes('leave'));
            
            if (isLeaveEvent) {
                leaveEventsMap.set(event.id, event);
            }
        });
        
        // Allow UI to breathe between chunks
        if (i + CHUNK_SIZE < allEvents.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    // Prepare operation lists
    const eventsToRemove = [];
    const eventsToUpdate = [];
    const eventsToAdd = [];
    
    // Step 2: Process events in chunks
    for (let i = 0; i < allEvents.length; i += CHUNK_SIZE) {
        const chunk = allEvents.slice(i, i + CHUNK_SIZE);
        
        chunk.forEach(event => {
            const eventId = event.id;
            const isLeaveEvent = leaveEventsMap.has(eventId);
            
            // Skip leave events in this pass
            if (isLeaveEvent) return;
            
            if (!validOrderEventIds.has(eventId)) {
                // Event is no longer valid or doesn't pass filters - mark for removal
                eventsToRemove.push(event);
            } else {
                // Event is valid and passes filters - mark for update
                eventsToUpdate.push({
                    event,
                    order: orderMap.get(eventId)
                });
            }
        });
        
        // Allow UI to breathe between chunks
        if (i + CHUNK_SIZE < allEvents.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    // Step 3: Identify orders that need new events
    const existingEventIds = new Set(allEvents.map(event => event.id));
    
    for (let i = 0; i < filteredOrders.length; i += CHUNK_SIZE) {
        const chunk = filteredOrders.slice(i, i + CHUNK_SIZE);
        
        chunk.forEach(order => {
            const eventId = createFullCalendarEventFromOrder(order).id;
            
            if (!existingEventIds.has(eventId)) {
                // Need to create a new event
                eventsToAdd.push({
                    eventData: createFullCalendarEventFromOrder(order),
                    order
                });
            }
        });
        
        // Allow UI to breathe between chunks
        if (i + CHUNK_SIZE < filteredOrders.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    // Step 4: Process removals in small batches
    for (let i = 0; i < eventsToRemove.length; i += CHUNK_SIZE) {
        const chunk = eventsToRemove.slice(i, i + CHUNK_SIZE);
        chunk.forEach(event => event.remove());
        
        if (i + CHUNK_SIZE < eventsToRemove.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    // Step 5: Process updates in small batches
    for (let i = 0; i < eventsToUpdate.length; i += CHUNK_SIZE) {
        const chunk = eventsToUpdate.slice(i, i + CHUNK_SIZE);
        
        chunk.forEach(({ event, order }) => {
            const hasDriverAssigned = order.driver_assigned_uuid || order.driver_assigned;
            
            if (hasDriverAssigned) {
                // Make visible with title
                event.setProp('title', createOrderEventTitle(order));
                const eventData = createFullCalendarEventFromOrder(order);
                event.setProp('backgroundColor', eventData.backgroundColor);
                event.setProp('borderColor', eventData.borderColor || eventData.backgroundColor);
                event.setProp('textColor', eventData.textColor || '#FFFFFF');
                event.setProp('display', 'auto');
                event.setProp('classNames', []);
            } else {
                // Hide completely
                event.setProp('title', '');
                event.setProp('backgroundColor', 'transparent');
                event.setProp('borderColor', 'transparent');
                event.setProp('textColor', 'transparent');
                event.setProp('display', 'none');
                event.setProp('classNames', ['hidden-event']);
            }
            
            // Update dates
            const eventData = createFullCalendarEventFromOrder(order);
            event.setStart(eventData.start);
            event.setEnd(eventData.end);
        });
        
        if (i + CHUNK_SIZE < eventsToUpdate.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    // Step 6: Process additions in small batches
    for (let i = 0; i < eventsToAdd.length; i += CHUNK_SIZE) {
        const chunk = eventsToAdd.slice(i, i + CHUNK_SIZE);
        
        chunk.forEach(({ eventData, order }) => {
            const hasDriverAssigned = order.driver_assigned_uuid || order.driver_assigned;
            
            // Modify event data if no driver assigned
            if (!hasDriverAssigned) {
                eventData.title = '';
                eventData.backgroundColor = 'transparent';
                eventData.borderColor = 'transparent';
                eventData.textColor = 'transparent';
                eventData.display = 'none';
                eventData.classNames = ['hidden-event'];
            }
            
            this.calendar.addEvent(eventData);
        });
        
        if (i + CHUNK_SIZE < eventsToAdd.length) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    
    // Step 7: Process leave events
    if (leaveEventsMap.size > 0) {
        const leaveEvents = Array.from(leaveEventsMap.values());
        
        for (let i = 0; i < leaveEvents.length; i += CHUNK_SIZE) {
            const chunk = leaveEvents.slice(i, i + CHUNK_SIZE);
            
            chunk.forEach(event => {
                event.setProp('classNames', ['leave-event', 'leave-visible']);
                event.setProp('display', 'auto');
                if (!event.backgroundColor || event.backgroundColor === 'transparent') {
                    event.setProp('backgroundColor', '#FFD700');
                }
            });
            
            if (i + CHUNK_SIZE < leaveEvents.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
    }
    
    // Step 8: Apply any additional visual filtering needed
    // We've already filtered the data at the source, but if there are
    // additional visual filters that need to be applied, do it here
    if (typeof this.refreshLeaveDisplay === 'function') {
        try {
            const result = this.refreshLeaveDisplay();
            if (result instanceof Promise) {
                await result;
            }
        } catch (error) {
            console.error('Error refreshing leave display:', error);
        }
    }
    
    // Final step: Render once when all operations are complete
    this.calendar.render();
}
    
    // Add a new method to ensure leave events remain visible
    refreshLeaveDisplay() {
        // Find all leave events and ensure they're visible
        const leaveEvents = this.calendar.getEvents().filter(event => {
            return event.classNames.includes('leave-event') || 
                   event.extendedProps?.type === 'leave' ||
                   (event.title && event.title.toLowerCase().includes('leave'));
        });
        
        leaveEvents.forEach(event => {
            // Ensure leave events are visible and styled properly
            event.setProp('classNames', ['leave-event', 'leave-visible']);
            event.setProp('display', 'auto');
            
            // If backgroundColor is transparent, set a default color
            if (!event.backgroundColor || event.backgroundColor === 'transparent') {
                event.setProp('backgroundColor', '#FFD700');
            }
        });
        
        // Add CSS if it doesn't exist yet to ensure leave events are always visible
        if (!document.getElementById('leave-events-style')) {
            const style = document.createElement('style');
            style.id = 'leave-events-style';
            style.textContent = `
                .leave-event, .leave-visible {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                }
                
                .hidden-event {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    background-color: transparent !important;
                    border-color: transparent !important;
                    color: transparent !important;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    
    @action viewEvent(order) {
        // get the event from the calendar
        let event = this.calendar.getEventById(order.id);
        const isCompleted = order.status === 'completed';
        this.modalsManager.show('modals/order-event', {
            // title: `Scheduling for ${order.public_id}`,
            title: `${order.public_id}`,
            eventBus: this.eventBus,
            acceptButtonText: 'Save Changes',
            acceptButtonIcon: 'save',
            hideDeclineButton: true,
            // Disable accept button if order is completed
            disableAcceptButton: isCompleted,
            // Add a tooltip message for completed orders
            acceptButtonTooltip: isCompleted ? 'Cannot edit completed orders' : null,
            order,
            // Store original driver info
            originalDriverUuid: order.driver_assigned_uuid,
            originalDriver: order.driver_assigned,
            reschedule: (date) => {
                if (date && typeof date.toDate === 'function') {
                    date = date.toDate();
                }
    
                order.set('scheduled_at', date);
            },
            endDateReschedule: (date) => {
                if (date && typeof date.toDate === 'function') {
                    date = date.toDate();
                }
    
                if (order.scheduled_at && date < order.scheduled_at) {
                    this.errorMessage = "End Date cannot be earlier than the start date.";
                    this.notifications.error(this.errorMessage);
                    return;
                }    
    
                order.set('estimated_end_date', date);
            },
            unschedule: () => {
                order.set('scheduled_at', null);
            },
            confirm: async (modal) => {
                // Don't allow saving if completed
                if (isCompleted) {
                    this.notifications.warning('Cannot modify a completed order.');
                    modal.done();
                    return;
                }
                modal.startLoading();
    
                if (!order.get('hasDirtyAttributes')) {
                    return modal.done();
                }
    
                try {
                    if (order.scheduled_at && order.estimated_end_date && order.estimated_end_date < order.scheduled_at) {
                        this.errorMessage = "End Date cannot be earlier than the start date.";
                        this.notifications.error(this.errorMessage);
                        modal.stopLoading();
                        return;
                    }
                    
                    // Preserve driver information during the save
                    const hadDriver = !isNone(order.driver_assigned_uuid);
                    
                    await order.save();
                    
                    // Handle the calendar events
                    if (event) {
                        if (!hadDriver) {
                            // If there's no driver assigned, remove the event
                            this.removeEvent(event);
                        } else {
                            // Otherwise, update the existing event
                            const updatedEvent = createFullCalendarEventFromOrder(order);
                            event.setProp('title', updatedEvent.title);
                            event.setStart(updatedEvent.start);
                            event.setEnd(updatedEvent.end);
                        }
                    } else if (hadDriver) {
                        // Create new event if there wasn't one but now there's a driver
                        event = this.calendar.addEvent(createFullCalendarEventFromOrder(order));
                    }
    
                    if (order.scheduled_at) {
                        // notify order has been scheduled
                        this.notifications.success(this.intl.t('fleet-ops.operations.scheduler.index.info-message', { orderId: order.public_id, orderAt: order.scheduledAt }));
                    } else {
                        this.notifications.info(this.intl.t('fleet-ops.operations.scheduler.index.info-message', { orderId: order.public_id }));
                    }
    
                    // Refresh current data without changing page
                    const currentPage = this.page;
                    await this.refreshOrders();
                    this.page = currentPage;
                    
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    @action viewOrderAsEvent(eventClickInfo) {
        const { event } = eventClickInfo;
        const order = this.store.peekRecord('order', event.id);

        this.viewEvent(order, eventClickInfo);
    }

    @action async scheduleEventFromDrop(dropInfo) {
        const { draggedEl, date } = dropInfo;
        const { dataset } = draggedEl;
        const { event } = dataset;
        const data = JSON.parse(event);
        const order = this.store.peekRecord('order', data.id);

        try {
            order.set('scheduled_at', date);
            await order.save();
            this.updateCalendar();
            return this.hostRouter.refresh();
        } catch (error) {
            this.notifications.serverError(error);
            this.removeEvent(event);
        }
    }

    @action receivedEvent(eventReceivedInfo) {
        const { event } = eventReceivedInfo;
        const order = this.store.peekRecord('order', event.id);

        this.setEventProperty(event, 'title', createOrderEventTitle(order));
    }

    @action async rescheduleEventFromDrag(eventDropInfo) {
        const { event } = eventDropInfo;
        const { start } = event;
        const order = this.store.peekRecord('order', event.id);
        const scheduledTime = order.scheduledAtTime;
        const newDate = new Date(`${format(start, 'PP')} ${scheduledTime}`);

        try {
            // set and save order props
            order.set('scheduled_at', isValidDate(newDate) ? newDate : start);
            await order.save();
            this.setEventProperty(event, 'title', createOrderEventTitle(order));
            this.updateCalendar();
            return this.hostRouter.refresh();
        } catch (error) {
            this.notifications.serverError(error);
            this.removeEvent(event);
        }
    }

    removeEvent(event) {
        if (isObject(event) && typeof event.remove === 'function') {
            event.remove();
            return true;
        }

        if (isObject(event) && typeof event.id === 'string') {
            return this.removeEvent(event.id);
        }

        if (isJson(event)) {
            event = JSON.parse(event);
            return this.removeEvent(event.id);
        }

        if (typeof event === 'string') {
            event = this.calendar.getEventById(event);
            if (typeof event.remove === 'function') {
                event.remove();
                return true;
            }
        }

        return false;
    }

    getEvent(event) {
        if (isJson(event)) {
            event = JSON.parse(event);
            return this.calendar.getEventById(event.id);
        }

        if (typeof event === 'string') {
            return this.calendar.getEventById(event);
        }

        return event;
    }

    setEventProperty(event, prop, value) {
        const eventInstance = this.getEvent(event);
        if (typeof eventInstance.setProp === 'function') {
            eventInstance.setProp(prop, value);
            return true;
        }

        return false;
    }
    
    // Updated pagination methods that use the queryParams
    @action
    nextPage() {
        this.page = Number(this.page) + 1;
        if (this.page < this.totalPages) {
            this.transitionToPage(this.page);
        }
    }

    @action
    prevPage() {
        this.page = Number(this.page) - 1;
        if (this.page > 1) {
            this.transitionToPage(this.page);
        }
    }
    
    // Helper method to transition with query params
    transitionToPage(pageNumber) {
        const queryParams = {
            page: pageNumber,
            ref: Date.now()
           
        };
        
        // this.hostRouter.transitionTo({ queryParams });
        this.updatePagedLists(pageNumber);
    }

    updatePagedLists(pageNumber) {
        // Calculate pagination for UI from in-memory data
        const startIndex = (pageNumber - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        
        // If we have enough data in memory, just re-slice it
        const store = this.store;
        const cachedOrders = store.peekAll('order').filter(order => order.status === 'created');
        
        if (cachedOrders.length >= endIndex) {
            // We have enough data in memory
            const pageOrders = cachedOrders.slice(startIndex, endIndex);
            
            // Update the UI lists
            this.scheduledOrders = pageOrders.filter(order => !isNone(order.driver_assigned_uuid));
            this.unscheduledOrders = pageOrders.filter(order => 
                isNone(order.driver_assigned_uuid) && isNone(order.vehicle_assigned_uuid)
            );
        } else {
            // We need to fetch this page
            store.query('order', {
                status: 'created',
                with: ['payload', 'driverAssigned.vehicle'],
                page: pageNumber,
                limit: this.itemsPerPage,
                sort: '-created_at'
            }).then(orders => {
                // Update only the UI lists, not the calendar
                this.scheduledOrders = orders.filter(order => !isNone(order.driver_assigned_uuid));
                this.unscheduledOrders = orders.filter(order => 
                    isNone(order.driver_assigned_uuid) && isNone(order.vehicle_assigned_uuid)
                );
            });
        }
        
        // IMPORTANT: Don't update the calendar on pagination!
        // The calendar should show all events regardless of pagination
    }

}
