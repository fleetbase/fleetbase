import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { format, isValid as isValidDate } from 'date-fns';
import isObject from '@fleetbase/ember-core/utils/is-object';
import isJson from '@fleetbase/ember-core/utils/is-json';
import createFullCalendarEventFromOrder, { createOrderEventTitle } from '../../../utils/create-full-calendar-event-from-order';
import { isNone } from '@ember/utils';

export default class OperationsSchedulerIndexController extends BaseController {
    @service modalsManager;
    @service notifications;
    @service store;
    @service intl;
    @service hostRouter;
    @tracked scheduledOrders = [];
    @tracked unscheduledOrders = [];
    @tracked events = [];
    @service eventBus;
    
    // Single pagination approach
    queryParams = ['ref', 'page'];
    ref = null;
    @tracked page = 1;
    @tracked totalPages = 1;
    @tracked itemsPerPage = 10;
    @tracked calendar;
    
    constructor() {
        super(...arguments);
        this.eventBus.subscribe('calendar-refresh-needed', this.handleCalendarRefresh.bind(this));
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
            this.updateCalendar();
        });
    }

    get isFirstPage() {
        return this.page <= 1;
    }

    get isLastPage() {
        return this.page >= this.totalPages;
    }
    
    // Remaining code remains the same...
    
    @action
    async refreshOrders() {
        const orders = await this.store.query('order', {
            status: 'created',
            with: ['payload', 'driverAssigned.vehicle'],
            page: this.page,
            sort: '-created_at'
        });
        
        this.scheduledOrders = orders.filter(order => !isNone(order.driver_assigned_uuid));
        this.unscheduledOrders = orders.filter(order => isNone(order.driver_assigned_uuid));
        this.updateCalendar();
    }
    
    
    @action setCalendarApi(calendar) {
        this.calendar = calendar;
    }
    
    @action
    handleCalendarRefresh(data) {
        // Update calendar
        this.updateCalendar();
        
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
            status: 'created',
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
    }
        
    updateCalendar() {
        if (!this.calendar) {
            console.warn("Calendar instance not available.");
            return;
        }
    
        // Combine unscheduled and scheduled orders to get all orders
        const allOrders = [...this.unscheduledOrders, ...this.scheduledOrders];
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
        
        this.hostRouter.transitionTo({ queryParams });
    }
}
