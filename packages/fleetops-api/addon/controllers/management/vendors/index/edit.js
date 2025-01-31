import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementVendorsIndexEditController extends BaseController {
    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementVendorsIndexEditController
     */
    @service hostRouter;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementVendorsIndexEditController
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
     * @memberof ManagementVendorsIndexEditController
     */
    @tracked overlay;

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementVendorsIndexEditController
     */
    @action transitionBack(vendor) {
        // check if vendor record has been edited and prompt for confirmation
        if (vendor.hasDirtyAttributes) {
            return this.confirmContinueWithUnsavedChanges(vendor, {
                confirm: () => {
                    vendor.rollbackAttributes();
                    return this.transitionToRoute('management.vendors.index');
                },
            });
        }

        return this.transitionToRoute('management.vendors.index');
    }

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementVendorsIndexEditController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When vendor details button is clicked in overlay.
     *
     * @param {VendorModel} vendor
     * @return {Promise}
     * @memberof ManagementVendorsIndexEditController
     */
    @action onViewDetails(vendor) {
        // check if vendor record has been edited and prompt for confirmation
        if (vendor.hasDirtyAttributes) {
            return this.confirmContinueWithUnsavedChanges(vendor);
        }

        return this.transitionToRoute('management.vendors.index.details', vendor);
    }

    /**
     * Trigger a route refresh and focus the new vendor created.
     *
     * @param {VendorModel} vendor
     * @return {Promise}
     * @memberof ManagementVendorsIndexEditController
     */
    @action onAfterSave(vendor) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.vendors.index.details', vendor);
    }

    /**
     * Prompts the user to confirm if they wish to continue with unsaved changes.
     *
     * @method
     * @param {VendorModel} vendor - The vendor object with unsaved changes.
     * @param {Object} [options={}] - Additional options for configuring the modal.
     * @returns {Promise} A promise that resolves when the user confirms, and transitions to a new route.
     * @memberof ManagementVendorsIndexEditController
     */
    confirmContinueWithUnsavedChanges(vendor, options = {}) {
        return this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.management.drivers.index.edit.title'),
            body: this.intl.t('fleet-ops.management.vendors.index.edit.body'),
            acceptButtonText: this.intl.t('fleet-ops.management.drivers.index.edit.button'),
            confirm: () => {
                vendor.rollbackAttributes();
                return this.transitionToRoute('management.vendors.index.details', vendor);
            },
            ...options,
        });
    }
}
