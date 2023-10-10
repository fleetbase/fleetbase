import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleSettingsIndexRoute extends Route {
    @service currentUser;
    @service store;

    model() {
        return this.store.findRecord('company', this.currentUser.companyId);
    }
}
