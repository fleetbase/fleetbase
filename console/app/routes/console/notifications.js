import Route from '@ember/routing/route';

export default class ConsoleNotificationsRoute extends Route {
    async model(params) {
        // Query the notification model using the store service
        return this.store.query('notification', params);
    }
}
