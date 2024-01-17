import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency-decorators';
import getTwoFaMethods from '@fleetbase/console/utils/get-two-fa-methods';

export default class ConsoleSettingsAuthController extends Controller {
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

    @action enforceTwoFaForCompanyUsersAction() {
        this.enforceTwoFaForCompanyUsers.perform(this.twoFaSettings);
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

    @task *enforceTwoFaForCompanyUsers(twoFaSettings = {}) {
        yield this.fetch
            .post('companies/enforce', { twoFaSettings })
            .then(() => {
                this.notifications.success('2FA Settings enforced for all users successfully.');
            })
            .catch((error) => {
                this.notifications.serverError(error);
            });
    }
}
