import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class AuthResetPasswordController extends Controller {
    /**
     * Inject the `fetch` service
     *
     * @memberof AuthResetPasswordController
     */
    @service fetch;

    /**
     * Inject the `notifications` service
     *
     * @memberof AuthResetPasswordController
     */
    @service notifications;

    /**
     * Inject the `router` service
     *
     * @memberof AuthResetPasswordController
     */
    @service router;

    /**
     * Inject the `intl` service
     *
     * @memberof AuthResetPasswordController
     */
    @service intl;

    /**
     * The code param.
     *
     * @memberof AuthResetPasswordController
     */
    @tracked code;

    /**
     * Users new password.
     *
     * @memberof AuthResetPasswordController
     */
    @tracked password;

    /**
     * Users new password confirmation.
     *
     * @memberof AuthResetPasswordController
     */
    @tracked password_confirmation;

    /**
     * Loading stae of password reset.
     *
     * @memberof AuthResetPasswordController
     */
    @tracked isLoading;

    /**
     * The reset password action.
     *
     * @memberof AuthResetPasswordController
     */
    @action resetPassword(event) {
        // firefox patch
        event.preventDefault();

        const { code, password, password_confirmation } = this;
        const { id } = this.model;

        this.isLoading = true;

        this.fetch
            .post('auth/reset-password', { link: id, code, password, password_confirmation })
            .then(() => {
                this.notifications.success(this.intl.t('auth.reset-password.success-message'));

                return this.router.transitionTo('auth.login');
            })
            .catch((error) => {
                this.notifications.serverError(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
