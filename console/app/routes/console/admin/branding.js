import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleAdminBrandingRoute extends Route {
    @service store;

    model() {
        return this.store.findRecord('brand', 1);
    }

    afterModel(model) {
        // Normalize icon URL to use local icon if it's the remote fleetbase icon
        if (model.icon_url && model.icon_url.includes('flb-assets.s3.ap-southeast-1.amazonaws.com/static/fleetbase-icon.png')) {
            model.set('icon_url', '/images/icon.png');
        }
    }
}
