import Controller, { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import pathToRoute from '@fleetbase/ember-core/utils/path-to-route';

export default class AuthLoginController extends Controller {
    /**
     * Inject the `forgotPassword` controller
     *
     * @var {Controller}
     */
    @controller('auth.forgot-password') forgotPasswordController;

    /**
     * Inject the `notifications` service
     *
     * @var {Service}
     */
    @service notifications;

    /**
     * Inject the `urlSearchParams` service
     *
     * @var {Service}
     */
    @service urlSearchParams;

    /**
     * Inject the `session` service
     *
     * @var {Service}
     */
    @service session;

    /**
     * Inject the `router` service
     *
     * @var {Service}
     */
    @service router;

    /**
     * Inject the `intl` service
     *
     * @var {Service}
     */
    @service intl;

    /**
     * Inject the `fetch` service
     *
     * @var {Service}
     */
    @service fetch;

    /**
     * Whether or not to remember the users session
     *
     * @var {Boolean}
     */
    @tracked rememberMe = false;

    /**
     * The identity to authenticate with
     *
     * @var {String}
     */
    @tracked identity = null;

    /**
     * The password to authenticate with
     *
     * @var {String}
     */
    @tracked password = null;

    /**
     * Login is validating user input
     *
     * @var {Boolean}
     */
    @tracked isValidating = false;

    /**
     * Login is processing
     *
     * @var {Boolean}
     */
    @tracked isLoading = false;

    /**
     * If the connection or requesst it taking too long
     *
     * @var {Boolean}
     */
    @tracked isSlowConnection = false;

    /**
     * Interval to determine when to timeout the request
     *
     * @var {Integer}
     */
    @tracked timeout = null;

    /**
     * Number of failed login attempts
     *
     * @var {Integer}
     */
    @tracked failedAttempts = 0;

    @tracked token;

    @action async login(event) {
        // firefox patch
        event.preventDefault();
        // get user credentials
        const { identity, password, rememberMe } = this;

        // If no password error
        if (!identity) {
            return this.notifications.warning(this.intl.t('auth.login.no-identity-notification'));
        }

        // If no password error
        if (!password) {
            return this.notifications.warning(this.intl.t('auth.login.no-identity-notification'));
        }

        // start loader
        this.set('isLoading', true);
        // set where to redirect on login
        this.setRedirect();

        // send request to check for 2fa
        try {
            let { twoFaSession, isTwoFaEnabled } = await this.session.checkForTwoFactor(identity);

            if (isTwoFaEnabled) {
                return this.session.store
                    .persist({ identity })
                    .then(() => {
                        return this.router.transitionTo('auth.two-fa', { queryParams: { token: twoFaSession } }).then(() => {
                            this.reset('success');
                        });
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);
                        this.reset('error');

                        throw error;
                    });
            }
        } catch (error) {
            return this.notifications.serverError(error);
        }

        try {
            await this.session.authenticate('authenticator:fleetbase', { identity, password }, rememberMe);
        } catch (error) {
            this.failedAttempts++;

            // Handle unverified user
            if (error.toString().includes('not verified')) {
                return this.sendUserForEmailVerification(identity);
            }

            return this.failure(error);
        }

        if (this.session.isAuthenticated) {
            this.success();
        }
    }

    /**
     * Transition user to onboarding screen
     */
    @action transitionToOnboard() {
        return this.router.transitionTo('onboard');
    }

    /**
     * Transition to forgot password screen, if email is set - set it.
     */
    @action forgotPassword() {
        return this.router.transitionTo('auth.forgot-password').then(() => {
            if (this.email) {
                this.forgotPasswordController.email = this.email;
            }
        });
    }

    /**
     * Creates an email verification session and transitions user to verification route.
     *
     * @param {String} email
     * @return {Promise<Transition>}
     * @memberof AuthLoginController
     */
    @action sendUserForEmailVerification(email) {
        return this.fetch.post('auth/create-verification-session', { email, send: true }).then(({ token, session }) => {
            return this.session.store.persist({ email }).then(() => {
                this.notifications.warning(this.intl.t('auth.login.unverified-notification'));
                return this.router.transitionTo('auth.verification', { queryParams: { token, hello: session } }).then(() => {
                    this.reset('error');
                });
            });
        });
    }

    /**
     * Sets correct route to send user to after login.
     *
     * @void
     */
    setRedirect() {
        const shift = this.urlSearchParams.get('shift');

        if (shift) {
            this.session.setRedirect(pathToRoute(shift));
        }
    }

    /**
     * Handles the authentication success
     *
     * @void
     */
    success() {
        this.reset('success');
    }

    /**
     * Handles the authentication failure
     *
     * @param {String} error An error message
     * @void
     */
    failure(error) {
        this.notifications.serverError(error);
        this.reset('error');
    }

    /**
     * Handles the request slow connection
     *
     * @void
     */
    slowConnection() {
        this.notifications.error(this.intl.t('auth.login.slow-connection-message'));
    }

    /**
     * Reset the login form
     *
     * @param {String} type
     * @void
     */
    reset(type) {
        // reset login form state
        this.isLoading = false;
        this.isSlowConnection = false;
        // reset login form state depending on type of reset
        switch (type) {
            case 'success':
                this.identity = null;
                this.password = null;
                this.isValidating = false;
                break;
            case 'error':
            case 'fail':
                this.password = null;
                break;
        }
        // clearTimeout(this.timeout);
    }
}
