import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import getVendorTypeOptions from '../utils/get-vendor-type-options';
import getVendorStatusOptions from '../utils/get-vendor-status-options';

export default class VendorFormPanelComponent extends Component {
    @service store;
    @service fetch;
    @service intl;
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
     * The users vendor instance.
     * @type {VendorModel|IntegratedVendorModel}
     */
    @tracked vendor;

    /**
     * Specific types of vendors which can be set as the type.
     *
     * @memberof VendorFormPanelComponent
     */
    @tracked vendorTypeOptions = getVendorTypeOptions();

    /**
     * Applicable status options for vendor.
     *
     * @memberof VendorFormPanelComponent
     */
    @tracked vendorStatusOptions = getVendorStatusOptions();

    /**
     * Permission needed to update or create record.
     *
     * @memberof DriverFormPanelComponent
     */
    @tracked savePermission;

    /**
     * Constructs the component and applies initial state.
     */
    constructor(owner, { vendor = null }) {
        super(...arguments);
        this.vendor = vendor;
        this.savePermission = vendor && vendor.isNew ? 'fleet-ops create vendor' : 'fleet-ops update vendor';
        this.isEditing = vendor && !vendor.isNew;
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
     * Task to save vendor.
     *
     * @return {void}
     * @memberof VendorFormPanelComponent
     */
    @task *save() {
        contextComponentCallback(this, 'onBeforeSave', this.vendor);

        try {
            this.vendor = yield this.vendor.save();
        } catch (error) {
            this.notifications.serverError(error);
            return;
        }

        this.notifications.success(this.intl.t('fleet-ops.component.vendor-form-panel.success-message', { vendorName: this.vendor.name }));
        contextComponentCallback(this, 'onAfterSave', this.vendor);
    }

    /**
     * Uploads a new logo for the vendor.
     *
     * @param {File} file
     * @memberof DriverFormPanelComponent
     */
    @action onUploadNewPhoto(file) {
        this.fetch.uploadFile.perform(
            file,
            {
                path: `uploads/${this.currentUser.companyId}/vendors/${this.vendor.id}`,
                subject_uuid: this.vendor.id,
                subject_type: 'fleet-ops:vendor',
                type: 'vendor_logo',
            },
            (uploadedFile) => {
                this.vendor.setProperties({
                    logo_uuid: uploadedFile.id,
                    logo_url: uploadedFile.url,
                    logo: uploadedFile,
                });
            }
        );
    }

    /**
     * Handle when vendor changed.
     *
     * @param {VendorModel} vendor
     * @memberof VendorFormPanelComponent
     */
    @action onVendorChanged(vendor) {
        this.vendor = vendor;
    }

    /**
     * View the details of the vendor.
     *
     * @action
     */
    @action onViewDetails() {
        const isActionOverrided = contextComponentCallback(this, 'onViewDetails', this.vendor);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.vendor, 'viewing');
        }
    }

    /**
     * Handles cancel button press.
     *
     * @action
     * @returns {any}
     */
    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel', this.vendor);
    }
}
