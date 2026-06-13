import Route from '@ember/routing/route';

export default class ConsoleAdminOrganizationsDetailsIndexRoute extends Route {
    model() {
        return this.modelFor('console.admin.organizations.details');
    }
}
