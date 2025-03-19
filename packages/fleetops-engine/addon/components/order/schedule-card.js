import { getOwner } from '@ember/application';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { inject as service } from '@ember/service';
import FullCalendar from '@fullcalendar/core';  
import dayGridPlugin from '@fullcalendar/daygrid';  // Day grid plugin for month view
import interactionPlugin from '@fullcalendar/interaction'; 
// import createFullCalendarEventFromOrder from '@fleetbase/fleetops-engine/utils/create-full-calendar-event-from-order';
/**
 * Component representing the schedule card of an order.
 * @extends Component
 * @memberof OrderScheduleCardComponent
 */

export default class OrderScheduleCardComponent extends Component {

    @service calendar;
    @service store;
    @service contextPanel;
    @service intl;
    @service modalsManager;
    @service notifications;
    @service abilities;
    @tracked timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    /**
     * Indicates if a driver is currently being assigned.
     * @tracked
     * @memberof OrderScheduleCardComponent
     */
    @tracked isAssigningDriver;
    @tracked drivers = [];
    @tracked isLoadingDrivers = false;
    @tracked assignedDrivers = [];
    @tracked orders = [];
    @tracked events = [];
    // @service router;
    @service eventBus;

    router = null;
    calendarInstance = null; 
    /**
     * Constructor for OrderScheduleCardComponent.
     * @param {Object} owner - The owner of the component.
     * @param {Object} args - Arguments passed to the component, including the order.
     */
    constructor(owner, { order }) {
        super(...arguments);
        let ownerInstance = getOwner(this);
        let storeService = ownerInstance.lookup('service:store');

        // Try looking up router:main as an alternative
        this.router = ownerInstance.lookup('router:main');
     
        this.loadDriverFromOrder(order);
        this.loadPayloadFromOrder(order);
        // this.loadDrivers(order.uuid);
    }
    @action
    initializeFullCalendar() {
        const calendarElement = document.getElementById('fleetbase-full-calendar');
        if (!calendarElement._initialized) {
            const calendar = new FullCalendar.Calendar(calendarElement, {
                plugins: [dayGridPlugin, interactionPlugin],  // Register necessary plugins
                initialView: 'dayGridMonth',  // Example view for month grid
                events: this.args.events,  // Your events data
                editable: true,  // Enable editing
            });
            calendar.render();  // Render FullCalendar
            calendarElement._initialized = true;  // Mark it as initialized
        }
    }
    // Assuming you are passing the FullCalendar instance to the component
    // @action
    // refreshFullCalendar() {
    //     const calendarApi = this.getFullCalendarApi();
    //     console.log(calendarApi)
    //     if (calendarApi) {
    //         console.log('Refreshing FullCalendar events');
    //         calendarApi.refetchEvents();  // This will re-fetch events from the server
    //     } else {
    //         console.log('FullCalendar API is not available.');
    //     }
    // }

    // // Method to get FullCalendar instance from the DOM (use FullCalendar's vanilla JS API)
    // getFullCalendarApi() {
    //     const calendarElement = document.getElementById('fleetbase-full-calendar'); // The FullCalendar container element
    //     if (calendarElement) {
    //         // Check if the FullCalendar instance is attached
    //         const calendar = calendarElement.fullCalendar ? calendarElement.fullCalendar() : null;
    //         if (calendar) {
    //             return calendar.getApi ? calendar.getApi() : null;  // Access FullCalendar API if available
    //         }
    //     }
    //     return null;
    // }
    @action loadDrivers(orderUuid) {
        this.isLoadingDrivers = true;
        // console.log('Fetching drivers for order UUID:', orderUuid);
        try {
            
            this.drivers = this.store.query('driver', { order_uuid: orderUuid,
                timezone: this.timezone
             });
        } catch (error) {
            console.error('Failed to load drivers:', error);
            this.drivers = [];
        } finally {
            this.isLoadingDrivers = false;
        }
        }
    /**
     * Action to handle driver click events.
     * @action
     * @param {DriverModel} driver - The clicked driver object.
     * @memberof OrderScheduleCardComponent
     */
    @action onClickDriver(driver) {
        this.contextPanel.focus(driver);
    }

    /**
     * Action to handle vehicle click events.
     * @action
     * @param {VehicleModel} vehicle - The clicked vehicle object.
     * @memberof OrderScheduleCardComponent
     */
    @action onClickVehicle(vehicle) {
        this.contextPanel.focus(vehicle);
    }

    /**
     * Action to start the process of assigning a driver.
     * @action
     * @memberof OrderScheduleCardComponent
     */
    @action startAssignDriver() { 
        if (this.abilities.cannot('fleet-ops assign-driver-for order')) {
            return;
        }
        this.isAssigningDriver = !this.isAssigningDriver;
        if (this.isAssigningDriver) {
            const order = this.args.order;
            this.loadDrivers(order.id);
          }
    }

