import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleAdminVirtualRoute extends Route {
    @service universe;

    model({ slug, view }) {
        return this.universe.lookupMenuItemFromRegistry('admin', slug, view);
    }
}
