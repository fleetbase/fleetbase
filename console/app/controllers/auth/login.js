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

    /**
     * Authenticate the user
     *
     * @void
     */
    @action async login(event) {
        // firefox patch
        event.preventDefault();

        // get user credentials
        const { email, password, rememberMe } = this;

        // If no password error
        if (!email) {
            return this.notifications.warning('Did you forget to enter your email?');
        }

        // If no password error
        if (!password) {
            return this.notifications.warning('Did you forget to enter your password?');
        }

        // start loader
        this.set('isLoading', true);

        // set where to redirect on login
        this.setRedirect();

        try {
            await this.session.authenticate('authenticator:fleetbase', { email, password }, rememberMe);
        } catch (error) {
            this.failedAttempts++;

            // Handle unverified user
            if (error.toString().includes('not verified')) {
                return this.sendUserForEmailVerification(email);
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
    sendUserForEmailVerification(email) {
        return this.fetch.post('auth/create-verification-session', { email, send: true }).then(({ token }) => {
            return this.session.store.persist({ email }).then(() => {
                this.notifications.warning('Your account needs to be verified to proceed.');
                return this.router
                    .transitionTo('auth.verification', {
                        queryParams: {
                            token,
                        },
                    })
                    .then(() => {
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
        this.notifications.error('Experiencing connectivity issues.');
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
