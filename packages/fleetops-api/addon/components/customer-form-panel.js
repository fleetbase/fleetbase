import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';

export default class CustomerFormPanelComponent extends Component {
    @service store;
    @service intl;
    @service fetch;
    @service currentUser;
    @service notifications;
    @service hostRouter;
    @service contextPanel;

    /**
     * Overlay context.
     * @type {any}
     */
    @tracked context;

    /**
     * Permission needed to update or create record.
     *
     * @memberof ContactFormPanelComponent
     */
    @tracked savePermission;

    /**
     * Constructs the component and applies initial state.
     */
    constructor(owner, { customer = null }) {
        super(...arguments);
        this.customer = customer;
        this.savePermission = customer && customer.isNew ? 'fleet-ops create customer' : 'fleet-ops update customer';
        applyContextComponentArguments(this);
    }

    /**
     * Sets the overlay context.
     *
     * @action
     * @param {OverlayContextObject} overlayContext
     */
    @action setOverlayContext(overlayContext) {
        this.context = overlayContext;
        contextComponentCallback(this, 'onLoad', ...arguments);
    }

    /**
     * Task to save customer.
     *
     * @return {void}
     * @memberof ContactFormPanelComponent
     */
    @task *save() {
        contextComponentCallback(this, 'onBeforeSave', this.customer);

        try {
            this.customer = yield this.customer.save();
        } catch (error) {
            this.notifications.serverError(error);
            return;
        }

        this.notifications.success(this.intl.t('fleet-ops.component.customer-form-panel.success-message', { customerName: this.customer.name }));
        contextComponentCallback(this, 'onAfterSave', this.customer);
    }

    /**
     * Uploads a new photo for the driver.
     *
     * @param {File} file
     * @memberof DriverFormPanelComponent
     */
    @action onUploadNewPhoto(file) {
        this.fetch.uploadFile.perform(
            file,
            {
                path: `uploads/${this.currentUser.companyId}/contacts/${this.customer.id}`,
                subject_uuid: this.customer.id,
                subject_type: 'fleet-ops:contact',
                type: 'contact_photo',
            },
            (uploadedFile) => {
                this.customer.setProperties({
                    photo_uuid: uploadedFile.id,
                    photo_url: uploadedFile.url,
                    photo: uploadedFile,
                });
            }
        );
    }

    /**
     * View the details of the customer.
     *
     * @action
     */
    @action onViewDetails() {
        const isActionOverrided = contextComponentCallback(this, 'onViewDetails', this.customer);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.customer, 'viewing');
        }
    }

    /**
     * Edit customer's primary address.
     *
     * @return {void}
     * @memberof ContactFormPanelComponent
     */
    @action async editAddress() {
        let place;

        if (this.customer.has_place) {
            place = await this.customer.place;
        } else {
            place = this.store.createRecord('place');
        }

        return this.contextPanel.focus(place, 'editing', {
            onAfterSave: (place) => {
                this.selectVendorAddress(place);
                this.contextPanel.clear();
            },
        });
    }

    /**
     * Select and set the customer's primary address.
     *
     * @param {PlaceModel} place
     * @memberof ContactFormPanelComponent
     */
    @action selectContactAddress(place) {
        this.customer.place = place;
        this.customer.place_uuid = place.id;
    }

    /**
     * Handles cancel button press.
     *
     * @action
     * @returns {any}
     */
    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel', this.customer);
    }
}
