import { getOwner } from '@ember/application';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { inject as service } from '@ember/service';
import FullCalendar from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { later } from '@ember/runloop';


export default class OrderScheduleCardComponent extends Component {
    @service calendar;
    @service store;
    @service contextPanel;
    @service intl;
    @service eventBus;
    @service modalsManager;
    @service notifications;
    @service abilities;
    @service analytics;
    @tracked timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    @tracked isAssigningDriver = false;
    @tracked drivers = [];
    @tracked isLoadingDrivers = false;
    @tracked assignedDrivers = [];
    @tracked orders = [];
    @tracked events = [];
    @tracked isModalOpen = false;
    @tracked showValidationErrors = false;
    @tracked originalOrderSnapshot = null;
    @tracked skipNextChangeCheck = false;
    @tracked isSaving = false;
    @tracked tempDriverSelection = null;
    @tracked tempVehicleSelection = null;
    @tracked originalOrder = null;
    @tracked shouldReopenEditModal = false;
    @tracked pendingEditModalData = null;
    router = null;
    calendarInstance = null;
    skipUnassignConfirm = false;



    constructor(owner, { order }) {
        super(...arguments);
        // Create a manual deep copy of the original order data
        this.originalOrder = {
            driver_assigned: order.driver_assigned ? order.driver_assigned : null,
            driver_assigned_uuid: order.driver_assigned_uuid,
            vehicle_assigned: order.vehicle_assigned ? order.vehicle_assigned : null,
            scheduled_at: order.scheduled_at ? order.scheduled_at : null,
            estimated_end_date: order.estimated_end_date ? order.estimated_end_date : null,
        };

        let ownerInstance = getOwner(this);
        let storeService = ownerInstance.lookup('service:store');

        // Try looking up router:main as an alternative
        this.router = ownerInstance.lookup('router:main');

        this.loadDriverFromOrder(order);
        this.loadPayloadFromOrder(order);
    }
    get isCompleted() {
        return this.args.order.status === 'completed';
    }
    get effectiveEventBus() {
        return this.eventBus || this.args.eventBus;
    }

    @action loadDrivers(orderUuid) {
        this.isLoadingDrivers = true;
        try {
            this.drivers = this.store.query('driver', {
                order_uuid: orderUuid,
                timezone: this.timezone,
                limit: 500
            });
        } catch (error) {
            console.error('Failed to load drivers:', error);
            this.drivers = [];
        } finally {
            this.isLoadingDrivers = false;
        }
    }

    @action onClickDriver(driver) {
        this.contextPanel.focus(driver);
    }

    @action onClickVehicle(vehicle) {
        this.contextPanel.focus(vehicle);
    }

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


