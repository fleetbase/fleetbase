import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { task } from 'ember-concurrency';
import Point from '@fleetbase/fleetops-data/utils/geojson/point';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import showErrorOnce from '@fleetbase/console/utils/show-error-once';

export default class PlaceFormPanelComponent extends Component {
    @service store;
    @service fetch;
    @service intl;
    @service notifications;
    @service hostRouter;
    @service contextPanel;

    /**
     * Overlay context.
     * @type {any}
     */
    @tracked context;

    /**
     * The coordinates input component instance.
     * @type {CoordinateInputComponent}
     */
    @tracked coordinatesInputComponent;

    /**
     * All possible place types
     *
     * @var {String}
     */
    @tracked placeTypes = ['place', 'customer'];

    /**
     * Permission needed to update or create record.
     *
     * @memberof DriverFormPanelComponent
     */
    @tracked savePermission;

    /**
     * Validation errors for the form fields.
     */
    @tracked errors = {};

    /**
     * Constructs the component and applies initial state.
     */
    constructor(owner, { place = null }) {
        super(...arguments);
        this.place = place;
        this.savePermission = place && place.isNew ? 'fleet-ops create place' : 'fleet-ops update place';
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
    isValidCoordinate(lat, lng) {
        const isNumber = (val) => typeof val === 'number' && !isNaN(val);

        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        const isLatValid = isNumber(latNum) && latNum >= -90 && latNum <= 90;
        const isLngValid = isNumber(lngNum) && lngNum >= -180 && lngNum <= 180;

        return isLatValid && isLngValid;
    }


    /**
     * Validates required fields and sets errors.
     * @returns {boolean} true if valid, false otherwise
     */
    validate() {
        const errors = {};
        const requiredFields = [
            { key: 'name', label: this.intl?.t?.('fleet-ops.common.name') || 'Name' },
            { key: 'code', label: this.intl?.t?.('fleet-ops.common.code') || 'Code' },
            { key: 'street1', label: this.intl?.t?.('fleet-ops.component.place-form-panel.street-1') || 'Street 1' },
            { key: 'postal_code', label: this.intl?.t?.('fleet-ops.component.place-form-panel.postal-code') || 'Postal Code' },
            { key: 'province', label: this.intl?.t?.('fleet-ops.component.place-form-panel.state') || 'State' },
            { key: 'country', label: this.intl?.t?.('fleet-ops.common.country') || 'Country' },
            { key: 'location', label: this.intl?.t?.('fleet-ops.common.coordinates') || 'Coordinates' },
        ];
        requiredFields.forEach(({ key, label }) => {
            if (isBlank(this.place[key])) {
                errors['is_required'] = 'isrequired';

                errors[key] = `${label} is required.`;
            }
        });
        const location = this.place.location;
        if (
            location?.coordinates?.length === 2 &&
            location.coordinates[0] != null &&
            location.coordinates[1] != null &&
            !(location.coordinates[0] === 0 && location.coordinates[1] === 0)
        ) {
            const [lng, lat] = location.coordinates;
            const valid = this.isValidCoordinate(lat, lng);

            if (!valid) {
                errors['location'] = 'invalid';
            }
        } else {
            errors['location'] = 'missing';
        }
        this.errors = errors;
        return Object.keys(errors).length === 0;
    }

    /**
     * Task to save place.
     *
     * @return {void}
     * @memberof PlaceFormPanelComponent
     */
    @task *save() {
        // Validate before saving
        // if (!this.validate()) {
        //     showErrorOnce(this, this.notifications, this.intl.t('validation.form_invalid'));
        //     if (this.errors?.is_required === 'isrequired') {
        //         showErrorOnce(this, this.notifications, this.intl.t('validation.form_invalid'));

        //     } else if (this.errors?.location === 'missing') {
        //         this.notifications.error(
        //             this.intl.t('fleet-ops.component.place-form-panel.coordinates-required') || 'Coordinates are required.'
        //         );
        //     } else if (this.errors?.location === 'invalid') {
        //         this.notifications.error(
        //             this.intl.t('fleet-ops.component.place-form-panel.coordinates-invalid') || 'Coordinates are invalid.'
        //         );
        //     } else {
        //     }
        //     return;
        // }
        contextComponentCallback(this, 'onBeforeSave', this.place);

        const phone = this.place.phone;
        if (typeof phone === 'string' && /^\+\d{1,4}$/.test(phone.trim())) {
            this.place.phone = '';
        }

        try {
            this.place = yield this.place.save();
        } catch (error) {
            this.notifications.serverError(error);
            return;
        }

        this.notifications.success(this.intl.t('fleet-ops.component.place-form-panel.success-message', { placeAddress: this.place.address }));
        contextComponentCallback(this, 'onAfterSave', this.place);
    }

    /**
     * View the details of the place.
     *
     * @action
     */
    @action onViewDetails() {
        const isActionOverrided = contextComponentCallback(this, 'onViewDetails', this.place);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.place, 'viewing');
        }
    }

    /**
     * Handles cancel button press.
     *
     * @action
     * @returns {any}
     */
    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel', this.place);
    }

    /**
     * Handles the selection from an autocomplete. Updates the place properties with the selected data.
     * If a coordinates input component is present, updates its coordinates too.
     *
     * @action
     * @param {Object} selected - The selected item from the autocomplete.
     * @param {Object} selected.location - The location data of the selected item.
     * @memberof PlaceFormPanelComponent
     */
    @action onAutocomplete(selected) {
        this.place.setProperties({ ...selected });

        if (this.coordinatesInputComponent) {
            this.coordinatesInputComponent.updateCoordinates(selected.location);
        }
    }

    /**
     * Performs reverse geocoding given latitude and longitude. Updates place properties with the geocoding result.
     *
     * @action
     * @param {Object} coordinates - The latitude and longitude coordinates.
     * @param {number} coordinates.latitude - Latitude value.
     * @param {number} coordinates.longitude - Longitude value.
     * @returns {Promise} A promise that resolves with the reverse geocoding result.
     * @memberof PlaceFormPanelComponent
     */
    @action onReverseGeocode({ latitude, longitude }) {
        return this.fetch.get('geocoder/reverse', { coordinates: [latitude, longitude].join(','), single: true }).then((result) => {
            if (isBlank(result)) {
                return;
            }

            this.place.setProperties({ ...result });
        });
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
     * Updates the place coordinates with the given latitude and longitude.
     *
     * @action
     * @param {Object} coordinates - The latitude and longitude coordinates.
     * @param {number} coordinates.latitude - Latitude value.
     * @param {number} coordinates.longitude - Longitude value.
     * @memberof PlaceFormPanelComponent
     */
    @action updatePlaceCoordinates({ latitude, longitude }) {
        if (!isNaN(latitude) && !isNaN(longitude)) {
            const location = new Point(longitude, latitude);
            this.place.set('location', location);
        } else {
            this.place.set('location', null);
        }
    }
}
