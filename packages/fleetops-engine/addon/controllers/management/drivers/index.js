import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { isBlank } from '@ember/utils';
import { equal } from '@ember/object/computed';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { later } from '@ember/runloop';
import { getOwner } from '@ember/application';


export default class ManagementDriversIndexController extends BaseController {
    @service notifications;
    @service modalsManager;
    @service intl;
    @service crud;
    @service driverActions;
    @service store;
    @service fetch;
    @service hostRouter;
    @service filters;
    @service currentUser;
    @service contextPanel;
    @service abilities;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = [
        'page',
        'limit',
        'sort',
        'query',
        'name',
        'drivers_license_number',
        'vehicle',
        'fleet',
        'vendor',
        'phone',
        'country',
        'public_id',
        'internal_id',
        'created_at',
        'updated_at',
        'status',
    ];

    /**
     * The current page of data being viewed
     *
     * @var {Integer}
     */
    @tracked page = 1;

    /**
     * The maximum number of items to show per page
     *
     * @var {Integer}
     */
    @tracked limit;

    /**
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked sort = '-created_at';

    /**
     * The filterable param `public_id`
     *
     * @var {String}
     */
    @tracked public_id;

    /**
     * The filterable param `internal_id`
     *
     * @var {String}
     */
    @tracked internal_id;

    /**
     * The filterable param `name`
     *
     * @var {String}
     */
    @tracked name;

    /**
     * The filterable param `vehicle`
     *
     * @var {String}
     */
    @tracked vehicle;

    /**
     * The filterable param `fleet`
     *
     * @var {String}
     */
    @tracked fleet;

    /**
     * The filterable param `drivers_license_number`
     *
     * @var {String}
     */
    @tracked drivers_license_number;

    /**
     * The filterable param `phone`
     *
     * @var {String}
     */
    @tracked phone;

    /**
     * The filterable param `status`
     *
     * @var {Array|String}
     */
    @tracked status;

    /**
     * The filterable param `created_at`
     *
     * @var {String}
     */
    @tracked created_at;

    /**
     * The filterable param `updated_at`
     *
     * @var {String}
     */
    @tracked updated_at;

    /**
     * The current layout.
     *
     * @memberof ManagementDriversIndexController
     */
    @tracked layout = 'table';

    /**
     * True if the current layout style is grid.
     *
     * @memberof ManagementDriversIndexController
     */
    @equal('layout', 'grid') isGridLayout;

    /**
     *Ttrue if the current layour style is table.
     *
     * @memberof ManagementDriversIndexController
     */
    @equal('layout', 'table') isTableLayout;

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('fleet-ops.common.name'),
            valuePath: 'name',
            width: '200px',
            cellComponent: 'table/cell/driver-name',
            permission: 'fleet-ops view driver',
            action: this.viewDriver,
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.id'),
            valuePath: 'public_id',
            width: '130px',
            cellComponent: 'click-to-copy',
            resizable: true,
            sortable: true,
            filterable: true,
            hidden: false,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.internal-id'),
            valuePath: 'internal_id',
            cellComponent: 'click-to-copy',
            width: '130px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        // {
        //     label: this.intl.t('fleet-ops.common.vendor'),
        //     cellComponent: 'table/cell/anchor',
        //     permission: 'fleet-ops view vendor',
        //     onClick: async (driver) => {
        //         const vendor = await driver.loadVendor();

