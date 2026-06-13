import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

/**
 * Controller for managing organizations in the admin console.
 *
 * @class ConsoleAdminOrganizationsController
 * @extends Controller
 */
export default class ConsoleAdminOrganizationsController extends Controller {
    @service store;
    @service intl;
    @service router;
    @service filters;
    @service crud;
    @service notifications;
    @service fetch;
    @service session;

    /**
     * The search query param value.
     *
     * @var {String|null}
     */
    @tracked query;

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
    @tracked limit = 20;

    /**
     * The filterable param `sort`
     *
     * @var {String|Array}
     */
    @tracked sort = '-created_at';

    /**
     * The filterable param `name`
     *
     * @var {String}
     */
    @tracked name;

    /**
     * The filterable param `country`
     *
     * @var {String}
     */
    @tracked country;
    @tracked status;
    @tracked owner_email;
    @tracked onboarding_completed;
    @tracked billing_status;
    @tracked created_at;
    @tracked needs_attention;
    @tracked missing_owner;
    @tracked inactive_status;
    @tracked table;

    /**
     * Array to store the fetched companies.
     *
     * @var {Array}
     */
    @tracked companies = [];

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['query', 'name', 'page', 'limit', 'sort', 'country', 'status', 'owner_email', 'onboarding_completed', 'billing_status', 'created_at', 'needs_attention', 'missing_owner', 'inactive_status'];

    get actionButtons() {
        return [
            {
                icon: 'filter',
                prefix: 'fas',
                text: 'Views',
                type: 'magic',
                size: 'sm',
                triggerClass: 'admin-organization-resource-action-button',
                items: [
                    { label: 'Needs Attention', icon: 'building-circle-exclamation', onClick: () => this.applySavedView('needs_attention') },
                    { label: 'Missing Owner', icon: 'user-slash', onClick: () => this.applySavedView('missing_owner') },
                    { label: 'Incomplete Onboarding', icon: 'triangle-exclamation', onClick: () => this.applySavedView('incomplete_onboarding') },
                    { label: 'Inactive Status', icon: 'circle-exclamation', onClick: () => this.applySavedView('inactive_status') },
                    { separator: true },
                    { label: 'Clear View', icon: 'filter-circle-xmark', onClick: this.clearSavedView },
                ],
            },
            {
                icon: 'long-arrow-up',
                text: 'Export',
                size: 'sm',
                iconClass: 'rotate-icon-45',
                onClick: this.exportOrganization,
            },
        ];
    }

    get bulkActions() {
        return [
            {
                label: 'Export selected',
                icon: 'long-arrow-up',
                fn: this.exportOrganization,
            },
        ];
    }

    /**
     * Columns for organization
     *
     * @memberof ConsoleAdminOrganizationsController
     */
    columns = [
        {
            sticky: true,
            label: this.intl.t('common.name'),
            valuePath: 'name',
            width: '320px',
            cellComponent: 'admin/table/cell/company',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('common.status'),
            valuePath: 'status',
            width: '140px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
            cellComponent: 'table/cell/status',
        },
        {
            label: 'Owner',
            valuePath: 'owner_uuid',
            width: '260px',
            cellComponent: 'admin/table/cell/owner',
            resizable: true,
            sortable: false,
            filterable: true,
            filterParam: 'owner_email',
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('console.admin.organizations.index.users-count-column'),
            valuePath: 'users_count',
            width: '110px',
            resizable: true,
            sortable: true,
        },
        {
            label: 'Country',
            valuePath: 'country',
            width: '120px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: 'Timezone',
            valuePath: 'timezone',
            width: '180px',
            resizable: true,
            sortable: true,
        },
        {
            label: 'Onboarding',
            valuePath: 'onboardingStatus',
            width: '150px',
            cellComponent: 'table/cell/status',
            resizable: true,
            sortable: true,
            filterable: true,
            filterParam: 'onboarding_completed',
        },
        {
            label: 'Billing',
            valuePath: 'billing_status',
            width: '140px',
            cellComponent: 'table/cell/status',
            resizable: true,
            sortable: true,
            filterable: true,
            filterParam: 'billing_status',
        },
        {
            label: this.intl.t('common.created-at'),
            valuePath: 'createdAt',
            width: '180px',
            resizable: true,
            sortable: true,
        },
        {
            label: 'Last Activity',
            valuePath: 'updatedAt',
            width: '180px',
            resizable: true,
            sortable: true,
        },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'Organization Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            sticky: 'right',
            width: 60,
            actions: [
                {
                    label: 'View Organization',
                    icon: 'eye',
                    fn: this.goToCompany,
                },
                {
                    label: 'Open Activity',
                    icon: 'clock-rotate-left',
                    fn: this.openActivity,
                },
                {
                    label: 'Impersonate Owner',
                    icon: 'user-secret',
                    fn: this.impersonateOwner,
                },
                {
                    label: 'Copy Public ID',
                    icon: 'copy',
                    fn: (company) => this.copyId(company.public_id, 'Public ID'),
                },
                {
                    label: 'Copy UUID',
                    icon: 'fingerprint',
                    fn: (company) => this.copyId(company.uuid, 'UUID'),
                },
            ],
        },
    ];

    /**
     * Update search query param and reset page to 1
     *
     * @param {Event} event
     * @memberof ConsoleAdminOrganizationsController
     */
    @action search(event) {
        this.query = event.target.value ?? '';
        this.page = 1;
    }

    /**
     * Navigates to the organization-users route for the selected company.
     *
     * @method goToCompany
     * @param {Object} company - The selected company.
     */
    @action goToCompany(company) {
        this.router.transitionTo('console.admin.organizations.details', company.public_id);
    }

    @action openActivity(company) {
        this.router.transitionTo('console.admin.organizations.details.activity', company.public_id);
    }

    @action async impersonateOwner(company) {
        const owner = this.resolveBelongsTo(company?.owner);
        const ownerId = owner?.id || owner?.uuid || company?.owner_uuid;

        if (!ownerId) {
            return this.notifications.error('This organization does not have an owner to impersonate.');
        }

        try {
            const { token } = await this.fetch.post('auth/impersonate', { user: ownerId });
            await this.router.transitionTo('console');
            this.session.manuallyAuthenticate(token);
            this.notifications.info(`Now impersonating ${owner?.email || 'organization owner'}...`);
            window.location.reload();
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    resolveBelongsTo(record) {
        if (!record) {
            return null;
        }

        if (record.content) {
            return record.content;
        }

        if (record.isPending || record.isFulfilled === false || typeof record.then === 'function') {
            return null;
        }

        return record;
    }

    @action copyId(value, label = 'ID') {
        if (!value) {
            return;
        }

        navigator.clipboard?.writeText(value);
        this.notifications.success(`${label} copied to clipboard.`);
    }

    /**
     * Toggles dialog to export `drivers`
     *
     * @void
     */
    @action exportOrganization() {
        const selections = this.table?.selectedRows?.map((_) => _.id) ?? [];
        this.crud.export('companies', { params: { selections } });
    }

    @action applySavedView(view) {
        this.clearSavedView();

        if (view === 'needs_attention') {
            this.needs_attention = 1;
        }

        if (view === 'missing_owner') {
            this.missing_owner = 1;
        }

        if (view === 'incomplete_onboarding') {
            this.onboarding_completed = false;
        }

        if (view === 'inactive_status') {
            this.inactive_status = 1;
        }

        this.page = 1;
    }

    @action clearSavedView() {
        this.needs_attention = null;
        this.missing_owner = null;
        this.inactive_status = null;
        this.onboarding_completed = null;
        this.page = 1;
    }
}
