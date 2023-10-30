import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import createNotificationKey from '../../../utils/create-notification-key';

export default class ConsoleAdminNotificationsController extends Controller {
    /**
     * Inject the notifications service.
     *
     * @memberof ConsoleAdminNotificationsController
     */
    @service notifications;

    /**
     * Inject the fetch service.
     *
     * @memberof ConsoleAdminNotificationsController
     */
    @service fetch;

    /**
     * The notification settings value JSON.
     *
     * @memberof ConsoleAdminNotificationsController
     * @var {Object}
     */
    @tracked notificationSettings = {};

    /**
     * Notification transport methods enabled.
     *
     * @memberof ConsoleAdminNotificationsController
     * @var {Array}
     */
    @tracked notificationTransportMethods = ['email', 'sms'];

    /**
     * Tracked property for the loading state
     *
     * @memberof ConsoleAdminNotificationsController
     * @var {Boolean}
     */
    @tracked isLoading = false;

    /**
     * Creates an instance of ConsoleAdminNotificationsController.
     * @memberof ConsoleAdminNotificationsController
     */
    constructor() {
        super(...arguments);
        this.getSettings();
    }

    /**
     * Selectes notifiables for settings.
     *
     * @param {Object} notification
     * @param {Array} notifiables
     * @memberof ConsoleAdminNotificationsController
     */
    @action onSelectNotifiable(notification, notifiables) {
        const notificationKey = createNotificationKey(notification.definition, notification.name);
        const _notificationSettings = { ...this.notificationSettings };

        if (!_notificationSettings[notificationKey]) {
            _notificationSettings[notificationKey] = {};
        }

        _notificationSettings[notificationKey].notifiables = notifiables;
        _notificationSettings[notificationKey].definition = notification.definition;
        _notificationSettings[notificationKey].via = notifiables.map((notifiable) => {
            return {
                identifier: notifiable.value,
                methods: this.notificationTransportMethods,
            };
        });

        this.mutateNotificationSettings(_notificationSettings);
    }

    /**
     * Mutates the notification settings property.
     *
     * @param {Object} [_notificationSettings={}]
     * @memberof ConsoleAdminNotificationsController
     */
    mutateNotificationSettings(_notificationSettings = {}) {
        this.notificationSettings = {
            ...this.notificationSettings,
            ..._notificationSettings,
        };
    }

    /**
     * Save notification settings to the server.
     *
     * @action
     * @method saveSettings
     * @returns {Promise}
     * @memberof ConsoleAdminNotificationsController
     */
    @action saveSettings() {
        const { notificationSettings } = this;

        this.isLoading = true;

        return this.fetch
            .post('notifications/save-settings', { notificationSettings })
            .then(() => {
                this.notifications.success('Notification settings successfully saved.');
            })
            .catch((error) => {
                this.notifications.serverError(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    /**
     * Fetches and updates notification settings asynchronously.
     *
     * @returns {Promise<void>} A promise for successful retrieval and update, or an error on failure.
     */
    getSettings() {
        return this.fetch
            .get('notifications/get-settings')
            .then(({ notificationSettings }) => {
                this.notificationSettings = notificationSettings;
            })
            .catch((error) => {
                this.notifications.serverError(error);
            });
    }
}
