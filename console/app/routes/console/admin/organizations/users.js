import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

/**
 * Route for displaying and managing users associated with a specific organization in the admin console.
 *
 * @class ConsoleAdminOrganizationUsersRoute
 * @extends Route
 */
export default class ConsoleAdminOrganizationUsersRoute extends Route {
    /**
     * Ember Data service for interacting with the store.
     *
     * @property {Service} store
     * @type {Object}
     */
    @service fetch;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        status: { refreshModel: true },
        name: { refreshModel: true },
        phone: { refreshModel: true },
        email: { refreshModel: true },
        createdAt: { refreshModel: true },
        updatedAt: { refreshModel: true },
    };

    /**
     * Fetches users based on the company ID.
     *
     * @param {Object} params - The parameters passed to the model hook.
     * @param {string} params.company_id - The ID of the company.
     * @returns {Object} An object containing the users associated with the company.
     */
    async model(params) {
        const id = params.company_id;
        const users = await this.fetch.get(`companies/${id}/users`);
        return users.toArray();
    }
}
