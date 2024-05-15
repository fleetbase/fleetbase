import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import { not } from '@ember/object/computed';

export default class AuthVerificationController extends Controller {
    /**
     * Inject the `fetch` service
     *
     * @memberof OnboardIndexController
     */
    @service fetch;

    /**
     * Inject the `notifications` service
     *
     * @memberof OnboardIndexController
     */
    @service notifications;

    /**
     * Inject the `modalsManager` service
     *
     * @memberof OnboardIndexController
     */
    @service modalsManager;

    /**
     * Inject the `currentUser` service
     *
     * @memberof OnboardIndexController
     */
    @service currentUser;

    /**
     * Inject the `router` service
     *
     * @memberof OnboardIndexController
     */
    @service router;

    /**
     * Inject the `session` service
     *
     * @memberof OnboardIndexController
     */
    @service session;

    /**
     * The session paramerer.
     *
     * @memberof OnboardVerifyEmailController
     */
    @tracked hello;

    /**
     * The token paramerer.
     *
     * @memberof OnboardVerifyEmailController
     */
    @tracked token;

    /**
     * The loading state of the verification request.
     *
     * @memberof OnboardVerifyEmailController
     */
    @tracked isLoading = false;

    /**
     * Validation state tracker.
     *
     * @memberof OnboardVerifyEmailController
     */
    @tracked isReadyToSubmit = false;

    /**
     * The request timeout to trigger alternative verification options.
     *
     * @memberof OnboardVerifyEmailController
     */
    @tracked waitTimeout = 1000 * 60 * 1.25;

    /**
     * Determines if Fleetbase is still awaiting verification after a certain time.
     *
     * @memberof OnboardVerifyEmailController
     */
    @tracked stillWaiting = false;

    /**
     * the input code.
     *
     * @memberof OnboardVerifyEmailController
     */
    @tracked code;

    /**
     * The query param for the session token.
     *
     * @memberof OnboardVerifyEmailController
     */
    @tracked queryParams = ['hello', 'token'];

    /**
     * The boolean opposite of `isReadyToSubmit`
     *
     * @memberof OnboardVerifyEmailController
     */
    @not('isReadyToSubmit') isNotReadyToSubmit;

    /**
     * Creates an instance of OnboardVerifyEmailController.
     * @memberof OnboardVerifyEmailController
     */
    constructor() {
        super(...arguments);

        later(
            this,
            () => {
                this.stillWaiting = true;
            },
            this.waitTimeout
        );
    }

    /**
     * Allow user to manually trigger no code received prompt.
     *
     * @memberof AuthVerificationController
     */
    @action onDidntReceiveCode() {
        this.stillWaiting = true;
    }

    /**
     * Validates the input
     *
     * @param {InputEvent} { target: { value } }
     * @memberof OnboardVerifyEmailController
     */
    @action validateInput({ target: { value } }) {
        if (value.length > 5) {
            this.isReadyToSubmit = true;
        } else {
            this.isReadyToSubmit = false;
        }
    }

    /**
     * Validates input on the first render
     *
     * @param {HTMLElement} el
     * @memberof AuthVerificationController
     */
    @action validateInitInput(el) {
        const value = el.value;
        if (value.length > 5) {
            this.isReadyToSubmit = true;
        } else {
            this.isReadyToSubmit = false;
        }
    }

    /**
     * Submits to verify code.
     *
     * @return {Promise}
     * @memberof OnboardVerifyEmailController
     */
    @action verifyCode() {
        const { token, code, email } = this;

        this.isLoading = true;

        return this.fetch
            .post('auth/verify-email', { token, code, email, authenticate: true })
            .then(({ status, token }) => {
                if (status === 'ok') {
                    this.notifications.success('Email successfully verified!');

                    if (token) {
                        this.notifications.info('Welcome to Fleetbase!');
                        this.session.manuallyAuthenticate(token);

                        return this.router.transitionTo('console');
                    }

                    return this.router.transitionTo('auth.login');
                }
            })
            .catch((error) => {
                this.notifications.serverError(error);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    /**
     * Action to resend verification code by SMS.
     *
     * @memberof OnboardVerifyEmailController
     */
    @action resendBySms() {
        this.modalsManager.show('modals/verify-by-sms', {
            title: 'Verify Account by Phone',
            acceptButtonText: 'Send',
            phone: this.currentUser.phone,
            confirm: (modal) => {
                modal.startLoading();
                const phone = modal.getOption('phone');

                return this.fetch
                    .post('onboard/send-verification-sms', { phone, session: this.hello })
                    .then(() => {
                        this.notifications.success('Verification code SMS sent!');
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);
                    });
            },
        });
    }

    /**
     * Action to resend verification code by email.
     *
     * @memberof OnboardVerifyEmailController
     */
    @action resendEmail() {
        this.modalsManager.show('modals/resend-verification-email', {
            title: 'Resend Verification Code',
            acceptButtonText: 'Send',
            email: this.currentUser.email,
            confirm: (modal) => {
                modal.startLoading();
                const email = modal.getOption('email');

                return this.fetch
                    .post('onboard/send-verification-email', { email, session: this.hello })
                    .then(() => {
                        this.notifications.success('Verification code email sent!');
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);
                    });
            },
        });
    }
}
