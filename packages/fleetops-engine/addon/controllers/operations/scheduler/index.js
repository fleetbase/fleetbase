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
            this.availableDrivers = drivers;
            return drivers;
        }).catch(error => {
            console.error('Error loading drivers:', error);
            this.notifications.error('Failed to load driver list');
            return [];
        });
        
        return this.availableDriversLoaded;
    }
   
    @task
    *getOrderStatusOptions() {
        try {
            // Make the API call to get status options
            const response = yield this.fetch.get('orders/statuses');
            
            if (Array.isArray(response)) {
                // Transform the response into the format we need
                this.statusOptions = [
                    { id: '', name: 'All Statuses' },
                    ...response.map(status => {
                        // Format the name: capitalize first letter of each word and replace underscores with spaces
                        const words = status.split('_');
                        const formattedName = words
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                            .join(' ');
                        
                        return { 
                            id: status, 
                            name: formattedName 
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
    

    // Action to handle status selection
    @action
    onStatusChange(selected) {
        this.selectedStatus = selected;
        this.status_filter = selected ? selected.id : '';
    }
    @action
    onDriverChange(driver) {
        this.selectedDriver = driver;
        this.driver_filter = driver ? driver.id : '';
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
        } catch (error) {
            console.error("Error applying filters:", error);
            this.notifications.error("An error occurred while applying filters.");
        }
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
        return orders.filter(order => {
            const statusFilter = this.status_filter.toLowerCase();
    
            if (order.status && order.status.toLowerCase() === statusFilter) {
                return true;
            }
    
            // Match based on specific boolean flags
            switch (statusFilter) {
                case 'confirmed':
                    return order.status === 'created' && !order.isDispatched && !order.isCompleted;
                case 'created':
                    return !order.isDispatched && !order.isCompleted && !order.isCanceled;
                case 'dispatched':
                    return !!order.isDispatched;
                case 'completed':
                    return !!order.isCompleted;
                case 'cancelled':
                case 'canceled':
                    return !!order.isCanceled;
                case 'in_progress':
                    return !!order.isDispatched && !order.isCompleted;
                default:
                    return false;
            }
        });
    }
    

    // Updated clear filters action
    @action
    clearFilters() {
        // Reset filter values
        this.order_id_filter = '';
        this.driver_filter = '';
        this.status_filter = '';
        this.showBusy = true;
        this.showLeave = true;
        this.showTripAssigned = true;

        // Reset selected filter values
        this.selectedDriver = null;
        this.selectedStatus = null;

        // Reset calendar filtering to show all events
        this.calendarFilteredOrders = this.calscheduledOrders; // Reset to the original unsorted list
        this.updateCalendarWithFilteredData(this.calendarFilteredOrders);
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

    

    updateCalendar() {
        if (!this.calendar) {
            console.warn("Calendar instance not available.");
            return;
        }
    
        // Combine unscheduled and scheduled orders to get all orders
        // const allOrders = [...this.unscheduledOrders, ...this.scheduledOrders];
        const allOrders = [...this.calscheduledOrders]
        // Create an array of valid event IDs from all current orders
        const validOrderEventIds = allOrders.map(order => createFullCalendarEventFromOrder(order).id);
        
        // Get all current calendar events
        const allEvents = this.calendar.getEvents();
        
        // Identify leave events - important to preserve them
        const leaveEvents = allEvents.filter(event => {
            // Identify leave events by class, source, or other property
            return event.classNames.includes('leave-event') || 
                   event.extendedProps?.type === 'leave' ||
                   (event.title && event.title.toLowerCase().includes('leave'));
        });
        
        // Keep track of leave event IDs to preserve them
        const leaveEventIds = leaveEvents.map(event => event.id);
        
        // Step 2: Process non-leave events (order events)
        allEvents
            .filter(event => !leaveEventIds.includes(event.id))
            .forEach(event => {
                // Find the corresponding order for each event
                const order = allOrders.find(o => createFullCalendarEventFromOrder(o).id === event.id);
               
                // If the event ID is not valid order event ID, remove it
                if (!validOrderEventIds.includes(event.id)) {
                    event.remove(); // Remove the event if it's no longer valid
                } else if (order && !order.driver_assigned) {
                    // For unassigned drivers, actually hide the event completely
                    event.setProp('title', '');
                    event.setProp('backgroundColor', 'transparent');
                    event.setProp('borderColor', 'transparent'); // Also clear the border color
                    event.setProp('textColor', 'transparent'); // Also clear the text color
                    event.setProp('display', 'none'); // Completely hide the event
                    event.setProp('classNames', ['hidden-event']);
                }
            });
    
        // Step 3: Add or update events for all orders
        allOrders.forEach(order => {
            const event = createFullCalendarEventFromOrder(order);
            const existingEvent = this.calendar.getEventById(event.id);
            const hasDriverAssigned = order.driver_assigned_uuid || order.driver_assigned;
            
            if (existingEvent) {
                // If the event exists, update properties
                if (hasDriverAssigned) {
                    // Driver assigned - make visible with title
                    existingEvent.setProp('title', createOrderEventTitle(order));
                    existingEvent.setProp('backgroundColor', event.backgroundColor);
                    existingEvent.setProp('borderColor', event.borderColor || event.backgroundColor);
                    existingEvent.setProp('textColor', event.textColor || '#FFFFFF');
                    existingEvent.setProp('display', 'auto'); // Make sure it's displayed
                    existingEvent.setProp('classNames', []); // Clear any hiding classes
                } else {
                    // No driver - completely hide event
                    existingEvent.setProp('title', '');
                    existingEvent.setProp('backgroundColor', 'transparent');
                    existingEvent.setProp('borderColor', 'transparent');
                    existingEvent.setProp('textColor', 'transparent');
                    existingEvent.setProp('display', 'none'); // Use display:none to completely hide
                    existingEvent.setProp('classNames', ['hidden-event']);
                }
    
                // Always update dates
                existingEvent.setStart(event.start);
                existingEvent.setEnd(event.end);
            } else {
                // If the event does not exist, add it to the calendar
                this.calendar.addEvent(event);
                const newEvent = this.calendar.getEventById(event.id);
    
                // Adjust visibility for new events if no driver is assigned
                if (!hasDriverAssigned) {
                    newEvent.setProp('title', '');
                    newEvent.setProp('backgroundColor', 'transparent');
                    newEvent.setProp('borderColor', 'transparent');
                    newEvent.setProp('textColor', 'transparent');
                    newEvent.setProp('display', 'none'); // Hide completely
                    newEvent.setProp('classNames', ['hidden-event']);
                }
            }
        });
        
        // IMPORTANT: Don't remove events just because they don't have titles
        // This was causing leave events to disappear
        // Instead, only remove non-leave events that have empty titles AND are not valid order events
        this.calendar.getEvents().forEach(event => {
            const isLeaveEvent = leaveEventIds.includes(event.id);
            const hasEmptyTitle = !event.title || event.title.trim() === '';
            const isValidOrderEvent = validOrderEventIds.includes(event.id);
            
            if (hasEmptyTitle && !isLeaveEvent && !isValidOrderEvent) {
                event.remove();
            }
        });
        
        // Make sure leave events are always visible regardless of driver assignments
        leaveEvents.forEach(event => {
            event.setProp('classNames', ['leave-event', 'leave-visible']);
            event.setProp('display', 'auto'); // Ensure display is set to auto for leave events
            // Ensure leave events have proper styling
            if (!event.backgroundColor || event.backgroundColor === 'transparent') {
                event.setProp('backgroundColor', '#FFD700'); // Default leave color
            }
        });
        // Apply checkbox filters
        // this.updateCalendarWithFilters();
        // Re-render the calendar
        this.calendar.render();
        
        // Force calendar to refresh leave data
        this.refreshLeaveDisplay();
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
    
        this.modalsManager.show('modals/order-event', {
            title: `Scheduling for ${order.public_id}`,
            eventBus: this.eventBus,
            acceptButtonText: 'Save Changes',
            acceptButtonIcon: 'save',
            hideDeclineButton: true,
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
