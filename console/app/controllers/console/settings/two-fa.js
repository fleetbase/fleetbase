import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency-decorators';
import getTwoFaMethods from '@fleetbase/console/utils/get-two-fa-methods';

export default class ConsoleSettingsTwoFaController extends Controller {
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
     * Flag indicating whether system-wide two-factor authentication is enabled.
     *
     * @type {boolean}
     */
    @tracked isUserTwoFaEnabled = false;

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
     * Constructor method for the ConsoleAccountAuthController.
     *
     * @constructor
     */
    constructor() {
        super(...arguments);
        this.loadSystemTwoFaConfig.perform();
        this.loadCompanyTwoFaSettings.perform();
        this.loadUserTwoFaSettings.perform();
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
     * Initiates the task to save user-specific two-factor authentication settings asynchronously.
     *
     * @method saveTwoFactor
     */
    @action saveTwoFactor() {
        this.saveTwoFactorSettingsForCompany.perform(this.twoFaSettings);
    }

    /**
     * Initiates the task to load user-specific two-factor authentication settings asynchronously.
     *
     * @method loadUserTwoFaSettings
     */
    @task *loadCompanyTwoFaSettings() {
        const twoFaSettings = yield this.fetch.get('companies/two-fa');
        if (twoFaSettings) {
            this.twoFaSettings = twoFaSettings;
            this.isTwoFaEnforced = twoFaSettings.enforced;
        }
        return twoFaSettings;
    }

    /**
     * Initiates the task to load system-wide two-factor authentication configuration asynchronously.
     *
     * @method loadSystemTwoFaConfig
     */
    @task *loadSystemTwoFaConfig() {
        const twoFaConfig = yield this.fetch.get('two-fa/config');

        if (twoFaConfig) {
            this.isSystemTwoFaEnabled = twoFaConfig.enabled;
            this.twoFaConfig = twoFaConfig;
        }
        return twoFaConfig;
    }

    /**
     * Initiates the task to load user-specific two-factor authentication settings asynchronously.
     *
     * @method loadUserTwoFaSettings
     */
    @task *loadUserTwoFaSettings() {
        const twoFaSettings = yield this.fetch.get('users/two-fa');
        if (twoFaSettings) {
            this.isUserTwoFaEnabled = twoFaSettings.enabled;
            this.twoFaSettings = twoFaSettings;
        }
        return twoFaSettings;
    }

    /**
     * Initiates the task to save user-specific two-factor authentication settings for the company asynchronously.
     *
     * @method saveTwoFactorSettingsForCompany
     * @param {Object} twoFaSettings - User-specific two-factor authentication settings.
     */
    @task *saveTwoFactorSettingsForCompany(twoFaSettings = {}) {
        yield this.fetch
            .post('companies/two-fa', { twoFaSettings })
            .then(() => {
                this.notifications.success('2FA Settings saved for organization successfully.');
            })
            .catch((error) => {
                this.notifications.serverError(error);
            });
    }
}
