import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
export default class ConsoleAdminOrganizationUsersController extends Controller {
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
     * The filterable param `name`
     *
     * @var {String}
     */
    @tracked name;

    /**
     * The filterable param `email`
     *
     * @var {String}
     */
    @tracked email;

    /**
     * The filterable param `phone`
     *
     * @var {String}
     */
    @tracked phone;

    /**
     * The filterable param `email`
     *
     * @var {Array|String}
     */
    @tracked type;

    /**
     * The filterable param `sort`
     *
     * @var {Array|String}
     */
    @tracked sort;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'limit', 'sort', 'query', 'name', 'email', 'phone', 'status'];

    constructor() {
        super(...arguments);
        this.columns = [
            {
                label: 'Name',
                valuePath: 'name',
            },
            {
                label: 'Phone',
                valuePath: 'phone',
            },
            {
                label: 'Email',
                valuePath: 'email',
            },
            {
                label: 'Status',
                valuePath: 'status',
            },
        ];
    }
}
