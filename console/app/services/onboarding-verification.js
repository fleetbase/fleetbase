import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { later } from '@ember/runloop';

/**
 * Drives the verify-email step of the onboarding flow: tracks whether the entered code
 * looks complete, prompts after the code has taken too long to arrive, and resends it by
 * email or SMS. Submitting the code is the step component's own job — this service does not
 * do it.
 */
export default class OnboardingVerificationService extends Service {
    @service fetch;
    @service notifications;
    @service modalsManager;
    @service currentUser;
    @tracked ready;
    @tracked waiting = false;

    /**
     * The onboarding session the verification code was issued against. The resend endpoints
     * need it to tie a new code to the session already in progress. The verification screens
     * carry it in a `hello` query param, but that name only ever existed to dodge a clash
     * with the session service, which this no longer injects.
     */
    @tracked session;

    @action start(options = {}) {
        if (options?.session !== undefined) {
            this.setSession(options.session);
        }

        // Hand the timer back so callers can cancel it. Without this the 75s wait is
        // unreachable once scheduled and will still fire after its caller has gone away.
        return this.#wait(options?.timeout ?? 75000);
    }

    @action didntReceiveCode() {
        this.waiting = true;
    }

    @action validateInput(event) {
        const value = event instanceof HTMLElement ? event.value : (event?.target?.value ?? '');
        this.ready = value?.length > 5;
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
                    return modal.stopLoading();
                }

                try {
                    await this.fetch.post('onboard/send-verification-sms', { phone, session: this.session });
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
                    this.notifications.error('No email address provided.');
                    return modal.stopLoading();
                }

                try {
                    await this.fetch.post('onboard/send-verification-email', { email, session: this.session });
                    this.notifications.success('Verification code email sent!');
                    modal.done();
                } catch (error) {
                    this.notifications.serverError(error);
                    modal.stopLoading();
                }
            },
        });
    }

    setSession(session) {
        this.session = session;
    }

    // start() is the only caller and always resolves the timeout itself, so this takes no
    // default of its own.
    #wait(timeout) {
        return later(
            this,
            () => {
                this.waiting = true;
            },
            timeout
        );
    }
}
