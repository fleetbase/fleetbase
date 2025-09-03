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
import ENV from '@fleetbase/console/config/environment';
import { 
    handleErrorLogDownload, 
    handleSuccessfulImport, 
    downloadFile 
  } from '@fleetbase/fleetops-engine/utils/import-utils';


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
            valuePath: 'vehicle.plate_number',
            modelNamePath: 'plate_number',
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
            // cellComponent: 'table/cell/link-list',
            // cellComponentLabelPath: 'name',
            action: (fleet) => {
                this.contextPanel.focus(fleet);
            },
            valuePath: 'fleet.name',
            width: '180px',
            resizable: true,
            hidden: false,
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
            filterComponent: 'filter/country',
            filterParam: 'country',
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
     * Handle page change from Table pagination.
     * Only updates the `page` QP; route will refresh model and show loader.
     */
    @action onPageChange(page) {
        set(this, 'page', page);
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
        let path = `${ENV.AWS.FILE_PATH}/driver-imports/${this.currentUser.companyId}`;
        let disk = ENV.AWS.DISK;
        let bucket = ENV.AWS.BUCKET;
        const checkQueue = () => {
            const uploadQueue = this.modalsManager.getOption('uploadQueue');
            if (uploadQueue.length) {
                this.modalsManager.setOption('acceptButtonDisabled', false);
            } else {
                this.modalsManager.setOption('acceptButtonDisabled', true);
            }
        };
    
        const originalConfirm = async (modal) => {
            const uploadQueue = this.modalsManager.getOption('uploadQueue');
            const uploadedFiles = [];
    
            const uploadTask = (file) => {
                return new Promise((resolve) => {
                    this.fetch.uploadFile.perform(
                        file,
                        {
                            path: path,
                            disk: disk,
                            bucket: bucket,
                            type: `driver_import`,
                        },
                        (uploadedFile) => {
                            uploadedFiles.pushObject(uploadedFile);
                            resolve(uploadedFile);
                        }
                    );
                });
            };
    
            if (!uploadQueue.length) {
                return this.notifications.warning(this.intl.t('fleet-ops.operations.orders.index.new.warning-message'));
            }
    
            modal.startLoading();
            modal.setOption('acceptButtonText', this.intl.t('fleet-ops.component.modals.order-import.uploading'));
    
            // Upload all files
            for (let i = 0; i < uploadQueue.length; i++) {
                const file = uploadQueue.objectAt(i);
                await uploadTask(file);
            }
    
            this.modalsManager.setOption('acceptButtonText', this.intl.t('fleet-ops.component.modals.order-import.processing'));
            this.modalsManager.setOption('isProcessing', true);
    
            const files = uploadedFiles.map((file) => file.id);
            let results;
    
            try {
                results = await this.fetch.post('drivers/import', { files });
    
                // Handle error log case
                if (results && results.error_log_url) {
                    handleErrorLogDownload(this, modal, results);
                    return;
                }
                 // Success case - process the results, passing onImportSuccess callback
            handleSuccessfulImport(this, results, modal, this.onImportSuccess.bind(this));
            } catch (error) {
                console.error('Import failed:', error);
                modal.stopLoading();
                this.modalsManager.setOption('isErrorState', false);
                this.modalsManager.setOption('errorLogUrl', null);
                this.modalsManager.setOption('uploadQueue', []);
                this.modalsManager.setOption('acceptButtonText', this.intl.t('fleet-ops.component.modals.order-import.start-upload-button'));
                this.modalsManager.setOption('acceptButtonIcon', 'upload');
                this.modalsManager.setOption('acceptButtonScheme', 'magic');
                this.modalsManager.setOption('acceptButtonDisabled', true);
                this.modalsManager.setOption('isProcessing', false);
                this.notifications.serverError(error);
            }
    
        };
    
        const downloadErrorLog = (modal) => {
            const errorLogUrl = this.modalsManager.getOption('errorLogUrl');
            if (errorLogUrl) {
                downloadFile(errorLogUrl, () => {
                    modal.done();
                    this.hostRouter.refresh();
                });
            }
        };
    
        this.modalsManager.show('modals/import-modal', {
            title: this.intl.t('fleet-ops.component.modals.place-import.title'),
            acceptButtonText: this.intl.t('fleet-ops.component.modals.order-import.start-upload-button'),
            acceptButtonScheme: 'magic',
            acceptButtonIcon: 'upload',
            acceptButtonDisabled: true,
            isProcessing: false,
            uploadQueue: [],
            keepOpen: true,
            errorLogUrl: null,
            isErrorState: false,
            fileQueueColumns: [
                { name: this.intl.t('fleet-ops.component.modals.order-import.type'), valuePath: 'extension', key: 'type' },
                { name: this.intl.t('fleet-ops.component.modals.order-import.file-name'), valuePath: 'name', key: 'fileName' },
                { name: this.intl.t('fleet-ops.component.modals.order-import.file-size'), valuePath: 'size', key: 'fileSize' },
                { name: this.intl.t('fleet-ops.component.modals.order-import.upload-date'), valuePath: 'file.lastModifiedDate', key: 'uploadDate' },
                { name: '', valuePath: '', key: 'delete' },
            ],
            acceptedFileTypes: [
                'application/vnd.ms-excel', 
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                'text/csv'
            ],
            queueFile: (file) => {
                const uploadQueue = this.modalsManager.getOption('uploadQueue');
                uploadQueue.pushObject(file);
                checkQueue();
            },
            removeFile: (file) => {
                const { queue } = file;
                const uploadQueue = this.modalsManager.getOption('uploadQueue');
                uploadQueue.removeObject(file);
                queue.remove(file);
                checkQueue();
            },
            confirm: (modal) => {
                const isErrorState = this.modalsManager.getOption('isErrorState');
                if (isErrorState) {
                    downloadErrorLog(modal);
                } else {
                    originalConfirm(modal);
                }
            },
            secondaryAction: (modal) => {
                const isErrorState = this.modalsManager.getOption('isErrorState');
                if (isErrorState) {
                    this.resetModalToInitialState();
                }
            },
            decline: (modal) => {
                const uploadQueue = this.modalsManager.getOption('uploadQueue');
                try {
                    if (Array.isArray(uploadQueue) && uploadQueue.length) {
                        const files = [...uploadQueue];
                        files.forEach(file => {
                            const { queue } = file;
                            if (typeof uploadQueue.removeObject === 'function') {
                                uploadQueue.removeObject(file);
                            }
                            if (queue && typeof queue.remove === 'function') {
                                queue.remove(file);
                            }
                        });
                    }
                } catch (error) {
                    console.error('Error during upload queue cleanup:', error);
                } finally {
                    this.modalsManager.setOption('uploadQueue', []);
                    modal.done();
                    this.hostRouter.refresh();
                }
            },
        });
    }
    
    // Add this method to handle post-import success behavior for drivers:
    onImportSuccess() {
        this.hostRouter.transitionTo('console.fleet-ops.management.drivers.index', {
            queryParams: { refresh: true }
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
                element: '.import-btn', // import button
                popover: {
                    title: this.intl.t('fleetbase.drivers.tour.import_button.title'),
                    description: this.intl.t('fleetbase.drivers.tour.import_button.description'),
                    onNextClick: () => {
                        document.querySelector('.import-btn').click();
                        const checkModal = setInterval(() => {
                        const modal = document.querySelector('.flb--modal');
                        if (modal && modal.classList.contains('show')) {
                        clearInterval(checkModal);
                        driverObj.moveNext(); // Move to the next step
                        }
                    }, 100);
                    }
                },
            },
            {
                element: '.flb--modal .dropzone', // upload spreadsheets popup
                popover: {
                    title: this.intl.t('fleetbase.common.upload_spreadsheets.title'),
                    description: this.intl.t('fleetbase.common.upload_spreadsheets.description'),
                },
            },
            {
                element: '.flb--modal .modal-footer-actions .btn-magic', // start upload button
                popover: {
                    title: this.intl.t('fleetbase.common.start_upload.title'),
                    description: this.intl.t('fleetbase.common.start_upload.description'),
                    onNextClick: () => {
                        this.modalsManager.done();
                        const checkModalClosed = setInterval(() => {
                            const modal = document.querySelector('.flb--modal');
                            if (!modal || !modal.classList.contains('show')) {
                                clearInterval(checkModalClosed);
                                driverObj.moveNext();
                            }
                        }, 100);
                    },
                },
            },
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
                                const el = document.querySelector('.next-content-overlay > .next-content-overlay-panel-container > .next-content-overlay-panel');
                                if (el) {
                                    const onTransitionEnd = () => {
                                        el.removeEventListener('transitionend', onTransitionEnd);
                                        driverObj.moveNext();
                                    };
                                    el.addEventListener('transitionend', onTransitionEnd);
                                }
                            }, 100);// Adjust delay based on createDriver completion
                    },
                    onPrevClick: () => {
                        driverObj.drive(0);
                    }
                },
            },
            {
                element: '.user-account-panel',
                popover: {
                    title: this.intl.t('fleetbase.drivers.tour.user_account.title'),
                    description: this.intl.t('fleetbase.drivers.tour.user_account.description'),
                    onPrevClick: () => {
                        // Attempt to close the sidebar by clicking the cancel button before moving to the previous step
                        const cancelButton = document.querySelector('.driver-form-cancel-button');
                        if (cancelButton) {
                            cancelButton.click();
                            later(this, () => {
                                driverObj.movePrevious();
                            }, 500); // Wait for sidebar to close
                        } else {
                            driverObj.movePrevious();
                        }
                    }
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
