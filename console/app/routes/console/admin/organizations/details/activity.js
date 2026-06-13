import Route from '@ember/routing/route';

export default class ConsoleAdminOrganizationsDetailsActivityRoute extends Route {
    model() {
        return this.modelFor('console.admin.organizations.details');
    }
}
