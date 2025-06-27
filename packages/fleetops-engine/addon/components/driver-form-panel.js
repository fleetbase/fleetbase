import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import Point from '@fleetbase/fleetops-data/utils/geojson/point';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import showErrorOnce from '@fleetbase/console/utils/show-error-once';

export default class DriverFormPanelComponent extends Component {
    @service store;
    @service fetch;
    @service intl;
    @service currentUser;
    @service notifications;
    @service hostRouter;
    @service contextPanel;
    @service modalsManager;
    @service universe;

    /**
     * Overlay context.
     * @type {any}
     */
    @tracked context;

    /**
     * Status options for drivers.
     * @type {Array}
     */
    @tracked driverStatusOptions = [
        { value: 'active', translationKey: 'statuses.active' },
        { value: 'pending', translationKey: 'statuses.pending' }
      ];

    /**
     * The coordinates input component instance.
     * @type {CoordinateInputComponent}
     */
    @tracked coordinatesInputComponent;

    /**
     * Permission needed to update or create record.
     *
     * @memberof DriverFormPanelComponent
     */
    @tracked savePermission;

    /**
     * Action to create a new user quickly
     *
     * @memberof DriverFormPanelComponent
     */
    userAccountActionButtons = [
        {
            text: this.intl.t('fleet-ops.component.driver-form-panel.create-user'),
            icon: 'user-plus',
            size: 'xs',
            permission: 'iam create user',
            onClick: () => {
                const user = this.store.createRecord('user', {
                    status: 'pending',
                    type: 'user',
                });

                this.modalsManager.show('modals/user-form', {
                    title: this.intl.t('fleet-ops.component.driver-form-panel.create-user'),
                    user,
                    formPermission: 'iam create user',
                    uploadNewPhoto: (file) => {
                        this.fetch.uploadFile.perform(
                            file,
                            {
                                path: `uploads/${this.currentUser.companyId}/users/${user.slug}`,
                                key_uuid: user.id,
                                key_type: 'user',
                                type: 'user_photo',
                            },
                            (uploadedFile) => {
                                user.setProperties({
                                    avatar_uuid: uploadedFile.id,
                                    avatar_url: uploadedFile.url,
                                    avatar: uploadedFile,
                                });
                            }
                        );
                    },
                    confirm: async (modal) => {
                        modal.startLoading();
                         // Required field validation
                        const requiredFields = ['name', 'email', 'phone', 'role'];
                        const hasEmptyRequired = requiredFields.some(field => !user[field] || user[field].toString().trim() === '');
                        if (hasEmptyRequired) {
                            showErrorOnce(this, this.notifications, this.intl.t('validation.form_invalid'));
                            modal.stopLoading();
                            return;
                        }
                        try {
                            await user.save();
                            this.notifications.success(this.intl.t('common.create-user-success'));
                            modal.done();
                        } catch (error) {
                            this.notifications.serverError(error);
                            modal.stopLoading();
                        }
                    },
                });
            },
        },
    ];

    /**
     * Constructs the component and applies initial state.
     */
    constructor(owner, { driver = null }) {
        super(...arguments);
        this.driver = driver;
        this.savePermission = driver && driver.isNew ? 'fleet-ops create driver' : 'fleet-ops update driver';
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
     * Task to save driver.
     *
     * @return {void}
     * @memberof DriverFormPanelComponent
     */
    @task *save() {
        // Validate before saving
        if (!this.validate()) {
            showErrorOnce(this, this.notifications, this.intl.t('validation.form_invalid'));
            return;
        }
        contextComponentCallback(this, 'onBeforeSave', this.driver);

        try {
            this.driver = yield this.driver.save();
        } catch (error) {
            this.notifications.serverError(error);
            this.hostRouter.refresh();
            return;
        }

        this.hostRouter.refresh();
        this.notifications.success(this.intl.t('fleet-ops.component.driver-form-panel.success-message', { driverName: this.driver.name }));
        this.universe.trigger('fleet-ops.driver.saved', this.driver);
        contextComponentCallback(this, 'onAfterSave', this.driver);
    }

     /**
     * Validates required fields and sets errors.
     * @returns {boolean} true if valid, false otherwise
     */
     validate() {
        const requiredFields = [
            'user',
            'drivers_license_number',
            'vehicle',
            'city',
            'country',
            'status'
        ];
        const hasEmptyRequired = requiredFields.some(field => !this.driver[field] || this.driver[field].toString().trim() === '');
        if (hasEmptyRequired) {
            showErrorOnce(this, this.notifications, this.intl.t('validation.form_invalid'));
            return false;
        }
        return true;
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
                path: `uploads/${this.currentUser.companyId}/drivers/${this.driver.id}`,
                subject_uuid: this.driver.id,
                subject_type: 'fleet-ops:driver',
                type: 'driver_photo',
            },
            (uploadedFile) => {
                this.driver.setProperties({
                    photo_uuid: uploadedFile.id,
                    photo_url: uploadedFile.url,
                    photo: uploadedFile,
                });
            }
        );
    }

    /**
     * View the details of the driver.
     *
     * @action
     */
    @action onViewDetails() {
        const isActionOverrided = contextComponentCallback(this, 'onViewDetails', this.driver);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.driver, 'viewing');
        }
    }

    /**
     * Handles cancel button press.
     *
     * @action
     * @returns {any}
     */
    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel', this.driver);
    }

    /**
     * Handles the selection from an autocomplete. Updates the place properties with the selected data.
     * If a coordinates input component is present, updates its coordinates too.
     *
     * @action
     * @param {Object} selected - The selected item from the autocomplete.
     * @param {Object} selected.location - The location data of the selected item.
     * @memberof DriverFormPanelComponent
     */
    @action onAutocomplete({ location }) {
        if (location) {
            this.driver.set('location', location);
            if (this.coordinatesInputComponent) {
                this.coordinatesInputComponent.updateCoordinates(location);
            }
        }
    }

    /**
     * Sets the coordinates input component.
     *
     * @action
     * @param {Object} coordinatesInputComponent - The coordinates input component to be set.
     * @memberof DriverFormPanelComponent
     */
    @action setCoordinatesInput(coordinatesInputComponent) {
        this.coordinatesInputComponent = coordinatesInputComponent;
    }

    /**
     * Updates the place coordinates with the given latitude and longitude.
     *
     * @action
     * @param {Object} coordinates - The latitude and longitude coordinates.
     * @param {number} coordinates.latitude - Latitude value.
     * @param {number} coordinates.longitude - Longitude value.
     * @memberof DriverFormPanelComponent
     */
    @action onCoordinatesChanged({ latitude, longitude }) {
        const location = new Point(longitude, latitude);
        this.driver.setProperties({ location });
    }
    /**
     * The selected status option.
     */
    get selectedStatus() {
        return this.driverStatusOptions.find(status => status.value === this.driver.status);
    }
    /**
     * 
     * @param {*} selectedStatus 
     */
    @action
    updateStatus(selectedStatus) {
        this.driver.status = selectedStatus.value;
    }
}
