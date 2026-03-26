import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import removeBootLoader from '../utils/remove-boot-loader';

export default class VirtualRoute extends Route {
    @service('universe/menu-service') menuService;
    @service('universe/hook-service') hookService;
    @service universe;
    @service session;
    @service router;

    queryParams = {
        view: {
            refreshModel: true,
        }
    };

    async beforeModel(transition) {
        this.hookService.execute('virtual:before-model', this.session, this.router, transition);
    }

    model({ slug }, transition) {
        const view = this.universe.getViewFromTransition(transition);
        return this.menuService.lookupMenuItem('auth:login', slug, view);
    }

    async afterModel(model, transition) {
        this.hookService.execute('virtual:after-model', this.session, this.router, model, transition);
        removeBootLoader();
    }
}
