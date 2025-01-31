import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ManagementContactsCustomersEditController extends BaseController {
    @service hostRouter;
    @service modalsManager;
    @service intl;

    /**
     * The overlay component context.
     *
     * @memberof ManagementContactsCustomersEditController
     */
    @tracked overlay;

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementContactsCustomersEditController
     */
    @action transitionBack(customer) {
        // check if contact record has been edited and prompt for confirmation
        if (customer.hasDirtyAttributes) {
            return this.confirmContinueWithUnsavedChanges(customer, {
                confirm: () => {
                    customer.rollbackAttributes();
                    return this.transitionToRoute('management.contacts.customers');
                },
            });
        }

        return this.transitionToRoute('management.contacts.customers');
    }

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementContactsCustomersEditController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When contact details button is clicked in overlay.
     *
     * @param {ContactModel} contact
     * @return {Promise}
     * @memberof ManagementContactsCustomersEditController
     */
    @action onViewDetails(customer) {
        // check if customer record has been edited and prompt for confirmation
        if (customer.hasDirtyAttributes) {
            return this.confirmContinueWithUnsavedChanges(customer);
        }

        return this.transitionToRoute('management.contacts.customers.details', customer);
    }

    /**
     * Trigger a route refresh and focus the new contact created.
     *
     * @param {ContactModel} customer
     * @return {Promise}
     * @memberof ManagementContactsCustomersEditController
     */
    @action onAfterSave(customer) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.contacts.customers.details', customer);
    }

    /**
     * Prompts the user to confirm if they wish to continue with unsaved changes.
     *
     * @method
     * @param {ContactModel} customer - The customer object with unsaved changes.
     * @param {Object} [options={}] - Additional options for configuring the modal.
     * @returns {Promise} A promise that resolves when the user confirms, and transitions to a new route.
     * @memberof ManagementContactsCustomersEditController
     */
    confirmContinueWithUnsavedChanges(customer, options = {}) {
        return this.modalsManager.confirm({
            title: this.intl.t('fleet-ops.management.customers.index.edit.title'),
            body: this.intl.t('fleet-ops.management.customers.index.edit.body'),
            acceptButtonText: this.intl.t('fleet-ops.management.customers.index.edit.button'),
            confirm: () => {
                customer.rollbackAttributes();
                return this.transitionToRoute('management.contacts.customers.details', customer);
            },
            ...options,
        });
    }
}
