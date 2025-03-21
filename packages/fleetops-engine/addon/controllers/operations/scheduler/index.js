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
    
        // Get all scheduled orders with drivers assigned
        const scheduledOrdersWithDrivers = this.scheduledOrders.filter(order => 
            !isNone(order.driver_assigned_uuid) || !isNone(order.driver_assigned)
        );
        
        // First, ensure all these orders have events on the calendar
        scheduledOrdersWithDrivers.forEach(order => {
            const event = createFullCalendarEventFromOrder(order);
            const existingEvent = this.calendar.getEventById(order.id);
    
            if (existingEvent) {
                // Update existing event
                existingEvent.setProp('title', event.title);
                existingEvent.setProp('backgroundColor', event.backgroundColor);
                existingEvent.setStart(event.start);
                existingEvent.setEnd(event.end);
            } else {
                // Add new event if it doesn't exist
                this.calendar.addEvent(event);
            }
        });
        
        // Now, handle events that might need to be removed
        // But be careful not to remove events for orders that exist on other pages
        const currentPageOrderIds = [...this.scheduledOrders, ...this.unscheduledOrders]
            .map(order => order.id);
        
        // Get all calendar events
        const allEvents = this.calendar.getEvents();
        
        // Only remove events if their corresponding orders are on the current page
        // and no longer have drivers assigned
        allEvents.forEach(event => {
            const orderId = event.id;
            // Only consider removing events for orders on the current page
            if (currentPageOrderIds.includes(orderId)) {
                const order = this.scheduledOrders.find(o => o.id === orderId) || 
                             this.unscheduledOrders.find(o => o.id === orderId);
                
                // If the order exists on this page but no longer has a driver assigned,
                // remove the event
                if (order && isNone(order.driver_assigned_uuid)) {
                    event.remove();
                }
            }
        });
        
        // Re-render the calendar
        this.calendar.render();
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
        if (this.page < this.totalPages) {
            this.transitionToPage(this.page + 1);
        }
    }

    @action
    prevPage() {
        if (this.page > 1) {
            this.transitionToPage(this.page - 1);
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