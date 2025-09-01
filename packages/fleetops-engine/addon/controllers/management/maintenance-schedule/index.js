import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import { isBlank } from '@ember/utils';
import ENV from '@fleetbase/console/config/environment';

export default class ManagementMaintenanceScheduleIndexController extends BaseController {
    @service notifications;
    @service modalsManager;
    @service intl;
    @service crud;
    @service store;
    @service hostRouter;
    @service filters;


    queryParams = [
        'public_id',
        'page',
        'per_page',
        'sort',
        'query',
        'vehicle',
        'reason',
        'start_date',
        'end_date',
        'created_at',
    ];

    @tracked public_id;
    @tracked page = 1;
    @tracked per_page;
    @tracked sort = '-created_at';
    @tracked query;
    @tracked vehicle;
    @tracked reason;
    @tracked created_at;
    @tracked start_date;
    @tracked end_date;

    @tracked columns = [
        {
            label: this.intl.t('fleet-ops.common.id'),
            valuePath: 'public_id',
            cellComponent: 'table/cell/anchor',
            action: (record) => this.viewSchedule(record),
            permission: 'fleet-ops view order',
            width: '110px',
            resizable: true,
            sortable: true,
            filterable: true,
            hidden: false,
            filterComponent: 'filter/string',
            filterParam: 'public_id',
        },
        {
            label: this.intl.t('fleet-ops.common.vehicle'),
            valuePath: 'vehicle.plate_number',
            width: '100px',
            cellComponent: 'table/cell/anchor',
            permission: 'fleet-ops view vehicle',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: this.intl.t('fleet-ops.common.select-vehicle'),
            filterParam: 'vehicle',
            model: 'vehicle',
            modelNamePath: 'plate_number',
        },
        {
            label: this.intl.t('fleet-ops.component.maintenance-schedule-form-panel.notes'),
            valuePath: 'reason',
            width: '220px',
            resizable: true,
            sortable: true,
            filterable: false,
            filterComponent: 'filter/string',
            filterParam: 'reason',
        },
        {
            label: this.intl.t('fleet-ops.common.start-date'),
            valuePath: 'start_date',
            cellComponent: 'table/cell/date',
            width: '140px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
            filterParam: 'start_date',
        },
        {
            label: this.intl.t('leaves.end_date'),
            valuePath: 'end_date',
            cellComponent: 'table/cell/date',
            width: '140px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
            filterParam: 'end_date',
        },
        {
            label: this.intl.t('fleet-ops.common.created-at'),
            valuePath: 'created_at',
            cellComponent: 'table/cell/date',
            width: '140px',
            resizable: true,
            sortable: true,
            filterable: false,
            filterComponent: 'filter/date',
            filterParam: 'created_at',
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
                    label: this.intl.t('fleet-ops.component.maintenance-schedule-form-panel.view'),
                    fn: (record) => this.viewSchedule(record),
                    permission: 'fleet-ops view order',
                },
                {
                    label: this.intl.t('fleet-ops.common.edit'),
                    fn: (record) => this.editSchedule(record),
                    permission: 'fleet-ops update order',
                },
                {
                    label: this.intl.t('fleet-ops.common.delete'),
                    fn: (record) => this.deleteSchedule(record),
                    permission: 'fleet-ops delete order',
                },
            ],
            sortable: false,
            filterable: false,
            resizable: false,
            searchable: false,
        },
    ];
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
    @action onPageChange(page) {
        set(this, 'page', page);
        this.hostRouter.refresh();
    }

    /**
     * Handle limit changes
     */
    @action onLimitChange(limit) {
        set(this, 'per_page', limit);
        set(this, 'page', 1); // Reset to first page
        this.hostRouter.refresh();
    }

    /**
     * Handle sort changes
     */
    @action onSortChange(sort) {
        set(this, 'sort', sort);
        set(this, 'page', 1); // Reset to first page
        this.hostRouter.refresh();
    }

    /**
     * Handle filter changes
     */
    @action onFilterChange(filterName, value) {
        set(this, filterName, value);
        set(this, 'page', 1); // Reset to first page
        this.hostRouter.refresh();
    }

    /**
     * Navigate to create new maintenance schedule
     */
    @action createSchedule() {
        return this.transitionToRoute('management.maintenance-schedule.index.new');
    }

    /**
     * Clear all filters
     */
    @action clearFilters() {
        set(this, 'public_id', null);
        set(this, 'query', null);
        set(this, 'vehicle', null);
        set(this, 'reason', null);
        set(this, 'start_date', null);
        set(this, 'end_date', null);
        set(this, 'created_at', null);
        set(this, 'page', 1);
        this.hostRouter.refresh();
    }

    @action viewSchedule(record) {
        // Pass the full record to avoid an extra API call
        return this.transitionToRoute('management.maintenance-schedule.index.details', record);
    }
    
    @action editSchedule(record) {
        // Pass the full record to avoid an extra API call
        return this.transitionToRoute('management.maintenance-schedule.index.edit', record);
    }
    
    @action async deleteSchedule(record, options = {}) {
        // Align modal appearance/behavior with CRUD delete modal while keeping our DELETE flow
        const modelName = this.intl.t('fleet-ops.component.maintenance-schedule-form-panel.title');
        const translatedTitle = this.intl.t('common.model-delete-confirmation', { modelName });
        const translatedSuccessMessage = this.intl.t('common.model-delete-success', { modelName });

        const openConfirm = (confirmHandler) =>
            this.modalsManager?.confirm({
                title: translatedTitle,
                args: ['model'],
                model: record,
                confirm: (modal) => {
                    if (typeof options.onConfirm === 'function') {
                        options.onConfirm(record);
                    }
                    return confirmHandler(modal);
                },
                confirmButtonTheme: 'danger',
            });

        const execDelete = async (modal) => {
            try {
                modal?.startLoading?.();

                const authSession = JSON.parse(localStorage.getItem('ember_simple_auth-session'));
                const token = authSession?.authenticated?.token;
                if (!token) {
                    this.notifications.error(this.intl.t('fleet-ops.common.not-authenticated'));
                    modal?.done?.();
                    return;
                }

                const id = record?.id ?? (typeof record.get === 'function' ? record.get('id') : null);
                if (!id) {
                    this.notifications.error(this.intl.t('fleet-ops.component.modals.order-import.invalid'));
                    modal?.done?.();
                    return;
                }

                const response = await fetch(`${ENV.API.host}/api/v1/leave-requests/${id}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    let message = this.intl.t('fleet-ops.common.failed-delete');
                    let errorObj = new Error(message);
                    try {
                        const err = await response.json();
                        message = err?.message || message;
                        errorObj = new Error(message);
                        // attach raw for serverError to display more details if implemented
                        errorObj.raw = err;
                    } catch (_) {}
                    this.notifications.serverError(errorObj);
                    if (typeof options.onError === 'function') {
                        options.onError(errorObj, record);
                    }
                    modal?.done?.();
                    return;
                }

                this.notifications.success(translatedSuccessMessage);
                if (typeof options.onSuccess === 'function') {
                    options.onSuccess(record);
                }
                modal?.done?.();
                await this.hostRouter.refresh();
            } catch (e) {
                this.notifications.serverError(e);
                if (typeof options.onError === 'function') {
                    options.onError(e, record);
                }
                modal?.done?.();
            } finally {
                if (typeof options.callback === 'function') {
                    options.callback(record);
                }
            }
        };

        // Open the modal. If modalsManager is unavailable, fall back to immediate delete
        if (this.modalsManager?.confirm) {
            return openConfirm(execDelete);
        }

        // Fallback behavior (no modal manager): proceed with delete directly
        return execDelete();
    }
 

    /**
     * The function `rejectLeave` asynchronously updates the status of a leave request to 'reject'.
     * @param leave - Leave object that contains information about the leave request, such as leave
     * type, start date, end date, and employee details.
     * @param [options] - The `options` parameter in the `rejectLeave` function is an optional object
     * that can be passed to provide additional configuration or settings for the rejection of the
     * leave request. It allows for customization of the rejection process by specifying various
     * options as key-value pairs within the object. These options could include things like
     */
    @action async rejectLeave(leave, options = {}) {
        await this._updateLeaveStatus(leave, 'reject');
    }

    @action async viewLeaves(leave, options = {}) {
        return this.transitionToRoute('management.leaves.index.details', leave);
    }

    @action createLeave() {
        return this.transitionToRoute('management.leaves.index.new');
    }

    @action editLeave(leave) {
        return this.transitionToRoute('management.leaves.index.edit', leave);
    }

    @action bulkDeleteLeaves() {
        const selected = this.table.selectedRows;
        this.crud.bulkDelete(selected, {
            modelNamePath: 'id',
            acceptButtonText: 'Delete selected leaves',
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
     * Toggles dialog to export a issue
     *
     * @void
     */
    // @action exportLeaves() {
    //     const selections = this.table.selectedRows.map((_) => _.id);
    //     this.crud.export('leaves', { params: { selections } });
    // }

    /**
     * Starts the guided tour for the leaves management page.
     *
     * This tour will highlight:
     * 1. The three dots dropdown button in the first row.
     * 2. The "View Leave" button in the actions menu.
     * 3. The sidebar with leave details including the approve/reject buttons.
     *
     * @void
     */
    @action startLeavesTour() {
        // UTILITY: Ensures dropdown menu is open before calling callback (for Next/Prev)
        const ensureMenuOpen = (callback) => {
            const menuSelector = '.next-dd-menu-table-dd';
            const menuBtnSelector = 'table tbody tr:first-child td:last-child .ember-basic-dropdown button';

            // If already open, proceed
            if (document.querySelector(menuSelector)) {
                callback();
                return;
            }
            // Try to open the menu
            const menuBtn = document.querySelector(menuBtnSelector);
            if (menuBtn) {
                menuBtn.click();
            }
            // Poll until menu is visible
            const waitForMenu = () => {
                if (document.querySelector(menuSelector)) {
                    callback();
                } else {
                    setTimeout(waitForMenu, 100);
                }
            };
            waitForMenu();
        };

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
                    element: 'table tbody tr:first-child td:last-child .ember-basic-dropdown button',
                    popover: {
                        title: this.intl.t('fleetbase.leaves.tour.dropdown.title'),
                        description: this.intl.t('fleetbase.leaves.tour.dropdown.description'),
                        onNextClick: () => {
                            const menuBtn = document.querySelector('table tbody tr:first-child td:last-child .ember-basic-dropdown button');
                            if (menuBtn) {
                                menuBtn.click();
                                const waitForMenu = () => {
                                    const menu = document.querySelector('.next-dd-menu-table-dd');
                                    if (menu) {
                                        driverObj.moveNext();
                                    } else {
                                        setTimeout(waitForMenu, 100);
                                    }
                                };
                                waitForMenu();
                            }
                        },
                    },
                },
                {
                    element: '.next-dd-menu-table-dd',
                    popover: {
                        title: this.intl.t('fleetbase.leaves.tour.actions_menu.title'),
                        description: this.intl.t('fleetbase.leaves.tour.actions_menu.description'),
                        // Keep menu open before going next/prev
                        onNextClick: () => ensureMenuOpen(() => driverObj.moveNext()),
                        onPrevClick: () => ensureMenuOpen(() => driverObj.movePrevious()),
                    },
                },
                {
                    element: '.next-dd-menu div[role="group"]:nth-child(3) > a',
                    popover: {
                        title: this.intl.t('fleetbase.leaves.tour.view_button.title'),
                        description: this.intl.t('fleetbase.leaves.tour.view_button.description'),
                        onNextClick: () => ensureMenuOpen(() => driverObj.moveNext()),
                        onPrevClick: () => ensureMenuOpen(() => driverObj.movePrevious()),
                    },
                },
                {
                    element: '.next-dd-menu div[role="group"]:nth-child(4) > a',
                    popover: {
                        title: this.intl.t('fleetbase.leaves.tour.approve_button.title'),
                        description: this.intl.t('fleetbase.leaves.tour.approve_button.description'),
                        onNextClick: () => ensureMenuOpen(() => driverObj.moveNext()),
                        onPrevClick: () => ensureMenuOpen(() => driverObj.movePrevious()),
                    },
                },
                {
                    element: '.next-dd-menu div[role="group"]:nth-child(5) > a',
                    popover: {
                        title: this.intl.t('fleetbase.leaves.tour.reject_button.title'),
                        description: this.intl.t('fleetbase.leaves.tour.reject_button.description'),
                        onNextClick: () => {
                            ensureMenuOpen(() => {
                               const viewBtn = document.querySelector('.next-dd-menu div[role="group"]:nth-child(3) > a');
                            if (viewBtn) {
                                viewBtn.click();
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
                            }
                            });
                        },
                        onPrevClick: () => ensureMenuOpen(() => driverObj.movePrevious()),
                    }
                },
                {
                    element: '.leaves-panel-details .grid',
                    popover: {
                        title: this.intl.t('fleetbase.leaves.tour.details.title'),
                        description: this.intl.t('fleetbase.leaves.tour.details.description'),
                        onPrevClick: () => {
                            // Attempt to close the sidebar by clicking the cancel/close button before moving to previous step
                            const closeBtn = document.querySelector('.next-content-overlay-panel:has(.leaves-panel-details) .next-view-header-right button');
                            if (closeBtn) {
                                closeBtn.click();
                                ensureMenuOpen(() => driverObj.moveTo(4)); // Go back to Reject button
                            }
                        },
                    },
                },
                {
                    element: '.leaves-panel-details .flex:has(.btn-wrapper)',
                    popover: {
                        title: this.intl.t('fleetbase.leaves.tour.sidebar_approve.title'),
                        description: this.intl.t('fleetbase.leaves.tour.sidebar_approve.description'),
                    },
                }
            ],
        });
        driverObj.drive();
    }
}
