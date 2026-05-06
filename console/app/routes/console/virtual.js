import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleVirtualRoute extends Route {
    @service sidebar;
    @service('universe/menu-service') menuService;
    @service universe;

    queryParams = {
        view: {
            refreshModel: true,
        },
    };

    model({ slug }, transition) {
        const view = this.universe.getViewFromTransition(transition);
        return this.menuService.lookupMenuItem('console', slug, view);
    }

    activate() {
        this.sidebar.disable();
    }

    deactivate() {
        this.sidebar.enable();
    }
}
