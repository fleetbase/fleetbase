import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import createNotificationKey from '../../../utils/create-notification-key';

export default class ConsoleAdminNotificationsController extends Controller {
    @service notifications;
    @service fetch;

    @tracked notificationSettings = {};
    @tracked notificationTransportMethods = ['email', 'sms'];
    @tracked isLoading = false;

    constructor() {
        super(...arguments);
        this.getSettings();
    }

    @action onSelectNotifiable(notification, notifiables) {
        const notificationKey = createNotificationKey(notification.definition);
        const _notificationSettings = { ...this.notificationSettings };

        if (!_notificationSettings[notificationKey]) {
            _notificationSettings[notificationKey] = {};
        }

        _notificationSettings[notificationKey].recipients = notifiables;
        _notificationSettings[notificationKey].definition = notification.definition;
        _notificationSettings[notificationKey].via = notifiables.map((notifiable) => {
            return {
                identifier: notifiable.value,
                methods: this.notificationTransportMethods,
            };
        });

        this.mutateNotificationSettings(_notificationSettings);
    }

    mutateNotificationSettings(_notificationSettings = {}) {
        this.notificationSettings = {
            ...this.notificationSettings,
            ..._notificationSettings,
        };
    }

    /**
     * Save notification settings to the server.
     *
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
