import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

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
     * Constructor for ConsoleAdminOrganizationsController.
     * Invokes the getAllCompanies method to fetch all companies.
     *
     * @constructor
     * @method constructor
     */
    constructor() {
        super(...arguments);
        this.getAllCompanies();
    }

    /**
     * Fetches all companies from the store and sets the 'companies' property.
     *
     * @method getAllCompanies
     */
    getAllCompanies() {
        this.store.findAll('company').then((companies) => {
            this.set('companies', companies);
        });
    }

    /**
     * Navigates to the organization-users route for the selected company.
     *
     * @method goToCompany
     * @param {Object} company - The selected company.
     */
    @action goToCompany(company) {
        this.router.transitionTo('console.admin.organization-users', company.id);
    }
}
