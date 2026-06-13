import Route from '@ember/routing/route';

export default class ConsoleAdminOrganizationsDetailsSettingsRoute extends Route {
    model() {
        return this.modelFor('console.admin.organizations.details');
    }
}
