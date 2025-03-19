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
    @service eventBus;
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
    
    @tracked isModalOpen = false;

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
       
        // this.eventBus.subscribe('calendar-refresh-needed', this.handleCalendarRefresh);
        this.loadDriverFromOrder(order);
        this.loadPayloadFromOrder(order);
        // this.loadDrivers(order.uuid);
    }
    get effectiveEventBus() {
        return this.eventBus || this.args.eventBus;
    }
    
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
        console.log("EventBus in assignDriver:", this.effectiveEventBus);
      
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
        console.log("startAssignDriver",this.effectiveEventBus)
        const eventBus = this.effectiveEventBus;
        try {
            // This is a hack to ensure all modals are closed first
            document.querySelectorAll('.modal.show').forEach(modal => {
                // Try to find and click the close button
                const closeBtn = modal.querySelector('.close, .btn-close, [data-dismiss="modal"]');
                if (closeBtn) {
                    closeBtn.click();
                }
            });
        } catch (e) {
            console.error('Error closing modals:', e);
        }
        if (this.isModalOpen) {
            // Prevent opening a new modal if one is already open
            return;
        }
        const order = this.args.order;
        this.modalsManager.done().then(() => {
        setTimeout(() => {
        this.isModalOpen = true; // Mark that a modal is being shown 
       
        // If driver is not selected, confirm to unassign the driver
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
                            console.log("eventBus",eventBus)
                            if (eventBus) {
                                eventBus.publish('calendar-refresh-needed', { orderId: order.id });
                            }
                            this.notifications.success(
                            this.intl.t('fleet-ops.operations.scheduler.index.success-message', { orderId: order.public_id, orderAt:order.scheduledAt})
                            );
                            modal.done();
                            this.isModalOpen = false;
                        })
                       
                    } catch (error) { 
                        this.notifications.serverError(error);
                        modal.stopLoading();
                    } finally {
                        // Close the modal after the action is completed
                        this.isModalOpen = false;
                    }
                },
                decline: (modal) => {
                    this.isAssigningDriver = false;
                    modal.done();
                    this.isModalOpen = false; 
                },
            });
        }else {
       
            // If driver is available, assign the driver to the order
        return this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.component.order.schedule-card.assign-driver'),
            body: driver.is_available
                ? this.intl.t('fleet-ops.component.order.schedule-card.assign-text', {
                    driverName: driver.name,
                    orderId: order.public_id,
                })
                : this.intl.t('fleet-ops.component.order.schedule-card.assign-busy-text', {
                    driverName: driver.name,
                    orderId: order.public_id,
                    availability: driver.availability_message,
                    button: driver.button_message,
                }),
            acceptButtonText: driver.is_available
                ? this.intl.t('fleet-ops.component.order.schedule-card.assign-button')
                : this.intl.t('fleet-ops.component.order.schedule-card.assign-busy-button', {
                    button: driver.button_message,
                }),

            confirm: (modal) => {
                modal.startLoading();
                order.setProperties({
                    driver_assigned_uuid: driver.id,
                    vehicle_assigned: driver.vehicle || null,
                });

                return order.save()
                    .then(() => {
                        this.isAssigningDriver = false;
                        console.log("eventBus then",eventBus)
                        return this.router.transitionTo('console.fleet-ops.operations.scheduler.index', {
                            queryParams: { ref: Date.now() }
                        });
                       
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);
                    })
                    .finally(() => {
                        console.log("eventBus",eventBus)
                        if (eventBus) {
                            eventBus.publish('calendar-refresh-needed', { orderId: order.id });
                        } else {
                            console.error("eventBus is not available.");
                        }
                        this.notifications.success(
                            this.intl.t('fleet-ops.operations.scheduler.index.success-message', { orderId: order.public_id, orderAt: order.scheduledAt })
                        );
                        modal.done();
                        this.isModalOpen = false; // Ensure modal is closed after action is completed
                    });
            },
            decline: (modal) => {
                modal.done();
                this.isModalOpen = false; // Close the modal when declined
            },
        });
    }
    }, 100);
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
        console.log("loaddriver")
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

    
}
