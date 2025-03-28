import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import { timeout, task } from 'ember-concurrency';

export default class PoliciesIndexController extends Controller {
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
    @service iam;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'limit', 'sort', 'query', 'type', 'created_by', 'updated_by', 'status', 'service', 'type'];

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
    @tracked sort = 'name';

    /**
     * All services for policies.
     *
     * @memberof PoliciesIndexController
     */
    @tracked services = [];

    /**
     * All types of policies.
     *
     * @memberof PoliciesIndexController
     */
    @tracked types = this.iam.schemeTypes.map(type => ({
        id: type.id,
        label: type.name // Ensure 'name' is mapped to 'label'
    }));

    /**
     * All columns applicable for roles
     *
     * @var {Array}
     */
    @tracked columns = [
        {
            label: this.intl.t('iam.common.name'),
            valuePath: 'name',
            cellComponent: 'table/cell/anchor',
            permission: 'iam view policy',
            onClick: this.editPolicy,
            width: '20%',
            sortable: false,
        },
        {
            label: this.intl.t('iam.common.description'),
            valuePath: 'description',
            sortable: false,
            width: '35%',
        },
        {
            label: this.intl.t('iam.common.service'),
            valuePath: 'service',
            sortable: false,
            width: '10%',
            filterable: true,
            filterComponent: 'filter/select',
            filterOptions: this.services,
        },
        {
            label: this.intl.t('iam.common.type'),
            valuePath: 'type',
            sortable: false,
            width: '10%',
            filterable: true,
            filterComponent: 'filter/select',
            filterOptionLabel: 'name',
            filterOptionValue: 'id',
            filterOptions: this.types,
        },
        {
            label: this.intl.t('iam.common.create'),
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
            ddMenuLabel: this.intl.t('iam.policies.index.policy-actions'),
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            width: '15%',
            actions: [
                {
                    label: this.intl.t('iam.policies.index.edit-policy'),
                    fn: this.editPolicy,
                    permission: 'iam view policy',
                },
                {
                    label: this.intl.t('iam.policies.index.delete-policy'),
                    fn: this.deletePolicy,
                    className: 'text-red-700 hover:text-red-800',
                    permission: 'iam delete policy',
                },
            ],
        },
    ];

    /**
     * Creates an instance of PoliciesIndexController.
     * @memberof PoliciesIndexController
     */
    constructor() {
        super(...arguments);
        this.iam.getServices.perform({
            onSuccess: (services) => {
                this.services = services;
            },
        });
    }

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
     * Bulk deletes selected `role` via confirm prompt
     *
     * @param {Array} selected an array of selected models
     * @void
     */
    @action bulkDeletePolicies() {
        const selected = this.table.selectedRows;

        this.crud.bulkDelete(selected, {
            modelNamePath: `name`,
            acceptButtonText: this.intl.t('iam.policies.index.delete-policies'),
            onSuccess: () => {
                return this.hostRouter.refresh();
            },
        });
    }

    /**
     * Toggles modal to create a new API key
     *
     * @void
     */
    @action createPolicy() {
        const formPermission = 'iam create policy';
        const policy = this.store.createRecord('policy', {
            is_mutable: true,
            is_deletable: true,
        });

        this.editPolicy(policy, {
            title: this.intl.t('iam.policies.index.new-policy'),
            acceptButtonText: this.intl.t('common.confirm'),
            acceptButtonIcon: 'check',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await policy.save();
                    this.notifications.success(this.intl.t('iam.policies.index.new-policy-created'));
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
     * @param {PolicyModel} policy
     * @memberof PoliciesIndexController
     * @void
     */
    @action editPolicy(policy, options = {}) {
        if (!policy.is_mutable) {
            return this.viewPolicyPermissions(policy);
        }

        const formPermission = 'iam update policy';
        this.modalsManager.show('modals/policy-form', {
            title: this.intl.t('iam.policies.index.edit-policy-title'),
            acceptButtonText: this.intl.t('common.save-changes'),
            acceptButtonIcon: 'save',
            acceptButtonDisabled: this.abilities.cannot(formPermission),
            acceptButtonHelpText: this.abilities.cannot(formPermission) ? this.intl.t('common.unauthorized') : null,
            formPermission,
            policy,
            confirm: async (modal) => {
                modal.startLoading();

                if (this.abilities.cannot(formPermission)) {
                    return this.notifications.warning(this.intl.t('common.permissions-required-for-changes'));
                }

                try {
                    await policy.save();
                    this.notifications.success(this.intl.t('iam.policies.index.changes-policy-saved-success'));
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
     * View policy permissions
     *
     * @param {PolicyModel} policy
     * @memberof PoliciesIndexController
     */
    @action viewPolicyPermissions(policy) {
        this.modalsManager.show('modals/view-policy-permissions', {
            title: this.intl.t('iam.components.modals.view-policy-permissions.view-permissions', { policyName: policy.name }),
            hideDeclineButton: true,
            acceptButtonText: this.intl.t('common.done'),
            policy,
        });
    }

    /**
     * Toggles dialog to delete API key
     *
     * @param {PolicyModel} policy
     * @memberof PoliciesIndexController
     * @void
     */
    @action deletePolicy(policy) {
        if (!policy.is_deletable) {
            return this.notifications.warning(this.intl.t('iam.policies.index.unable-delete-policy-warning', { policyType: policy.type }));
        }

        this.modalsManager.confirm({
            title: `Delete (${policy.name || 'Untitled'}) policy`,
            body: this.intl.t('iam.policies.index.data-assosciated-this-policy-deleted'),
            confirm: async (modal) => {
                modal.startLoading();
                try {
                    await policy.destroyRecord();
                    this.notifications.success(this.intl.t('iam.policies.index.policy-deleted', { policyName: policy.name }));
                    return this.hostRouter.refresh();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    /**
     * Toggles dialog to export API credentials
     *
     * @void
     */
    @action exportPolicies() {
        this.crud.export('policy');
    }

    /**
     * Reload data.
     */
    @action reload() {
        return this.hostRouter.refresh();
    }
}
