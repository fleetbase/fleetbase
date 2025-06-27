import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout, task } from 'ember-concurrency';
import showErrorOnce from '@fleetbase/console/utils/show-error-once';
export default class UsersIndexController extends Controller {
    @service store;
    @service intl;
    @service notifications;
    @service currentUser;
    @service modalsManager;
    @service hostRouter;
    @service crud;
    @service fetch;
    @service abilities;
    @service filters;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'limit', 'sort', 'query', 'type', 'created_by', 'updated_by', 'status', 'role', 'name'];

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
     * The search query param
     *
     * @var {Integer}
     */
    @tracked query;

    /**
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked sort = '-created_at';

    /**
     * All columns applicable for orders
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('iam.common.name'),
            valuePath: 'name',
            width: '160px',
            cellComponent: 'table/cell/user-name',
            permission: 'iam view user',
            mediaPath: 'avatar_url',
            action: this.editUser,
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('iam.common.email'),
            valuePath: 'email',
            cellComponent: 'click-to-copy',
            sortable: false,
            width: '12%',
        },
        {
            label: this.intl.t('iam.common.phone'),
            valuePath: 'phone',
            cellComponent: 'click-to-copy',
            sortable: false,
            width: '12%',
        },
        {
            label: this.intl.t('iam.common.role'),
            valuePath: 'role.name',
            sortable: false,
            width: '10%',
            filterable: true,
            filterComponent: 'filter/model',
            filterComponentPlaceholder: 'Select role',
            filterParam: 'role',
            model: 'role',
        },
        {
            label: this.intl.t('iam.common.status'),
            valuePath: 'session_status',
            sortable: false,
            width: '12%',
            cellComponent: 'table/cell/status',
            filterable: true,
            filterComponent: 'filter/select',
            filterParam: 'status',
            filterOptions: ['pending', 'active'],
        },
        {
            label: this.intl.t('iam.users.index.last-login'),
            valuePath: 'lastLogin',
            width: '130px',
            resizable: true,
            sortable: false,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('iam.users.index.created-at'),
            valuePath: 'createdAt',
            sortParam: 'created_at',
            width: '140px',
            resizable: true,
            sortable: false,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: this.intl.t('iam.users.index.updated-at'),
            valuePath: 'updatedAt',
            sortParam: 'updated_at',
            width: '130px',
            resizable: true,
            hidden: true,
            sortable: false,
            filterable: false,
            filterComponent: 'filter/date',
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: this.intl.t('iam.users.index.user-actions'),
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            actions: [
                {
                    label: this.intl.t('iam.users.index.edit-user'),
                    fn: this.editUser,
                    permission: 'iam view user',
                },
                {
                    label: this.intl.t('iam.users.index.view-user-permissions'),
                    fn: this.viewUserPermissions,
                    permission: 'iam view user',
                },
                {
                    label: this.intl.t('iam.users.index.re-send-invitation'),
                    fn: this.resendInvitation,
                    permission: 'iam update user',
                    isVisible: (user) => user.get('session_status') === 'pending',
                },
                {
                    label: this.intl.t('iam.users.index.deactivate-user'),
                    fn: this.deactivateUser,
                    className: 'text-danger',
                    permission: 'iam deactivate user',
                    isVisible: (user) => user.get('session_status') === 'active',
                },
                {
                    label: this.intl.t('iam.users.index.activate-user'),
                    fn: this.activateUser,
                    className: 'text-danger',
                    permission: 'iam activate user',
                    isVisible: (user) => user.get('session_status') === 'inactive' || (this.currentUser.user.is_admin && user.get('session_status') === 'pending'),
                },
                {
                    label: this.intl.t('iam.users.index.verify-user'),
                    fn: this.verifyUser,
                    className: 'text-danger',
                    permission: 'iam verify user',
                    isVisible: (user) => !user.get('email_verified_at'),
                },
                {
                    label: this.intl.t('iam.users.index.change-user-password'),
                    fn: this.changeUserPassword,
                    className: 'text-danger',
                    isVisible: (user) => this.abilities.can('iam change-password-for user') || user.role_name === 'Administrator' || user.is_admin === true,
                },
                {
                    label: this.intl.t('iam.users.index.delete-user'),
                    fn: this.deleteUser,
                    className: 'text-danger',
                    permission: 'iam delete user',
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
            this.query = null;
            return;
        }

        // timeout for typing
        yield timeout(250);

        // reset page for results
        if (this.page > 1) {
            this.page = 1;
        }

        // update the query param
        this.query = value;
    }

    /**
     * Bulk deletes selected `user` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeleteUsers() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: this.intl.t('iam.users.index.delete-users'),
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
        });
    }

    /**
     * Toggles dialog to export `user`
     *
     * @void
     */
    @action exportUsers() {
        const selections = this.table.selectedRows.map((_) => _.id);
        this.crud.export('users', { params: { selections } });
    }

    /**
     * View user permissions.
     *
     * @param {UserModel} user
     * @memberof UsersIndexController
     */
    @action viewUserPermissions(user) {
        this.modalsManager.show('modals/view-user-permissions', {
            title: this.intl.t('iam.components.modals.view-user-permissions.view-permissions', { userName: user.name }),
            hideDeclineButton: true,
            acceptButtonText: this.intl.t('common.done'),
            user,
        });
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action createUser() {
        const formPermission = 'iam create user';
        const user = this.store.createRecord('user', {
            status: 'pending',
            type: 'user',
        });

        this.editUser(user, {
            title: this.intl.t('iam.users.index.new-user'),
            acceptButtonText: this.intl.t('common.confirm'),
            acceptButtonIcon: 'check',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            keepOpen:true,
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                // Required field validation
                const requiredFields = ['name', 'email', 'phone', 'role'];
                const hasEmptyRequired = requiredFields.some(field => !user[field] || user[field].toString().trim() === '');
                if (hasEmptyRequired) {
                    showErrorOnce(this, this.notifications, this.intl.t('validation.form_invalid'));
                    modal.stopLoading();
                    return;
                }

                // Phone number validation
                const phone = user.phone?.trim();
                if (typeof phone === 'string' && /^\+\d{1,4}$/.test(phone)) {
                    user.phone = '';
                }
                try {
                    await user.save();
                    this.notifications.success(this.intl.t('iam.users.index.user-changes-saved-success'));
                    modal.done();
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action editUser(user, options = {}) {
        const formPermission = 'iam update user';
        this.modalsManager.show('modals/user-form', {
            title: this.intl.t('iam.users.index.edit-user-title'),
            modalClass: 'modal-lg',
            acceptButtonText: this.intl.t('common.save-changes'),
            acceptButtonIcon: 'save',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            user,
            keepOpen:true,
            uploadNewPhoto: (file) => {
                this.fetch.uploadFile.perform(
                    file,
                    {
                        path: `uploads/${user.company_uuid}/users/${user.slug}`,
                        key_uuid: user.id,
                        key_type: `user`,
                        type: `user_photo`,
                    },
                    (uploadedFile) => {
                        user.setProperties({
                            avatar_uuid: uploadedFile.id,
                            avatar_url: uploadedFile.url,
                            avatar: uploadedFile,
                        });
                    }
                );
            },
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }
                 // Required field validation
                const requiredFields = ['name', 'email', 'phone', 'role'];
                const hasEmptyRequired = requiredFields.some(field => !user[field] || user[field].toString().trim() === '');
                if (hasEmptyRequired) {
                     showErrorOnce(this, this.notifications, this.intl.t('validation.form_invalid'));
                     modal.stopLoading();
                     return;
                 }
                // Phone number validation
                const phone = user.phone?.trim();
                if (typeof phone === 'string' && /^\+\d{1,4}$/.test(phone)) {
                    user.phone = '';
                }

                try {
                    await user.save();
                    this.notifications.success(this.intl.t('iam.users.index.user-changes-saved-success'));
                    modal.done();
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
            ...options,
        });
    }


    /**
     * Toggles dialog to delete API key
     *
     * @void
     */
    @action deleteUser(user) {
        if (user.id === this.currentUser.id) {
            return this.notifications.error(this.intl.t('iam.users.index.error-you-cant-delete-yourself'));
        }

        this.modalsManager.confirm({
            title: this.intl.t('iam.users.index.delete-user-title', { userName: user.get('name') }),
            body: this.intl.t('iam.users.index.data-assosciated-user-delete'),
            confirm: async (modal) => {
                modal.startLoading();
                try {
                    await user.removeFromCurrentCompany();
                    this.notifications.success(this.intl.t('iam.users.index.delete-user-success-message', { userName: user.get('name') }));
                    this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Deactivates a user
     *
     * @void
     */
    @action deactivateUser(user) {
        this.modalsManager.confirm({
            title: this.intl.t('iam.users.index.deactivate-user-title', { userName: user.get('name') }),
            body: this.intl.t('iam.users.index.access-account-or-resources-unless-re-activated'),
            confirm: async (modal) => {
                modal.startLoading();
                try {
                    await user.deactivate();
                    this.notifications.success(this.intl.t('iam.users.index.deactivate-user-success-message', { userName: user.get('name') }));
                    this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Activate a user
     *
     * @void
     */
    @action activateUser(user) {
        this.modalsManager.confirm({
            title: this.intl.t('iam.users.index.re-activate-user-title', { userName: user.get('name') }),
            body: this.intl.t('iam.users.index.this-user-will-regain-access-to-your-organization'),
            confirm: async (modal) => {
                modal.startLoading();
                try {
                    await user.activate();
                    this.notifications.success(this.intl.t('iam.users.index.re-activate-user-success-message', { userName: user.get('name') }));
                    this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Verify a user
     *
     * @void
     */
    @action verifyUser(user) {
        this.modalsManager.confirm({
            title: this.intl.t('iam.users.index.verify-user-title', { userName: user.get('name') }),
            body: this.intl.t('iam.users.index.verify-user-manually-prompt'),
            confirm: async (modal) => {
                modal.startLoading();
                try {
                    await user.verify();
                    this.notifications.success(this.intl.t('iam.users.index.user-verified-success-message', { userName: user.get('name') }));
                    this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Change password for a user
     *
     * @void
     */
    @action changeUserPassword(user) {
        this.modalsManager.show('modals/change-user-password', {
            keepOpen: true,
            user,
        });
    }

    /**
     * Resends invite for a user to join.
     *
     * @void
     */
    @action resendInvitation(user) {
        this.modalsManager.confirm({
            title: this.intl.t('iam.users.index.resend-invitation-to-join-organization'),
            body: this.intl.t('iam.users.index.confirming-fleetbase-will-re-send-invitation-for-user-to-join-your-organization'),
            confirm: async (modal) => {
                modal.startLoading();
                try {
                    await user.resendInvite();
                    this.notifications.success(this.intl.t('iam.users.index.invitation-resent'));
                    this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Reload data.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }
}
