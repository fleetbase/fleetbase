import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementContactsCustomersNewController extends BaseController {
    @service store;
    @service hostRouter;
    @service intl;
    @service modalsManager;

    /**
     * The overlay component context.
     *
     * @memberof ManagementContactsCustomersNewController
     */
    @tracked overlay;

    /**
     * The customer being created.
     *
     * @var {contactModel}
     */
    @tracked customer = this.store.createRecord('contact', { type: 'customer', status: 'active' });

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementContactsCustomersNewController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementContactsCustomersNewController
     */
    @action transitionBack() {
        return this.transitionToRoute('management.contacts.customers');
    }

    /**
     * Trigger a route refresh and focus the new customer created.
     *
     * @param {contactModel} customer
     * @return {Promise}
     * @memberof ManagementContactsCustomersNewController
     */
    @action onAfterSave(customer) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.contacts.customers.details', customer).then(() => {
            this.resetForm();
        });
    }

    /**
     * Resets the form with a new customer record
     *
     * @memberof ManagementContactsCustomersNewController
     */
    resetForm() {
        this.customer = this.store.createRecord('contact', { type: 'customer', status: 'active' });
    }
}
