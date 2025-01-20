import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { later } from '@ember/runloop';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

/**
 * Represents a live map drawer place listing component.
 * This component is responsible for displaying and interacting with a list of places on a live map.
 *
 * @extends Component
 */
export default class LiveMapDrawerPlaceListingComponent extends Component {
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
     * Service for CRUD operations.
     * @service
     */
    @service crud;

    /**
     * Service for intl.
     * @service
     */
    @service intl;
    /**
     * The list of places to display, tracked for reactivity.
     * @tracked
     */
    @tracked places = [];

    /**
     * The internal list of places used for searching, tracked for reactivity.
     * @tracked
     */
    @tracked _places = [];

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
            label: this.intl.t('fleet-ops.component.live-map-drawer.place-listing.place'),
            valuePath: 'address',
            width: '200px',
            cellComponent: 'table/cell/anchor',
            onClick: this.focus,
            showOnlineIndicator: true,
        },
        {
            label: this.intl.t('fleet-ops.component.live-map-drawer.place-listing.location'),
            valuePath: 'location',
            width: '80px',
            cellComponent: 'table/cell/point',
            onClick: this.locate,
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
                    label: this.intl.t('fleet-ops.component.live-map-drawer.place-listing.view-place'),
                    fn: this.focus,
                },
                {
                    label: this.intl.t('fleet-ops.component.live-map-drawer.place-listing.edit-place'),
                    fn: (place) => {
                        return this.focus(place, 'editing');
                    },
                },
                {
                    label: this.intl.t('fleet-ops.component.live-map-drawer.place-listing.locate-place'),
                    fn: this.locate,
                },
                {
                    label: this.intl.t('fleet-ops.component.live-map-drawer.place-listing.delete-place'),
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
     * Initializes the component with places passed in from `this.args` and sets up the live map reference.
     */
    constructor() {
        super(...arguments);
        this.places = getWithDefault(this.args, 'places', []);
        this._places = [...this.places];
        this.liveMap = this.args.liveMap;
    }

    /**
     * Filters the places list based on a query.
     *
     * @param {string} query - The query string to filter the places list.
     */
    search(query) {
        if (typeof query !== 'string' && !isBlank(query)) {
            return;
        }

        this.places = [
            ...this._places.filter((place) => {
                return typeof place.address === 'string' && place.address.toLowerCase().includes(query.toLowerCase());
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
     * Action to focus on a place in the live map and context panel.
     *
     * @param {object} place - The place object to focus on.
     * @param {string} intent - The intent for focusing, default is 'viewing'.
     */
    @action focus(place, intent = 'viewing') {
        if (this.liveMap) {
            this.liveMap.focusLayerByRecord(place, 17, {
                onAfterFocusWithRecord: () => {
                    later(
                        this,
                        () => {
                            this.contextPanel.focus(place, intent);
                        },
                        600 * 2
                    );
                },
            });
        } else {
            this.contextPanel.focus(place, intent);
        }
    }

    /**
     * Action to locate a place on the live map.
     *
     * @param {object} place - The place object to locate.
     */
    @action locate(place) {
        if (this.liveMap) {
            this.liveMap.focusLayerByRecord(place, 18);
        } else {
            this.notifications.warning(this.intl.t('fleet-ops.component.live-map-drawer.place-listing.warning-message'));
        }
    }

    /**
     * Action to delete a place from the list and perform cleanup.
     *
     * @param {object} place - The place object to delete.
     * @param {object} options - Additional options for the delete operation.
     */
    @action delete(place, options = {}) {
        this.crud.delete(place, {
            onSuccess: () => {
                this._places.removeObject(place);
                this.places.removeObject(place);
            },
            ...options,
        });
    }
}
