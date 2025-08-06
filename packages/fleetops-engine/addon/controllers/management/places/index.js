import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { isBlank } from '@ember/utils';
import { task, timeout } from 'ember-concurrency';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { later } from '@ember/runloop';
import ENV from '@fleetbase/console/config/environment';
import { 
    handleErrorLogDownload, 
    handleSuccessfulImport, 
    downloadFile 
  } from '@fleetbase/fleetops-engine/utils/import-utils';

export default class ManagementPlacesIndexController extends BaseController {
    @service notifications;
    @service modalsManager;
    @service intl;
    @service store;
    @service fetch;
    @service filters;
    @service hostRouter;
    @service crud;
    @service currentUser;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['name', 'page', 'limit', 'sort', 'query', 'public_id', 'country', 'phone', 'created_at', 'updated_at', 'city', 'neighborhood', 'state', 'code'];

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
     * The filterable param `public_id`
     *
     * @var {String}
     */
    @tracked postal_code;

    /**
     * The filterable param `phone`
     *
     * @var {String}
     */
    @tracked phone;

    /**
     * The filterable param `city`
     *
     * @var {String}
     */
    @tracked city;

    /**
     * The filterable param `name`
     *
     * @var {String}
     */
    @tracked name;

    /**
     * The filterable param `country`
     *
     * @var {String}
     */
    @tracked country;

