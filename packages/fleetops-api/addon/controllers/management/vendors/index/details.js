import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ManagementVendorsIndexDetailsController extends BaseController {
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
     * Transitions back to the "management.vendors.index" route.
     *
     * @method
     * @action
     * @returns {Transition} The transition object representing the route change.
     */
    @action transitionBack() {
        return this.transitionToRoute('management.vendors.index');
    }

    /**
     * Transitions to the edit view for a specific vendor.
     *
     * @method
     * @param {VendorModel} vendor - The vendor to be edited.
     * @action
     * @returns {Transition} The transition object representing the route change.
     */
    @action onEdit(vendor) {
        return this.transitionToRoute('management.vendors.index.edit', vendor);
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
