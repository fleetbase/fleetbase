import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementVehiclesIndexNewController extends BaseController {
    /**
     * Inject the `store` service
     *
     * @memberof ManagementVehiclesIndexNewController
     */
    @service store;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementVehiclesIndexNewController
     */
    @service hostRouter;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementVehiclesIndexNewController
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
     * @memberof ManagementVehiclesIndexNewController
     */
    @tracked overlay;

    /**
     * The vehicle being created.
     *
     * @var {VehicleModel}
     */
    @tracked vehicle = this.store.createRecord('vehicle', { status: 'active' });

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementVehiclesIndexNewController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementVehiclesIndexNewController
     */
    @action transitionBack() {
        return this.transitionToRoute('management.vehicles.index');
    }

    /**
     * Trigger a route refresh and focus the new vehicle created.
     *
     * @param {VehicleModel} vehicle
     * @return {Promise}
     * @memberof ManagementVehiclesIndexNewController
     */
    @action onAfterSave(vehicle) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.vehicles.index.details', vehicle).then(() => {
            this.resetForm();
        });
    }

    /**
     * Resets the form with a new vehicle record
     *
     * @memberof ManagementVehiclesIndexNewController
     */
    resetForm() {
        this.vehicle = this.store.createRecord('vehicle', { status: 'active' });
    }
}
