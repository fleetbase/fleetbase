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
    get fuelReport() {
        if (!this._fuelReport) {
            this._fuelReport = this.store.createRecord('fuelReport');
        }
        return this._fuelReport;
    }

    /**
     * Track the fuel report privately
     *
     * @private
     */
    @tracked _fuelReport;

    /**
     * Initialize a new fuel report when the controller is created
     *
     * @method init
     */
    init() {
        super.init(...arguments);
        this.resetForm();
    }

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
        // Reset the form before transitioning
        this.resetForm();
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

        // Reset the form immediately after save
        this.resetForm();
        
        this.hostRouter.refresh();
        return this.hostRouter.transitionTo('console.fleet-ops.management.fuel-reports.index.details', fuelReport.public_id);
    }

    /**
     * Resets the form with a new fuel report record
     *
     * @memberof ManagementFuelReportsIndexNewController
     */
    @action resetForm() {
        // Unload any existing fuel report
        if (this._fuelReport && this._fuelReport.isNew) {
            this._fuelReport.unloadRecord();
        }
        
        // Create a fresh record
        this._fuelReport = this.store.createRecord('fuelReport');
    }
}