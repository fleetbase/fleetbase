import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class TwoFaSettingsComponent extends Component {
    @tracked is2FAEnabled = false;
    @tracked selected2FAMethod;
    TwoFaMethods = [
        { name: 'Authenticator App', description: 'Get codes from an app like Authy, 1Password, Microsoft Authenticator, or Google Authenticator', recommended: true },
        { name: 'SMS', description: 'Receive a unique code via SMS' },
        { name: 'Email', description: 'Receive a unique code via Email' },
    ];

    @action toggle2FA() {
        this.is2FAEnabled = !this.is2FAEnabled;

        if (!this.is2FAEnabled) {
            this.selected2FAMethod = null;
        }
    }

    @action select2FAMethod(method) {
        this.selected2FAMethod = method;
    }
}
