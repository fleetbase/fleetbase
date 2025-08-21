import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { later } from '@ember/runloop';
import ENV from '@fleetbase/console/config/environment';
import { getOwner } from '@ember/application';
import { 
    handleErrorLogDownload, 
    handleSuccessfulImport, 
    downloadFile 
  } from '@fleetbase/fleetops-engine/utils/import-utils';

export default class ManagementVehiclesIndexController extends BaseController {
    @service contextPanel;
    @service notifications;
    @service modalsManager;
    @service vehicleActions;
    @service intl;
    @service store;
    @service fetch;
    @service crud;
    @service filters;
    @service currentUser;
    @service hostRouter;

    /**
     * Default query parameters for management controllers.
     *
     * @var {Array}
     */
    queryParams = [
        'page',
        'limit',
        'sort',
        'query',
        'public_id',
        'status',
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'name',
        'plate_number',
        'year',
        'vehicle_make',
        'vehicle_model',
        'display_name',
    ];

    /**
     * The search query.
     *
     * @var {String}
     */
    @tracked query = null;

    /**
     * The current page.
     *
     * @var {Integer}
     */
    @tracked page = 1;

    /**
     * The number of results to query.
     *
     * @var {Integer}
     */
    @tracked limit;

    /**
     * The param to sort the data on, the param with prepended `-` is descending.
     *
     * @var {String}
     */
    @tracked sort = '-created_at';

    /**
     * The filterable param `public_id`.
     *
     * @var {String}
     */
    @tracked public_id;

    /**
     * The filterable param `status`.
     *
     * @var {String|Array}
     */
    @tracked status;

    /**
     * The filterable param `make`.
     *
     * @var {String}
     */
    @tracked name;

    /**
     * The filterable param `plate_number`.
     *
     * @var {String}
     */
    @tracked plate_number;

    /**
     * The filterable param `vehicle_make`.
     *
     * @var {String}
     */
    @tracked vehicle_make;

    /**
     * The filterable param `vehicle_model`.
     *
     * @var {String}
     */
    @tracked vehicle_model;

    /**
     * The filterable param `year`.
     *
     * @var {String}
     */
    @tracked year;

    /**
     * The filterable param `country`.
     *
     * @var {String}
     */
    @tracked country;

    /**
     * The filterable param `fleet`.
     *
     * @var {String}
     */
    @tracked fleet;

    /**
     * The filterable param `vendor`.
     *
     * @var {String}
     */
    @tracked vendor;

    /**
     * The filterable param `driver`.
     *
     * @var {String}
     */
    @tracked driver;

    /**
     * The filterable param `display_name`.
     *
     * @var {String}
     */
    @tracked display_name;

    /**
     * TableComponent instance.
     *
     * @var {TableComponent}
     */
    @tracked table;

    /**
     * All possible order status options.
     *
     * @var {String}
     */
    @tracked statusOptions = [];

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        // {
        //     label: this.intl.t('fleet-ops.common.name'),
        //     valuePath: 'plateNumberModel',
        //     photoPath: 'avatar_url',
        //     width: '200px',
        //     cellComponent: 'table/cell/vehicle-name',
        //     permission: 'fleet-ops view vehicle',
        //     action: this.viewVehicle,
        //     resizable: true,
        //     sortable: true,
        //     filterable: true,
        //     filterComponent: 'filter/string',
        //     filterParam: 'plateNumberModel',
        //     showOnlineIndicator: true,
        // },
        {
            label: this.intl.t('fleet-ops.common.plate-number'),
            valuePath: 'plate_number',
            cellComponent: 'table/cell/base',
            width: '100px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
            filterParam: 'plate_number',
        },
        // {
        //     label: 'Driver Assigned',
        //     cellComponent: 'table/cell/anchor',
        //     permission: 'fleet-ops view driver',
        //     action: async (vehicle) => {
        //         const driver = await vehicle.loadDriver();

