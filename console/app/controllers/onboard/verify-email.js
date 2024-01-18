import AuthVerificationController from '../auth/verification';
import { action } from '@ember/object';

export default class OnboardVerifyEmailController extends AuthVerificationController {
    /**
     * Submits to verify code.
     *
     * @return {Promise}
     * @memberof OnboardVerifyEmailController
     */
    @action verifyCode() {
        const { hello, code } = this;

        this.isLoading = true;

        return this.fetch
            .post('onboard/verify-email', { session: hello, code })
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
}
