import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

/**
 * Route for managing console notifications.
 */
export default class ConsoleNotificationsRoute extends Route {
    @service store;
    @service socket;
    @service currentUser;

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

    /**
     * Activate the route and set up event listeners for incoming notifications.
     */
    activate() {
        this.listenForNotificationFrom(`user.${this.currentUser.id}`);
        this.listenForNotificationFrom(`company.${this.currentUser.companyId}`);
    }

    /**
     * Listen for notifications from a specified channel.
     *
     * @param {string} channelId - The ID of the channel to listen for notifications from.
     */
    async listenForNotificationFrom(channelId) {
        console.log('listenForNotificationFrom()', ...arguments);
        // setup socket
        const socket = this.socket.instance();

        // Listen for socket connection errors
        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (let event of socket.listener('error')) {
                console.log('[socket error]', event);
            }
        })();

        // Listen for socket connection
        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (let event of socket.listener('connect')) {
                console.log('[socket connected]', event);
            }
        })();

        // Listen for socket connection aborted
        (async () => {
            // eslint-disable-next-line no-unused-vars
            for await (let event of socket.listener('connectAbort')) {
                console.log('[socket connectAborted]', event);
            }
        })();

        // listen on the specified channel
        const channel = socket.subscribe(channelId);

        // listen to the channel for events
        await channel.listener('subscribe').once();

        console.log('subscribed to ', channelId);

        // get incoming data and trigger the onReceivedNotification method
        (async () => {
            for await (let incomingNotification of channel) {
                this.onReceivedNotification(incomingNotification);
            }
        })();
    }

    /**
     * Method called when a notification is received. It triggers a route refresh.
     */
    onReceivedNotification() {
        this.refresh();
    }
}