        //         return this.contextPanel.focus(driver);
        //     },
        //     valuePath: 'driver_name',
        //     width: '120px',
        //     resizable: true,
        //     filterable: true,
        //     filterComponent: 'filter/model',
        //     filterComponentPlaceholder: 'Select driver to filter by',
        //     filterParam: 'driver',
        //     model: 'driver',
        // },
        {
            label: this.intl.t('fleet-ops.common.id'),
            valuePath: 'public_id',
            cellComponent: 'click-to-copy',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.internal-id'),
            valuePath: 'internal_id',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.make'),
            valuePath: 'make',
            cellComponent: 'table/cell/base',
            width: '80px',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: false,
            filterParam: 'make',
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.model'),
            valuePath: 'model',
            cellComponent: 'table/cell/base',
            width: '80px',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: false,
            filterParam: 'model',
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.year'),
            valuePath: 'year',
            cellComponent: 'table/cell/base',
            width: '80px',
            resizable: true,
            sortable: true,
            hidden: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.fleet'),
            // cellComponent: 'table/cell/link-list',
            // cellComponentLabelPath: 'name',
            // action: (fleet) => {
            //     this.contextPanel.focus(fleet);
            // },
            valuePath: 'fleetNames',
            width: '180px',
            resizable: true,
            hidden: false,
            filterable: true,
            filterComponent: 'filter/model',
            // filterComponentPlaceholder: this.intl.t('fleet-ops.common.select-fleet'),
            // filterParam: 'fleet',
            // model: 'fleet',
        },

        // {
        //     label: this.intl.t('fleet-ops.common.vendor'),
        //     cellComponent: 'table/cell/anchor',
        //     permission: 'fleet-ops view vendor',
        //     action: async ({ vendor_uuid }) => {
        //         const vendor = await this.store.findRecord('vendor', vendor_uuid);

