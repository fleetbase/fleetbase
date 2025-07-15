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

export default class ManagementTollReportsIndexController extends BaseController {
    @service notifications;
    @service modalsManager;
    @service intl;
    @service crud;
    @service store;
    @service hostRouter;
    @service contextPanel;
    @service filters;
    @service loader;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'limit', 'sort', 'query', 'public_id', 'internal_id', 'vehicle', 'driver', 'created_by', 'updated_by', 'status', 'country'];

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
     * The filterable param `driver`
     *
     * @var {String}
     */
    @tracked driver;

    /**
     * The filterable param `vehicle`
     *
     * @var {String}
     */
    @tracked vehicle;

    /**
     * The filterable param `vehicle`
     *
     * @var {String}
     */
    @tracked reporter;

    /**
     * The filterable param `vehicle`
     *
     * @var {String}
     */
    @tracked volume;

    /**
     * The filterable param `vehicle`
     *
     * @var {String}
     */
    @tracked odometer;

    /**
     * The filterable param `status`
     *
     * @var {Array}
     */
    @tracked status;

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
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
            label: this.intl.t('fleet-ops.common.reporter'),
            valuePath: 'reporter_name',
            width: '100px',
            cellComponent: 'table/cell/anchor',
            onClick: async (fuelReport) => {
                let reporter = await this.store.findRecord('user', fuelReport.reported_by_uuid);

                if (reporter) {
                    this.contextPanel.focus(reporter);
                }
            },
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: this.intl.t('fleet-ops.common.select-reporter'),
            filterParam: 'reporter',
            model: 'user',
        },
        {
            label: this.intl.t('fleet-ops.common.driver'),
            valuePath: 'driver_name',
            width: '120px',
            cellComponent: 'table/cell/anchor',
            permission: 'fleet-ops view driver',
            onClick: async (fuelReport) => {
                let driver = await fuelReport.loadDriver();

                if (driver) {
                    this.contextPanel.focus(driver);
                }
            },
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: this.intl.t('fleet-ops.common.select-driver'),
            filterParam: 'driver',
            model: 'driver',
        },
        {
            label: this.intl.t('fleet-ops.common.vehicle'),
            valuePath: 'vehicle_name',
            width: '100px',
            cellComponent: 'table/cell/anchor',
            permission: 'fleet-ops view vehicle',
            onClick: async (fuelReport) => {
                let vehicle = await fuelReport.loadVehicle();

                if (vehicle) {
                    this.contextPanel.focus(vehicle);
                }
            },
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: this.intl.t('fleet-ops.common.select-vehicle'),
            filterParam: 'vehicle',
            model: 'vehicle',
            modelNamePath: 'displayName',
        },
        {
            label: this.intl.t('fleet-ops.common.status'),
            valuePath: 'status',
            cellComponent: 'table/cell/status',
            width: '100px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/select',
            filterOptions: ['draft', 'pending-approval', 'approved', 'rejected', 'revised', 'submitted', 'in-review', 'confirmed', 'processed', 'archived', 'cancelled'],
        },
        {
            label: this.intl.t('fleet-ops.common.created-at'),
            valuePath: 'createdAt',
            sortParam: 'created_at',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('fleet-ops.common.updated-at'),
            valuePath: 'updatedAt',
            sortParam: 'updated_at',
            width: '120px',
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
                    label: this.intl.t('fleet-ops.management.toll-reports.index.view'),
                    fn: this.viewFuelReport,
                    permission: 'fleet-ops view fuel-report',
                },
                {
                    label: this.intl.t('fleet-ops.management.toll-reports.index.edit-toll-report'),
                    fn: this.editFuelReport,
                    permission: 'fleet-ops update fuel-report',
                },
                {
                    separator: true,
                },
                {
                    label: this.intl.t('fleet-ops.management.toll-reports.index.delete'),
                    fn: this.deleteFuelReport,
                    permission: 'fleet-ops delete fuel-report',
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
     * Toggles dialog to export a fuel report
     *
     * @void
     */
    @action exportFuelReports() {
        this.crud.export('fuel-report');
    }

    /**
     * Handles and prompts for spreadsheet imports of fuel report.
     *
     * @void
     */
    @action importFuelReports() {
        this.crud.import('fuel-report', {
            onImportCompleted: () => {
                this.hostRouter.refresh();
            },
        });
    }

    /**
     * View the selected fuel report
     *
     * @param {FuelReportModel} fuelReport
     * @param {Object} options
     * @void
     */
    @action viewFuelReport(fuelReport) {
        this.transitionToRoute('management.toll-reports.index.details', fuelReport);
    }

    /**
     * Reload layout view.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }

    /**
     * Create a new fuel report
     *
     * @void
     */
    @action createFuelReport() {
        this.transitionToRoute('management.toll-reports.index.new');
    }

    /**
     * Edit a fuel report
     *
     * @param {FuelReportModel} fuelReport
     * @void
     */
    @action editFuelReport(fuelReport) {
        this.transitionToRoute('management.toll-reports.index.edit', fuelReport);
    }

    /**
     * Prompt to delete a fuel report
     *
     * @param {FuelReportModel} fuelReport
     * @param {Object} options
     * @void
     */
    @action deleteFuelReport(fuelReport, options = {}) {
        this.crud.delete(fuelReport, {
            action_path: 'is_toll',
            onConfirm: () => {
                this.hostRouter.refresh();
            },
            ...options,
        });
    }

    /**
     * Bulk deletes selected fuel report's via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeleteFuelReports() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: this.intl.t('fleet-ops.management.toll-reports.index.delete-button'),
            onSuccess: async () => {
                await this.hostRouter.refresh();
                this.table.untoggleSelectAll();
            },
        });
    }

    /**
     * Start the guided tour for toll reports management
     *
     * @action
     * @memberof ManagementTollReportsIndexController
     */
    @action startTollReportsTour() {
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
                    element: '.new-toll-report-btn',
                    onHighlightStarted: (element) => {
                                            element.style.setProperty('pointer-events', 'none', 'important');
                                            element.disabled = true;
                                        },
                                        onDeselected: (element) => {
                                            element.style.pointerEvents = 'auto';
                                            element.disabled = false;
                                        },
                                        popover: {
                                            title: this.intl.t('fleetbase.toll-reports.tour.new_button.title'),
                                            description: this.intl.t('fleetbase.toll-reports.tour.new_button.description'),
                                            onNextClick: () => {
                                                this.createFuelReport();
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
                    element: '.next-content-overlay-panel:has(.toll-report-form-panel)',
                    popover: {
                        title: this.intl.t('fleetbase.toll-reports.tour.form_panel.title'),
                        description: this.intl.t('fleetbase.toll-reports.tour.form_panel.description'),
                    },
                    onHighlightStarted: async (element) => {
                        // Wait for overlay to fully open
                        await new Promise(resolve => setTimeout(resolve, 500));
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.toll-report-form-panel .input-group:has(.reporter)',
                    popover: {
                        title: this.intl.t('fleetbase.toll-reports.tour.reporter_field.title'),
                        description: this.intl.t('fleetbase.toll-reports.tour.reporter_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.toll-report-form-panel .input-group:has(.driver)',
                    popover: {
                        title: this.intl.t('fleetbase.toll-reports.tour.driver_field.title'),
                        description: this.intl.t('fleetbase.toll-reports.tour.driver_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.toll-report-form-panel .input-group:has(.vehicle)',
                    popover: {
                        title: this.intl.t('fleetbase.toll-reports.tour.vehicle_field.title'),
                        description: this.intl.t('fleetbase.toll-reports.tour.vehicle_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.toll-report-form-panel .input-group:has(.status)',
                    popover: {
                        title: this.intl.t('fleetbase.toll-reports.tour.status_field.title'),
                        description: this.intl.t('fleetbase.toll-reports.tour.status_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.toll-report-form-panel .input-group:has(.toll-payment-method-field)',
                    popover: {
                        title: this.intl.t('fleetbase.toll-reports.tour.payment_method_field.title'),
                        description: this.intl.t('fleetbase.toll-reports.tour.payment_method_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.toll-report-form-panel .input-group:has(.toll-cost-field)',
                    popover: {
                        title: this.intl.t('fleetbase.toll-reports.tour.cost_field.title'),
                        description: this.intl.t('fleetbase.toll-reports.tour.cost_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.toll-report-form-panel .toll-coordinates-field',
                    popover: {
                        title: this.intl.t('fleetbase.toll-reports.tour.coordinates_field.title'),
                        description: this.intl.t('fleetbase.toll-reports.tour.coordinates_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.toll-report-form-panel .toll-upload-field',
                    popover: {
                        title: this.intl.t('fleetbase.toll-reports.tour.upload_field.title'),
                        description: this.intl.t('fleetbase.toll-reports.tour.upload_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.create-toll-report-btn',
                    popover: {
                        title: this.intl.t('fleetbase.toll-reports.tour.submit.title'),
                        description: this.intl.t('fleetbase.toll-reports.tour.submit.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
            ],
        });

        driverObj.drive();
    }
}
