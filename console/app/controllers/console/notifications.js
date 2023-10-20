import Controller from '@ember/controller';

export default class ConsoleNotificationsController extends Controller {
    changePage(newPage) {
        // You can fetch a new page of notifications using the store.query method
        this.store.query('notification', { page: newPage }).then((newNotifications) => {
            this.set('model', newNotifications);
        });
    }
}
