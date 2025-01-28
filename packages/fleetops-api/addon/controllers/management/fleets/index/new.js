import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementFleetsIndexNewController extends BaseController {
    /**
     * Inject the `store` service
     *
     * @memberof ManagementFleetsIndexNewController
     */
    @service store;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementFleetsIndexNewController
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
     * @memberof ManagementFleetsIndexNewController
     */
    @service modalsManager;

    /**
     * The overlay component context.
     *
     * @memberof ManagementFleetsIndexNewController
     */
    @tracked overlay;

    /**
     * The fleet being created.
     *
     * @var {FleetModel}
     */
    @tracked fleet = this.store.createRecord('fleet', { status: 'active' });

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementFleetsIndexNewController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementFleetsIndexNewController
     */
    @action transitionBack() {
        return this.transitionToRoute('management.fleets.index');
    }

    /**
     * Trigger a route refresh and focus the new fleet created.
     *
     * @param {FleetModel} fleet
     * @return {Promise}
     * @memberof ManagementFleetsIndexNewController
     */
    @action onAfterSave(fleet) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.fleets.index.details', fleet).then(() => {
            this.resetForm();
        });
    }

    /**
     * Resets the form with a new fleet record
     *
     * @memberof ManagementFleetsIndexNewController
     */
    resetForm() {
        this.fleet = this.store.createRecord('fleet', { status: 'active' });
    }
}
