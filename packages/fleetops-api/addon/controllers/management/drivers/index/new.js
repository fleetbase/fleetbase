import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementDriversIndexNewController extends BaseController {
    /**
     * Inject the `store` service
     *
     * @memberof ManagementDriversIndexNewController
     */
    @service store;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementDriversIndexNewController
     */
    @service hostRouter;

    /**
     * Inject the `intl` service
     *
     * @memberof intl
     */
    @service intl;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementDriversIndexNewController
     */
    @service modalsManager;

    /**
     * The overlay component context.
     *
     * @memberof ManagementDriversIndexNewController
     */
    @tracked overlay;

    /**
     * The driver being created.
     *
     * @var {DriverModel}
     */
    @tracked driver = this.store.createRecord('driver', { status: 'active' });

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementDriversIndexNewController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementDriversIndexNewController
     */
    @action transitionBack() {
        return this.transitionToRoute('management.drivers.index');
    }

    /**
     * Trigger a route refresh and focus the new driver created.
     *
     * @param {DriverModel} driver
     * @return {Promise}
     * @memberof ManagementDriversIndexNewController
     */
    @action onAfterSave(driver) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.drivers.index.details', driver).then(() => {
            this.resetForm();
        });
    }

    /**
     * Resets the form with a new driver record
     *
     * @memberof ManagementDriversIndexNewController
     */
    resetForm() {
        this.driver = this.store.createRecord('driver', { status: 'active' });
    }
}
