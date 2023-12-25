import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class TwoFaSettingsComponent extends Component {
    @service fetch;
    @service notifications;

    @tracked is2FAEnabled = false;
    @tracked selected2FAMethod;

    TwoFaMethods = [
        { name: 'Authenticator App', description: 'Get codes from an app like Authy, 1Password, Microsoft Authenticator, or Google Authenticator', recommended: true },
        { name: 'SMS', description: 'Receive a unique code via SMS' },
        { name: 'Email', description: 'Receive a unique code via Email' },
    ];

    constructor() {
        super(...arguments);
        if (this.is2FAEnabled) {
            this.selected2FAMethod = this.TwoFaMethods.find((method) => method.recommended);
        }
    }

    @action async toggle2FA() {
        this.is2FAEnabled = !this.is2FAEnabled;

        if (!this.is2FAEnabled) {
            this.selected2FAMethod = null;
        } else {
            this.selected2FAMethod = this.TwoFaMethods.find((method) => method.recommended);
        }

        console.log('selected2FAMethod:', this.selected2FAMethod);
    }

    @action select2FAMethod(method) {
        this.selected2FAMethod = method;
        console.log('selected2FAMethod:', this.selected2FAMethod);
    }
}
