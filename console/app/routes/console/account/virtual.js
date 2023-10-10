import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleAccountVirtualRoute extends Route {
    @service universe;

    model({ slug, view }) {
        return this.universe.lookupMenuItemFromRegistry('account', slug, view);
    }
}
