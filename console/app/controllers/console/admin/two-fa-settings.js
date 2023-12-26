import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

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

    @tracked selected2FAMethod = null;

    @tracked is2FAEnabled = true;

    /**
     * The 2FA settings value JSON.
     *
     * @memberof ConsoleAdminNotificationsController
     * @var {Object}
     */
    @tracked twoFaSettings = {
        Selected: this.selected2FAMethod,
        Enabled: this.is2FAEnabled,
    };

    /**
     * Tracked property for the loading state
     *
     * @memberof ConsoleAdminTwoFaSettingsController
     * @var {Boolean}
     */
    @tracked isLoading = false;

    constructor() {
        super(...arguments);
        this.twoFaSettings;
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
        const { twoFaSettings } = this;

        console.log('settings', twoFaSettings);

        this.isLoading = true;

        return this.fetch
            .post('two-fa-settings/save-settings', { twoFaSettings })
            .then(() => {
                this.notifications.success('2FA settings successfully saved.');
            })
            .catch((error) => {
                this.notifications.serverError(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
