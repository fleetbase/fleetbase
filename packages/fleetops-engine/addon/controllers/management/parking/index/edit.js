import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ManagementParkingIndexEditController extends BaseController {
    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementParkingIndexEditController
     */
    @service hostRouter;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementParkingIndexEditController
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
     * @memberof ManagementParkingIndexEditController
     */
    @tracked overlay;

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementParkingIndexEditController
     */
    @action transitionBack(fuelReport) {
        // check if fuel-report record has been edited and prompt for confirmation
        if (fuelReport.hasDirtyAttributes) {
            return this.confirmContinueWithUnsavedChanges(fuelReport, {
                confirm: () => {
                    fuelReport.rollbackAttributes();
                    return this.transitionToRoute('management.parking.index');
                },
            });
        }

        return this.transitionToRoute('management.parking.index');
    }

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementFuelReportsIndexEditController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When fuel-report details button is clicked in overlay.
     *
     * @param {FuelReportModel} fuelReport
     * @return {Promise}
     * @memberof ManagementFuelReportsIndexEditController
     */
    @action onViewDetails(fuelReport) {
        // check if fuel-report record has been edited and prompt for confirmation
        if (fuelReport.hasDirtyAttributes) {
            return this.confirmContinueWithUnsavedChanges(fuelReport);
        }

        return this.transitionToRoute('management.parking.index.details', fuelReport);
    }

    /**
     * Trigger a route refresh and focus the new fuel-report created.
     *
     * @param {FuelReportModel} fuel-report
     * @return {Promise}
     * @memberof ManagementFuelReportsIndexEditController
     */
    @action onAfterSave(fuelReport) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.parking.index.details', fuelReport);
    }

    /**
     * Prompts the user to confirm if they wish to continue with unsaved changes.
     *
     * @method
     * @param {FuelReportModel} fuel-report - The fuel-report object with unsaved changes.
     * @param {Object} [options={}] - Additional options for configuring the modal.
     * @returns {Promise} A promise that resolves when the user confirms, and transitions to a new route.
     * @memberof ManagementFuelReportsIndexEditController
     */
    confirmContinueWithUnsavedChanges(fuelReport, options = {}) {
        return this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.management.drivers.index.edit.title'),
            body: this.intl.t('fleet-ops.management.parking.index.edit.body'),
            acceptButtonText: this.intl.t('fleet-ops.management.drivers.index.edit.button'),
            confirm: () => {
                fuelReport.rollbackAttributes();
                return this.transitionToRoute('management.parking.index.details', fuelReport);
            },
            ...options,
        });
    }
}
