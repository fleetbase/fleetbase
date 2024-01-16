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
    @tracked methods = getTwoFaMethods();

    /**
     * The 2FA settings value JSON.
     *
     * @memberof ConsoleAdminNotificationsController
     * @var {Object}
     */
    @tracked twoFaSettings = {
        enabled: false,
        enforced: false,
        method: 'email',
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
        this.loadSystemTwoFaConfig.perform();
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
     * Action method triggered when Two-Factor Authentication enforcement is toggled.
     *
     * @action
     * @param {Boolean} isEnabled - The new state of Two-Factor Authentication.
     */
    @action onTwoFaEnforcedToggled(isEnabled) {
        this.onTwoFaEnforcedToggled = isEnabled;
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
            enforced: this.isTwoFaEnforced,
            method: this.twoFaMethod,
        };

        this.isLoading = true;

        return this.fetch
            .post('two-fa/config', { twoFaSettings })
            .then(() => {
                this.notifications.success('2FA Configuration saved successfully.');
            })
            .catch((error) => {
                this.notifications.serverError(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
