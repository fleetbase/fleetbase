import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default class ConsoleAdminOrganizationsDetailsExtensionsTabController extends Controller {
    @service session;
    @service('universe/menu-service') menuService;

    get tab() {
        return this.menuService.getMenuItems('console:admin:organization:tabs').find((tab) => tab.slug === this.slug);
    }

    get context() {
        return {
            organization: this.organization,
            currentUser: this.session?.data?.authenticated?.user,
            capabilities: {},
        };
    }
}