    /**
     * Action to assign a driver to an order.
     * @action
     * @param {DriverModel} driver - The driver to be assigned.
     * @memberof OrderScheduleCardComponent
     */
    @action assignDriver(driver) { 
        const order = this.args.order;

        if (isBlank(driver)) {
            return this.modalsManager.confirm({ 
                title: this.intl.t('fleet-ops.component.order.schedule-card.unassign-driver'),
                body: this.intl.t('fleet-ops.component.order.schedule-card.unassign-text', { orderId: order.public_id }),
                acceptButtonText: this.intl.t('fleet-ops.component.order.schedule-card.unassign-button'),
                confirm: async (modal) => {
                    order.setProperties({
                        driver_assigned: null,
                        driver_assigned_uuid: null,
                        vehicle_assigned: null,
                    });

                    modal.startLoading();

                    try {
                        await order.save()
                        .then(() => {
                            this.isAssigningDriver = false;
                            return this.router.transitionTo('console.fleet-ops.operations.scheduler.index', {
                                queryParams: { ref: Date.now() }
                              })
                        })
                        .then(() => {

                            // this.eventBus.publish('calendar-refresh-needed', { orderId: order.id });
                            if (this.eventBus) {
                                this.eventBus.publish('calendar-refresh-needed', { orderId: order.id });
                            } else {
                                console.error("eventBus is not available.");
                            }
                            this.notifications.success(
                                this.intl.t('fleet-ops.operations.scheduler.index.success-message', { orderId: order.public_id, orderAt:order.scheduledAt})
                            );
                            modal.done();
                        })
                       
                    } catch (error) { 
                        this.notifications.serverError(error);
                        modal.stopLoading();
                    }
                },
                decline: (modal) => {
                    this.isAssigningDriver = false;
                    modal.done();
                },
            });
        }

            return this.modalsManager.confirm({
                title: this.intl.t('fleet-ops.component.order.schedule-card.assign-driver'),
                // body: this.intl.t('fleet-ops.component.order.schedule-card.assign-text', { driverName: driver.name, orderId: order.public_id }),
                body: driver.is_available
                ? this.intl.t('fleet-ops.component.order.schedule-card.assign-text', {
                    driverName: driver.name,
                    orderId: order.public_id,
                })
                : this.intl.t('fleet-ops.component.order.schedule-card.assign-busy-text', {
                    driverName: driver.name,
                    orderId: order.public_id,
                    availability:driver.availability_message,
                    button:driver.button_message,
                }),
                // acceptButtonText: this.intl.t('fleet-ops.component.order.schedule-card.assign-button'),
                acceptButtonText: driver.is_available
                ? this.intl.t('fleet-ops.component.order.schedule-card.assign-button')
                : this.intl.t('fleet-ops.component.order.schedule-card.assign-busy-button',{
                    button:driver.button_message,
                }),

                confirm: (modal) => {
                    modal.startLoading();
                    order.setProperties({
                        driver_assigned_uuid: driver.id,
                        vehicle_assigned: driver.vehicle || null,
                    });
                    return order
                        .save()
                        .then(() => {
                            this.isAssigningDriver = false;
                            return this.router.transitionTo('console.fleet-ops.operations.scheduler.index', {
                                queryParams: { ref: Date.now() }
                              })
                        })
                        // .then(() => {
                        // })
                        .catch((error) => {
                            this.notifications.serverError(error);
                        })
                        .finally(() => {
                            // this.isAssigningDriver = false;

                            // this.eventBus.publish('calendar-refresh-needed', { orderId: order.id });
                            if (this.eventBus) {
                                this.eventBus.publish('calendar-refresh-needed', { orderId: order.id });
                            } else {
                                console.error("eventBus is not available.");
                            }
                            this.notifications.success(
                                this.intl.t('fleet-ops.operations.scheduler.index.success-message', { orderId: order.public_id, orderAt:order.scheduledAt})
                            );
                            modal.done();
                            
                            
                        });
                },
                decline: (modal) => {
                    this.isAssigningDriver = false;
                    modal.done();
                },
            });
    }

    /**
     * Action triggered when the title of an order is clicked.
     * @action
     * @param {OrderModel} order - The order associated with the clicked title.
     * @memberof OrderScheduleCardComponent
     */
    @action onTitleClick(order) {
        const { onTitleClick } = this.args;

        if (typeof onTitleClick === 'function') {
            onTitleClick(order);
        }
    }

    /**
     * Loads the driver information from the order.
     * @param {OrderModel} order - The order to load the driver from.
     * @memberof OrderScheduleCardComponent
     */
    loadDriverFromOrder(order) { 
        if (order && typeof order.loadDriver === 'function') {
            order.loadDriver();
        }
    }

    /**
     * Loads the payload information from the order.
     * @param {OrderModel} order - The order to load the payload from.
     * @memberof OrderScheduleCardComponent
     */
    loadPayloadFromOrder(order) { 
        if (order && typeof order.loadPayload === 'function') {
            order.loadPayload();
        }
    }

    // Helper function to update the assigned drivers list dynamically
 
    // updateAssignedDriversList(order, isAssigned) { alert("update")
    //     if (!this.assignedDrivers) {
    //         this.assignedDrivers = []; // Initialize if it's undefined
    //     }
    //     if (isAssigned) { alert("isassigned")
    //         // Add the driver to the list of assigned drivers
    //         console.log("order",order)
    //         console.log("public_id",order.public_id)
    //         this.assignedDrivers.push({
    //             orderId: order.public_id,
    //             driverId: order.driver_assigned_uuid,
    //             driverName: order.driver_assigned ? order.driver_assigned.name : 'N/A',
    //         });
    //         console.log("assignedDrivers",this.assignedDrivers)
    //     } else { alert("not isassigned")
    //         // Remove the driver from the assigned drivers list
    //         console.log("order.public_id",order.public_id)
    //         this.assignedDrivers = this.assignedDrivers.filter(driver => driver.orderId !== order.public_id);
    //     }
    // }
    // async refreshOrders() {
    //     try {
    //         console.log("Refreshing orders...");
    //         this.orders = await this.store.query('order', {
    //           status: 'created',
    //           limit: 100,
    //           sort: '-created_at',
    //         });
    //         console.log("Orders fetched:", this.orders);
    //     } catch (error) {
    //         console.error('Error refreshing orders:', error);
    //     }
    // }
    
}
