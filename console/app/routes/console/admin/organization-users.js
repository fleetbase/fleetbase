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
    @service store;

    /**
     * Fetches users based on the company ID.
     *
     * @param {Object} params - The parameters passed to the model hook.
     * @param {string} params.company_id - The ID of the company.
     * @returns {Object} An object containing the users associated with the company.
     */
    async model(params) {
        console.log('params', params);
        let companyId = params.company_id;
        console.log('companyId', companyId);
        // let users = this.store.findAll('user');
        let users = this.store.query('user', { company_id: companyId });
        console.log('users', users.toArray());
        return { users };
    }
}
