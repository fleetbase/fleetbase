import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { isBlank } from '@ember/utils';
import { next } from '@ember/runloop';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { later } from '@ember/runloop';
import getIssueTypes from '../../../utils/get-issue-types';
import getIssueCategories from '../../../utils/get-issue-categories';

export default class ManagementMaintenanceScheduleIndexController extends BaseController {
    @service notifications;
    @service modalsManager;
    @service intl;
    @service crud;
    @service store;
    @service hostRouter;
    @service filters;
    @service currentUser;

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
        'public_id',
        'issue_id',
        'driver',
        'vehicle',
        'assignee',
        'reporter',
        'created_by',
        'updated_by',
        'status',
        'priority',
        'category',
        'type',
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
     * The filterable param `status`
     *
     * @var {String}
     */
    @tracked status;

    /**
     * The filterable param `priority`
     *
     * @var {Array|String}
     */
    @tracked priority;

    /**
     * The filterable param `type`
     *
     * @var {String}
     */
    @tracked type;

    /**
     * The filterable param `category`
     *
     * @var {String}
     */
    @tracked category;

    /**
     * The filterable param `vehicle`
     *
     * @var {String}
     */
    @tracked vehicle;

    /**
     * The filterable param `driver`
     *
     * @var {String}
     */
    @tracked driver;

    /**
     * The filterable param `assignee`
     *
     * @var {String}
     */
    @tracked assignee;

