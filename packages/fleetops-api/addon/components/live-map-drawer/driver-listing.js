import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { later } from '@ember/runloop';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

/**
 * Represents a live map drawer driver listing component.
 * This component is responsible for displaying and interacting with a list of drivers on a live map.
 *
 * @extends Component
 */
export default class LiveMapDrawerDriverListingComponent extends Component {
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
     * Service for triggering notifications.
     * @service
     */
    @service hostRouter;

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
     * The list of drivers to display, tracked for reactivity.
     * @tracked
     */
    @tracked drivers = [];

    /**
     * The internal list of drivers used for searching, tracked for reactivity.
     * @tracked
     */
    @tracked _drivers = [];

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
            label: this.intl.t('fleet-ops.common.driver'),
            valuePath: 'name',
            photoPath: 'photo_url',
            width: '100px',
            cellComponent: 'cell/driver-name',
            onClick: this.focus,
        },
        {
            label: this.intl.t('fleet-ops.component.live-map-drawer.driver-listing.location'),
            valuePath: 'location',
            width: '80px',
            cellComponent: 'table/cell/point',
            onClick: this.locate,
        },
        {
            label: this.intl.t('fleet-ops.component.live-map-drawer.driver-listing.current-job'),
            valuePath: 'current_job_id',
            width: '80px',
            cellComponent: 'table/cell/anchor',
            onClick: this.job,
        },
        {
            label: this.intl.t('fleet-ops.common.status'),
            valuePath: 'status',
            cellComponent: 'table/cell/status',
            width: '60px',
        },
        {
            label: this.intl.t('fleet-ops.component.live-map-drawer.driver-listing.last-seen'),
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
                    label: this.intl.t('fleet-ops.component.live-map-drawer.driver-listing.view-driver'),
                    fn: this.focus,
                },
                {
                    label: this.intl.t('fleet-ops.component.live-map-drawer.driver-listing.edit-driver'),
                    fn: (driver) => {
                        return this.focus(driver, 'editing');
                    },
                },
                {
                    label: this.intl.t('fleet-ops.component.live-map-drawer.driver-listing.locate-driver'),
                    fn: this.locate,
                },
                {
                    label: this.intl.t('fleet-ops.component.live-map-drawer.driver-listing.delete-driver'),
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
     * Initializes the component with drivers passed in from `this.args` and sets up the live map reference.
     */
    constructor() {
        super(...arguments);
        this.drivers = getWithDefault(this.args, 'drivers', []);
        this._drivers = [...this.drivers];
        this.liveMap = this.args.liveMap;
    }

    /**
     * Filters the drivers list based on a query.
     *
     * @param {string} query - The query string to filter the drivers list.
     */
    search(query) {
        if (typeof query !== 'string' && !isBlank(query)) {
            return;
        }

        this.drivers = [
            ...this._drivers.filter((driver) => {
                return typeof driver.name === 'string' && driver.name.toLowerCase().includes(query.toLowerCase());
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
     * Action to focus on a driver in the live map and context panel.
     *
     * @param {object} driver - The driver object to focus on.
     * @param {string} intent - The intent for focusing, default is 'viewing'.
     */
    @action focus(driver, intent = 'viewing') {
        if (this.liveMap) {
            this.liveMap.focusLayerByRecord(driver, 16, {
                onAfterFocusWithRecord: () => {
                    later(
                        this,
                        () => {
                            this.contextPanel.focus(driver, intent);
                        },
                        600 * 2
                    );
                },
            });
        } else {
            this.contextPanel.focus(driver, intent);
        }
    }

    /**
     * Action to locate a driver on the live map.
     *
     * @param {object} driver - The driver object to locate.
     */
    @action locate(driver) {
        if (this.liveMap) {
            this.liveMap.focusLayerByRecord(driver, 18);
        } else {
            this.notifications.warning(this.intl.t('fleet-ops.component.live-map-drawer.driver-listing.warning-message'));
        }
    }

    /**
     * Transitino to view the drivers current job
     *
     * @param {DriverModel} driver
     * @memberof LiveMapDrawerDriverListingComponent
     */
    @action job(driver) {
        if (driver.current_job_id) {
            this.hostRouter.transitionTo('console.fleet-ops.operations.orders.index.view', driver.current_job_id);
        }
    }

    /**
     * Action to delete a driver from the list and perform cleanup.
     *
     * @param {object} driver - The driver object to delete.
     * @param {object} options - Additional options for the delete operation.
     */
    @action delete(driver, options = {}) {
        this.crud.delete(driver, {
            onSuccess: () => {
                this._drivers.removeObject(driver);
                this.drivers.removeObject(driver);
            },
            ...options,
        });
    }
}
