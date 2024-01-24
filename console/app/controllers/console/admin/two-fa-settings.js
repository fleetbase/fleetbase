import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';
import getTwoFaMethods from '@fleetbase/console/utils/get-two-fa-methods';

/**
 * Controller responsible for handling Two-Factor Authentication settings in the admin console.
 *
 * @class ConsoleAdminTwoFaSettingsController
 * @extends Controller
 */
export default class ConsoleAdminTwoFaSettingsController extends Controller {
    /**
     * Service for handling data fetching.
     *
     * @type {fetch}
     */
    @service fetch;

    /**
     * Service for displaying notifications.
     *
     * @type {notifications}
     */
    @service notifications;

    /**
     * System-wide two-factor authentication configuration.
     *
     * @type {Object}
     */
    @tracked twoFaConfig = {};

    /**
     * User-specific two-factor authentication settings.
     *
     * @type {Object}
     */
    @tracked twoFaSettings = {};

    /**
     * Flag indicating whether system-wide two-factor authentication is enabled.
     *
     * @type {boolean}
     */
    @tracked isSystemTwoFaEnabled = false;

    /**
     * Flag indicating whether 2FA enforcement is required.
     *
     * @type {boolean}
     */
    @tracked isTwoFaEnforced = false;

    /**
     * Available two-factor authentication methods.
     *
     * @type {Array}
     */
    @tracked methods = getTwoFaMethods();

    /**
     * Tracked property for the loading state
     *
     * @memberof ConsoleAdminTwoFaSettingsController
     * @var {Boolean}
     */
    @tracked isLoading = false;

    /**
     * Constructor method for the ConsoleAccountAuthController.
     *
     * @constructor
     */
    constructor() {
        super(...arguments);
        this.loadSystemTwoFaConfig.perform();
    }

    /**
     * Handles the event when two-factor authentication is toggled.
     *
     * @method onTwoFaToggled
     * @param {boolean} enabled - Whether two-factor authentication is enabled or not.
     */
    @action onTwoFaToggled(enabled) {
        this.twoFaSettings = {
            ...this.twoFaSettings,
            enabled,
        };
    }

    /**
     * Handles the event when a two-factor authentication method is selected.
     *
     * @method onTwoFaMethodSelected
     * @param {string} method - The selected two-factor authentication method.
     */
    @action onTwoFaMethodSelected(method) {
        this.twoFaSettings = {
            ...this.twoFaSettings,
            method,
        };
    }

    /**
     * Handles the event when two-factor authentication is toggled.
     *
     * @method onTwoFaToggled
     * @param {boolean} enabled - Whether two-factor authentication is enforced or not.
     */
    @action onTwoFaEnforceToggled(enforced) {
        this.twoFaSettings = {
            ...this.twoFaSettings,
            enforced,
        };
    }

    /**
     * Handles the event when 2FA enforcement is toggled.
     *
     * @method onTwoFaEnforceToggled
     */

    /**
     * Initiates the task to save user-specific two-factor authentication settings asynchronously.
     *
     * @method saveTwoFactorAuthSettings
     */
    @action saveSettings() {
        this.saveTwoFactorSettingsForAdmin.perform(this.twoFaSettings);
    }

    /**
     * Initiates the task to load system-wide two-factor authentication configuration asynchronously.
     *
     * @method loadSystemTwoFaConfig
     */

    @task *loadSystemTwoFaConfig() {
        const twoFaSettings = yield this.fetch.get('two-fa/config').catch((error) => {
            this.notifications.serverError(error);
        });
        if (twoFaSettings) {
            this.twoFaSettings = twoFaSettings;
        }

        return twoFaSettings;
    }

    /**
     * Initiates the task to save user-specific two-factor authentication settings asynchronously.
     *
     * @method saveTwoFactorSettingsForAdmin
     * @param {Object} twoFaSettings - User-specific two-factor authentication settings.
     */
    @task *saveTwoFactorSettingsForAdmin(twoFaSettings = {}) {
        yield this.fetch
            .post('two-fa/config', { twoFaSettings })
            .then(() => {
                this.notifications.success('2FA Settings saved for admin successfully.');
            })
            .catch((error) => {
                this.notifications.serverError(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