        //         if (vendor) {
        //             this.contextPanel.focus(vendor);
        //         }
        //     },
        //     valuePath: 'vendor.name',
        //     modelNamePath: 'name',
        //     width: '180px',
        //     resizable: true,
        //     filterable: true,
        //     filterComponent: 'filter/model',
        //     filterComponentPlaceholder: 'Select vendor to filter by',
        //     filterParam: 'vendor',
        //     model: 'vendor',
        // },
        {
            label: this.intl.t('fleet-ops.common.vehicle'),
            cellComponent: 'table/cell/anchor',
            permission: 'fleet-ops view vehicle',
            onClick: (driver) => {
                return driver
                    .loadVehicle()
                    .then((vehicle) => {
                        return this.contextPanel.focus(vehicle);
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);
                    });
            },
            valuePath: 'vehicle.display_name',
            modelNamePath: 'display_name',
            resizable: true,
            width: '180px',
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: this.intl.t('fleet-ops.common.select-vehicle'),
            filterParam: 'vehicle',
            model: 'vehicle',
        },
        {
            label: this.intl.t('fleet-ops.common.fleet'),
            cellComponent: 'table/cell/link-list',
            cellComponentLabelPath: 'name',
            action: (fleet) => {
                this.contextPanel.focus(fleet);
            },
            valuePath: 'fleets',
            width: '180px',
            resizable: true,
            hidden: true,
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: this.intl.t('fleet-ops.common.select-fleet'),
            filterParam: 'fleet',
            model: 'fleet',
        },
        {
            label: this.intl.t('fleet-ops.common.license'),
            valuePath: 'drivers_license_number',
            cellComponent: 'table/cell/base',
            width: '150px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.phone'),
            valuePath: 'phone',
            cellComponent: 'table/cell/base',
            width: '150px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterParam: 'phone',
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.country'),
            valuePath: 'country',
            cellComponent: 'table/cell/country',
            cellClassNames: 'uppercase',
            width: '120px',
            resizable: true,
            hidden: true,
            sortable: true,
            filterable: true,
            filterParam: 'country',
            filterComponent: 'filter/multi-option',
            filterFetchOptions: 'lookup/countries',
            filterOptionLabel: 'name',
            filterOptionValue: 'cca2',
            multiOptionSearchEnabled: true,
            multiOptionSearchPlaceholder: 'Search countries...',
        },
        {
            label: this.intl.t('fleet-ops.common.status'),
            valuePath: 'status',
            cellComponent: 'table/cell/status',
            width: '10%',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/select',
            filterFetchOptions: 'drivers/statuses',
        },
        {
            label: this.intl.t('fleet-ops.common.created-at'),
            valuePath: 'createdAt',
            sortParam: 'created_at',
            filterParam: 'created_at',
            width: '130px',
            resizable: true,
            sortable: true,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('fleet-ops.common.updated-at'),
            valuePath: 'updatedAt',
            sortParam: 'updated_at',
            filterParam: 'updated_at',
            width: '130px',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: this.intl.t('fleet-ops.common.actions'),
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            actions: [
                {
                    label: this.intl.t('fleet-ops.management.drivers.index.view-details'),
                    fn: this.viewDriver,
                    permission: 'fleet-ops view driver',
                },
                {
                    label: this.intl.t('fleet-ops.management.drivers.index.edit-details'),
                    fn: this.editDriver,
                    permission: 'fleet-ops update driver',
                },
                {
                    separator: true,
                },
                // {
                //     label: this.intl.t('fleet-ops.management.drivers.index.assign-order-driver'),
                //     fn: this.assignOrder,
                //     permission: 'fleet-ops assign-order-for driver',
                // },
                // {
                //     label: this.intl.t('fleet-ops.management.drivers.index.assign-vehicle-driver'),
                //     fn: this.assignVehicle,
                //     permission: 'fleet-ops assign-vehicle-for driver',
                // },
                {
                    label: this.intl.t('fleet-ops.management.drivers.index.locate-driver-map'),
                    fn: this.locateDriver,
                    permission: 'fleet-ops view driver',
                },
                {
                    separator: true,
                },
                {
                    label: this.intl.t('fleet-ops.management.drivers.index.delete-driver'),
                    fn: this.deleteDriver,
                    permission: 'fleet-ops delete driver',
                },
            ],
            sortable: false,
            filterable: false,
            resizable: false,
            searchable: false,
        },
    ];

    /**
     * The search task.
     *
     * @void
     */
    @task({ restartable: true }) *search({ target: { value } }) {
        // if no query don't search
        if (isBlank(value)) {
            set(this, 'query', null);
            this.hostRouter.refresh();
            return;
        }
        // timeout for typing
        yield timeout(200);

        // reset page for results
        if (this.page > 1) {
            set(this, 'page', 1);
        }

        // update the query param
        set(this, 'query', value);
        this.hostRouter.refresh();
    }

    /**
     * Switch layout view.
     *
     * @param {String} layout
     * @memberof ManagementDriversIndexController
     */
    @action changeLayout(layout) {
        this.layout = layout;
    }

    /**
     * Reload layout view.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }

    /**
     * Bulk deletes selected `driver` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeleteDrivers() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: this.intl.t('fleet-ops.management.drivers.index.delete-button'),
            onSuccess: async () => {
                await this.hostRouter.refresh();
                this.table.untoggleSelectAll();
            },
        });
    }

    /**

    /**
     * Toggles dialog to export `drivers`
     *
     * @void
     */
    @action exportDrivers() {
        const selections = this.table.selectedRows.map((_) => _.id);
        this.crud.export('driver', { params: { selections } });
    }

    /**
     * Handles and prompts for spreadsheet imports of drivers.
     *
     * @void
     */
    @action importDrivers() {
        this.crud.import('driver', {
            onImportCompleted: () => {
                this.hostRouter.refresh();
            },
        });
    }

    /**
     * View a `driver` details in modal
     *
     * @param {DriverModel} driver
     * @param {Object} options
     * @void
     */
    @action viewDriver(driver) {
        return this.transitionToRoute('management.drivers.index.details', driver);
    }

    /**
     * Create a new `driver` in modal
     *
     * @param {Object} options
     * @void
     */
    @action createDriver() {
        return this.transitionToRoute('management.drivers.index.new');
    }

    /**
     * View a `driver` details in modal
     *
     * @param {VehicleModel} driver
     * @param {Object} options
     * @void
     */
    @action editDriver(driver) {
        return this.transitionToRoute('management.drivers.index.edit', driver);
    }

    /**
     * Delete a `driver` via confirm prompt
     *
     * @param {DriverModel} driver
     * @param {Object} options
     * @void
     */
    @action deleteDriver(driver, options = {}) {
        this.driverActions.delete(driver, {
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
            ...options,
        });
    }

    /**
     * Prompt user to assign a `order` to a `driver`
     *
     * @param {DriverModel} driver
     * @param {Object} options
     * @void
     */
    @action assignOrder(driver, options = {}) {
        this.driverActions.assignOrder(driver, options);
    }

    /**
     * Prompt user to assign a `driver` to a `driver`
     *
     * @param {DriverModel} driver
     * @param {Object} options
     * @void
     */
    @action assignVehicle(driver, options = {}) {
        this.driverActions.assignVehicle(driver, options);
    }

    /**
     * Display a dialog with a map view of the `driver` location
     *
     * @param {DriverModel} driver
     * @void
     */
    @action locateDriver(driver, options = {}) {
        this.driverActions.locate(driver, options);
    }
    /**
     * Start the drivers tour to guide users through the driver creation process
     *
     * @void
     */


