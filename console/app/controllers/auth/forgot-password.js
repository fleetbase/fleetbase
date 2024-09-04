import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency';

export default class AuthForgotPasswordController extends Controller {
    @service fetch;
    @service notifications;
    @service intl;

    /**
     * The email variable
     *
     * @memberof AuthForgotPasswordController
     */
    @tracked email;

    /**
     * Indicator if request has been sent.
     *
     * @memberof AuthForgotPasswordController
     */
    @tracked isSent = false;

    /**
     * Query parameters.
     *
     * @memberof AuthForgotPasswordController
     */
    queryParams = ['email'];

    /**
     * Sends a secure magic reset link to the user provided email.
     *
     * @memberof AuthForgotPasswordController
     */
    @task *sendSecureLink(event) {
        event.preventDefault();

        try {
            yield this.fetch.post('auth/get-magic-reset-link', { email: this.email });
            this.notifications.success(this.intl.t('auth.forgot-password.success-message'));
            this.isSent = true;
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}
