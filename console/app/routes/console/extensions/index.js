import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleExtensionsIndexRoute extends Route {
    @service fetch;

    model(params) {
        return this.fetch.get('extensions');
    }
}
