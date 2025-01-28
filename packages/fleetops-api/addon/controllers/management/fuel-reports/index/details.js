import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
/**
 * Controller for managing the details view within the "Management -> Fuel-Report -> Index" route.
 *
 * @class ManagementFuelReportsIndexDetailsController
 * @extends Controller
 */
export default class ManagementFuelReportsIndexDetailsController extends BaseController {
    @service hostRouter;

    /**
     * The currently active view tab ('details' by default).
     *
     * @type {String}
     * @tracked
     */
    @tracked view = 'details';

    /**
     * An array of query parameters to be serialized in the URL.
     *
     * @type {String[]}
     * @tracked
     */
    @tracked queryParams = ['view'];

    /**
     * Transitions back to the "management.fuelReport.index" route.
     *
     * @method
     * @action
     * @returns {Transition} The transition object representing the route change.
     */
    @action transitionBack() {
        return this.transitionToRoute('management.fuel-reports.index');
    }

    /**
     * Transitions to the edit view for a specific vehicle.
     *
     * @param {FuelReportModel} fuelReport
     * @method
     * @action
     * @returns {Transition} The transition object representing the route change.
     */
    @action onEdit(fuelReport) {
        return this.transitionToRoute('management.fuel-reports.index.edit', fuelReport);
    }

    /**
     * Updates the active view tab.
     *
     * @method
     * @param {String} tab - The name of the tab to activate.
     * @action
     */
    @action onTabChanged(tab) {
        this.view = tab;
    }
}
