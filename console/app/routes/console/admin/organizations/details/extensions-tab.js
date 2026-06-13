import Route from '@ember/routing/route';

export default class ConsoleAdminOrganizationsDetailsExtensionsTabRoute extends Route {
    model(params) {
        return {
            organization: this.modelFor('console.admin.organizations.details'),
            slug: params.slug,
        };
    }

    setupController(controller, model) {
        super.setupController(controller, model);
        controller.organization = model.organization;
        controller.slug = model.slug;
    }
}
