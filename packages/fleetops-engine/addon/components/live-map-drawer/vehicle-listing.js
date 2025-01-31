import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { later } from '@ember/runloop';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

/**
 * Represents a live map drawer vehicle listing component.
 * This component is responsible for displaying and interacting with a list of vehicles on a live map.
 *
 * @extends Component
 */
export default class LiveMapDrawerVehicleListingComponent extends Component {
    /**
     * Service for managing context panels within the application.
     * @service
     */
    @service contextPanel;

    /**
     * Service for triggering notifications.
     * @service
     */
    @service notifications;

    /**
     * Service for intl.
     * @service
     */
    @service intl;

    /**
     * Service for CRUD operations.
     * @service
     */
    @service crud;

    /**
     * The list of vehicles to display, tracked for reactivity.
     * @tracked
     */
    @tracked vehicles = [];

    /**
     * The internal list of vehicles used for searching, tracked for reactivity.
     * @tracked
     */
    @tracked _vehicles = [];

    /**
     * The current search query, tracked for reactivity.
     * @tracked
     */
    @tracked query = '';

    /**
     * The table component reference, tracked for reactivity.
     * @tracked
     */
    @tracked table = null;

    /**
     * The configuration for table columns including details like label, valuePath, and cellComponent,
     * tracked for reactivity.
     * @tracked
     */
    @tracked columns = [
        {
            label: this.intl.t('fleet-ops.common.vehicle'),
            valuePath: 'display_name',
            photoPath: 'photo_url',
            width: '100px',
            cellComponent: 'table/cell/vehicle-name',
            onClick: this.focus,
            showOnlineIndicator: true,
        },
        {
            label: this.intl.t('fleet-ops.component.live-map-drawer.vehicle-listing.location'),
            valuePath: 'location',
            width: '80px',
            cellComponent: 'table/cell/point',
            onClick: this.locate,
        },
        {
            label: this.intl.t('fleet-ops.common.status'),
            valuePath: 'status',
            cellComponent: 'table/cell/status',
            width: '60px',
        },
        {
            label: this.intl.t('fleet-ops.component.live-map-drawer.vehicle-listing.last-seen'),
            valuePath: 'updatedAgo',
            width: '60px',
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '90px',
            actions: [
                {
                    label: this.intl.t('fleet-ops.component.live-map-drawer.vehicle-listing.view-vehicle'),
                    fn: this.focus,
                },
                {
                    label: this.intl.t('fleet-ops.component.live-map-drawer.vehicle-listing.edit-vehicle'),
                    fn: (vehicle) => {
                        return this.focus(vehicle, 'editing');
                    },
                },
                {
                    label: this.intl.t('fleet-ops.component.live-map-drawer.vehicle-listing.locate-vehicle'),
                    fn: this.locate,
                },
                {
                    label: this.intl.t('fleet-ops.component.live-map-drawer.vehicle-listing.delete-vehicle'),
                    fn: this.delete,
                },
            ],
            sortable: false,
            filterable: false,
            resizable: false,
            searchable: false,
        },
    ];

    /**
     * Initializes the component with vehicles passed in from `this.args` and sets up the live map reference.
     */
    constructor() {
        super(...arguments);
        this.vehicles = getWithDefault(this.args, 'vehicles', []);
        this._vehicles = [...this.vehicles];
        this.liveMap = this.args.liveMap;
    }

    /**
     * Filters the vehicles list based on a query.
     *
     * @param {string} query - The query string to filter the vehicles list.
     */
    search(query) {
        if (typeof query !== 'string' && !isBlank(query)) {
            return;
        }

        this.vehicles = [
            ...this._vehicles.filter((vehicle) => {
                return typeof vehicle.displayName === 'string' && vehicle.displayName.toLowerCase().includes(query.toLowerCase());
            }),
        ];
    }

    /**
     * Action to perform a search based on the input event's value.
     *
     * @param {Event} event - The input event containing the search value.
     */
    @action performSearch({ target: { value } }) {
        this.search(value);
    }

    /**
     * Action to focus on a vehicle in the live map and context panel.
     *
     * @param {object} vehicle - The vehicle object to focus on.
     * @param {string} intent - The intent for focusing, default is 'viewing'.
     */
    @action focus(vehicle, intent = 'viewing') {
        if (this.liveMap) {
            this.liveMap.focusLayerByRecord(vehicle, 16, {
                onAfterFocusWithRecord: () => {
                    later(
                        this,
                        () => {
                            this.contextPanel.focus(vehicle, intent);
                        },
                        600 * 2
                    );
                },
            });
        } else {
            this.contextPanel.focus(vehicle, intent);
        }
    }

    /**
     * Action to locate a vehicle on the live map.
     *
     * @param {object} vehicle - The vehicle object to locate.
     */
    @action locate(vehicle) {
        if (this.liveMap) {
            this.liveMap.focusLayerByRecord(vehicle, 18);
        } else {
            this.notifications.warning(this.intl.t('fleet-ops.component.live-map-drawer.vehicle-listing.warning-message'));
        }
    }

    /**
     * Action to delete a vehicle from the list and perform cleanup.
     *
     * @param {object} vehicle - The vehicle object to delete.
     * @param {object} options - Additional options for the delete operation.
     */
    @action delete(vehicle, options = {}) {
        this.crud.delete(vehicle, {
            onSuccess: () => {
                this._vehicles.removeObject(vehicle);
                this.vehicles.removeObject(vehicle);
            },
            ...options,
        });
    }
}
