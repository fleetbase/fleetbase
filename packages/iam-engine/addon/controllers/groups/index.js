import Controller, { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout, task } from 'ember-concurrency';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

export default class GroupsIndexController extends Controller {
    @controller('users.index') usersIndexController;
    @service store;
    @service intl;
    @service notifications;
    @service currentUser;
    @service modalsManager;
    @service hostRouter;
    @service crud;
    @service fetch;
    @service abilities;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'limit', 'sort', 'query', 'type', 'created_by', 'updated_by', 'status'];

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
     * All columns applicable for groups
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('iam.common.name'),
            valuePath: 'name',
            cellComponent: 'table/cell/anchor',
            permission: 'iam view group',
            onClick: this.editGroup,
            width: '20%',
            sortable: false,
        },
        {
            label: this.intl.t('iam.common.description'),
            valuePath: 'description',
            sortable: false,
            width: '25%',
        },
        {
            label: this.intl.t('iam.common.member'),
            valuePath: 'users',
            cellComponent: 'table/cell/group-members',
            onClick: (user) => {
                this.usersIndexController.editUser(user);
            },
            sortable: false,
            width: '35%',
        },
        {
            label: this.intl.t('iam.groups.index.created'),
            valuePath: 'createdAt',
            sortable: false,
            width: '10%',
            tooltip: true,
            cellClassNames: 'overflow-visible',
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: this.intl.t('iam.groups.index.group-actions'),
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '10%',
            actions: [
                {
                    label: this.intl.t('iam.groups.index.edit-group'),
                    fn: this.editGroup,
                    permission: 'iam view group',
                },
                {
                    label: this.intl.t('iam.groups.index.delete-group-label'),
                    fn: this.deleteGroup,
                    className: 'text-red-700 hover:text-red-800',
                    permission: 'iam delete group',
                },
            ],
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
    @action bulkDeleteGroups() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: this.intl.t('aim.groups.index.delete-group'),
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
        });
    }

    /**
     * Toggles dialog to export `group`
     *
     * @void
     */
    @action exportGroups() {
        this.crud.export('group');
    }

    /**
     * Toggles modal to create a new group
     *
     * @void
     */
    @action createGroup() {
        const formPermission = 'iam create group';
        const group = this.store.createRecord('group', { users: [] });

        this.editGroup(group, {
            title: this.intl.t('iam.groups.index.new-group'),
            acceptButtonText: this.intl.t('common.confirm'),
            acceptButtonIcon: 'check',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            group,
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }
                try {
                    await group.save();
                    this.notifications.success(this.intl.t('iam.groups.index.new-group-created'));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Toggles modal to edit a group
     *
     * @void
     */
    @action editGroup(group, options = {}) {
        const formPermission = 'iam update group';
        this.modalsManager.show('modals/group-form', {
            title: this.intl.t('iam.groups.index.edit-group-title'),
            acceptButtonText: this.intl.t('common.save-changes'),
            acceptButtonIcon: 'save',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            group,
            lastSelectedUser: null,
            removeUser: (user) => {
                group.users.removeObject(user);
            },
            addUser: (user) => {
                group.users.pushObject(user);
                this.modalsManager.setOption('lastSelectedUser', null);
            },
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await group.save();
                    this.notifications.success(this.intl.t('iam.groups.index.changes-group-save'));
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
     * Toggles dialog to delete a group
     *
     * @void
     */
    @action deleteGroup(group) {
        const groupName = getWithDefault(group, 'name', this.intl.t('iam.groups.index.untitled'));

        this.modalsManager.confirm({
            title: this.intl.t('iam.groups.index.delete-group-title', { groupName }),
            body: this.intl.t('iam.groups.index.data-assosciated-this-group-deleted'),
            confirm: async (modal) => {
                modal.startLoading();
                try {
                    await group.destroyRecord();
                    this.notifications.success(this.intl.t('iam.groups.index.delete-group-success-message', { name: group.name }));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }
}
