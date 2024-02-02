import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class AuthForgotPasswordController extends Controller {
    /**
     * Inject the `fetch` service
     *
     * @memberof AuthForgotPasswordController
     */
    @service fetch;

    /**
     * Inject the `notifications` service
     *
     * @memberof AuthForgotPasswordController
     */
    @service notifications;

    /**
     * Inject the `intl` service
     *
     * @memberof AuthForgotPasswordController
     */
    @service intl;

    /**
     * The email variable
     *
     * @memberof AuthForgotPasswordController
     */
    @tracked email;

    /**
     * The loading state
     *
     * @memberof AuthForgotPasswordController
     */
    @tracked isLoading;

    /**
     * Indicator if request has been sent.
     *
     * @memberof AuthForgotPasswordController
     */
    @tracked isSent = false;

    /**
     * Sends a secure magic reset link to the user provided email.
     *
     * @memberof AuthForgotPasswordController
     */
    @action sendSecureLink(event) {
        // firefox patch
        event.preventDefault();

        const { email } = this;

        this.isLoading = true;

        this.fetch
            .post('auth/get-magic-reset-link', { email })
            .then(() => {
                this.notifications.success(this.intl.t('auth.forgot-password.success-message'));
                this.isSent = true;
            })
            .catch((error) => {
                this.notifications.serverError(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
