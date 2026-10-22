import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleAdminOrganizationsDetailsIndexRoute extends Route {
    @service fetch;

    async model() {
        const organization = this.modelFor('console.admin.organizations.details');

        try {
            const { usage } = await this.fetch.get(`companies/${organization.uuid}/usage`);
            return { organization, usage, usageError: false };
        } catch {
            return { organization, usage: null, usageError: true };
        }
    }
}
