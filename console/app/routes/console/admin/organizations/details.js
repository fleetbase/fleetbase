import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleAdminOrganizationsDetailsRoute extends Route {
    @service fetch;

    model(params) {
        return this.fetch.get(`companies/find/${params.public_id}`, {}, { normalizeToEmberData: true, normalizeModelType: 'company' });
    }
}
