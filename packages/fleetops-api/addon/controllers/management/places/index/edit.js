import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ManagementPlacesIndexEditController extends BaseController {
    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementplacesIndexEditController
     */
    @service hostRouter;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementplacesIndexEditController
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
     * @memberof ManagementplacesIndexEditController
     */
    @tracked overlay;

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementplacesIndexEditController
     */
    @action transitionBack(place) {
        // check if place record has been edited and prompt for confirmation
        if (place.hasDirtyAttributes) {
            return this.confirmContinueWithUnsavedChanges(place, {
                confirm: () => {
                    place.rollbackAttributes();
                    return this.transitionToRoute('management.places.index');
                },
            });
        }

        return this.transitionToRoute('management.places.index');
    }

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementplacesIndexEditController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When place details button is clicked in overlay.
     *
     * @param {PlaceModel} place
     * @return {Promise}
     * @memberof ManagementplacesIndexEditController
     */
    @action onViewDetails(place) {
        // check if place record has been edited and prompt for confirmation
        if (place.hasDirtyAttributes) {
            return this.confirmContinueWithUnsavedChanges(place);
        }

        return this.transitionToRoute('management.places.index.details', place);
    }

    /**
     * Trigger a route refresh and focus the new place created.
     *
     * @param {PlaceModel} place
     * @return {Promise}
     * @memberof ManagementplacesIndexEditController
     */
    @action onAfterSave(place) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.places.index.details', place);
    }

    /**
     * Prompts the user to confirm if they wish to continue with unsaved changes.
     *
     * @method
     * @param {PlaceModel} place - The place object with unsaved changes.
     * @param {Object} [options={}] - Additional options for configuring the modal.
     * @returns {Promise} A promise that resolves when the user confirms, and transitions to a new route.
     * @memberof ManagementplacesIndexEditController
     */
    confirmContinueWithUnsavedChanges(place, options = {}) {
        return this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.management.drivers.index.edit.title'),
            body: this.intl.t('fleet-ops.management.places.index.edit.body'),
            acceptButtonText: this.intl.t('fleet-ops.management.drivers.index.edit.button'),
            confirm: () => {
                place.rollbackAttributes();
                return this.transitionToRoute('management.places.index.details', place);
            },
            ...options,
        });
    }
}
