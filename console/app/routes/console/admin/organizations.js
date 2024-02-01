import Route from '@ember/routing/route';

export default class ConsoleAdminOrganizationsRoute extends Route {
    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        name: { refreshModel: true },
    };
}
