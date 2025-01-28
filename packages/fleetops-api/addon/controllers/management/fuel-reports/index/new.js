import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementFuelReportsIndexNewController extends BaseController {
    /**
     * Inject the `store` service
     *
     * @memberof ManagementFuelReportsIndexNewController
     */
    @service store;

    /**
     * Inject the `currentUser` service
     *
     * @memberof ManagementFuelReportsIndexNewController
     */
    @service currentUser;

    /**
     * Inject the `intl` service
     *
     * @memberof intl
     */
    @service intl;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementFuelReportsIndexNewController
     */
    @service hostRouter;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementFuelReportsIndexNewController
     */
    @service modalsManager;

    /**
     * The overlay component context.
     *
     * @memberof ManagementFuelReportsIndexNewController
     */
    @tracked overlay;

    /**
     * The fuel report being created.
     *
     * @var {FuelReportModel}
     */
    @tracked fuelReport = this.store.createRecord('fuelReport', { reporter: this.currentUser.user });

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementFuelReportsIndexNewController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementFuelReportsIndexNewController
     */
    @action transitionBack() {
        return this.hostRouter.transitionTo('console.fleet-ops.management.fuel-reports.index');
    }

    /**
     * Trigger a route refresh and focus the new fuel report created.
     *
     * @param {FuelReportModel} fuelReport
     * @return {Promise}
     * @memberof ManagementFuelReportsIndexNewController
     */
    @action onAfterSave(fuelReport) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.hostRouter.transitionTo('console.fleet-ops.management.fuel-reports.index.details', fuelReport.public_id).then(() => {
            this.resetForm();
        });
    }

    /**
     * Resets the form with a new fuel report record
     *
     * @memberof ManagementFuelReportsIndexNewController
     */
    resetForm() {
        this.fuelReport = this.store.createRecord('fuelReport', { reporter: this.currentUser.user });
    }
}
