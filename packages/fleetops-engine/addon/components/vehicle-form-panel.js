import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import Point from '@fleetbase/fleetops-data/utils/geojson/point';
import showErrorOnce from '@fleetbase/console/utils/show-error-once';

export default class VehicleFormPanelComponent extends Component {
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
     * Status options for vehicles.
     * @type {Array}
     */
    @tracked vehicleStatusOptions =  [
        { value: 'active', translationKey: 'statuses.active' },
        { value: 'pending', translationKey: 'statuses.pending' }
      ];

    /**
     * Permission needed to update or create record.
     *
     * @memberof DriverFormPanelComponent
     */
    @tracked savePermission;

    /**
     * Constructs the component and applies initial state.
     */
    constructor(owner, { vehicle = null }) {
        super(...arguments);
        this.vehicle = vehicle;
        this.savePermission = vehicle && vehicle.isNew ? 'fleet-ops create vehicle' : 'fleet-ops update vehicle';
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
     * Updates the avatar URL based on the provided option.
     *
     * @action
     * @param {Object} option - The option containing key and value properties.
     * @param {string} option.key - The key indicating the type of avatar (e.g., 'custom_avatar').
     * @param {string} option.value - The URL or value associated with the avatar.
     * @memberof VehicleFormPanelComponent
     */
    @action updateAvatarUrl(option) {
        if (option.key === 'custom_avatar') {
            this.vehicle.avatar_url = option.value;
        } else {
            this.vehicle.avatar_url = [option.value];
        }
    }

    /**
     * Updates the selected image URL.
     *
     * @action
     * @param {string} url - The URL of the selected image.
     */
    @action updateSelectedImage(url) {
        this.vehicle.avatar_url = url;
    }

    /**
     * Task to save vehicle.
     *
     * @return {void}
     * @memberof VehicleFormPanelComponent
     */
    @task *save() {
         // Validate before saving
         if (!this.validate()) {
            showErrorOnce(this, this.notifications, this.intl.t('validation.form_invalid'));
            return;
        }
        contextComponentCallback(this, 'onBeforeSave', this.vehicle);

        try {
            this.vehicle = yield this.vehicle.save();
        } catch (error) {
            this.notifications.serverError(error);
            return;
        }

        this.notifications.success(this.intl.t('fleet-ops.component.vehicle-form-panel.success-message', { vehicleName: this.vehicle.displayName }));
        contextComponentCallback(this, 'onAfterSave', this.vehicle);
    }

    /**
     * Validates required fields and sets errors.
     * @returns {boolean} true if valid, false otherwise
     */
    validate() {
        const requiredFields = [
            'plate_number',
            'make',
            'model',
            'year',
            'status'
        ];
        const hasEmptyRequired = requiredFields.some(field => !this.vehicle[field] || this.vehicle[field].toString().trim() === '');
        if (hasEmptyRequired) {
            showErrorOnce(this, this.notifications, this.intl.t('validation.form_invalid'));
            return false;
        }
        return true;
    }

    /**
     * Uploads a new photo for the vehicle.
     *
     * @param {File} file
     * @memberof DriverFormPanelComponent
     */
    @action onUploadNewPhoto(file) {
        this.fetch.uploadFile.perform(
            file,
            {
                path: `uploads/${this.currentUser.companyId}/vehicles/${this.vehicle.id}`,
                subject_uuid: this.vehicle.id,
                subject_type: 'fleet-ops:vehicle',
                type: 'vehicle_photo',
            },
            (uploadedFile) => {
                this.vehicle.setProperties({
                    photo_uuid: uploadedFile.id,
                    photo_url: uploadedFile.url,
                    photo: uploadedFile,
                });
            }
        );
    }

    /**
     * View the details of the vehicle.
     *
     * @action
     */
    @action onViewDetails() {
        const isActionOverrided = contextComponentCallback(this, 'onViewDetails', this.vehicle);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.vehicle, 'viewing');
        }
    }

    /**
     * Handles cancel button press.
     *
     * @action
     * @returns {any}
     */
    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel', this.vehicle);
    }

    /**
     * Handle autocomplete callback
     *
     * @param {AutocompleteEvent} { location }
     * @memberof VehicleFormPanelComponent
     */
    @action onAutocomplete({ location }) {
        if (location) {
            this.vehicle.setProperties({ location });

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
     * @memberof PlaceFormPanelComponent
     */
    @action setCoordinatesInput(coordinatesInputComponent) {
        this.coordinatesInputComponent = coordinatesInputComponent;
    }

    /**
     * Updates the Vehicle coordinates with the given latitude and longitude.
     *
     * @action
     * @param {Object} coordinates - The latitude and longitude coordinates.
     * @param {number} coordinates.latitude - Latitude value.
     * @param {number} coordinates.longitude - Longitude value.
     * @memberof PlaceFormPanelComponent
     */
    @action onCoordinatesChanged({ latitude, longitude }) {
        const location = new Point(longitude, latitude);

        this.vehicle.setProperties({ location });
    }

    /**
     * The selected status option.
     */
    get selectedStatus() {
        return this.vehicleStatusOptions.find(status => status.value === this.vehicle.status);
    }
    /**
     * 
     * @param {*} selectedStatus 
     */
    @action
    updateStatus(selectedStatus) {
        this.vehicle.status = selectedStatus.value;
    }
}
