import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementPlacesIndexNewController extends BaseController {
    /**
     * Inject the `store` service
     *
     * @memberof ManagementplacesIndexNewController
     */
    @service store;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementplacesIndexNewController
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
     * @memberof ManagementplacesIndexNewController
     */
    @service modalsManager;

    /**
     * The overlay component context.
     *
     * @memberof ManagementplacesIndexNewController
     */
    @tracked overlay;

    /**
     * The place being created.
     *
     * @var {placeModel}
     */
    @tracked place = this.store.createRecord('place');

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementplacesIndexNewController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementplacesIndexNewController
     */
    @action transitionBack() {
        return this.transitionToRoute('management.places.index');
    }

    /**
     * Trigger a route refresh and focus the new place created.
     *
     * @param {placeModel} place
     * @return {Promise}
     * @memberof ManagementplacesIndexNewController
     */
    @action onAfterSave(place) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.places.index.details', place).then(() => {
            this.resetForm();
        });
    }

    /**
     * Resets the form with a new place record
     *
     * @memberof ManagementplacesIndexNewController
     */
    resetForm() {
        this.place = this.store.createRecord('place');
    }
}
