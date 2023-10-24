import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class NotificationsController extends Controller {
    // Inject the store service to fetch notifications
    @service socket;
    @service store;
    @service fetch;
    @service notifications;
    @service universe;
    @service router;

    /**
     * Queryable parameters for this controller's model
     *
     * @var {Array}
     */
    queryParams = ['page', 'limit', 'sort', 'query', 'created_at'];

    /**
     * The current page of data being viewed
     *
     * @var {Integer}
     */
    @tracked page = 1;

    /**
     * The maximum number of items to show per page
     *
     * @var {Integer}
     */
    @tracked limit = 20;

    /**
     * The param to sort the data on, the param with prepended `-` is descending
     *
     * @var {String}
     */
    @tracked sort = '-created_at';

    @tracked selected = [];

    @action selectNotification(notification) {
        if (this.selected.includes(notification)) {
            this.selected.removeObject(notification);
        } else {
            this.selected.pushObject(notification);
        }
    }

    @action delete() {
        return this.fetch
            .delete('notifications/bulk-delete', {
                notifications: this.selected.map(({ id }) => id),
            })
            .then(() => {
                this.notifications.success(`${this.selected.length} notifications deleted`);
                this.universe.trigger('notifications.deleted', [...this.selected]);
                this.selected.clear();

                return this.router.refresh();
            })
            .catch((error) => {
                this.notifications.serverError(error);
            });
    }

    @action read() {
        return this.fetch
            .put('notifications/mark-as-read', {
                notifications: this.selected.map(({ id }) => id),
            })
            .then(() => {
                this.notifications.success(`${this.selected.length} notifications marked as read`);
                this.universe.trigger('notifications.read', [...this.selected]);
                this.selected.clear();

                return this.router.refresh();
            })
            .catch((error) => {
                this.notifications.serverError(error);
            });
    }

    @action selectAll() {
        this.selected = this.model.toArray();
    }

    @tracked selectedNotifications = [];

    @tracked allNotifications = [];

    constructor() {
        super(...arguments);
        this.fetchAllNotifications();
    }

    async fetchAllNotifications() {
        try {
            const allNotifications = await this.store.findAll('notification');
            this.allNotifications = allNotifications.toArray();
        } catch (error) {
            console.error('Failed to fetch all notifications:', error);
        }
    }

    @action onSelectNotification(notification) {
        if (this.selectedNotifications.includes(notification)) {
            this.selectedNotifications.removeObject(notification);
        } else {
            this.selectedNotifications.pushObject(notification);
        }
    }

    @action selectAllNotifications() {
        if (this.selectedNotifications.length === this.model.length) {
            this.selectNotifications.clear();
        } else {
            this.selectedNotifications = this.allNotifications.slice();
        }
    }

    @action toggleCheckbox(notification) {
        if (this.selected.includes(notification)) {
            this.selected.removeObject(notification);
        } else {
            this.selected.pushObject(notification);
            if (!notification.read_at) {
                this.read();
            }
        }
    }
}
