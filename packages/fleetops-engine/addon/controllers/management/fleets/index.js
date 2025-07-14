import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import { driver } from 'driver.js';
import { later } from '@ember/runloop';
import 'driver.js/dist/driver.css';

export default class ManagementFleetsIndexController extends BaseController {
    @service notifications;
    @service modalsManager;
    @service intl;
    @service store;
    @service crud;
    @service fetch;
    @service hostRouter;
    @service universe;
    @service filters;
    @service serviceAreas;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'limit', 'sort', 'query', 'public_id', 'zone', 'service_area', 'parent_fleet', 'vendor', 'created_by', 'updated_by', 'status', 'task', 'name'];

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
     * The filterable param `service_area`
     *
     * @var {String}
     */
    @tracked service_area;
    /**
     * The filterable param `parent_fleet`
     *
     * @var {String}
     */
    @tracked parent_fleet;
    /**
     * The filterable param `vendor`
     *
     * @var {String}
     */
    @tracked vendor;

    /**
     * The filterable param `zone`
     *
     * @var {String}
     */
    @tracked zone;

    /**
     * The filterable param `task`
     *
     * @var {Array}
     */
    @tracked task;

    /**
     * The filterable param `task`
     *
     * @var {String}
     */
    @tracked name;

    /**
     * The filterable param `status`
     *
     * @var {Array}
     */
    @tracked status;

    /**
     * All possible order status options
     *
     * @var {String}
     */
    @tracked statusOptions = ['active', 'disabled', 'decommissioned'];

    /**
     * If all rows is toggled
     *
     * @var {Boolean}
     */
    @tracked allToggled = false;

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('fleet-ops.common.name'),
            valuePath: 'name',
            width: '150px',
            cellComponent: 'table/cell/anchor',
            permission: 'fleet-ops view fleet',
            action: this.viewFleet.bind(this),
            resizable: true,
            sortable: true,
            filterable: true,
            filterParam: 'name',
            filterComponent: 'filter/string',
        },
        // {
        //     label: this.intl.t('fleet-ops.common.service-area'),
        //     cellComponent: 'table/cell/anchor',
        //     action: this.viewServiceArea.bind(this),
        //     permission: 'fleet-ops view service-area',
        //     valuePath: 'service_area.name',
        //     resizable: true,
        //     width: '130px',
        //     filterable: true,
        //     filterComponent: 'filter/model',
        //     filterComponentPlaceholder: 'Select service area',
        //     filterParam: 'service_area',
        //     model: 'service-area',
        // },
        {
            label: this.intl.t('fleet-ops.common.parent-fleet'),
            cellComponent: 'table/cell/anchor',
            permission: 'fleet-ops view fleet',
            // action: this.viewParentFleet.bind(this),
            valuePath: 'parent_fleet.name',
            resizable: true,
            width: '130px',
            filterable: false,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: this.intl.t('fleet-ops.common.select-fleet'),
            filterParam: 'parent_fleet_uuid',
            model: 'fleet',
        },
        // {
        //     label: this.intl.t('fleet-ops.common.vendor'),
        //     cellComponent: 'table/cell/anchor',
        //     permission: 'fleet-ops view vendor',
        //     // action: this.viewVendor.bind(this),
        //     valuePath: 'vendor.name',
        //     resizable: true,
        //     width: '130px',
        //     filterable: true,
        //     filterComponent: 'filter/model',
        //     filterComponentPlaceholder: 'Select vendor',
        //     filterParam: 'vendor',
        //     model: 'vendor',
        // },
        {
            label: this.intl.t('fleet-ops.common.zone'),
            cellComponent: 'table/cell/anchor',
            permission: 'fleet-ops view zone',
            action: this.viewZone.bind(this),
            valuePath: 'zone.name',
            resizable: true,
            width: '130px',
            filterable: false,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: 'Select zone',
            filterParam: 'zone',
            model: 'zone',
        },
        {
            label: this.intl.t('fleet-ops.common.id'),
            valuePath: 'public_id',
            width: '120px',
            cellComponent: 'click-to-copy',
            action: this.viewFleet,
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('fleet-ops.common.manpower'),
            valuePath: 'drivers_count',
            width: '100px',
            resizable: true,
            sortable: true,
            filterable: false,
        },
        {
            label: this.intl.t('fleet-ops.common.active-manpower'),
            valuePath: 'drivers_online_count',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: false,
        },
        {
            label: this.intl.t('fleet-ops.common.task'),
            valuePath: 'task',
            cellComponent: 'table/cell/base',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
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
            filterOptions: this.statusOptions,
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
            ddMenuLabel: this.intl.t('fleet-ops.management.fleets.index.fleet-action'),
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            actions: [
                {
                    label: this.intl.t('fleet-ops.management.fleets.index.view-fleet'),
                    fn: this.viewFleet,
                    permission: 'fleet-ops view fleet',
                },
                {
                    label: this.intl.t('fleet-ops.management.fleets.index.edit-fleet'),
                    fn: this.editFleet,
                    permission: 'fleet-ops update fleet',
                },
                {
                    label: this.intl.t('fleet-ops.management.fleets.index.assign-driver'),
                    permission: 'fleet-ops assign-driver-for fleet',
                    fn: () => {},
                },
                {
                    separator: true,
                },
                {
                    label: this.intl.t('fleet-ops.management.fleets.index.delete-fleet'),
                    fn: this.deleteFleet,
                    permission: 'fleet-ops delete fleet',
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
     * Bulk deletes selected `driver` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeleteFleets() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: this.intl.t('fleet-ops.management.fleets.index.delete-button'),
            onSuccess: async () => {
                await this.hostRouter.refresh();
                this.table.untoggleSelectAll();
            },
        });
    }

    /**
     * Reload layout view.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }

    /**
     * Toggles dialog to export `fleet`
     *
     * @void
     */
    @action exportFleets() {
        const selections = this.table.selectedRows.map((_) => _.id);
        this.crud.export('fleet', { params: { selections } });
    }

    /**
     * View a `fleet` details in modal
     *
     * @param {FleetModel} fleet
     * @param {Object} options
     * @void
     */
    @action viewFleet(fleet) {
        return this.transitionToRoute('management.fleets.index.details', fleet);
    }

    /**
     * Handles and prompts for spreadsheet imports of fleets.
     *
     * @void
     */
    @action importFleets() {
        this.crud.import('fleet', {
            onImportCompleted: () => {
                this.hostRouter.refresh();
            },
        });
    }

    /**
     * Create a new `fleet` in modal
     *
     * @param {Object} options
     * @void
     */
    @action createFleet() {
        return this.transitionToRoute('management.fleets.index.new');
    }

    /**
     * Edit a `fleet` details
     *
     * @param {FleetModel} fleet
     * @param {Object} options
     * @void
     */
    @action editFleet(fleet) {
        return this.transitionToRoute('management.fleets.index.edit', fleet);
    }

    /**
     * Delete a `fleet` via confirm prompt
     *
     * @param {FleetModel} fleet
     * @param {Object} options
     * @void
     */
    @action deleteFleet(fleet, options = {}) {
        this.crud.delete(fleet, {
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
            ...options,
        });
    }

    /**
     * View a service area.
     *
     * @param {FleetModel} fleet
     * @param {Object} options
     * @void
     */
    @action viewServiceArea(fleet, options = {}) {
        this.serviceAreas.viewServiceAreaInDialog(fleet.get('service_area'), options);
    }

    /**
     * View a zone.
     *
     * @param {FleetModel} fleet
     * @param {Object} options
     * @void
     */
    @action viewZone(fleet, options = {}) {
        this.serviceAreas.viewZoneInDialog(fleet.zone, options);
    }

    /**
     * Starts the tour for the fleets page
     *
     * @void
     */
    @action startFleetsTour() {
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
                    element: 'button.create-fleet-btn',
                    onHighlightStarted: (element) => {
                        element.style.setProperty('pointer-events', 'none', 'important');
                        element.disabled = true;
                    },
                    onDeselected: (element) => {
                        element.style.pointerEvents = 'auto';
                        element.disabled = false;
                    },
                    popover: {
                        title: this.intl.t('fleetbase.fleets.tour.new_button.title'),
                        description: this.intl.t('fleetbase.fleets.tour.new_button.description'),
                        onNextClick: () => {
                            this.createFleet();
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
                    element: '.next-content-overlay-panel:has(.fleet-form-panel)',
                    popover: {
                        title: this.intl.t('fleetbase.fleets.tour.form_panel.title'),
                        description: this.intl.t('fleetbase.fleets.tour.form_panel.description'),
                    },
                },
                {
                    element: '.fleet-form-panel .input-group.fleet-name-field',
                    popover: {
                        title: this.intl.t('fleetbase.fleets.tour.name_field.title'),
                        description: this.intl.t('fleetbase.fleets.tour.name_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.fleet-form-panel .input-group.parent-fleet-field',
                    popover: {
                        title: this.intl.t('fleetbase.fleets.tour.parent_fleet_field.title'),
                        description: this.intl.t('fleetbase.fleets.tour.parent_fleet_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.fleet-form-panel .input-group.status-field',
                    popover: {
                        title: this.intl.t('fleetbase.fleets.tour.status_field.title'),
                        description: this.intl.t('fleetbase.fleets.tour.status_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.fleet-form-panel .input-group.task-field',
                    popover: {
                        title: this.intl.t('fleetbase.fleets.tour.task_field.title'),
                        description: this.intl.t('fleetbase.fleets.tour.task_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.fleet-save-btn',
                    popover: {
                        title: this.intl.t('fleetbase.fleets.tour.submit.title'),
                        description: this.intl.t('fleetbase.fleets.tour.submit.description'),
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
