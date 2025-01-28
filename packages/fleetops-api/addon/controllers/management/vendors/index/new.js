import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementVendorsIndexNewController extends BaseController {
    /**
     * Inject the `store` service
     *
     * @memberof ManagementVendorIndexNewController
     */
    @service store;

    /**
     * Inject the `hostRouter` service
     *
     * @memberof ManagementVendorIndexNewController
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
     * @memberof ManagementVendorIndexNewController
     */
    @service modalsManager;

    /**
     * The overlay component context.
     *
     * @memberof ManagementVendorIndexNewController
     */
    @tracked overlay;

    /**
     * The vendor being created.
     *
     * @var {VendorModel}
     */
    @tracked vendor = this.store.createRecord('vendor', { status: 'active' });

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementVendorsIndexNewController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementVendorIndexNewController
     */
    @action transitionBack() {
        return this.transitionToRoute('management.vendors.index');
    }

    /**
     * Trigger a route refresh and focus the new vendor created.
     *
     * @param {VendorModel} vendor
     * @return {Promise}
     * @memberof ManagementVendorsIndexNewController
     */
    @action onAfterSave(vendor) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.vendors.index.details', vendor).then(() => {
            this.resetForm();
        });
    }

    /**
     * Resets the form with a new vendor record
     *
     * @memberof ManagementVendorIndexNewController
     */
    resetForm() {
        this.vendor = this.store.createRecord('vendor', { status: 'active' });
    }
}
