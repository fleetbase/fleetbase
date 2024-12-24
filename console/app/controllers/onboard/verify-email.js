import AuthVerificationController from '../auth/verification';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import { not } from '@ember/object/computed';
import { task } from 'ember-concurrency';

export default class OnboardVerifyEmailController extends AuthVerificationController {
    @service fetch;
    @service notifications;
    @service session;
    @service currentUser;
    @service router;

    /** props */
    @tracked hello;
    @tracked code;
    @tracked queryParams = ['hello', 'code'];

    @task *verifyCode() {
        try {
            const { status, token } = yield this.fetch.post('onboard/verify-email', { session: this.hello, code: this.code });
            if (status === 'ok') {
                this.notifications.success('Email successfully verified!');

                if (token) {
                    this.notifications.info('Welcome to Fleetbase!');
                    this.session.manuallyAuthenticate(token);

                    return this.router.transitionTo('console');
                }

                return this.router.transitionTo('auth.login');
            }
        } catch (error) {
            this.notifications.serverError(error);
        }
    }
}
