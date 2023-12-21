import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class ConsoleAdminTwoFaSettingsController extends Controller {
    @service notifications;
    @service currentUser;

    @tracked selected2FAMethod;
    @tracked is2FAEnabled = false;

    // @action
    // async saveSettings() {
    //     const currentUser = this.currentUser.user;
    //     if (currentUser) {
    //         console.log('Before setting meta:', currentUser.meta);
    //         currentUser.meta = {
    //             two_factor_method: this.selected2FAMethod,
    //         };
    //         console.log('After setting meta:', currentUser.meta);
    //         try {
    //             await currentUser.save();
    //             this.notifications.success('Settings saved successfully.');
    //         } catch (error) {
    //             console.error('Error saving settings:', error);
    //             this.notifications.error('Failed to save settings.');
    //         }
    //     } else {
    //         console.error('Current user not found.');
    //         this.notifications.error('User not found.');
    //     }
    // }

    @action
    async saveSettings() {
        const currentUser = this.currentUser.user;
        if (currentUser) {
            if (this.selected2FAMethod) {
                currentUser.meta = {
                    two_factor_method: this.selected2FAMethod,
                };
                try {
                    await currentUser.save();
                    this.notifications.success('Settings saved successfully.');
                } catch (error) {
                    console.error('Error saving settings:', error);
                    this.notifications.error('Failed to save settings.');
                }
            } else {
                console.error('No selected 2FA method.');
                this.notifications.warning('Please select a 2FA method before saving.');
            }
        } else {
            console.error('Current user not found.');
            this.notifications.error('User not found.');
        }
    }
}
