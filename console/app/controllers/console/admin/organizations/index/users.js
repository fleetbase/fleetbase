import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

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
    @tracked nestedQuery = '';

    /**
     * The company loaded.
     *
     * @memberof ConsoleAdminOrganizationsIndexUsersController
     */
    @tracked company;

    /**
     * The overlay context API.
     *
     * @memberof ConsoleAdminOrganizationsIndexUsersController
     */
    @tracked contextApi;

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
     * Update search query param and reset page to 1
     *
     * @param {Event} event
     * @memberof ConsoleAdminOrganizationsController
     */
    @action search(event) {
        this.nestedQuery = event.target.value ?? '';
        this.nestedPage = 1;
    }

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
}
