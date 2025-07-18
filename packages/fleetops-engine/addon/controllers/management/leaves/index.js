import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import ENV from '@fleetbase/console/config/environment';
import { getOwner } from '@ember/application';

export default class ManagementLeavesIndexController extends BaseController {
    @service notifications;
    @service modalsManager;
    @service intl;
    @service crud;
    @service store;
    @service hostRouter;
    @service filters;


    queryParams = [
        'page',
        'limit',
        'sort',
        'query',
        'driver',
        'status',
        'leave_type',
        'processed_by',
        'created_at',
        'start_date',
        'end_date',
    ];

    @tracked page = 1;
    @tracked limit;
    @tracked sort = '-created_at';
    @tracked query;
    @tracked driver;
    @tracked status;
    @tracked leave_type;
    @tracked processed_by;
    @tracked created_at;
    @tracked start_date;
    @tracked end_date;

    @tracked columns = [
        {
            label: this.intl.t('fleet-ops.common.id'),
            valuePath: 'public_id',
            cellComponent: 'table/cell/anchor',
            action: this.viewLeave,
            permission: 'fleet-ops view leaves',
            width: '110px',
            resizable: true,
            sortable: true,
        },
        {
            label: this.intl.t('leaves.driver_name'),
            valuePath: 'user.name',
            cellComponent: 'table/cell/anchor',
            permission: 'fleet-ops view user',
            onClick: async (leave) => {
                let user = await leave.user;
                if (user) {
                    this.contextPanel.focus(user);
                }
            },
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: 'Select driver',
            filterParam: 'driver',
            model: 'driver',
        },
        {
            label: this.intl.t('leaves.start_date'),
            valuePath: 'start_date',
            cellComponent: 'table/cell/date',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('leaves.end_date'),
            valuePath: 'end_date',
            cellComponent: 'table/cell/date',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('leaves.total_days'),
            valuePath: 'total_days',
            width: '80px',
            resizable: true,
            sortable: true,
        },
        {
            label: this.intl.t('leaves.leave_type'),
            valuePath: 'leave_type',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/select',
            filterOptions: [this.intl.t('leaves.sick'), this.intl.t('leaves.vacation'), this.intl.t('leaves.other')], // adjust as needed
        },
        {
            label: this.intl.t('leaves.reason'),
            valuePath: 'reason',
            width: '150px',
            resizable: true,
            sortable: false,
        },
        {
            label: this.intl.t('leaves.status'),
            valuePath: 'status',
            width: '100px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/select',
            filterOptions: [this.intl.t('leaves.submitted'), this.intl.t('leaves.approve'), this.intl.t('leaves.reject')], // adjust as needed
        },
        {
            label: 'Processed By',
            valuePath: 'processed_by_user.name',
            cellComponent: 'table/cell/anchor',
            permission: 'iam view user',
            onClick: async (leave) => {
                let user = await leave.processed_by_user;
                if (user) {
                    this.contextPanel.focus(user);
                }
            },
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: 'Select user',
            filterParam: 'processed_by',
            model: 'user',
        },
        {
            label: this.intl.t('leaves.created_at'),
            valuePath: 'created_at',
            cellComponent: 'table/cell/date',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        // {
        //     label: 'Leave Balance',
        //     valuePath: 'driver.leave_balance',
        //     width: '100px',
        //     resizable: true,
        //     sortable: false,
        // },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: this.intl.t('leaves.leave_actions'),
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            actions: [
                {
                    label: this.intl.t('leaves.view'),
                    fn: this.viewLeaves,
                    permission: 'fleet-ops view leaves',
                },
                {
                    label: this.intl.t('leaves.approve'),
                    fn: this.approveLeave,
                    permission: 'fleet-ops approve leaves',
                },
                {
                    label: this.intl.t('leaves.reject'),
                    fn: this.rejectLeave,
                    permission: 'fleet-ops delete leaves',
                },
            ],
            sortable: false,
            filterable: false,
            resizable: false,
            searchable: false,
        },
    ];

    // @task({ restartable: true }) *search({ target: { value } }) {
    //     if (!value) {
    //         set(this, 'query', null);
    //         this.hostRouter.refresh();
    //         return;
    //     }
    //     yield timeout(200);
    //     if (this.page > 1) {
    //         set(this, 'page', 1);
    //     }
    //     set(this, 'query', value);
    //     this.hostRouter.refresh();
    // }


    /**
     * The function `_updateLeaveStatus` asynchronously updates the status of a leave request by
     * sending a PUT request to the API with the specified action and handles success and error
     * responses accordingly.
     * @param leave - The `_updateLeaveStatus` function you provided is responsible for updating the
     * status of a leave request by sending a PUT request to the API endpoint. It also handles success
     * and error scenarios, displaying notifications accordingly.
     * @param action - The `action` parameter in the `_updateLeaveStatus` function represents the
     * action that will be performed on a leave request. This action could be approving, rejecting,
     * cancelling, or any other action that can be taken on a leave request. The function sends a PUT
     * request to update the status of the
     * @returns The `_updateLeaveStatus` function returns a boolean value (`true`, `false`, or `null`)
     * based on the outcome of the leave status update operation.
     */
    async _updateLeaveStatus(leave, action) {
        try {
            const authSession = JSON.parse(localStorage.getItem('ember_simple_auth-session'));
            const token = authSession?.authenticated?.token;
            if (!token) {
                return null;
            }

            const response = await fetch(`${ENV.API.host}/api/v1/leave-requests/${leave.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ action })
            });

            if (!response.ok) {
                const error = await response.json();
                this.notifications.error(error.message || `${this.intl.t('leaves.failed_to')} ${action} ${this.intl.t('leaves.leave')}.`);
                return false;
            }
            const actionText = action === 'approve'
            ? this.intl.t('leaves.approved')
            : action === 'reject'
                ? this.intl.t('leaves.rejected')
                : action;

            this.notifications.success(`${this.intl.t('leaves.leave_uppercase')} ${actionText}!`);
            // Get the route instance and clear its cache
            const owner = getOwner(this);
            const route = owner.lookup('route:management.leaves.index');
            if (route && route._cache) {
                route._cache.unavailability = null;
            }
            // Now refresh the model (SPA-style)
            this.hostRouter.refresh();
            return true;
        } catch (error) {
            this.notifications.error(`${this.intl.t('leaves.failed_to')} ${action === 'approve' ? this.intl.t('leaves.approved') : this.intl.t('leaves.rejected')} ${this.intl.t('leaves.leave')}.`);
            console.error(error);
            return false;
        }
    }

    /**
     * The `approveLeave` function asynchronously updates the status of a leave request to 'approve'.
     * @param leave - The `leave` parameter likely refers to an object or data structure that
     * represents a leave request or leave application. It may contain information such as the
     * employee's name, leave dates, reason for leave, and any other relevant details related to the
     * leave request.
     * @param [options] - The `options` parameter in the `approveLeave` function is an optional object
     * that allows you to provide additional configuration or settings for the approval process. It can
     * be used to pass in any extra information or flags that may be needed for the approval logic.
     * This parameter is not required for the function to
     */
    @action async approveLeave(leave, options = {}) {
        await this._updateLeaveStatus(leave, 'approve');
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
    // @action exportLeaves() {
    //     const selections = this.table.selectedRows.map((_) => _.id);
    //     this.crud.export('leaves', { params: { selections } });
    // }
}
