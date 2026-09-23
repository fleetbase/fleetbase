import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export default class AuthVerifyContactController extends Controller {
    @service fetch;
    @service notifications;
    @service router;
    @service intl;
    @service session;

    /**
     * The verification code query param.
     *
     * @memberof AuthVerifyContactController
     */
    @tracked code;

    /**
     * Whether the email address or phone number has been verified.
     *
     * @memberof AuthVerifyContactController
     */
    @tracked verified = false;

    /**
     * Query parameters.
     *
     * @memberof AuthVerifyContactController
     */
    queryParams = ['code'];

    /**
     * Confirms the email address or phone number from the link.
     *
     * @memberof AuthVerifyContactController
     */
    @task *verify(event) {
        event?.preventDefault();

        const { code } = this;
        const { id } = this.model;

        try {
            yield this.fetch.post('auth/confirm-contact-verification', { link: id, code });
        } catch (error) {
            return this.notifications.serverError(error);
        }

        this.verified = true;
        this.notifications.success(this.intl.t(this.model.channel === 'phone' ? 'auth.verify-contact.phone-verified' : 'auth.verify-contact.email-verified'));
    }

    /**
     * Continue to the console, or to sign in.
     *
     * @memberof AuthVerifyContactController
     */
    @action continue() {
        return this.router.transitionTo(this.session.isAuthenticated ? 'console' : 'auth.login');
    }
}