@action
startDriversTour() {
    const driverObj = driver({
        showProgress: true,
        nextBtnText: this.intl.t('fleetbase.common.next'),
        prevBtnText: this.intl.t('fleetbase.common.previous'),
        doneBtnText: this.intl.t('fleetbase.common.done'),
        closeBtnText: this.intl.t('fleetbase.common.close'),
        allowClose: false,
        disableActiveInteraction: true,
        onPopoverRender: (popover) => {
            const closeBtn = popover.wrapper.querySelector('.driver-popover-close-btn');
            if (closeBtn) {
                closeBtn.style.display = 'inline-block';
            }
        },
        onDestroyStarted: () => {
            // Close the sidebar when the tour is destroyed
            const sidebar = document.querySelector('.next-content-overlay-panel');
            if (sidebar) {
                const driverFormPanel = document.querySelector('.driver-form-panel');
                if (driverFormPanel) {
                    const cancelButton = document.querySelector('.driver-form-cancel-button');
                    if (cancelButton) {
                        cancelButton.click(); // Simulate click to trigger onPressCancel
                    }
                }
            }
            driverObj.destroy();
        },
        steps: [
            {
                element: 'button.new-driver-button',
                onHighlightStarted: (element) => {
                    element.style.setProperty('pointer-events', 'none', 'important');
                    element.disabled = true;
                },
                onDeselected: (element) => {
                    element.style.pointerEvents = 'auto';
                    element.disabled = false;
                },
                popover: {
                    title: this.intl.t('fleetbase.drivers.tour.new_button.title'),
                    description: this.intl.t('fleetbase.drivers.tour.new_button.description'),
                    onNextClick: () => {
                        this.createDriver();
                        later(this, () => {
                            driverObj.moveNext();
                        }, 500); // Adjust delay based on createDriver completion
                    },
                },
            },
            {
                element: '.user-account-panel',
                popover: {
                    title: this.intl.t('fleetbase.drivers.tour.user_account.title'),
                    description: this.intl.t('fleetbase.drivers.tour.user_account.description'),
                },
            },
            {
                element: '.driver-details-panel',
                popover: {
                    title: this.intl.t('fleetbase.drivers.tour.driver_details.title'),
                    description: this.intl.t('fleetbase.drivers.tour.driver_details.description'),
                },
            },
            {
                element: '.new-driver-submit',
                popover: {
                    title: this.intl.t('fleetbase.drivers.tour.submit.title'),
                    description: this.intl.t('fleetbase.drivers.tour.submit.description'),
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
            },
        ],
    });

    // Check if sidebar is open before starting the tour
    const sidebar = document.querySelector('.next-content-overlay-panel');
    if (sidebar && window.getComputedStyle(sidebar).display !== 'none') {
        const driverFormPanel = document.querySelector('.driver-form-panel');
        if (driverFormPanel) {
            const cancelButton = document.querySelector('.driver-form-cancel-button');
            if (cancelButton) {
                cancelButton.click(); // Simulate click to trigger onPressCancel
                later(this, () => {
                    driverObj.drive();
                }, 500); // Wait for sidebar to close
                return;
            }
        }
        // Fallback if cancel button not found
        driverObj.drive();
    } else {
        driverObj.drive();
    }
}
}
