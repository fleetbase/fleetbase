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
    router = null;
    calendarInstance = null; 
    skipUnassignConfirm = false;

    

    constructor(owner, { order }) {
        super(...arguments);
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
                timezone: this.timezone
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
            // Close any open modals first
            document.querySelectorAll('.modal.show').forEach(modal => {
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
            // setTimeout(() => {
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
                                const orderId = order.public_id;
                                // Try to find and click the edit button for this order
                                setTimeout(() => {
                                    const editButton = document.querySelector('a[data-order-id="' + orderId + '"]');
                                    if (editButton) {
                                        editButton.click();
                                    }
                                }, 100);
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
                                availability: driver.availability_message,
                                button: driver.button_message,
                            }),
                        acceptButtonText: driver.is_available
                            ? this.intl.t('fleet-ops.component.order.schedule-card.assign-button')
                            : this.intl.t('fleet-ops.component.order.schedule-card.assign-busy-button', {
                                button: driver.button_message,
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
                                    
                                    document.body.classList.add('is-loading');
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
                                        document.body.classList.remove('is-loading');
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

   
/*
* Assign Driver to the order
*/
    
@action assignDriverNew(driver) {
    const eventBus = this.effectiveEventBus;
    try {
        // Close any open modals first
        document.querySelectorAll('.modal.show').forEach(modal => {
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
        this.isModalOpen = true; // Mark that a modal is being shown 
        this.isAssigningDriver = true;
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
                        vehicle_assigned_uuid: null
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
        } 
       
        else if((driver.is_available && !driver.have_no_vehicle || (!driver.is_available && !driver.have_no_vehicle))) {
            // For drivers that are available or busy but have a vehicle
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
                        availability: driver.availability_message || 'This driver is currently busy with other orders.',
                        button: driver.button_message || 'continue with assignment',
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
                    
                    // Always assign both driver and their vehicle (if available)
                    const properties = {
                        driver_assigned: driver,
                        is_driver_assigned: true,
                        driver_assigned_uuid: driver.id
                    };
                    
                    // Add vehicle information if available
                    if (driver.vehicle) {
                        properties.vehicle_assigned = driver.vehicle;
                        properties.vehicle_assigned_uuid = driver.vehicle.id;
                    } else {
                        properties.vehicle_assigned = null;
                        properties.vehicle_assigned_uuid = null;
                    }
                    
                    order.setProperties(properties);

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
        else{
            const orderId = order.public_id;
            // Pre-select the driver for the order
            order.setProperties({
                driver_assigned: driver,
                has_driver_assigned: false,
                driver_assigned_uuid: driver.id
            });
        
            // Skip change check to avoid modal loops
            // this.skipNextChangeCheck = true;
        
            // Open the parent modal (edit popup)
            setTimeout(() => {
                const editButton = document.querySelector('a[data-order-id="' + orderId + '"]');
                if (editButton) {
                    editButton.click();
                } else {
                    console.error('Edit button not found for order:', orderId);
                }
            }, 100);
           
            // return;
        }
    });
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
  const hasDriver = order.driver_assigned !== null;
  const hasVehicle = order.vehicle_assigned !== null;
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
  const wasDriverAssigned = order.get('driver_assigned_uuid') !== null && order.get('driver_assigned_uuid') !== undefined;
  const isUnassigningDriver = wasDriverAssigned && !hasDriver;
  
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
      },
    });
  }
  
  // Check for partial assignment only if driver/vehicle fields have changed
  if (isPartiallyAssigned && !isDatesOnlyChange) {
    // Show error if only one of driver/vehicle is selected
    this.notifications.error(
      this.intl.t('fleet-ops.component.order.schedule-card.required-error', {
        defaultValue: 'Both driver and vehicle must be selected together.'
      })
    );
    
    // Option to automatically open the edit form again
    setTimeout(() => {
      const editButton = document.querySelector('a[data-order-id="' + orderId + '"]');
      if (editButton) {
        editButton.click();
      }
    }, 100);
    
    return;
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
      
      // Add a small delay for notification visibility
      setTimeout(() => {
        // Close any active modals
        try {
          if (this.modalsManager && typeof this.modalsManager.done === 'function') {
            this.modalsManager.done();
          }
        } catch (e) {
          console.error('Error closing modals:', e);
        }
        
        // Finally, transition to refresh the page
        this.router.transitionTo('console.fleet-ops.operations.scheduler.index', {
          queryParams: newQueryParams
        });
      }, 200);
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
        order.set('driver_assigned', null);
        order.set('driver_assigned_uuid', null);
        return;
      }

  if (driver.have_no_vehicle) {
    // Assign directly if driver has no vehicle
   order.set('driver_assigned', driver);
    order.set('driver_assigned_uuid', driver.id);
  } else {
    // Go through assign modal logic
    this.assignDriverNew(driver);
  }
}

}