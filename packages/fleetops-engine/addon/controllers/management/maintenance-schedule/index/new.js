import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementMaintenanceScheduleIndexNewController extends BaseController {
    /**
     * Inject the `store` service
     *
     * @memberof ManagementissuesIndexNewController
     */
    @service store;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementissuesIndexNewController
     */
    @service hostRouter;

    /**
     * Inject the `intl` service
     *
     * @memberof intl
     */
    @service intl;

    /**
     * Inject the `currentUser` service
     *
     * @memberof ManagementissuesIndexNewController
     */
    @service currentUser;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementissuesIndexNewController
     */
    @service modalsManager;

    /**
     * The overlay component context.
     *
     * @memberof ManagementissuesIndexNewController
     */
    @tracked overlay;

    /**
     * The order being created for maintenance schedule.
     *
     * Note: We instantiate a maintenance-schedule record here; the form panel
     * will convert new records into a leave-request before saving to ensure the
     * POST goes to /leave-requests.
     *
     * @var {MaintenanceScheduleModel}
     */
    @tracked order = this.store.createRecord('leave-request', {});

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementissuesIndexNewController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementissuesIndexNewController
     */
    @action transitionBack() {
        return this.transitionToRoute('management.maintenance-schedule.index');
    }

    /**
     * Trigger a route refresh and focus the new order created.
     *
     * @param {OrderModel} order
     * @return {Promise}
     * @memberof ManagementissuesIndexNewController
     */
    @action async onAfterSave(order) {
        if (this.overlay) {
            this.overlay.close();
        }
        this.resetForm();
        this.hostRouter.refresh();
        return this.transitionToRoute('management.maintenance-schedule.index.details', order).then(() => {
            this.resetForm();
        });
    }

    /**
     * Resets the form with a new order record
     *
     * @memberof ManagementissuesIndexNewController
     */
    resetForm() {
        this.order = this.store.createRecord('leave-request', {});
    }
}
