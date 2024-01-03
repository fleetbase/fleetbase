import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

/**
 * Controller responsible for handling Two-Factor Authentication settings in the admin console.
 *
 * @class ConsoleAdminTwoFaSettingsController
 * @extends Controller
 */
export default class ConsoleAdminTwoFaSettingsController extends Controller {
    /**
     * Inject the notifications service.
     *
     * @memberof ConsoleAdminTwoFaSettingsController
     */
    @service notifications;

    /**
     * Inject the fetch service.
     *
     * @memberof ConsoleAdminTwoFaSettingsController
     */
    @service fetch;

    /**
     * Tracked property for the Two-Factor Authentication enabled state.
     *
     * @memberof ConsoleAdminTwoFaSettingsController
     * @type {Boolean}
     */
    @tracked twoFaMethod = 'authenticator_app';

    /**
     * Array of available Two-Factor Authentication methods.
     *
     * @memberof ConsoleAdminTwoFaSettingsController
     * @type {Array}
     */
    @tracked methods = [
        {
            key: 'authenticator_app',
            name: 'Authenticator App',
            description: 'Get codes from an app like Authy, 1Password, Microsoft Authenticator, or Google Authenticator',
            recommended: true,
        },
        { key: 'sms', name: 'SMS', description: 'Receive a unique code via SMS' },
        { key: 'email', name: 'Email', description: 'Receive a unique code via Email' },
    ];

    /**
     * The 2FA settings value JSON.
     *
     * @memberof ConsoleAdminNotificationsController
     * @var {Object}
     */
    @tracked twoFaSettings = {
        enabled: false,
        method: 'authenticator_app',
    };

    /**
     * Tracked property for the loading state
     *
     * @memberof ConsoleAdminTwoFaSettingsController
     * @var {Boolean}
     */
    @tracked isLoading = false;

    /**
     * Constructor method for the controller.
     *
     * @constructor
     */
    constructor() {
        super(...arguments);
        this.loadSettings();
    }

    /**
     * Action method triggered when Two-Factor Authentication is toggled.
     *
     * @action
     * @param {Boolean} isEnabled - The new state of Two-Factor Authentication.
     */
    @action onTwoFaToggled(isEnabled) {
        this.isTwoFaEnabled = isEnabled;
    }

    /**
     * Action method triggered when a Two-Factor Authentication method is selected.
     *
     * @action
     * @param {String} method - The selected Two-Factor Authentication method.
     */
    @action onTwoFaMethodSelected(method) {
        this.twoFaMethod = method;
    }

    /**
     * Action method to load Two-Factor Authentication settings from the server.
     *
     * @action
     * @returns {Promise}
     */
    @action loadSettings() {
        return this.fetch
            .get('two-fa/settings')
            .then((twoFaSettings) => {
                this.twoFaSettings = twoFaSettings;
            })
            .catch((error) => {
                this.notifications.serverError(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    /**
     * Save Two Factor settings to the server.
     *
     * @action
     * @method saveSettings
     * @returns {Promise}
     * @memberof ConsoleAdminTwoFaSettingsController
     */
    @action saveSettings() {
        const twoFaSettings = {
            enabled: this.isTwoFaEnabled,
            method: this.twoFaMethod,
        };

        this.isLoading = true;

        return this.fetch
            .post('two-fa/settings', { twoFaSettings })
            .then(() => {
                this.notifications.success('2FA Settings saved successfully.');
            })
            .catch((error) => {
                this.notifications.serverError(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
