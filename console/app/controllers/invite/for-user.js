import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class InviteForUserController extends Controller {
    @service fetch;
    @service session;
    @service notifications;
    @service modalsManager;
    @service router;
    @tracked code;
    @tracked isLoading;

    @action acceptInvite() {
        const { code } = this;

        this.isLoading = true;

        this.fetch
            .post('users/accept-company-invite', { code })
            .then((response) => {
                this.session.manuallyAuthenticate(response.token);
                this.notifications.success('Invitation accepted, welcome to Fleetbase!');

                this.isLoading = false;

                return this.router.transitionTo('console').then(() => {
                    if (response.needs_password && response.needs_password === true) {
                        this.setPassword();
                    }
                });
            })
            .catch((error) => {
                this.notifications.serverError(error);
                this.isLoading = false;
            });
    }

    @action setPassword() {
        this.modalsManager.show('modals/set-password', {
            title: 'Set a new password',
            closeButton: false,
            backdropClose: false,
            hideDeclineButton: true,
            declineButtonDisabled: true,
            password: null,
            password_confirmation: null,
            confirm: (modal) => {
                modal.startLoading();

                const input = modal.getOptions(['password', 'password_confirmation']);

                return this.fetch.post('users/set-password', input);
            },
        });
    }
}
