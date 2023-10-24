import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

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

    model(params = {}) {
        return this.store.query('notification', params);
    }

    afterModel() {
        this.listenForNotificationFrom(`user.${this.currentUser.id}`);
        this.listenForNotificationFrom(`company.${this.currentUser.companyId}`);
    }

    async listenForNotificationFrom(channelId) {
        // setup socket
        const socket = this.socket.instance();

        // listen on company channel
        const channel = socket.subscribe(channelId);

        // listen to channel for events
        await channel.listener('subscribe').once();

        // get incoming data and console out
        (async () => {
            for await (let incomingNotification of channel) {
                this.onReceivedNotification(incomingNotification);
            }
        })();
    }

    onReceivedNotification() {
        this.refresh();
    }
}
