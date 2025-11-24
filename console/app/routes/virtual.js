import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class VirtualRoute extends Route {
    @service universe;
    @service router;

    queryParams = {
        view: {
            refreshModel: true,
        },
    };

    beforeModel(transition) {
        const slug = transition.to?.params?.virtual?.slug ?? transition.to?.params?.slug;
        console.debug('[VirtualRoute] beforeModel:', { slug, target: transition.to?.name });

        if (slug === 'bitacora') {
            return this.router.replaceWith('console.bitacora.live-report');
        }
    }

    model({ slug }, transition) {
        console.debug('[VirtualRoute] model:', { slug, target: transition.to?.name });
        const view = this.universe.getViewFromTransition(transition);
        return this.universe.lookupMenuItemFromRegistry('auth:login', slug, view);
    }
}
