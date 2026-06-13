import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleAdminOrganizationsDetailsExtensionsRoute extends Route {
    @service fetch;

    async model() {
        const organization = this.modelFor('console.admin.organizations.details');
        const response = await this.fetch.get(`companies/${organization.uuid}/extensions`);

        return {
            organization,
            extensions: response.extensions ?? [],
        };
    }
}
