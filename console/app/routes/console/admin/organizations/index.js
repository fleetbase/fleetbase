import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';

/**
 * `ConsoleAdminOrganizationsRoute` is a Route that handles the logic for the admin organizations console.
 *
 * @class ConsoleAdminOrganizationsRoute
 * @extends Route
 * @public
 */
export default class ConsoleAdminOrganizationsRoute extends Route {
    /**
     * `store` is a service that provides methods for querying and manipulating the application's data store.
     *
     * @service store
     * @public
     */
    @service store;

    queryParams = {
        page: { refreshModel: true },
        query: { refreshModel: true },
        sort: { refreshModel: true },
        limit: { refreshModel: true },
        name: { refreshModel: true },
        country: { refreshModel: true },
    };

    /**
     * `search` is a task that performs a search query on the 'company' model in the store.
     *
     * @method search
     * @param {string} query - The search query.
     * @returns {Promise} A promise that resolves with the search results.
     * @public
     */
    search = task(function* (query) {
        try {
            return yield this.store.query('company', { query });
        } catch (error) {
            console.error('An error occurred during the search:', error);
        }
    }).restartable();

    /**
     * `model` is a method that queries the 'company' model in the store with the provided parameters.
     *
     * @method model
     * @param {Object} params - The query parameters.
     * @returns {Promise} A promise that resolves with the query results.
     * @public
     */
    model(params) {
        return this.store.query('company', params);
    }
}
