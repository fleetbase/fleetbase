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
    /**
     * The Ember Data service for interacting with the store.
     *
     * @property {Service} store
     * @type {Object}
     */
    @service store;

    /**
     * Inject the `intl` service
     *
     * @var {Service}
     */
    @service intl;

    /**
     * The Ember Router service for handling transitions between routes.
     *
     * @property {Service} router
     * @type {Object}
     */
    @service router;

    /**
     * Inject the `filters` service
     *
     * @var {Service}
     */
    @service filters;

    /**
     * Inject the `crud` service
     *
     * @var {Service}
     */
    @service crud;

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
    queryParams = ['name', 'page', 'limit', 'sort'];

    /**
     * Columns for organization
     *
     * @memberof ConsoleAdminOrganizationsController
     */
    columns = [
        {
            label: this.intl.t('common.name'),
            valuePath: 'name',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('console.admin.organizations.index.owner-name-column'),
            valuePath: 'owner.name',
            width: '200px',
            resizable: true,
            sortable: true,
        },
        {
            label: this.intl.t('console.admin.organizations.index.owner-email-column'),
            valuePath: 'owner.email',
            width: '200px',
            resizable: true,
            sortable: true,
            filterable: true,
        },
        {
            label: this.intl.t('console.admin.organizations.index.phone-column'),
            valuePath: 'owner.phone',
            width: '200px',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('console.admin.organizations.index.users-count-column'),
            valuePath: 'users_count',
            resizable: true,
            sortable: true,
        },
        {
            label: this.intl.t('common.created-at'),
            valuePath: 'createdAt',
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
        this.router.transitionTo('console.admin.organizations.index.users', company.public_id);
    }

    /**
     * Toggles dialog to export `drivers`
     *
     * @void
     */
    @action exportOrganization() {
        const selections = this.table.selectedRows.map((_) => _.id);
        this.crud.export('companies', { params: { selections } });
    }
}
