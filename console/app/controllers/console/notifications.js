import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

/**
 * Controller for managing notifications.
 */
export default class NotificationsController extends Controller {
    /**
     * Inject the `socket` service
     *
     * @memberof NotificationsController
     */
    @service socket;

    /**
     * Inject the `store` service
     *
     * @memberof NotificationsController
     */
    @service store;

    /**
     * Inject the `fetch` service
     *
     * @memberof NotificationsController
     */
    @service fetch;

    /**
     * Inject the `notifications` service
     *
     * @memberof NotificationsController
     */
    @service notifications;

    /**
     * Inject the `universe` service
     *
     * @memberof NotificationsController
     */
    @service universe;

    /**
     * Inject the `router` service
     *
     * @memberof NotificationsController
     */
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

    /**
     * The selected notifications.
     *
     * @tracked
     * @var {Array}
     * @memberof NotificationsController
     */
    @tracked selected = [];

    /**
     * Creates an instance of NotificationsController.
     * @memberof NotificationsController
     */
    constructor() {
        super(...arguments);

        // listen for received notifications
        this.universe.on('notification.received', () => {
            this.router.refresh();
        });
    }

    /**
     * Action to select or deselect a notification.
     *
     * @param {NotificationModel} notification - The notification to select or deselect.
     * @memberof NotificationsController
     */
    @action selectNotification(notification) {
        if (this.selected.includes(notification)) {
            this.selected.removeObject(notification);
        } else {
            this.selected.pushObject(notification);
        }
    }

    /**
     * Action to delete selected notifications.
     *
     * @memberof NotificationsController
     */
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

    /**
     * Action to mark selected notifications as read.
     *
     * @memberof NotificationsController
     */
    @action read() {
        const unreadSelectedNotifications = this.selected.filter((notification) => notification.unread);

        return this.fetch
            .put('notifications/mark-as-read', {
                notifications: unreadSelectedNotifications.map(({ id }) => id),
            })
            .then(() => {
                this.notifications.success(`${unreadSelectedNotifications.length} notifications marked as read`);
                this.universe.trigger('notifications.read', [...unreadSelectedNotifications]);
                this.selected.clear();

                return this.router.refresh();
            })
            .catch((error) => {
                this.notifications.serverError(error);
            });
    }

    /**
     * Action to select all notifications.
     *
     * @memberof NotificationsController
     */
    @action selectAll() {
        if (this.selected.length === this.model.length) {
            this.selected.clear();
        } else {
            this.selected = this.model.toArray();
        }
    }

    /**
     * Action to mark a notification as read.
     *
     * @param {NotificationModel} notification
     * @return {Promise}
     * @memberof NotificationsController
     */
    @action markNotificationAsRead(notification) {
        return notification.markAsRead().then(() => {
            this.notifications.info('Notification marked as read.');
            this.universe.trigger('notifications.read', [notification]);
        });
    }
}
