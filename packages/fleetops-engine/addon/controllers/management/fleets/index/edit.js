import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ManagementFleetsIndexEditController extends BaseController {
    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementFleetsIndexEditController
     */
    @service hostRouter;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementFleetsIndexEditController
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
     * @memberof ManagementFleetsIndexEditController
     */
    @tracked overlay;

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementFleetsIndexEditController
     */
    @action transitionBack(fleet) {
        // check if fleet record has been edited and prompt for confirmation
        if (fleet.hasDirtyAttributes) {
            return this.confirmContinueWithUnsavedChanges(fleet, {
                confirm: () => {
                    fleet.rollbackAttributes();
                    return this.transitionToRoute('management.fleets.index');
                },
            });
        }

        return this.transitionToRoute('management.fleets.index');
    }

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementFleetsIndexEditController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When fleet details button is clicked in overlay.
     *
     * @param {VehicleModel} fleet
     * @return {Promise}
     * @memberof ManagementFleetsIndexEditController
     */
    @action onViewDetails(fleet) {
        // check if fleet record has been edited and prompt for confirmation
        if (fleet.hasDirtyAttributes) {
            return this.confirmContinueWithUnsavedChanges(fleet);
        }

        return this.transitionToRoute('management.fleets.index.details', fleet);
    }

    /**
     * Trigger a route refresh and focus the new fleet created.
     *
     * @param {VehicleModel} fleet
     * @return {Promise}
     * @memberof ManagementFleetsIndexEditController
     */
    @action onAfterSave(fleet) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.fleets.index.details', fleet);
    }

    /**
     * Prompts the user to confirm if they wish to continue with unsaved changes.
     *
     * @method
     * @param {VehicleModel} fleet - The fleet object with unsaved changes.
     * @param {Object} [options={}] - Additional options for configuring the modal.
     * @returns {Promise} A promise that resolves when the user confirms, and transitions to a new route.
     * @memberof ManagementFleetsIndexEditController
     */
    confirmContinueWithUnsavedChanges(fleet, options = {}) {
        return this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.management.drivers.index.edit.title'),
            body: this.intl.t('fleet-ops.management.fleets.index.edit.body'),
            acceptButtonText: this.intl.t('fleet-ops.management.drivers.index.edit.button'),
            confirm: () => {
                fleet.rollbackAttributes();
                return this.transitionToRoute('management.fleets.index.details', fleet);
            },
            ...options,
        });
    }
}
