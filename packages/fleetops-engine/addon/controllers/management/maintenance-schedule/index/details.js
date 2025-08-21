import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
export default class ManagementMaintenanceScheduleIndexDetailsController extends BaseController {
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
     * Transitions back to the maintenance schedule index route.
     *
     * @method
     * @action
     * @returns {Transition}
     */
    @action transitionBack() {
        return this.transitionToRoute('management.maintenance-schedule.index');
    }

    /**
     * Transitions to the edit view for a specific order.
     *
     * @method
     * @param {OrderModel} order
     * @action
     * @returns {Transition}
     */
    @action onEdit(order) {
        return this.transitionToRoute('management.maintenance-schedule.index.edit', order);
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
