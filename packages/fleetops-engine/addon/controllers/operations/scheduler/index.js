import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { format, isValid as isValidDate } from 'date-fns';
import isObject from '@fleetbase/ember-core/utils/is-object';
import isJson from '@fleetbase/ember-core/utils/is-json';
import createFullCalendarEventFromOrder, { createOrderEventTitle } from '../../../utils/create-full-calendar-event-from-order';

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
    queryParams = ['ref'];
    ref = null;
    @tracked currentPageUnscheduled = 1;
    @tracked currentPageScheduled = 1;
    @tracked itemsPerPage = 10;
    @tracked calendar;
    
    constructor() {
        super(...arguments);
        // Add this line to listen for the refresh event
        this.eventBus.subscribe('calendar-refresh-needed', this.handleCalendarRefresh.bind(this));
    }
    didReceiveAttrs() {
        super.didReceiveAttrs();
        // Assuming `scheduledOrders` is fetched based on the query param `ref`
        this.fetchScheduledOrders();
    }
    
      // Fetch the scheduled orders (this can be an API call or state reload)
    fetchScheduledOrders() {
        // Logic to fetch scheduled orders, possibly from the backend or store
        // For example, call an API or service to get the orders
        this.store.query('order', { scheduled: true }).then(orders => {
            this.scheduledOrders = orders;
            this.updateCalendar();  // Call updateCalendar after the orders are fetched
        });
    }

    // Computed properties for pagination
    get paginatedUnscheduledOrders() {
        const start = (this.currentPageUnscheduled - 1) * this.itemsPerPage;
        return this.unscheduledOrders.slice(start, start + this.itemsPerPage);
    }

    get paginatedScheduledOrders() {
        const start = (this.currentPageScheduled - 1) * this.itemsPerPage;
        return this.scheduledOrders.slice(start, start + this.itemsPerPage);
    }

    get totalPagesUnscheduled() {
        return this.totalPages || Math.ceil(this.unscheduledOrders.length / this.itemsPerPage);
    }

    get totalPagesScheduled() {
        return Math.ceil(this.scheduledOrders.length / this.itemsPerPage);
    }

    get isFirstPage() {
        return this.currentPageScheduled <= 1;
    }

    get isLastPage() {
        return this.currentPageUnscheduled >= this.totalPages;
    }
    @action
    async refreshOrders() {
        this.unscheduledOrders = await this.store.query('order', {
            scheduled: false, // Adjust query based on your API
        });
        this.scheduledOrders = await this.store.query('order', {
            scheduled: true, // Adjust query based on your API
        });
    }
    @action setCalendarApi(calendar) {
        this.calendar = calendar;
        // setup some custom post initialization stuff here
        // calendar.setOption('height', 800);
    }
    @action
    handleCalendarRefresh(data) {
        // Call your update method
        this.updateCalendar();
        
        // Optionally, refresh the specific order's data
        if (data && data.orderId) {
            const order = this.store.peekRecord('order', data.orderId);
            if (order) {
                order.reload();
            }
        }
    }
    updateCalendar() {
    
        if (!this.calendar) {
            console.warn("Calendar instance not available.");
            return;
        }
    
        // Combine unscheduled and scheduled orders to get all orders
        const allOrders = [...this.unscheduledOrders, ...this.scheduledOrders];
        // Create an array of valid event IDs from all current orders
        const validEventIds = allOrders.map(order => createFullCalendarEventFromOrder(order).id);
        
        // Step 2: Remove events that are no longer in any orders or are unassigned
        const allEvents = this.calendar.getEvents();
        allEvents.forEach(event => {
            // Find the corresponding order for each event
            const order = allOrders.find(o => createFullCalendarEventFromOrder(o).id === event.id);
           
            // If the event ID is not valid or the order has no driver assigned (for scheduled orders), remove it
            if (!validEventIds.includes(event.id) || (order && !order.driver_assigned)) {
                event.remove(); // Remove the event if it's no longer valid or unassigned
            }
        });
    
        // Step 3: Add or update events for all orders
        allOrders.forEach(order => {
            const event = createFullCalendarEventFromOrder(order);
            const existingEvent = this.calendar.getEventById(event.id);
    
            if (existingEvent) {
                // If the event exists, update properties
                existingEvent.setProp('title', event.title);
                existingEvent.setProp('backgroundColor', event.backgroundColor);
    
                // Adjust visibility if the driver is unassigned for scheduled orders
                if (!order.driver_assigned) {
                    // For scheduled orders with no driver, add the hidden-event class
                    if (this.scheduledOrders.includes(order)) {
                        // console.log(`Hiding event for unassigned driver from scheduled order: ${event.id}`);
                        // existingEvent.setProp('backgroundColor', 'transparent'); // Remove background color
                        existingEvent.setProp('title', ''); // Remove title or set to something generic
                        existingEvent.setProp('classNames', ['hidden-event']); // Add class to hide but keep event data visible
                    }
                } else {
                    existingEvent.setProp('classNames', []); // Ensure event is visible when driver is assigned
                }
    
                // Update start/end dates for scheduled orders if needed
                if (this.scheduledOrders.includes(order)) {
                    existingEvent.setProp('backgroundColor', 'transparent');
                    existingEvent.setStart(event.start);
                    existingEvent.setEnd(event.end);
                }
            } else {
                // If the event does not exist, add it to the calendar
                this.calendar.addEvent(event);
                const newEvent = this.calendar.getEventById(event.id);
    
                // Adjust visibility for new events if no driver is assigned
                if (!order.driver_assigned) {
                    newEvent.setProp('backgroundColor', 'transparent'); // Remove background color
                    newEvent.setProp('title', ''); // Remove title or set to something generic
                    newEvent.setProp('classNames', ['hidden-event']); // Hide unassigned events
                }
            }
        });
        this.calendar.getEvents().forEach(event => {
            if (!event.title || event.title.trim() === '') {
                event.remove();
            }
        });
        // Step 4: Re-render the calendar
        this.calendar.render();
    }
    
    
    @action viewEvent(order) {
        // get the event from the calendar
        let event = this.calendar.getEventById(order.id);

        this.modalsManager.show('modals/order-event', {
            title: `Scheduling for ${order.public_id}`,
            acceptButtonText: 'Save Changes',
            acceptButtonIcon: 'save',
            hideDeclineButton: true,
            order,
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
                    await order.save();
                    // remove event from calendar
                    if (event) {
                        this.removeEvent(event);
                    }

                    if (order.scheduled_at) {
                        // notify order has been scheduled
                        this.notifications.success(this.intl.t('fleet-ops.operations.scheduler.index.info-message', { orderId: order.public_id, orderAt: order.scheduledAt }));
                        // add event to calendar
                        event = this.calendar.addEvent(createFullCalendarEventFromOrder(order));
                    } else {
                        this.notifications.info(this.intl.t('fleet-ops.operations.scheduler.index.info-message', { orderId: order.public_id }));
                    }

                    // update event props
                    this.setEventProperty(event, 'title', createOrderEventTitle(order));
                    this.updateCalendar();
                    // refresh route
                    return this.hostRouter.refresh();
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
    @action
    nextPageUnscheduled() {
        if (this.currentPageUnscheduled < this.totalPagesUnscheduled) {
            this.currentPageUnscheduled++;
        }
    }

    @action
    prevPageUnscheduled() {
        if (this.currentPageUnscheduled > 1) {
            this.currentPageUnscheduled--;
        }
    }

    @action
    nextPageScheduled() {
    
        if (this.currentPageScheduled < this.totalPagesScheduled) {
            this.currentPageScheduled++;
        }
    }

    @action
    prevPageScheduled() {
        if (this.currentPageScheduled > 1) {
            this.currentPageScheduled--;
        }
    }
    
    @action
    goToNextPage() {
        const nextPage = this.currentPageScheduled + 1;

        if (!this.totalPages || nextPage > this.totalPages) {
            console.warn("No more pages to load.");
            return;
        }
        if(this.totalPages > this.currentPageScheduled)
        {
            this.currentPageScheduled = nextPage;
        }

        // Ensure queryParams is defined
        let queryParams = this.hostRouter.currentRoute.queryParams || {};
        queryParams = { ...queryParams, page: nextPage };
        this.hostRouter.transitionTo({ queryParams });
    }

    
    @action
    goToPreviousPage() {
        const prevPage = this.currentPageScheduled - 1;
        if (prevPage >= 1) {
            let queryParams = this.hostRouter.currentRoute.queryParams || {};
            queryParams = { ...queryParams, page: prevPage };  // Fix: Use prevPage instead of nextPage
            this.hostRouter.transitionTo({ queryParams });
        }
    }
}