    /**
     * The filterable param `reporter`
     *
     * @var {String}
     */
    @tracked reporter;

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('fleet-ops.common.id'),
            valuePath: 'public_id',
            width: '140px',
            cellComponent: 'table/cell/link-to',
            route: 'management.maintenance-schedule.index.details',
            onLinkClick: this.viewIssue,
            permission: 'fleet-ops view order',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
            filterParam: 'public_id',
        },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.vehicle-assigned'),
            cellComponent: 'cell/vehicle-name',
            valuePath: 'vehicle_assigned.display_name',
            modelPath: 'vehicle_assigned',
            showOnlineIndicator: true,
            width: '170px',
            resizable: true,
            sortable: true,
            filterable: false,
        },
        {
            label: this.intl.t('fleet-ops.common.schedule'),
            valuePath: 'scheduledAt',
            sortParam: 'scheduled_at',
            width: '150px',
            cellComponent: 'table/cell/date',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
            filterLabel: this.intl.t('fleet-ops.operations.orders.index.scheduled-at'),
            filterParam: 'on',
        },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.estimated-end-date'),
            valuePath: 'estimatedEndDate',
            sortParam: 'estimated_end_date',
            width: '150px',
            cellComponent: 'table/cell/date',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
            filterParam: 'estimated_end_date',
        },
        {
            label: this.intl.t('fleet-ops.component.maintenance-schedule-form-panel.notes'),
            valuePath: 'notes',
            cellComponent: 'table/cell/base',
            resizable: true,
            sortable: false,
            filterable: true,
            filterComponent: 'filter/string',
            filterParam: 'notes',
        },
        {
            label: this.intl.t('fleet-ops.operations.orders.index.created-by'),
            valuePath: 'created_by_name',
            width: '140px',
            cellComponent: 'table/cell/base',
            resizable: true,
            sortable: true,
            filterable: false,
        },
        {
            label: this.intl.t('fleet-ops.common.created-at'),
            valuePath: 'createdAt',
            sortParam: 'created_at',
            width: '140px',
            cellComponent: 'table/cell/date',
            resizable: true,
            sortable: true,
            filterable: true,
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
            width: '12%',
            actions: [
                {
                    label: this.intl.t('fleet-ops.component.maintenance-schedule-form-panel.view'),
                    icon: 'eye',
                    fn: this.viewIssue,
                    permission: 'fleet-ops view order',
                },
                {
                    label: this.intl.t('fleet-ops.common.edit'),
                    icon: 'pen',
                    fn: this.editIssue,
                    permission: 'fleet-ops update order',
                },
                { separator: true },
                {
                    label: this.intl.t('fleet-ops.common.delete'),
                    icon: 'trash',
                    fn: this.deleteIssue,
                    permission: 'fleet-ops delete order',
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
     * Toggles dialog to export a issue
     *
     * @void
     */
    @action exportIssues() {
        const selections = this.table.selectedRows.map((_) => _.id);
        this.crud.export('issue', { params: { selections } });
    }

    /**
     * Handles and prompts for spreadsheet imports of issues.
     *
     * @void
     */
    @action importIssues() {
        this.crud.import('issue', {
            onImportCompleted: () => {
                this.hostRouter.refresh();
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
     * Handle page change from the table pagination and refresh the route.
     * Ensures the model reloads when navigating pages.
     */
    @action onPageChange(page) {
        set(this, 'page', page);
        // Schedule transition outside current render to avoid rerender-in-render errors
        next(this, () => {
            this.transitionToRoute('management.maintenance-schedule.index', { queryParams: { page } });
        });
    }

    /**
     * View the selected maintenance order
     *
     * @param {OrderModel} order
     * @param {Object} options
     * @void
     */
    @action viewIssue(order) {
        const public_id = typeof order?.public_id === 'string' ? order.public_id : order?.get?.('public_id');
        next(this, () => {
            this.transitionToRoute('management.maintenance-schedule.index.details', public_id);
        });
    }

    /**
     * Create a new maintenance schedule order
     *
     * @void
     */
    @action createIssue() {
        return this.transitionToRoute('management.maintenance-schedule.index.new');
    }

    /**
     * Edit a maintenance schedule order
     *
     * @param {OrderModel} order
     * @void
     */
    @action editIssue(order) {
        return this.transitionToRoute('management.maintenance-schedule.index.edit', order);
    }

    /**
     * Delete a `issue` via confirm prompt
     *
     * @param {IssueModel} issue
     * @param {Object} options
     * @void
     */
    @action deleteIssue(issue, options = {}) {
        this.crud.delete(issue, {
            acceptButtonIcon: 'trash',
            onConfirm: () => {
                this.hostRouter.refresh();
            },
            ...options,
        });
    }

    /**
     * Bulk deletes selected `issues` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeleteIssues() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: 'id',
            acceptButtonText: this.intl.t('fleet-ops.management.issues.index.delete-button'),
            onSuccess: async () => {
                await this.hostRouter.refresh();
                this.table.untoggleSelectAll();
            },
        });
    }

    /**
     * Starts the guided tour for the issues management page
     *
     * @void
     */
    @action startIssuesTour() {
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
                    element: '.new-issue-btn',
                    popover: {
                        title: this.intl.t('fleetbase.issues.tour.new_button.title'),
                        description: this.intl.t('fleetbase.issues.tour.new_button.description'),
                        onNextClick: () => {
                            this.createIssue();
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
                    onHighlightStarted: (element) => {
                        element.style.setProperty('pointer-events', 'none', 'important');
                        element.disabled = true;
                    },
                    onDeselected: (element) => {
                        element.style.pointerEvents = 'auto';
                        element.disabled = false;
                    },
                },
                {
                    element: '.next-content-overlay-panel:has(.issue-form-panel)',
                    popover: {
                        title: this.intl.t('fleetbase.issues.tour.form_panel.title'),
                        description: this.intl.t('fleetbase.issues.tour.form_panel.description'),
                        onPrevClick: () => {
                            // Attempt to close the sidebar by clicking the cancel button before moving to the previous step
                            const cancelButton = document.querySelector('.issue-form-cancel-button');
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
                    // onHighlightStarted: (element) => {
                    //     element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // },
                },
                {
                    element: '.issue-form-panel .input-group:has(.reporter)',
                    popover: {
                        title: this.intl.t('fleetbase.issues.tour.reporter_field.title'),
                        description: this.intl.t('fleetbase.issues.tour.reporter_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.issue-form-panel .input-group:has(.assignee)',
                    popover: {
                        title: this.intl.t('fleetbase.issues.tour.assigned_to_field.title'),
                        description: this.intl.t('fleetbase.issues.tour.assigned_to_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.issue-form-panel .input-group:has(.driver)',
                    popover: {
                        title: this.intl.t('fleetbase.issues.tour.driver_field.title'),
                        description: this.intl.t('fleetbase.issues.tour.driver_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.issue-form-panel .input-group:has(.vehicle)',
                    popover: {
                        title: this.intl.t('fleetbase.issues.tour.vehicle_field.title'),
                        description: this.intl.t('fleetbase.issues.tour.vehicle_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.issue-form-panel .input-group:has(.issue-type)',
                    popover: {
                        title: this.intl.t('fleetbase.issues.tour.type_field.title'),
                        description: this.intl.t('fleetbase.issues.tour.type_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.issue-form-panel .input-group:has(.issue-category)',
                    popover: {
                        title: this.intl.t('fleetbase.issues.tour.category_field.title'),
                        description: this.intl.t('fleetbase.issues.tour.category_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.issue-form-panel .input-group:has(.report)',
                    popover: {
                        title: this.intl.t('fleetbase.issues.tour.report_field.title'),
                        description: this.intl.t('fleetbase.issues.tour.report_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.issue-form-panel .input-group:has(.emberTagInput)',
                    popover: {
                        title: this.intl.t('fleetbase.issues.tour.tags_field.title'),
                        description: this.intl.t('fleetbase.issues.tour.tags_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.issue-form-panel .input-group:has(.priority)',
                    popover: {
                        title: this.intl.t('fleetbase.issues.tour.priority_field.title'),
                        description: this.intl.t('fleetbase.issues.tour.priority_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.issue-form-panel .input-group:has(.status)',
                    popover: {
                        title: this.intl.t('fleetbase.issues.tour.status_field.title'),
                        description: this.intl.t('fleetbase.issues.tour.status_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.issue-form-panel .input-group.coordinates',
                    popover: {
                        title: this.intl.t('fleetbase.issues.tour.coordinates_field.title'),
                        description: this.intl.t('fleetbase.issues.tour.coordinates_field.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
                {
                    element: '.create-issue-btn',
                    popover: {
                        title: this.intl.t('fleetbase.issues.tour.submit.title'),
                        description: this.intl.t('fleetbase.issues.tour.submit.description'),
                    },
                    onHighlightStarted: (element) => {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    },
                },
            ],
        });

        // Start the tour
        driverObj.drive();
    }
}
