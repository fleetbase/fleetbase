import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { task } from 'ember-concurrency';
import Point from '@fleetbase/fleetops-data/utils/geojson/point';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';

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

    /**
     * Task to save place.
     *
     * @return {void}
     * @memberof PlaceFormPanelComponent
     */
    @task *save() {
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
        const location = new Point(longitude, latitude);

        this.place.setProperties({ location });
    }
}