    @action assignDriver(driver) {
        const eventBus = this.effectiveEventBus;
        try {
            // Close any open modals first using Ember's modal service
            if (this.modalsManager && typeof this.modalsManager.done === 'function') {
                this.modalsManager.done();
            }
        } catch (e) {
            console.error('Error closing modals:', e);
        }

        if (this.isModalOpen) {
            // Prevent opening a new modal if one is already open
            return;
        }

        const order = this.args.order;
        this.modalsManager.done().then(() => {
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
                            is_driver_assigned: false,
                            driver_assigned_uuid: null,
                            vehicle_assigned: null,
                        });

                        modal.startLoading();

                        try {
                            await order.save();

                            // Get the current page from the router
                            const currentRoute = this.router.currentRoute;
                            const queryParams = currentRoute.queryParams || {};
                            const currentPage = queryParams.page || 1;

                            // Update the ref timestamp while keeping the same page
                            const newQueryParams = {
                                ref: Date.now(),
                                page: currentPage
                            };

                            return this.router.transitionTo('console.fleet-ops.operations.scheduler.index', {
                                queryParams: newQueryParams
                            }).then(() => {
                                if (eventBus) {
                                    eventBus.publish('calendar-refresh-needed', {
                                        orderId: order.id,
                                        currentPage: currentPage,
                                        refreshAll: true
                                    });
                                }
                                this.notifications.success(
                                    this.intl.t('fleet-ops.operations.scheduler.index.success-message', {
                                        orderId: order.public_id,
                                        orderAt: order.scheduledAt
                                    })
                                );
                                modal.done();
                                this.isModalOpen = false;
                            });
                        } catch (error) {
                            this.notifications.serverError(error);
                            modal.stopLoading();
                        } finally {
                            this.isModalOpen = false;
                        }
                    },
                    decline: (modal) => {
                        this.isAssigningDriver = false;
                        modal.done();
                        this.isModalOpen = false;
                    },
                });
            } else {
                if (!driver.is_available && driver.have_no_vehicle) {
                    this.modalsManager.confirm({
                        title: this.intl.t('fleet-ops.component.order.schedule-card.driver-no-vehicle-title'),
                        body: this.intl.t('fleet-ops.component.order.schedule-card.driver-has-no-vehicle'),
                        acceptButtonText: this.intl.t('fleet-ops.component.order.schedule-card.ok-button'),
                        hideCancelButton: true,
                        modalClass: 'driver-has-no-vehicle',
                        confirm: (modal) => {
                            modal.done();
                            this.isModalOpen = false;
                            // Schedule reopening of edit modal instead of DOM manipulation
                            this.scheduleEditModalReopen(order);
                            // Handle modal reopening after operation
                            this.handleModalReopeningAfterOperation();
                        }
                    });
                    return;
                }


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
                            availability: driver.availability_message || 'Unavailable',
                            button: driver.button_message || 'Continue with assignment',
                        }),
                    acceptButtonText: driver.is_available
                        ? this.intl.t('fleet-ops.component.order.schedule-card.assign-button')
                        : this.intl.t('fleet-ops.component.order.schedule-card.assign-busy-button', {
                            button: driver.button_message || 'Continue with assignment',
                        }),

                    confirm: (modal) => {
                        // Get the current query params
                        const currentRoute = this.router.currentRoute;
                        const queryParams = currentRoute.queryParams || {};
                        const currentPage = queryParams.page || 1;
                        modal.startLoading();
                        order.setProperties({
                            driver_assigned: driver,
                            is_driver_assigned: true,
                            driver_assigned_uuid: driver.id,
                            vehicle_assigned: driver.vehicle || null,
                        });

                        return order.save()
                            .then(() => {
                                this.isAssigningDriver = false;

                                // Update with current page
                                const newQueryParams = {
                                    ref: Date.now(),
                                    page: currentPage
                                };

                                return this.router.transitionTo('console.fleet-ops.operations.scheduler.index', {
                                    queryParams: newQueryParams
                                });
                            })
                            .catch((error) => {
                                this.notifications.serverError(error);
                            })
                            .finally(() => {
                                if (eventBus) {
                                    // Pass the current page to the refresh handler
                                    eventBus.publish('calendar-refresh-needed', {
                                        orderId: order.id,
                                        currentPage: currentPage,
                                        refreshAll: true
                                    });
                                } else {
                                    console.error("eventBus is not available.");
                                }
                                this.notifications.success(
                                    this.intl.t('fleet-ops.operations.scheduler.index.success-message', {
                                        orderId: order.public_id,
                                        orderAt: order.scheduledAt
                                    })
                                );
                                modal.done();
                                this.isModalOpen = false;
                            });
                    },
                    decline: (modal) => {
                        modal.done();
                        this.isModalOpen = false;
                    },
                });
            }
            // }, 100);
        });
    }

    @action
    onTitleClick(order) {
        if (typeof this.args.onTitleClick === 'function') {
            this.args.onTitleClick(order);

            if (this.skipNextChangeCheck) {
                this.skipNextChangeCheck = false; // reset after use
                return;
            }

            if (!this.originalOrderSnapshot) {
                this.originalOrderSnapshot = {
                    driver_id: order.driver_assigned?.id,
                    vehicle_id: order.vehicle_assigned?.id,
                    scheduledAt: order.scheduledAt,
                    estimatedEndDate: order.estimatedEndDate,
                };
            }

        }
    }

    loadDriverFromOrder(order) {
        if (order && typeof order.loadDriver === 'function') {
            order.loadDriver();
        }
    }

    loadPayloadFromOrder(order) {
        if (order && typeof order.loadPayload === 'function') {
            order.loadPayload();
        }
    }


    hasOrderChanged(order) {
        const snapshot = this.originalOrderSnapshot;
        if (!snapshot) return false;

        return (
            snapshot.driver_id !== order.driver_assigned?.internal_id ||
            snapshot.vehicle_id !== order.vehicle_assigned?.internal_id
            //   snapshot.scheduledAt !== order.scheduledAt ||
            //   snapshot.estimatedEndDate !== order.estimatedEndDate
            // Add more fields if needed
        );
    }

    /*
    * Save the order
    */
    @action
    saveOrder(order) {
        const orderId = order.public_id;
        const hasDriver = this.tempDriverSelection !== null || order.driver_assigned !== null;
        const hasVehicle = this.tempVehicleSelection !== null || order.vehicle_assigned !== null;
        const isPartiallyAssigned = hasDriver !== hasVehicle;

        // Get current route info for redirection
        const currentRoute = this.router.currentRoute;
        const queryParams = currentRoute.queryParams || {};
        const currentPage = queryParams.page || 1;

        // Update the ref timestamp while keeping the same page
        const newQueryParams = {
            ref: Date.now(),
            page: currentPage
        };

        // Check if only dates have changed (no changes to driver/vehicle assignments)
        const hasDatesChanged = order.hasDirtyAttributes && (
            order.changedAttributes().scheduledAt ||
            order.changedAttributes().estimatedEndDate
        );

        const hasDriverVehicleChanged = order.hasDirtyAttributes && (
            order.changedAttributes().driver_assigned ||
            order.changedAttributes().vehicle_assigned ||
            order.changedAttributes().driver_assigned_uuid ||
            order.changedAttributes().vehicle_assigned_uuid
        );

        // If only dates have changed, skip driver/vehicle validation
        const isDatesOnlyChange = hasDatesChanged && !hasDriverVehicleChanged;

        // Check if driver is being unassigned
        const wasDriverAssigned = this.originalOrder.driver_assigned_uuid !== null && this.originalOrder.driver_assigned_uuid !== undefined;
        const isUnassigningDriver = wasDriverAssigned && !hasDriver;

        // Check if there are any changes to the order, like driver, vehicle, date, etc.
        const hasChanges = (() => {
            // Helper function to safely compare values
            const safeCompare = (val1, val2) => {
                if (val1 === val2) return false;
                if (val1 == null && val2 == null) return false; // Both null/undefined
                if (val1 == null || val2 == null) return true;  // One is null/undefined
                return val1 !== val2;
            };

            return (
                safeCompare(this.originalOrder.driver_assigned_uuid, order.driver_assigned_uuid) ||
                safeCompare(this.originalOrder.vehicle_assigned_uuid, order.vehicle_assigned_uuid) ||
                safeCompare(this.originalOrder.scheduled_at, order.scheduled_at) ||
                safeCompare(this.originalOrder.estimated_end_date, order.estimated_end_date)
            );
        })();


        // If no changes then close the modal and show a notification
        if (!hasChanges) {
            this.notifications.info(this.intl.t('fleet-ops.component.order.schedule-card.no-changes', {
                defaultValue: 'No changes were made to the order.',
                orderId: order.public_id
            }));

            // Close the modal
            if (this.modalsManager && typeof this.modalsManager.done === 'function') {
                this.modalsManager.done();
            }
            return;
        }

        if (!order.scheduled_at) {
            this.notifications.error(
                this.intl.t('fleet-ops.component.order.schedule-card.start-date-required')
            );
            return;
        }

        // Handle driver unassignment with confirmation dialog
        if (isUnassigningDriver) {
            return this.modalsManager.confirm({
                title: this.intl.t('fleet-ops.component.order.schedule-card.unassign-driver'),
                body: this.intl.t('fleet-ops.component.order.schedule-card.unassign-text', { orderId: order.public_id }),
                acceptButtonText: this.intl.t('fleet-ops.component.order.schedule-card.unassign-button'),
                confirm: async (modal) => {
                    order.setProperties({
                        driver_assigned: null,
                        is_driver_assigned: false,
                        driver_assigned_uuid: null,
                        vehicle_assigned: null,
                        vehicle_assigned_uuid: null
                    });

                    modal.startLoading();

                    try {
                        await order.save();
                        // After successful unassign, update the original state
                        this.originalOrder = null;

                        this.notifications.success(
                            this.intl.t('fleet-ops.operations.scheduler.index.success-message', {
                                orderId: order.public_id,
                                orderAt: order.scheduledAt
                            })
                        );

                        modal.done();
                        this.isModalOpen = false;

                        // Publish calendar update before transition
                        if (this.effectiveEventBus) {
                            this.effectiveEventBus.publish('calendar-refresh-needed', {
                                orderId: order.id,
                                currentPage: currentPage,
                                refreshAll: true
                            });
                        }

                        // Then transition
                        return this.router.transitionTo('console.fleet-ops.operations.scheduler.index', {
                            queryParams: newQueryParams
                        });
                    } catch (error) {
                        this.notifications.serverError(error);
                        modal.stopLoading();
                    } finally {
                        this.isModalOpen = false;
                    }
                },
                decline: (modal) => {
                    this.isAssigningDriver = false;
                    modal.done();
                    this.isModalOpen = false;

                    // Clear temporary selections to restore original state
                    this.tempDriverSelection = null;
                    this.tempVehicleSelection = null;

                    // Publish calendar refresh event to update the page
                    if (this.effectiveEventBus) {
                        this.effectiveEventBus.publish('calendar-refresh-needed', {
                            orderId: order.id,
                            currentPage: currentPage,
                            refreshAll: true
                        });
                    }

                    // Schedule reopening of edit modal instead of DOM manipulation
                    this.scheduleEditModalReopen(order);
                    // Handle modal reopening after operation
                    this.handleModalReopeningAfterOperation();
                },
            });
        }

        // Check for partial assignment only if driver/vehicle fields have changed
        if (isPartiallyAssigned && !isDatesOnlyChange) {
            // Show error if only one of driver/vehicle is selected
            this.notifications.error(
                this.intl.t('fleet-ops.component.order.schedule-card.required-error')
            );

            // Schedule reopening of edit modal instead of DOM manipulation
            this.scheduleEditModalReopen(order);
            // Handle modal reopening after operation
            this.handleModalReopeningAfterOperation();
            return;
        }

        // Driver assigned but not available - show validation popup
        if (hasChanges && hasDriver && (!order.driver_assigned.is_available || order.vehicle_assigned.is_vehicle_available == 0)) {
            // Determine which one is busy
            const isDriverBusy = !order.driver_assigned.is_available;
            const isVehicleBusy = order.vehicle_assigned.is_vehicle_available == 0;

            let title, body, acceptButtonText;

            if (isDriverBusy && isVehicleBusy) {
                title = this.intl.t('fleet-ops.component.order.schedule-card.assign-driver-vehicle');
                body = this.intl.t('fleet-ops.component.order.schedule-card.assign-driver-vehicle-busy-text', {
                    driverName: order.driver_assigned.name,
                    driverAvailability: order.driver_assigned.availability_message || 'Unavailable',
                    driverButton: order.driver_assigned.button_message || 'Continue with assignment',
                    vehicleName: order.vehicle_assigned.plate_number,
                    vehicleAvailability: order.vehicle_assigned.availability_message || 'Unavailable',
                    vehicleButton: order.vehicle_assigned.button_message || 'Continue with assignment',
                    orderId: order.public_id,
                });
                acceptButtonText = this.intl.t('fleet-ops.component.order.schedule-card.assign-button', { default: 'Assign' });
            } else if (isDriverBusy) {
                title = this.intl.t('fleet-ops.component.order.schedule-card.assign-driver-vehicle');
                body = this.intl.t('fleet-ops.component.order.schedule-card.assign-driver-busy-text', {
                    driverName: order.driver_assigned.name,
                    driverAvailability: order.driver_assigned.availability_message || 'Unavailable',
                    driverButton: order.driver_assigned.button_message || 'Continue with assignment',
                    vehicleName: order.vehicle_assigned.plate_number,
                    orderId: order.public_id,
                });
                acceptButtonText = this.intl.t('fleet-ops.component.order.schedule-card.assign-button', { default: 'Assign' });
            } else if (isVehicleBusy) {
                title = this.intl.t('fleet-ops.component.order.schedule-card.assign-driver-vehicle');
                body = this.intl.t('fleet-ops.component.order.schedule-card.assign-vehicle-busy-text', {
                    driverName: order.driver_assigned.name,
                    vehicleName: order.vehicle_assigned.plate_number,
                    vehicleAvailability: order.vehicle_assigned.availability_message || 'Unavailable',
                    vehicleButton: order.vehicle_assigned.button_message || 'Continue with assignment',
                    orderId: order.public_id,
                });
                acceptButtonText = this.intl.t('fleet-ops.component.order.schedule-card.assign-button', { default: 'Assign' });
            }

            return this.modalsManager.confirm({
                title: title,
                body: body,
                acceptButtonText: acceptButtonText,
                declineText: this.intl.t('common.cancel'),
                confirm: async (modal) => {
                    // User confirmed to proceed with busy driver/vehicle
                    // Apply temporary selections to order before saving
                    if (hasDriver && hasVehicle) {
                        order.setProperties({
                            driver_assigned: this.tempDriverSelection !== null ? this.tempDriverSelection : order.driver_assigned,
                            driver_assigned_uuid: this.tempDriverSelection !== null ? this.tempDriverSelection.id : order.driver_assigned_uuid,
                            vehicle_assigned: this.tempVehicleSelection !== null ? this.tempVehicleSelection : order.vehicle_assigned,
                            vehicle_assigned_uuid: this.tempVehicleSelection !== null ? this.tempVehicleSelection.id : order.vehicle_assigned_uuid
                        });
                    }

                    modal.startLoading();

                    try {
                        await order.save();

                        // Show success notification
                        this.notifications.success(
                            this.intl.t('fleet-ops.operations.orders.index.view.update-success', {
                                orderId: order.public_id
                            })
                        );

                        // Publish calendar refresh event
                        if (this.effectiveEventBus) {
                            this.effectiveEventBus.publish('calendar-refresh-needed', {
                                orderId: order.id,
                                currentPage: currentPage,
                                refreshAll: true
                            });
                        }

                        modal.done();

                        // Transition to refresh the page
                        return this.router.transitionTo('console.fleet-ops.operations.scheduler.index', {
                            queryParams: newQueryParams
                        });
                    } catch (error) {
                        this.notifications.serverError(error);
                        modal.stopLoading();
                    }
                },
                decline: (modal) => {
                    // User cancelled - reopen the previous modal
                    modal.done();
                    // Clear temporary selections to restore original state
                    this.tempDriverSelection = null;
                    this.tempVehicleSelection = null;
                    order.set('driver_assigned', this.originalOrder.driver_assigned);
                    order.set('vehicle_assigned', this.originalOrder.vehicle_assigned);

                    // Publish calendar refresh event to update the page
                    if (this.effectiveEventBus) {
                        this.effectiveEventBus.publish('calendar-refresh-needed', {
                            orderId: order.id,
                            currentPage: currentPage,
                            refreshAll: true
                        });
                    }

                    // Schedule reopening of edit modal instead of DOM manipulation
                    this.scheduleEditModalReopen(order);
                    // Handle modal reopening after operation
                    this.handleModalReopeningAfterOperation();
                },
            });
        }

        // Apply temporary selections to order before saving
        if (hasDriver && hasVehicle) {
            order.setProperties({
                driver_assigned: this.tempDriverSelection !== null ? this.tempDriverSelection : order.driver_assigned,
                driver_assigned_uuid: this.tempDriverSelection !== null ? this.tempDriverSelection.id : order.driver_assigned_uuid,
                vehicle_assigned: this.tempVehicleSelection !== null ? this.tempVehicleSelection : order.vehicle_assigned,
                vehicle_assigned_uuid: this.tempVehicleSelection !== null ? this.tempVehicleSelection.id : order.vehicle_assigned_uuid
            });
        } else if (!hasDriver && !hasVehicle) {
            order.setProperties({
                driver_assigned: null,
                driver_assigned_uuid: null,
                vehicle_assigned: null,
                vehicle_assigned_uuid: null
            });
        }

        // If it passes validation, save the order
        return order.save()
            .then(() => {
                // Show success notification
                this.notifications.success(
                    this.intl.t('fleet-ops.operations.orders.index.view.update-success', {
                        orderId: order.public_id
                    })
                );

                // IMPORTANT: Publish calendar refresh event BEFORE closing modals or transitioning
                if (this.effectiveEventBus) {
                    this.effectiveEventBus.publish('calendar-refresh-needed', {
                        orderId: order.id,
                        currentPage: currentPage,
                        refreshAll: true
                    });
                }

                // Close any active modals using Ember's modal service
                try {
                    if (this.modalsManager && typeof this.modalsManager.done === 'function') {
                        this.modalsManager.done();
                    }
                } catch (e) {
                    console.error('Error closing modals:', e);
                }

                // Check if we need to reopen the edit modal after successful save
                if (this.shouldReopenEditModal) {
                    // Use Ember's run loop to ensure the modal is properly closed before reopening
                    this.later(() => {
                        this.checkForModalReopening();
                    }, 100);
                } else {
                    // Finally, transition to refresh the page
                    this.router.transitionTo('console.fleet-ops.operations.scheduler.index', {
                        queryParams: newQueryParams
                    });
                }

                if (this.analytics && this.analytics.isInitialized) {
                    this.analytics.trackDriverAssignment({
                        order_id: order.id,
                        order_uuid: order.uuid,
                        order_public_id: order.public_id,
                        type: 'success'
                    });
                }
            })
            .catch((error) => {
                this.notifications.error(
                    this.intl.t('fleet-ops.component.order.schedule-card.save-error', {
                        defaultValue: 'Failed to update order.'
                    })
                );
                console.error('Error saving order:', error);
            });
    }

    /*
     * Handle driver change
     */
    @action
    handleDriverChange(order, driver) {
        if (!driver) {
            this.tempDriverSelection = null;
            this.tempVehicleSelection = null;

            // Clear UI immediately
            order.set('driver_assigned', null);
            order.set('driver_assigned_uuid', null);
            order.set('vehicle_assigned', null);
            order.set('vehicle_assigned_uuid', null);
        } else {
            this.tempDriverSelection = driver;

            // Update UI immediately to show the selections
            order.set('driver_assigned', driver);
            order.set('driver_assigned_uuid', driver.id);

            // Auto-fill vehicle in UI if driver has one
            if (driver.vehicle.id) {
                order.set('vehicle_assigned', driver.vehicle);
                order.set('vehicle_assigned_uuid', driver.vehicle.id);
                this.tempVehicleSelection = driver.vehicle;
            } else {
                order.set('vehicle_assigned', null);
                this.tempVehicleSelection = null;
            }
        }
    }

    @action
    handleVehicleChange(order, vehicle) {
        if (!vehicle) {
            this.tempVehicleSelection = null;
            // Update UI immediately
            order.set('vehicle_assigned', null);
            order.set('vehicle_assigned_uuid', null);
        } else {
            this.tempVehicleSelection = vehicle;
            // Update UI immediately
            order.set('vehicle_assigned', vehicle);
            order.set('vehicle_assigned_uuid', vehicle.id);
        }
    }


    /**
     * Opens the edit modal for an order using proper Ember patterns
     * @param {Object} order - The order to edit
     * @param {Object} options - Additional options for the modal
     */
    @action
    openEditModal(order, options = {}) {
        // Use Ember's modal service instead of DOM manipulation
        this.modalsManager.show('order-edit-modal', {
            order,
            onSave: this.saveOrder.bind(this),
            onCancel: this.closeEditModal.bind(this),
            ...options
        });
    }

    /**
     * Closes the edit modal and handles cleanup
     */
    @action
    closeEditModal() {
        this.modalsManager.done();
        this.shouldReopenEditModal = false;
        this.pendingEditModalData = null;
        this.isModalOpen = false;
    }

    /**
     * Schedules reopening of the edit modal after current operation completes
     * @param {Object} order - The order to edit
     * @param {Object} options - Additional options for the modal
     */
    @action
    scheduleEditModalReopen(order, options = {}) {
        this.shouldReopenEditModal = true;
        this.pendingEditModalData = { order, options };
    }

    /**
     * Reopens the edit modal if scheduled
     */
    @action
    reopenEditModalIfScheduled() {
        if (this.shouldReopenEditModal && this.pendingEditModalData) {
            const { order, options } = this.pendingEditModalData;
            this.openEditModal(order, options);
            this.shouldReopenEditModal = false;
            this.pendingEditModalData = null;
        }
    }

    /**
     * Lifecycle hook to handle cleanup when component is destroyed
     */
    willDestroy() {
        super.willDestroy(...arguments);
        // Clean up any pending modal operations
        this.shouldReopenEditModal = false;
        this.pendingEditModalData = null;
        this.isModalOpen = false;
    }

    /**
     * Method to be called after operations complete to check for modal reopening
     * This should be called manually after async operations complete
     */
    @action
    checkForModalReopening() {
        // Check if we need to reopen a modal after the current operation completes
        this.reopenEditModalIfScheduled();
    }

    /**
     * Helper method to handle modal reopening after async operations
     * This ensures proper timing for modal operations
     */
    @action
    handleModalReopeningAfterOperation() {
        // Use Ember's run loop to ensure proper timing
        this.later(() => {
            this.checkForModalReopening();
        }, 100);
    }
}