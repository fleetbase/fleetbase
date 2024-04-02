import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency-decorators';
import getTwoFaMethods from '@fleetbase/console/utils/get-two-fa-methods';

/**
 * Controller for managing user authentication and password-related actions in the console.
 *
 * @class ConsoleAccountAuthController
 * @extends Controller
 */
export default class ConsoleAccountAuthController extends Controller {
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
     * Service for managing application routing.
     *
     * @type {router}
     */
    @service router;

    /**
     * Service for managing modals.
     *
     * @type {router}
     */
    @service modalsManager;

    /**
     * The new password the user intends to set.
     *
     * @type {string}
     */
    @tracked newPassword;

    /**
     * The user's confirmation of the new password.
     *
     * @type {string}
     */
    @tracked newConfirmPassword;

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
     * Initiates the task to save user-specific two-factor authentication settings asynchronously.
     *
     * @method saveTwoFactorAuthSettings
     */
    @action saveTwoFactorAuthSettings() {
        this.saveUserTwoFaSettings.perform(this.twoFaSettings);
    }

    /**
     * Initiates the task to change the user's password asynchronously.
     *
     * @method changePassword
     */
    @task *changePassword(event) {
        // If from event fired
        if (event instanceof Event) {
            event.preventDefault();
        }

        // Validate current password
        const isPasswordValid = yield this.validatePassword.perform();
        if (!isPasswordValid) {
            this.newPassword = undefined;
            this.newConfirmPassword = undefined;
            return;
        }

        try {
            yield this.fetch.post('users/change-password', {
                password: this.newPassword,
                password_confirmation: this.newConfirmPassword,
            });

            this.notifications.success('Password change successfully.');
        } catch (error) {
            this.notifications.serverError(error, 'Failed to change password.');
        }

        this.newPassword = undefined;
        this.newConfirmPassword = undefined;
    }

    /**
     * Task to validate current password
     *
     * @return {boolean}
     */
    @task *validatePassword() {
        let isPasswordValid = false;

        yield this.modalsManager.show('modals/validate-password', {
            body: 'You must validate your current password before it can be changed.',
            onValidated: (isValid) => {
                isPasswordValid = isValid;
            },
        });

        return isPasswordValid;
    }

    /**
     * Initiates the task to save user-specific two-factor authentication settings asynchronously.
     *
     * @method saveUserTwoFaSettings
     * @param {Object} twoFaSettings - User-specific two-factor authentication settings.
     */
    @task *saveUserTwoFaSettings(twoFaSettings = {}) {
        yield this.fetch
            .post('users/two-fa', { twoFaSettings })
            .then(() => {
                this.notifications.success('2FA Settings saved successfully.');
            })
            .catch((error) => {
                this.notifications.serverError(error);
            });
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
}
