import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ManagementContactsIndexNewController extends BaseController {
    @service store;
    @service hostRouter;
    @service intl;
    @service modalsManager;

    /**
     * The overlay component context.
     *
     * @memberof ManagementcontactsIndexNewController
     */
    @tracked overlay;

    /**
     * The contact being created.
     *
     * @var {contactModel}
     */
    @tracked contact = this.store.createRecord('contact', { type: 'contact', status: 'active' });

    /**
     * Set the overlay component context object.
     *
     * @param {OverlayContext} overlay
     * @memberof ManagementcontactsIndexNewController
     */
    @action setOverlayContext(overlay) {
        this.overlay = overlay;
    }

    /**
     * When exiting the overlay.
     *
     * @return {Transition}
     * @memberof ManagementcontactsIndexNewController
     */
    @action transitionBack() {
        return this.transitionToRoute('management.contacts.index');
    }

    /**
     * Trigger a route refresh and focus the new contact created.
     *
     * @param {contactModel} contact
     * @return {Promise}
     * @memberof ManagementcontactsIndexNewController
     */
    @action onAfterSave(contact) {
        if (this.overlay) {
            this.overlay.close();
        }

        this.hostRouter.refresh();
        return this.transitionToRoute('management.contacts.index.details', contact).then(() => {
            this.resetForm();
        });
    }

    /**
     * Resets the form with a new contact record
     *
     * @memberof ManagementcontactsIndexNewController
     */
    resetForm() {
        this.contact = this.store.createRecord('contact', { type: 'contact', status: 'active' });
    }
}
