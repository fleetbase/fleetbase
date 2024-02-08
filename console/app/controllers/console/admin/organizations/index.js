import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency';

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
            label: this.intl.t('console.admin.organizations.index.phone-column'),
            valuePath: 'phone',
            resizable: true,
            sortable: true,
            filterable: true,
            filterComponent: 'filter/string',
        },
        {
            label: this.intl.t('common.created-at'),
            valuePath: 'createdAt',
        },
    ];

    /**
     * `search` is a task that performs a search query on the 'company' model in the store.
     *
     * @method search
     * @param {string} query - The search query.
     * @returns {Promise} A promise that resolves with the search results.
     * @public
     */
    @task({ restartable: true }) *search(event) {
        this.companies = yield this.store.query('company', { query: event.target.value });
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
}
