import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementVehiclesIndexEditController extends BaseController {
    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementVehiclesIndexEditController
     */
    @service hostRouter;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementVehiclesIndexEditController
     */
    @service modalsManager;

    /**
     * Inject the `intl` service
     *
     * @memberof intl
     */
    @service intl;

    /**
     * The overlay component context.
     *
     * @memberof ManagementVehiclesIndexEditController
     */
    @tracked overlay;

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementVehiclesIndexEditController
     */
    @action transitionBack(vehicle) {
        // check if vehicle record has been edited and prompt for confirmation
        if (vehicle.hasDirtyAttributes) {
            return this.confirmContinueWithUnsavedChanges(vehicle, {
                confirm: () => {
                    vehicle.rollbackAttributes();
                    return this.transitionToRoute('management.vehicles.index');
                },
            });
        }

        return this.transitionToRoute('management.vehicles.index');
    }

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementVehiclesIndexEditController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When vehicle details button is clicked in overlay.
     *
     * @param {VehicleModel} vehicle
     * @return {Promise}
     * @memberof ManagementVehiclesIndexEditController
     */
    @action onViewDetails(vehicle) {
        // check if vehicle record has been edited and prompt for confirmation
        if (vehicle.hasDirtyAttributes) {
            return this.confirmContinueWithUnsavedChanges(vehicle);
        }

        return this.transitionToRoute('management.vehicles.index.details', vehicle);
    }

    /**
     * Trigger a route refresh and focus the new vehicle created.
     *
     * @param {VehicleModel} vehicle
     * @return {Promise}
     * @memberof ManagementVehiclesIndexEditController
     */
    @action onAfterSave(vehicle) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.vehicles.index.details', vehicle);
    }

    /**
     * Prompts the user to confirm if they wish to continue with unsaved changes.
     *
     * @method
     * @param {VehicleModel} vehicle - The vehicle object with unsaved changes.
     * @param {Object} [options={}] - Additional options for configuring the modal.
     * @returns {Promise} A promise that resolves when the user confirms, and transitions to a new route.
     * @memberof ManagementVehiclesIndexEditController
     */
    confirmContinueWithUnsavedChanges(vehicle, options = {}) {
        return this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.management.drivers.index.edit.title'),
            body: this.intl.t('fleet-ops.management.vehicles.index.edit.body'),
            acceptButtonText: this.intl.t('fleet-ops.management.drivers.index.edit.button'),
            confirm: () => {
                vehicle.rollbackAttributes();
                return this.transitionToRoute('management.vehicles.index.details', vehicle);
            },
            ...options,
        });
    }
}
