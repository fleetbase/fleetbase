import Route from '@ember/routing/route';
import ArrayProxy from '@ember/array/proxy';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';

export default class ConsoleAdminOrganizationsDetailsUsersRoute extends Route {
    @service fetch;

    queryParams = {
        nestedPage: { refreshModel: true },
        nestedLimit: { refreshModel: true },
        nestedSort: { refreshModel: true },
        nestedQuery: { refreshModel: true },
    };

    model(params) {
        const company = this.modelFor('console.admin.organizations.details');

        return this.fetch
            .get(`companies/${company.public_id}/users`, {
                page: params.nestedPage,
                limit: params.nestedLimit,
                sort: params.nestedSort,
                query: params.nestedQuery,
                paginate: 1,
            })
            .then(this.transformResults.bind(this));
    }

    transformResults({ users, meta }) {
        if (isArray(users)) {
            users = users.map((user) => this.fetch.jsonToModel(user, 'user'));
        }

        return ArrayProxy.create({ content: users, meta });
    }

    setupController(controller) {
        super.setupController(...arguments);
        controller.company = this.modelFor('console.admin.organizations.details');
    }
}
