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
     * Inject the `intl` service
     *
     * @var {Service}
     */
    @service intl;

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
            },
        ];
    }
}
