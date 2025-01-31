import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';

export default class ContactFormPanelComponent extends Component {
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
     * All possible contact status options.
     *
     * @var {String}
     */
    @tracked contactStatusOptions = ['pending', 'active', 'do-not-contact', 'prospective', 'archived'];

    /**
     * Permission needed to update or create record.
     *
     * @memberof ContactFormPanelComponent
     */
    @tracked savePermission;

    /**
     * Constructs the component and applies initial state.
     */
    constructor(owner, { contact = null }) {
        super(...arguments);
        this.contact = contact;
        this.savePermission = contact && contact.isNew ? 'fleet-ops create contact' : 'fleet-ops update contact';
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
     * Task to save contact.
     *
     * @return {void}
     * @memberof ContactFormPanelComponent
     */
    @task *save() {
        contextComponentCallback(this, 'onBeforeSave', this.contact);

        try {
            this.contact = yield this.contact.save();
        } catch (error) {
            this.notifications.serverError(error);
            return;
        }

        this.notifications.success(this.intl.t('fleet-ops.component.contact-form-panel.success-message', { contactName: this.contact.name }));
        contextComponentCallback(this, 'onAfterSave', this.contact);
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
                path: `uploads/${this.currentUser.companyId}/contacts/${this.contact.id}`,
                subject_uuid: this.contact.id,
                subject_type: 'fleet-ops:contact',
                type: 'contact_photo',
            },
            (uploadedFile) => {
                this.contact.setProperties({
                    photo_uuid: uploadedFile.id,
                    photo_url: uploadedFile.url,
                    photo: uploadedFile,
                });
            }
        );
    }

    /**
     * View the details of the contact.
     *
     * @action
     */
    @action onViewDetails() {
        const isActionOverrided = contextComponentCallback(this, 'onViewDetails', this.contact);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.contact, 'viewing');
        }
    }

    /**
     * Edit contact's primary address.
     *
     * @return {void}
     * @memberof ContactFormPanelComponent
     */
    @action async editAddress() {
        let place;

        if (this.contact.has_place) {
            place = await this.contact.place;
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
     * Select and set the contact's primary address.
     *
     * @param {PlaceModel} place
     * @memberof ContactFormPanelComponent
     */
    @action selectContactAddress(place) {
        this.contact.place = place;
        this.contact.place_uuid = place.id;
    }

    /**
     * Handles cancel button press.
     *
     * @action
     * @returns {any}
     */
    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel', this.contact);
    }
}
