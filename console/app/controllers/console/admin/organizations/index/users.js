import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export default class ConsoleAdminOrganizationsIndexUsersController extends Controller {
    /**
     * Inject the `filters` service
     *
     * @var {Service}
     */
    @service filters;

    /**
     * Inject the `intl` service
     *
     * @var {Service}
     */
    @service intl;

    /**
     * Inject the `router` service
     *
     * @var {Service}
     */
    @service router;

    /**
     * The current page of data being viewed
     *
     * @var {Integer}
     */
    @tracked nestedPage = 1;

    /**
     * The maximum number of items to show per page
     *
     * @var {Integer}
     */
    @tracked nestedLimit = 20;

    /**
     * The filterable param `sort`
     *
     * @var {Array|String}
     */
    @tracked nestedSort = '-created_at';

    /**
     * The filterable param `sort`
     *
     * @var {String}
     */
    @tracked nestedQuery;

    /**
     * The company loaded.
     *
     * @memberof ConsoleAdminOrganizationsIndexUsersController
     */
    @tracked company;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['nestedPage', 'nestedLimit', 'nestedSort', 'nestedQuery'];

    /**
     * Columns to render to the table.
     *
     * @memberof ConsoleAdminOrganizationsIndexUsersController
     */
    columns = [
        {
            label: this.intl.t('common.name'),
            valuePath: 'name',
        },
        {
            label: this.intl.t('common.phone-number'),
            valuePath: 'phone',
        },
        {
            label: this.intl.t('common.email'),
            valuePath: 'email',
        },
        {
            label: this.intl.t('common.status'),
            valuePath: 'status',
            cellComponent: 'table/cell/status',
        },
    ];

    /**
     * Set the overlay component context object.
     *
     * @param {Object} contextApi
     * @memberof ConsoleAdminOrganizationsIndexUsersController
     */
    @action setOverlayContext(contextApi) {
        this.contextApi = contextApi;
    }

    /**
     * Handle closing the overlay.
     *
     * @return {Promise<Transition>} 
     * @memberof ConsoleAdminOrganizationsIndexUsersController
     */
    @action onPressClose() {
        if (this.contextApi && typeof this.contextApi.close === 'function') {
            this.contextApi.close();
        }
        
        return this.router.transitionTo('console.admin.organizations.index');
    }

    /**
     * `search` is a task that performs a search query on the 'company' model in the store.
     *
     * @method search
     * @param {string} query - The search query.
     * @returns {Promise} A promise that resolves with the search results.
     * @public
     */
    @task({ restartable: true }) *search(event) {
        this.nestedQuery = event.target.value;
        // this.companies = yield this.fetch.get(`companies/${this.company.public_id}/users`, { query: event.target.value });
    }
}