    /**
     * The filterable param `country`
     *
     * @var {String}
     */
    @tracked neighborhood;

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('fleet-ops.common.name'),
            valuePath: 'name',
            width: '180px',
            cellComponent: 'table/cell/anchor',
            cellClassNames: 'uppercase',
            action: this.viewPlace,
            permission: 'fleet-ops view place',
            hidden: true,
            resizable: true,
            sortable: true,
            filterable: true,
            filterParam: 'name',
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.code'),
            valuePath: 'code',
            width: '120px',
            cellComponent: 'table/cell/anchor',
            action: this.viewPlace,
            resizable: true,
            sortable: true,
            filterable: false,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.address'),
            valuePath: 'address',
            cellComponent: 'table/cell/anchor',
            action: this.viewPlace,
            permission: 'fleet-ops view place',
            width: '320px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterParam: 'address',
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.id'),
            valuePath: 'public_id',
            width: '120px',
            cellComponent: 'click-to-copy',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.city'),
            valuePath: 'city',
            cellComponent: 'table/cell/anchor',
            cellClassNames: 'uppercase',
            action: this.viewPlace,
            permission: 'fleet-ops view place',
            width: '100px',
            hidden: true,
            resizable: true,
            sortable: true,
            filterable: true,
            filterParam: 'city',
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.state'),
            valuePath: 'state',
            cellComponent: 'table/cell/anchor',
            cellClassNames: 'uppercase',
            action: this.viewPlace,
            permission: 'fleet-ops view place',
            width: '100px',
            hidden: true,
            resizable: true,
            sortable: true,
            filterable: true,
            filterParam: 'state',
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.postal-code'),
            valuePath: 'postal_code',
            cellComponent: 'table/cell/anchor',
            action: this.viewPlace,
            permission: 'fleet-ops view place',
            width: '100px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.country'),
            valuePath: 'country_name',
            cellComponent: 'table/cell/base',
            cellClassNames: 'uppercase',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/country',
            filterParam: 'country',
        },
        {
            label: this.intl.t('fleet-ops.common.neighborhood'),
            valuePath: 'neighborhood',
            cellComponent: 'table/cell/anchor',
            cellClassNames: 'uppercase',
            action: this.viewPlace,
            permission: 'fleet-ops view place',
            width: '100px',
            hidden: true,
            resizable: true,
            sortable: true,
            filterable: true,
            filterParam: 'neighborhood',
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.phone'),
            valuePath: 'phone',
            cellComponent: 'table/cell/base',
            width: '120px',
            hidden: true,
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.created-at'),
            valuePath: 'createdAt',
            sortParam: 'created_at',
            width: '10%',
            resizable: true,
            sortable: true,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('fleet-ops.common.updated-at'),
            valuePath: 'updatedAt',
            sortParam: 'updated_at',
            width: '10%',
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
            ddMenuLabel: this.intl.t('fleet-ops.management.places.index.place-action'),
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            actions: [
                {
                    label: this.intl.t('fleet-ops.management.places.index.view-details'),
                    fn: this.viewPlace,
                    permission: 'fleet-ops view place',
                },
                {
                    label: this.intl.t('fleet-ops.management.places.index.edit-place'),
                    fn: this.editPlace,
                    permission: 'fleet-ops update place',
                },
                {
                    separator: true,
                },
                {
                    label: this.intl.t('fleet-ops.management.places.index.view-place'),
                    fn: this.viewOnMap,
                    permission: 'fleet-ops view place',
                },
                {
                    separator: true,
                },
                {
                    label: this.intl.t('fleet-ops.management.places.index.delete'),
                    fn: this.deletePlace,
                    permission: 'fleet-ops delete place',
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
     * Starts the Driver.js product tour
     */
    // @action
    // startTour() {
    //     const driverObj = driver({
    //       showProgress: true,
    //       nextBtnText: this.intl.t('fleetbase.common.next'),
    //         prevBtnText: this.intl.t('fleetbase.common.previous'),
    //         doneBtnText: this.intl.t('fleetbase.common.done'),
    //         closeBtnText: this.intl.t('fleetbase.common.close'),
    //       steps: [ // you can pass steps directly here
    //         {
    //             element: '#next-view-section-subheader-actions .btn-wrapper .new-place-button',
    //             onHighlightStarted: (element) => {
    //                 element.style.setProperty('pointer-events', 'none', 'important');
    //                 element.disabled = true;
    //                 },
    //                 onDeselected: (element) => {
    //                 element.style.pointerEvents = 'auto';
    //                 element.disabled = false;
    //                 },
    //             popover: {
    //                 title: this.intl.t('fleetbase.orders.tour.add.title'),
    //                 description: this.intl.t('fleetbase.orders.tour.add.description'),
    //                 onNextClick: () => {
    //                     this.createPlace();

    //                     later(this, () => {
    //                         const el = document.querySelector('.next-content-overlay > .next-content-overlay-panel-container > .next-content-overlay-panel');

    //                         if (el) {
    //                             const onTransitionEnd = () => {
    //                                 el.removeEventListener('transitionend', onTransitionEnd);
    //                                 driverObj.moveNext();
    //                             };

    //                             el.addEventListener('transitionend', onTransitionEnd);
    //                         }
    //                     }, 100);
                        
    //                 },
    //             },
    //         },
    //         {
    //             element: '.place-form-panel .next-content-overlay-panel',
    //             popover: {
    //                 title: this.intl.t('fleetbase.orders.tour.dates.title'),
    //                 description: this.intl.t('fleetbase.orders.tour.dates.description'),
    //                 side: 'left',
    //                 align: 'start',
    //             },
    //         },
    //         {
    //             element: '.create-place-button',
    //             popover: {
    //                 title: this.intl.t('Add New Place'),
    //                 description: this.intl.t('Click here to add a new place.'),
    //                 onNextClick: () => {
    //                     const onRouteChange = () => {
    //                         this.hostRouter.off('routeDidChange', onRouteChange);
                    
    //                         // Wait for the button to appear in the DOM
    //                         const waitForButton = () => {
    //                             if (document.querySelector('button.create-user-button')) {
    //                                 driverObj.moveNext();
    //                             } else {
    //                                 setTimeout(waitForButton, 100); // Check again after 100ms
    //                             }
    //                         };
                    
    //                         waitForButton();
    //                     };
                    
    //                     this.hostRouter.on('routeDidChange', onRouteChange);
    //                     this.hostRouter.transitionTo('console.iam.users');
    //                 }
                    
    //             },

    //         },
    //         {
    //             element: 'button.create-user-button',
    //             popover: {
    //                 title: this.intl.t('Import Places'),
    //                 description: this.intl.t('Import places in bulk using a spreadsheet.'),
    //                 onNextClick: () => {
    //                     this.createUser();
    //                 },
    //             },
    //         },
    //         {
    //             element: '.create-user-modal',
    //             popover: {
    //                 title: this.intl.t('Export Places'),
    //                 description: this.intl.t('Export your places data.'),
    //             },
    //         },
    //       ]
    //     });
      
    //     driverObj.drive(); // <-- start the tour
    //   }

      @action
    startPlacesTour() {
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
                    element: '#next-view-section-subheader-actions .btn-wrapper .new-place-button',
                    onHighlightStarted: (element) => {
                        element.style.setProperty('pointer-events', 'none', 'important');
                        element.disabled = true;
                    },
                    onDeselected: (element) => {
                        element.style.pointerEvents = 'auto';
                        element.disabled = false;
                    },
                    popover: {
                        title: this.intl.t('fleetbase.places.tour.new_button.title'),
                        description: this.intl.t('fleetbase.places.tour.new_button.description'),
                        onNextClick: () => {
                            this.createPlace();

                            later(this, () => {
                                const el = document.querySelector('.next-content-overlay > .next-content-overlay-panel-container > .next-content-overlay-panel');

                                if (el) {
                                    const onTransitionEnd = () => {
                                        el.removeEventListener('transitionend', onTransitionEnd);
                                        driverObj.moveNext();
                                    };

                                    el.addEventListener('transitionend', onTransitionEnd);
                                }
                            }, 100);
                        },
                    },
                },
                {
                    element: '.place-form-panel .next-content-overlay-panel',
                    popover: {
                        title: this.intl.t('fleetbase.places.tour.form_panel.title'),
                        description: this.intl.t('fleetbase.places.tour.form_panel.description'),
                        onPrevClick: () => {
                            // Attempt to close the sidebar by clicking the cancel button before moving to the previous step
                            const cancelButton = document.querySelector('.place-form-cancel-button');
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
                    element: '.place-form-panel .input-group:has(.place-name)',
                    popover: {
                        title: this.intl.t('fleetbase.places.tour.name_field.title'),
                        description: this.intl.t('fleetbase.places.tour.name_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.place-form-panel .input-group:has(.place-code)',
                    popover: {
                        title: this.intl.t('fleetbase.places.tour.code_field.title'),
                        description: this.intl.t('fleetbase.places.tour.code_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.place-form-panel .input-group:has(.coordinates-input)',
                    popover: {
                        title: this.intl.t('fleetbase.places.tour.coordinates_field.title'),
                        description: this.intl.t('fleetbase.places.tour.coordinates_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.create-place-button',
                    popover: {
                        title: this.intl.t('fleetbase.places.tour.submit.title'),
                        description: this.intl.t('fleetbase.places.tour.submit.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
            ]
        });

        // Check if sidebar is open before starting the tour
        const sidebar = document.querySelector('.next-content-overlay-panel');
        if (sidebar && window.getComputedStyle(sidebar).display !== 'none') {
            const placeFormPanel = document.querySelector('.place-form-panel');
            if (placeFormPanel) {
                const cancelButton = document.querySelector('.place-form-cancel-button');
                if (cancelButton) {
                    cancelButton.click(); // Simulate click to close sidebar
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

    /**
     * Toggles dialog to export `place`
     *
     * @void
     */
    @action exportPlaces() {
        const selections = this.table.selectedRows.map((_) => _.id);
        this.crud.export('place', { params: { selections } });
    }

    /**
     * View a place details
     *
     * @param {PlaceModel} place
     * @return {Promise}
     * @memberof ManagementPlacesIndexController
     */
    @action viewPlace(place) {
        return this.transitionToRoute('management.places.index.details', place);
    }

    /**
     * Reload layout view.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }
    /**
     * Create a new place
     *
     * @return {Promise}
     * @memberof ManagementPlacesIndexController
     */
    @action createPlace() {
        return this.transitionToRoute('management.places.index.new');
    }

    /**
     *Edit place details
     *
     * @param {PlaceModel} place
     * @return {Promise}
     * @memberof ManagementPlacesIndexController
     */
    @action editPlace(place) {
        return this.transitionToRoute('management.places.index.edit', place);
    }

    /**
     * Delete a `place` via confirm prompt
     *
     * @param {PlaceModel} place
     * @param {Object} options
     * @void
     */
    @action deletePlace(place, options = {}) {
        this.crud.delete(place, {
            onConfirm: () => {
                return this.hostRouter.refresh();
            },
            ...options,
        });
    }

    /**
     * Bulk deletes selected `place` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeletePlaces() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `address`,
            acceptButtonText: this.intl.t('fleet-ops.management.places.index.delete-button'),
            onSuccess: async () => {
                await this.hostRouter.refresh();
                this.table.untoggleSelectAll();
            },
        });
    }

    /**
     * Prompt user to assign a `vendor` to a `place`
     *
     * @param {PlaceModel} place
     * @param {Object} options
     * @void
     */
    @action assignVendor(place, options = {}) {
        this.modalsManager.show('modals/place-assign-vendor', {
            title: this.intl.t('fleet-ops.management.places.index.title'),
            acceptButtonText: this.intl.t('fleet-ops.management.places.index.confirm-button'),
            hideDeclineButton: true,
            place,
            confirm: (modal) => {
                modal.startLoading();
                return place.save().then(() => {
                    this.notifications.success(this.intl.t('fleet-ops.management.places.index.success-message', { placeName: place.name }));
                });
            },
            ...options,
        });
    }

    /**
     * Handles and prompts for spreadsheet imports of places.
     *
     * @void
     */
    @action
    importPlaces() {
        let path = `${ENV.AWS.FILE_PATH}/place-imports/${this.currentUser.companyId}`;
        let disk = ENV.AWS.DISK;
        let bucket = ENV.AWS.BUCKET;

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
                        {
                            path,
                            disk,
                            bucket,
                            type: 'place_import',
                        },
                        (uploadedFile) => {
                            uploadedFiles.pushObject(uploadedFile);
                            resolve(uploadedFile);
                        }
                    );
                });
            };

            modal.startLoading();
            modal.setOption('acceptButtonText', this.intl.t('fleet-ops.component.modals.order-import.processing'));
            modal.setOption('isProcessing', true);

            for (let file of uploadQueue) {
                await uploadTask(file);
            }

            const files = uploadedFiles.map((file) => file.id);
            let results;

            try {
                results = await this.fetch.post('places/import', { files });

                if (results?.error_log_url) {
                    handleErrorLogDownload(this, modal, results);
                    return;
                }

                handleSuccessfulImport(this, results, modal, this.onImportSuccess.bind(this));

            } catch (error) {
                console.error('Import failed:', error);
                modal.stopLoading();
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
            acceptedFileTypes: [
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/csv',
            ],
            fileQueueColumns: [
                { name: this.intl.t('fleet-ops.component.modals.order-import.type'), valuePath: 'extension', key: 'type' },
                { name: this.intl.t('fleet-ops.component.modals.order-import.file-name'), valuePath: 'name', key: 'fileName' },
                { name: this.intl.t('fleet-ops.component.modals.order-import.file-size'), valuePath: 'size', key: 'fileSize' },
                { name: this.intl.t('fleet-ops.component.modals.order-import.upload-date'), valuePath: 'file.lastModifiedDate', key: 'uploadDate' },
                { name: '', valuePath: '', key: 'delete' },
            ],
            queueFile: (file) => {
                this.modalsManager.getOption('uploadQueue').pushObject(file);
                checkQueue();
            },
            removeFile: (file) => {
                const uploadQueue = this.modalsManager.getOption('uploadQueue');
                uploadQueue.removeObject(file);
                file.queue.remove(file);
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
                if (this.modalsManager.getOption('isErrorState')) {
                    this.resetModalToInitialState();
                }
            },
            decline: (modal) => {
                const uploadQueue = this.modalsManager.getOption('uploadQueue');
                try {
                    if (Array.isArray(uploadQueue) && uploadQueue.length) {
                        const files = [...uploadQueue];
                        files.forEach(file => {
                            if (uploadQueue.removeObject) {
                                uploadQueue.removeObject(file);
                            }
                            file.queue?.remove?.(file);
                        });
                    }
                } catch (error) {
                    console.error('Upload queue cleanup error:', error);
                } finally {
                    this.modalsManager.setOption('uploadQueue', []);
                    modal.done();
                    this.hostRouter.refresh();
                }
            },
        });
    }


    onImportSuccess(results) {
        this.hostRouter.transitionTo('console.fleet-ops.operations.places.index', {
            queryParams: { layout: 'table', t: Date.now() },
        }).then(() => this.hostRouter.refresh());
    }

    /**
     * View a place location on map
     *
     * @param {PlaceModel} place
     * @param {Object} options
     * @void
     */
    @action viewOnMap(place, options = {}) {
        const { latitude, longitude } = place;

        this.modalsManager.show('modals/point-map', {
            title: this.intl.t('fleet-ops.management.places.index.locate-title', { placeName: place.name }),
            acceptButtonText: this.intl.t('common.done'),
            hideDeclineButton: true,
            latitude,
            longitude,
            location: [latitude, longitude],
            ...options,
        });
    }

    /**
     * View information about a place vendor
     *
     * @param {PlaceModel} place
     * @void
     */
    @action async viewPlaceVendor(place) {
        const vendor = await this.store.findRecord('vendor', place.vendor_uuid);

        if (vendor) {
            this.contextPanel.focus(vendor);
        }
    }
}