        //         this.vendors.viewVendor(vendor);
        //     },
        //     valuePath: 'vendor_name',
        //     width: '150px',
        //     hidden: true,
        //     resizable: true,
        //     filterable: true,
        //     filterComponent: 'filter/model',
        //     filterComponentPlaceholder: 'Select vendor to filter by',
        //     filterParam: 'vendor',
        //     model: 'vendor',
        // },
        {
            label: this.intl.t('fleet-ops.common.status'),
            valuePath: 'status',
            cellComponent: 'table/cell/status',
            width: '10%',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/select',
            // filterFetchOptions: 'vehicles/statuses',
            filterOptions: ['pending', 'active'],
        },
        {
            label: this.intl.t('fleet-ops.common.created-at'),
            valuePath: 'createdAt',
            sortParam: 'created_at',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: false,
            filterParam: 'created_at',
            filterLabel: 'Created Between',
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('fleet-ops.common.updated-at'),
            valuePath: 'updatedAt',
            sortParam: 'updated_at',
            width: '12%',
            resizable: true,
            sortable: true,
            hidden: true,
            filterParam: 'updated_at',
            filterLabel: 'Last Updated Between',
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'Vehicle Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '90px',
            actions: [
                {
                    label: this.intl.t('fleet-ops.management.vehicles.index.view-vehicle'),
                    fn: this.viewVehicle,
                    permission: 'fleet-ops view vehicle',
                },
                {
                    label: this.intl.t('fleet-ops.management.vehicles.index.edit-vehicle'),
                    fn: this.editVehicle,
                    permission: 'fleet-ops update vehicle',
                },
                {
                    label: this.intl.t('fleet-ops.management.vehicles.index.locate-action-title'),
                    fn: this.locateVehicle,
                    permission: 'fleet-ops view vehicle',
                },
                {
                    separator: true,
                },
                {
                    label: this.intl.t('fleet-ops.management.vehicles.index.delete-vehicle'),
                    fn: this.deleteVehicle,
                    permission: 'fleet-ops delete vehicle',
                },
            ],
            sortable: false,
            filterable: false,
            resizable: false,
            searchable: false,
        },
    ];
    
    /**
     * Reload layout view.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }

    /**
     * Bulk deletes selected `vehicle` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeleteVehicles() {
        const selectedRows = this.table.selectedRows;

        this.crud.bulkDelete(selectedRows, {
            modelNamePath: `display_name`,
            acceptButtonText: this.intl.t('fleet-ops.management.vehicles.index.delete-button'),
            onSuccess: async () => {
                await this.hostRouter.refresh();
                this.table.untoggleSelectAll();
            },
        });
    }

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
     * Toggles dialog to export `vehicles`
     *
     * @void
     */
    @action exportVehicles() {
        const selections = this.table.selectedRows.map((_) => _.id);
        this.crud.export('vehicle', { params: { selections } });
    }

    /**
     * View a `vehicle` details in modal
     *
     * @param {VehicleModel} vehicle
     * @param {Object} options
     * @void
     */
    @action viewVehicle(vehicle) {
        return this.transitionToRoute('management.vehicles.index.details', vehicle, { queryParams: { view: 'details' } });
    }

    /**
     * Create a new `vehicle` in modal
     *
     * @param {Object} options
     * @void
     */
    @action createVehicle() {
        return this.transitionToRoute('management.vehicles.index.new');
    }

    /**
     * Edit a `vehicle` details
     *
     * @param {VehicleModel} vehicle
     * @param {Object} options
     * @void
     */
    @action editVehicle(vehicle) {
        return this.transitionToRoute('management.vehicles.index.edit', vehicle);
    }

    /**
     * Delete a `vehicle` via confirm prompt
     *
     * @param {VehicleModel} vehicle
     * @param {Object} options
     * @void
     */
    @action deleteVehicle(vehicle, options = {}) {
        this.vehicleActions.delete(vehicle, {
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
            ...options,
        });
    }

    /**
     * Handles and prompts for spreadsheet imports of vehicles.
     *
     * @void
     */
    @action
    importVehicles() {
        const path = `${ENV.AWS.FILE_PATH}/vehicle-imports/${this.currentUser.companyId}`;
        const disk = ENV.AWS.DISK;
        const bucket = ENV.AWS.BUCKET;

        const checkQueue = () => {
            const uploadQueue = this.modalsManager.getOption('uploadQueue');
            this.modalsManager.setOption('acceptButtonDisabled', !uploadQueue.length);
        };

        const originalConfirm = async (modal) => {
            const uploadQueue = this.modalsManager.getOption('uploadQueue');
            const uploadedFiles = [];

            if (!uploadQueue.length) {
                return this.notifications.warning(this.intl.t('fleet-ops.operations.orders.index.new.warning-message'));
            }

            const uploadTask = (file) => {
                return new Promise((resolve) => {
                    this.fetch.uploadFile.perform(
                        file,
                        { path, disk, bucket, type: 'vehicle_import' },
                        (uploadedFile) => {
                            uploadedFiles.pushObject(uploadedFile);
                            resolve(uploadedFile);
                        }
                    );
                });
            };

            modal.startLoading();
            modal.setOption('acceptButtonText', this.intl.t('fleet-ops.component.modals.order-import.uploading'));

            for (let i = 0; i < uploadQueue.length; i++) {
                await uploadTask(uploadQueue.objectAt(i));
            }

            modal.setOption('acceptButtonText', this.intl.t('fleet-ops.component.modals.order-import.processing'));
            modal.setOption('isProcessing', true);

            const files = uploadedFiles.map((file) => file.id);

            try {
                const results = await this.fetch.post('vehicles/import', { files });
                if (results?.error_log_url) {
                    handleErrorLogDownload(this, modal, results);
                    return;
                }
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
            acceptedFileTypes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
            fileQueueColumns: [
                { name: this.intl.t('fleet-ops.component.modals.order-import.type'), valuePath: 'extension', key: 'type' },
                { name: this.intl.t('fleet-ops.component.modals.order-import.file-name'), valuePath: 'name', key: 'fileName' },
                { name: this.intl.t('fleet-ops.component.modals.order-import.file-size'), valuePath: 'size', key: 'fileSize' },
                { name: this.intl.t('fleet-ops.component.modals.order-import.upload-date'), valuePath: 'file.lastModifiedDate', key: 'uploadDate' },
                { name: '', valuePath: '', key: 'delete' },
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
                if (this.modalsManager.getOption('isErrorState')) {
                    downloadErrorLog(modal);
                } else {
                    originalConfirm(modal);
                }
            },
            secondaryAction: (modal) => {
                if (this.modalsManager.getOption('isErrorState')) {
                    this.resetModalToInitialState();
                }
            },
            decline: (modal) => {
                try {
                    const uploadQueue = this.modalsManager.getOption('uploadQueue') || [];
                    uploadQueue.forEach(file => {
                        file.queue?.remove(file);
                    });
                } catch (e) {
                    console.error('Error during upload queue cleanup:', e);
                } finally {
                    this.modalsManager.setOption('uploadQueue', []);
                    modal.done();
                    this.hostRouter.refresh();
                }
            },
        });
    }

    onImportSuccess() {
        this.hostRouter.transitionTo('console.fleet-ops.management.vehicles.index', {
            queryParams: { refresh: true }
        });
    }
    


    /**
     * Allow user to assign driver to a `vehicle` via prompt
     *
     * @param {VehicleModel} vehicle
     * @param {Object} options
     * @todo implement
     * @void
     */
    @action assignDriver() {}

    /**
     * View a vehicle location on map
     *
     * @param {VehicleModel} vehicle
     * @param {Object} options
     * @void
     */
    @action locateVehicle(vehicle, options = {}) {
        this.vehicleActions.locate(vehicle, options);
    }

    /**
     * Start the vehicles tour to guide users through the vehicle creation process
     *
     * @void
     */
    @action
    startVehiclesTour() {
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
            steps: [
                {       
                    element: '.import-btn', // import button
                    popover: {
                        title: this.intl.t('fleetbase.vehicles.tour.import_button.title'),
                        description: this.intl.t('fleetbase.vehicles.tour.import_button.description'),
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
                    element: 'button.new-vehicle-button',
                    onHighlightStarted: (element) => {
                        element.style.setProperty('pointer-events', 'none', 'important');
                        element.disabled = true;
                    },
                    onDeselected: (element) => {
                        element.style.pointerEvents = 'auto';
                        element.disabled = false;
                    },
                    popover: {
                        title: this.intl.t('fleetbase.vehicles.tour.new_button.title'),
                        description: this.intl.t('fleetbase.vehicles.tour.new_button.description'),
                        onNextClick: () => {
                            this.createVehicle();

                            const tryAttach = () => {
                                const el = document.querySelector('.next-content-overlay > .next-content-overlay-panel-container > .next-content-overlay-panel');
                                if (el) {
                                    const onTransitionEnd = () => {
                                        el.removeEventListener('transitionend', onTransitionEnd);
                                        driverObj.moveNext();
                                    };
                                    el.addEventListener('transitionend', onTransitionEnd);
                                } else {
                                    setTimeout(tryAttach, 100); // Try again after 50ms
                                }
                            };

                            tryAttach();
                        },
                        onPrevClick: () => { 
                            driverObj.drive(0); // Go back to the first step
                        }

                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    },
                },
                {
                    element: '.vehicle-details-panel .next-content-panel-container .next-content-panel',
                    popover: {
                        title: this.intl.t('fleetbase.vehicles.tour.vehicle_details.title'),
                        description: this.intl.t('fleetbase.vehicles.tour.vehicle_details.description'),
                        onPrevClick: () => {
                            // Attempt to close the sidebar by clicking the cancel button before moving to the previous step
                            const cancelButton = document.querySelector('.vehicle-form-cancel-button');
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
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    },
                },
                {
                    element: '.vehicle-avatar-panel',
                    popover: {
                        title: this.intl.t('fleetbase.vehicles.tour.vehicle_avatar.title'),
                        description: this.intl.t('fleetbase.vehicles.tour.vehicle_avatar.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    },
                },
                {
                    element: '.new-vehicle-submit',
                    popover: {
                        title: this.intl.t('fleetbase.vehicles.tour.submit.title'),
                        description: this.intl.t('fleetbase.vehicles.tour.submit.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    },
                }
            ],
        });

        driverObj.drive();
    }
}
