import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

/**
 * Route for managing console notifications.
 */
export default class ConsoleNotificationsRoute extends Route {
    @service store;

    queryParams = {
        page: { refreshModel: true },
        limit: { refreshModel: true },
        sort: { refreshModel: true },
        query: { refreshModel: true },
        created_at: { refreshModel: true },
    };

    /**
     * Fetch the model data based on the specified parameters.
     *
     * @param {Object} params - Query parameters for fetching notifications.
     * @returns {Promise} - A promise that resolves with the notification data.
     */
    model(params = {}) {
        return this.store.query('notification', params);
    }
}
