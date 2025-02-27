import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { inject as service } from '@ember/service';

/**
 * Component representing the schedule card of an order.
 * @extends Component
 * @memberof OrderScheduleCardComponent
 */
export default class OrderScheduleCardComponent extends Component {
    @service store;
    @service contextPanel;
    @service intl;
    @service modalsManager;
    @service notifications;
    @service abilities;

    /**
     * Indicates if a driver is currently being assigned.
     * @tracked
     * @memberof OrderScheduleCardComponent
     */
    @tracked isAssigningDriver;
    @tracked drivers = [];
    @tracked isLoadingDrivers = false;

    /**
     * Constructor for OrderScheduleCardComponent.
     * @param {Object} owner - The owner of the component.
     * @param {Object} args - Arguments passed to the component, including the order.
     */
    constructor(owner, { order }) {
        super(...arguments);
        this.loadDriverFromOrder(order);
        this.loadPayloadFromOrder(order);
        // this.loadDrivers(order.uuid);
    }

    @action loadDrivers(orderUuid) {
        this.isLoadingDrivers = true;
        // console.log('Fetching drivers for order UUID:', orderUuid);
        try {
            
            // console.log('Fetching drivers for order UUID:', orderUuid);
            this.drivers = this.store.query('driver', { order_uuid: orderUuid });
            // console.log(this.drivers);
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
            console.log(order,"order");
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
                    });

                    modal.startLoading();

                    try {
                        await order.save();
                        this.isAssigningDriver = false;
                        modal.done();
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
              }),
            acceptButtonText: this.intl.t('fleet-ops.component.order.schedule-card.assign-button'),
            confirm: () => {
                order.set('driver_assigned_uuid', driver.id);
                return order
                    .save()
                    .catch((error) => {
                        this.notifications.serverError(error);
                    })
                    .finally(() => {
                        this.isAssigningDriver = false;
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
}
