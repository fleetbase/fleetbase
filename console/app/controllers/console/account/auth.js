import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency-decorators';
import getTwoFaMethods from '@fleetbase/console/utils/get-two-fa-methods';

export default class ConsoleAccountAuthController extends Controller {
    @service fetch;
    @tracked password;
    @tracked confirmPassword;
    @tracked newPassword;
    @tracked twoFaConfig = {};
    @tracked twoFaSettings = {};
    @tracked isSystemTwoFaEnabled = false;
    @tracked methods = getTwoFaMethods();

    constructor() {
        super(...arguments);
        this.loadSystemTwoFaConfig.perform();
        this.loadUserTwoFaSettings.perform();
    }

    @action validatePassword(event) {
        event.preventDefault();
    }

    @action changeUserPassword(event) {
        event.preventDefault();
    }

    @action onTwoFaToggled(enabled) {
        this.twoFaSettings = {
            ...this.twoFaSettings,
            enabled,
        };
    }

    @action onTwoFaMethodSelected(method) {
        this.twoFaSettings = {
            ...this.twoFaSettings,
            method,
        };
    }

    @action saveTwoFactorAuthSettings() {
        this.saveUserTwoFaSettings.perform(this.twoFaSettings);
    }

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

    @task *loadUserTwoFaSettings() {
        const twoFaSettings = yield this.fetch.get('users/two-fa');

        if (twoFaSettings) {
            this.twoFaSettings = twoFaSettings;
        }

        return twoFaSettings;
    }

    @task *loadSystemTwoFaConfig() {
        const twoFaConfig = yield this.fetch.get('two-fa/config');

        if (twoFaConfig) {
            this.isSystemTwoFaEnabled = twoFaConfig.enabled;
            this.twoFaConfig = twoFaConfig;
        }

        return twoFaConfig;
    }
}
