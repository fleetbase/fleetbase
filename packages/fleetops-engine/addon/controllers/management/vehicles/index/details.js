import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * Controller for managing the details view within the "Management -> Vehicles -> Index" route.
 *
 * @class ManagementVehiclesIndexDetailsController
 * @extends Controller
 */
export default class ManagementVehiclesIndexDetailsController extends BaseController {
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
     * Transitions back to the "management.vehicles.index" route.
     *
     * @method
     * @action
     * @returns {Transition} The transition object representing the route change.
     */
    @action transitionBack() {
        return this.transitionToRoute('management.vehicles.index');
    }

    /**
     * Transitions to the edit view for a specific vehicle.
     *
     * @method
     * @param {VehicleModel} vehicle - The vehicle to be edited.
     * @action
     * @returns {Transition} The transition object representing the route change.
     */
    @action onEdit(vehicle) {
        return this.transitionToRoute('management.vehicles.index.edit', vehicle);
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
