import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleAdminIndexRoute extends Route {
    @service fetch;

    model() {
        return this.fetch.get('settings/overview');
    }
}
