import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
import getTwoFaMethods from '@fleetbase/console/utils/get-two-fa-methods';

/**
 * Controller for managing user authentication and password-related actions in the console.
 *
 * @class ConsoleAccountAuthController
 * @extends Controller
 */
export default class ConsoleAccountAuthController extends Controller {
    @service currentUser;
    @service fetch;
    @service notifications;
    @service router;

    /**
     * The new email address the user wants to verify.
     *
     * @type {string}
     */
    @tracked newEmail;

    /**
     * The current password used to authorize an email change.
     *
     * @type {string}
     */
    @tracked currentPassword;

    /**
     * The current password used to authorize a password change.
     *
     * @type {string}
     */
    @tracked changePasswordCurrentPassword;

    /**
     * The new password the user intends to set.
     *
     * @type {string}
     */
    @tracked newPassword;

    /**
     * Whether the user may change their own password.
     *
     * @type {boolean}
     */
    @tracked canChangePassword = true;

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
     * Load the 2FA settings this page shows. Called by the route on entry.
     *
     * Not done in the constructor: the router looks a route's controller up to read its
     * query params before the parent route's authentication check has run. After a
     * sign-out reloads the page on this URL, that lookup alone would fire these requests
     * with no session, and each 401 would surface as an "Unauthenticated." error.
     *
     * @method load
     */
    @action load() {
        this.loadSystemTwoFaConfig.perform();
        this.loadUserTwoFaSettings.perform();
        this.loadPasswordPolicy.perform();
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
     * Initiates the task to request an email change for the current user.
     *
     * @method changeEmail
     */
    @task *changeEmail(event) {
        if (event instanceof Event) {
            event.preventDefault();
        }

        try {
            yield this.fetch.post('users/change-email', {
                email: this.newEmail,
                password: this.currentPassword,
            });

            this.notifications.success('Email change verification sent. Confirm the new address before your login email changes.');
            this.newEmail = undefined;
            this.currentPassword = undefined;
        } catch (error) {
            this.notifications.serverError(error, 'Failed to request email change.');
        }
    }

    /**
     * Initiates the task to change the user's password asynchronously. The current
     * password is sent with the new one and checked by the server.
     *
     * @method changePassword
     */
    @task *changePassword(event) {
        // If from event fired
        if (event instanceof Event) {
            event.preventDefault();
        }

        try {
            yield this.fetch.post('users/change-password', {
                current_password: this.changePasswordCurrentPassword,
                password: this.newPassword,
                password_confirmation: this.newConfirmPassword,
            });

            this.notifications.success('Password changed successfully.');
        } catch (error) {
            this.notifications.serverError(error, 'Failed to change password.');
        }

        this.changePasswordCurrentPassword = undefined;
        this.newPassword = undefined;
        this.newConfirmPassword = undefined;
    }

    /**
     * Loads whether the user may change their own password.
     *
     * @method loadPasswordPolicy
     */
    @task *loadPasswordPolicy() {
        try {
            const policy = yield this.fetch.get('users/password-policy');
            this.canChangePassword = policy?.can_change_password !== false;
        } catch {
            // Older servers have no password policy endpoint; keep the form available.
            this.canChangePassword = true;
        }
    }

    /**
     * Initiates the task to save user-specific two-factor authentication settings asynchronously.
     *
     * @method saveUserTwoFaSettings
     * @param {Object} twoFaSettings - User-specific two-factor authentication settings.
     */
    @task *saveUserTwoFaSettings(twoFaSettings = {}) {
        try {
            yield this.fetch.post('users/two-fa', { twoFaSettings });
            this.notifications.success('2FA Settings saved successfully.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    /**
     * Initiates the task to load user-specific two-factor authentication settings asynchronously.
     *
     * @method loadUserTwoFaSettings
     */
    @task *loadUserTwoFaSettings() {
        try {
            const twoFaSettings = yield this.fetch.get('users/two-fa');
            if (twoFaSettings) {
                this.isUserTwoFaEnabled = twoFaSettings.enabled;
                this.twoFaSettings = twoFaSettings;
            }

            return twoFaSettings;
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    /**
     * Initiates the task to load system-wide two-factor authentication configuration asynchronously.
     *
     * @method loadSystemTwoFaConfig
     */
    @task *loadSystemTwoFaConfig() {
        try {
            const twoFaConfig = yield this.fetch.get('two-fa/config');
            if (twoFaConfig) {
                this.isSystemTwoFaEnabled = twoFaConfig.enabled;
                this.twoFaConfig = twoFaConfig;
            }

            return twoFaConfig;
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}
