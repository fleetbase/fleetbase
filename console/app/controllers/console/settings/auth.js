import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';

export default class ConsoleSettingsAuthController extends Controller {
    @service fetch;
    @service notifications;

    /**
     * Whether users in the organization may change their own password. When off, only
     * administrators and users with the `iam change-password` permission can.
     *
     * @type {boolean}
     */
    @tracked allowUsersChangePassword = true;

    /**
     * Load the organization's authentication settings. Called by the route on entry,
     * see `ConsoleSettingsTwoFaController.load` for why this is not in the constructor.
     *
     * @method load
     */
    @action load() {
        this.loadAuthSettings.perform();
    }

    @action onAllowUsersChangePasswordToggled(allowed) {
        this.allowUsersChangePassword = allowed;
    }

    @task *loadAuthSettings() {
        try {
            const settings = yield this.fetch.get('companies/auth-settings');
            if (settings) {
                this.allowUsersChangePassword = settings.allow_users_change_password !== false;
            }
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *saveAuthSettings() {
        try {
            yield this.fetch.post('companies/auth-settings', {
                allow_users_change_password: this.allowUsersChangePassword,
            });
            this.notifications.success('Authentication settings saved.');
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}
