import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { later } from '@ember/runloop';

export default class ConsoleAdminOrganizationsDetailsUsersController extends Controller {
    @service intl;
    @service router;
    @service fetch;
    @service notifications;
    @service modalsManager;
    @service session;

    @tracked nestedPage = 1;
    @tracked nestedLimit = 20;
    @tracked nestedSort = '-created_at';
    @tracked nestedQuery = '';
    @tracked company;
    @tracked table;

    queryParams = ['nestedPage', 'nestedLimit', 'nestedSort', 'nestedQuery'];
    actionButtons = [];
    bulkActions = [];

    get sort() {
        return this.nestedSort;
    }

    set sort(value) {
        this.nestedSort = value;
    }

    columns = [
        {
            label: this.intl.t('common.name'),
            valuePath: 'name',
            sticky: true,
            resizable: true,
            sortable: true,
            filterable: true,
            filterParam: 'nestedQuery',
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('common.role'),
            valuePath: 'roleName',
            resizable: true,
            sortable: true,
        },
        {
            label: this.intl.t('common.phone'),
            valuePath: 'phone',
            resizable: true,
        },
        {
            label: this.intl.t('common.email'),
            valuePath: 'email',
            resizable: true,
            sortable: true,
            filterable: true,
            filterParam: 'nestedQuery',
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('common.status'),
            valuePath: 'status',
            cellComponent: 'table/cell/status',
            resizable: true,
            sortable: true,
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'User Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '9%',
            actions: [
                {
                    label: 'Impersonate',
                    icon: 'user-secret',
                    fn: this.impersonateUser,
                },
                {
                    label: 'Change Password',
                    icon: 'lock-open',
                    fn: this.changeUserPassword,
                },
                {
                    separator: true,
                },
                {
                    label: 'Verify',
                    icon: 'circle-check',
                    fn: this.verifyUser,
                },
                {
                    label: 'Activate',
                    icon: 'user-check',
                    fn: this.activateUser,
                },
                {
                    label: 'Deactivate',
                    icon: 'user-slash',
                    fn: this.deactivateUser,
                },
                {
                    label: 'Transfer Ownership',
                    icon: 'crown',
                    fn: this.transferOwnership,
                },
                {
                    label: 'Remove from Organization',
                    icon: 'user-xmark',
                    class: 'text-red-600',
                    fn: this.removeUser,
                },
            ],
            sortable: false,
            filterable: false,
            resizable: false,
            searchable: false,
            sticky: 'right',
        },
    ];

    @action async impersonateUser(user) {
        try {
            const { token } = await this.fetch.post('auth/impersonate', { user: user.id });
            await this.router.transitionTo('console');
            this.session.manuallyAuthenticate(token);
            this.notifications.info(`Now impersonating ${user.email}...`);
            later(
                this,
                () => {
                    window.location.reload();
                },
                600
            );
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action changeUserPassword(user) {
        this.modalsManager.show('modals/change-user-password', {
            keepOpen: true,
            user,
        });
    }

    @action async verifyUser(user) {
        return this.runUserLifecycleAction(user, 'verify', 'User verified.');
    }

    @action async activateUser(user) {
        return this.runUserLifecycleAction(user, 'activate', 'User activated.');
    }

    @action async deactivateUser(user) {
        return this.confirmUserLifecycleAction(user, 'Deactivate User', `Deactivate ${user.name || user.email} for this organization?`, 'deactivate', 'User deactivated.');
    }

    @action transferOwnership(user) {
        this.modalsManager.confirm({
            title: 'Transfer Ownership',
            body: `Transfer organization ownership to ${user.name || user.email}?`,
            acceptButtonText: 'Transfer Ownership',
            acceptButtonIcon: 'crown',
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    await this.fetch.post(`companies/${this.company.uuid}/transfer-ownership`, { newOwner: this.userIdentifier(user) });
                    this.notifications.success('Organization ownership transferred.');
                    return this.router.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                }
            },
        });
    }

    @action removeUser(user) {
        return this.confirmUserLifecycleAction(user, 'Remove User', `Remove ${user.name || user.email} from this organization?`, null, 'User removed.', async () => {
            await this.fetch.delete(`companies/${this.company.uuid}/users/${this.userIdentifier(user)}`);
        });
    }

    @action search(event) {
        this.nestedQuery = event.target.value ?? '';
        this.nestedPage = 1;
    }

    @action refresh() {
        return this.router.refresh();
    }

    async runUserLifecycleAction(user, action, successMessage) {
        try {
            await this.fetch.patch(`companies/${this.company.uuid}/users/${this.userIdentifier(user)}/${action}`);
            this.notifications.success(successMessage);
            return this.router.refresh();
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    confirmUserLifecycleAction(user, title, body, action, successMessage, callback = null) {
        this.modalsManager.confirm({
            title,
            body,
            acceptButtonText: title,
            confirm: async (modal) => {
                modal.startLoading();

                try {
                    if (typeof callback === 'function') {
                        await callback();
                        this.notifications.success(successMessage);
                        return this.router.refresh();
                    }

                    return this.runUserLifecycleAction(user, action, successMessage);
                } catch (error) {
                    this.notifications.serverError(error);
                }
            },
        });
    }

    userIdentifier(user) {
        return user?.uuid || user?.id;
    }
}
