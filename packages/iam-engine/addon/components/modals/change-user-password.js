import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class ModalsChangeUserPasswordComponent extends Component {
    @service fetch;
    @service notifications;
    @service intl;
    @tracked options = {};
    @tracked password;
    @tracked confirmPassword;
    @tracked sendCredentials = true;
    @tracked user;

    constructor(owner, { options }) {
        super(...arguments);
        this.user = options.user;
        this.options = options;
        this.setupOptions();
    }

    setupOptions() {
        this.options.title = this.intl.t('fleet-ops.user-management.reset-user-credentials');
        this.options.acceptButtonText = this.intl.t('fleet-ops.user-management.reset-credentials');
        this.options.declineButtonHidden = true;
        this.options.confirm = async (modal) => {
            modal.startLoading();

            try {
                await this.fetch.post('auth/change-user-password', {
                    user: this.user.id,
                    password: this.password,
                    password_confirmation: this.confirmPassword,
                    send_credentials: this.sendCredentials,
                });

                this.notifications.success('User password reset.');

                if (typeof this.options.onPasswordResetComplete === 'function') {
                    this.options.onPasswordResetComplete();
                }

                modal.done();
            } catch (error) {
                this.notifications.serverError(error);
                modal.stopLoading();
            }
        };
    }
}
