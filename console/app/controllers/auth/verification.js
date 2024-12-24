import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import { task } from 'ember-concurrency';

export default class AuthVerificationController extends Controller {
    @service fetch;
    @service notifications;
    @service modalsManager;
    @service currentUser;
    @service router;
    @service session;
    @service intl;

    /** props */
    @tracked hello;
    @tracked token;
    @tracked code;
    @tracked email;
    @tracked isReadyToSubmit = false;
    @tracked waitTimeout = 1000 * 60 * 1.25;
    @tracked stillWaiting = false;
    @tracked queryParams = ['hello', 'token', 'code'];

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

    @action onDidntReceiveCode() {
        this.stillWaiting = true;
    }

    @action validateInput({ target: { value } }) {
        if (value.length > 5) {
            this.isReadyToSubmit = true;
        } else {
            this.isReadyToSubmit = false;
        }
    }

    @action validateInitInput(el) {
        const value = el.value;
        if (value.length > 5) {
            this.isReadyToSubmit = true;
        } else {
            this.isReadyToSubmit = false;
        }
    }

    @task *verifyCode() {
        try {
            const { status, token } = yield this.fetch.post('auth/verify-email', { token: this.token, code: this.code, email: this.email, authenticate: true });
            if (status === 'ok') {
                this.notifications.success('Email successfully verified!');

                if (token) {
                    this.notifications.info(`Welcome to ${this.intl.t('app.name')}`);
                    this.session.manuallyAuthenticate(token);

                    return this.router.transitionTo('console');
                }

                return this.router.transitionTo('auth.login');
            }
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action resendBySms() {
        this.modalsManager.show('modals/verify-by-sms', {
            title: 'Verify Account by Phone',
            acceptButtonText: 'Send',
            phone: this.currentUser.phone,
            confirm: async (modal) => {
                modal.startLoading();
                const phone = modal.getOption('phone');
                if (!phone) {
                    this.notifications.error('No phone number provided.');
                }

                try {
                    await this.fetch.post('onboard/send-verification-sms', { phone, session: this.hello });
                    this.notifications.success('Verification code SMS sent!');
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    @action resendEmail() {
        this.modalsManager.show('modals/resend-verification-email', {
            title: 'Resend Verification Code',
            acceptButtonText: 'Send',
            email: this.currentUser.email,
            confirm: async (modal) => {
                modal.startLoading();
                const email = modal.getOption('email');
                if (!email) {
                    this.notifications.error('No email number provided.');
                }

                try {
                    await this.fetch.post('onboard/send-verification-email', { email, session: this.hello });
                    this.notifications.success('Verification code email sent!');
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }
}
