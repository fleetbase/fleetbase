import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class ConsoleAdminOrganizationUsersController extends Controller {
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
}
