import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleSettingsVirtualRoute extends Route {
    @service universe;

    model({ slug, view }) {
        return this.universe.lookupMenuItemFromRegistry('settings', slug, view);
    }
}
