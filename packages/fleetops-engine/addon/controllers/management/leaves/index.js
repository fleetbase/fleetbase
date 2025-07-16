import BaseController from '@fleetbase/fleetops-engine/controllers/base-controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { timeout } from 'ember-concurrency';
import { task } from 'ember-concurrency-decorators';
import ENV from '@fleetbase/console/config/environment';

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
            valuePath: 'id',
            cellComponent: 'table/cell/anchor',
            action: this.viewLeave,
            permission: 'fleet-ops view leaves',
            width: '110px',
            resizable: true,
            sortable: true,
        },
        {
            label: 'Driver Name',
            valuePath: 'driver.name',
            cellComponent: 'table/cell/anchor',
            permission: 'fleet-ops view driver',
            onClick: async (leave) => {
                let driver = await leave.driver;
                if (driver) {
                    this.contextPanel.focus(driver);
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
            label: 'Start Date',
            valuePath: 'start_date',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        {
            label: 'End Date',
            valuePath: 'end_date',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        {
            label: 'Total Days',
            valuePath: 'total_days',
            width: '80px',
            resizable: true,
            sortable: true,
        },
        {
            label: 'Leave Type',
            valuePath: 'leave_type',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/select',
            filterOptions: ['sick', 'casual', 'annual', 'unpaid', 'other'], // adjust as needed
        },
        {
            label: 'Reason',
            valuePath: 'reason',
            width: '150px',
            resizable: true,
            sortable: false,
        },
        {
            label: 'Status',
            valuePath: 'status',
            cellComponent: 'table/cell/status',
            width: '100px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/select',
            filterOptions: ['pending', 'approved', 'rejected', 'cancelled'], // adjust as needed
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
            label: 'Created At',
            valuePath: 'created_at',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/date',
        },
        {
            label: 'Leave Balance',
            valuePath: 'driver.leave_balance',
            width: '100px',
            resizable: true,
            sortable: false,
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'Leave Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            actions: [
                {
                    label: 'Approve',
                    fn: this.approveLeave,
                    permission: 'fleet-ops view leaves',
                },
                {
                    label: 'Reject',
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

    @task({ restartable: true }) *search({ target: { value } }) {
        if (!value) {
            set(this, 'query', null);
            this.hostRouter.refresh();
            return;
        }
        yield timeout(200);
        if (this.page > 1) {
            set(this, 'page', 1);
        }
        set(this, 'query', value);
        this.hostRouter.refresh();
    }

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
                this.notifications.error(error.message || `Failed to ${action} leave.`);
                return false;
            }

            this.notifications.success(`Leave ${action}d!`);
            this.hostRouter.refresh();
            return true;
        } catch (error) {
            this.notifications.error(`Failed to ${action} leave.`);
            console.error(error);
            return false;
        }
    }

    @action async approveLeave(leave, options = {}) {
        await this._updateLeaveStatus(leave, 'approve');
    }

    @action async rejectLeave(leave, options = {}) {
        await this._updateLeaveStatus(leave, 'reject');
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
}