import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleVirtualRoute extends Route {
    @service universe;

    model({ slug, view }) {
        return this.universe.lookupMenuItemFromRegistry('console', slug, view);
    }
}
