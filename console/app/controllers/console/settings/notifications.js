import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import createNotificationKey from '@fleetbase/ember-core/utils/create-notification-key';
import { task } from 'ember-concurrency';

export default class ConsoleSettingsNotificationsController extends Controller {
    @service notifications;
    @service fetch;
    @service store;
    @service currentUser;
    @tracked notificationSettings = {};
    @tracked notificationTransportMethods = ['email', 'sms'];
    @tracked company;

    /**
     * Creates an instance of ConsoleSettingsNotificationsController.
     * @memberof ConsoleSettingsNotificationsController
     */
    constructor() {
        super(...arguments);
        this.getSettings.perform();
    }

    /**
     * Toggles the "Alphanumeric Sender ID" feature for the current company.
     *
     * Updates the company's `options` object by setting the
     * `alpha_numeric_sender_id_enabled` flag. This controls whether the
     * organization uses a custom alphanumeric sender ID when sending SMS.
     *
     * @action
     * @param {boolean} enabled - Whether the feature should be enabled or disabled.
     * @returns {void}
     */
    @action toggleAlphaNumericSenderId(enabled) {
        const currentOptions = this.company.options ?? {};
        this.company.set('options', { ...currentOptions, alpha_numeric_sender_id_enabled: enabled });
    }

    /**
     * Sets the Alphanumeric Sender ID string for the current company.
     *
     * Reads the input's value from the event and updates the company's `options`
     * object by setting the `alpha_numeric_sender_id` field. This value represents
     * the sender name that will appear in outbound SMS messages (subject to carrier
     * support and restrictions).
     *
     * @action
     * @param {Event} event - Input event containing the alphanumeric sender ID value.
     * @returns {void}
     */
    @action setAlphaNumericSenderId(event) {
        const value = event.target.value;
        const currentOptions = this.company.options ?? {};
        this.company.set('options', { ...currentOptions, alpha_numeric_sender_id: value });
    }

    /**
     * Selectes notifiables for settings.
     *
     * @param {Object} notification
     * @param {Array} notifiables
     * @memberof ConsoleSettingsNotificationsController
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
     * @memberof ConsoleSettingsNotificationsController
     */
    mutateNotificationSettings(_notificationSettings = {}) {
        this.notificationSettings = {
            ...this.notificationSettings,
            ..._notificationSettings,
        };
    }

    /**
     * Save notification settings.
     *
     * @memberof ConsoleSettingsNotificationsController
     */
    @task *saveSettings() {
        const { notificationSettings } = this;

        try {
            yield this.fetch.post('notifications/save-settings', { notificationSettings: notificationSettings ?? {} });
            yield this.saveCompanyOptions.perform();
            this.notifications.success('Notification settings successfully saved.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    /**
     * Get notification settings.
     *
     * @memberof ConsoleSettingsNotificationsController
     */
    @task *getSettings() {
        try {
            const { notificationSettings } = yield this.fetch.get('notifications/get-settings');
            this.notificationSettings = notificationSettings;
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    /**
     * Saves the updated company options to the backend.
     *
     * This ember-concurrency task attempts to persist the company's modified
     * `options` object by calling `company.save()`. If the request fails, a server
     * error notification is displayed. No action is taken if no company is loaded.
     *
     * @task
     * @generator
     * @yields {Promise} Resolves when the save request completes.
     * @returns {Promise<void>} Task completion state.
     */
    @task *saveCompanyOptions() {
        if (!this.company) return;

        try {
            yield this.company.save();
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}
