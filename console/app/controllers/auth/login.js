import Controller, { inject as controller } from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import pathToRoute from '@fleetbase/ember-core/utils/path-to-route';

export default class AuthLoginController extends Controller {
    @controller('auth.forgot-password') forgotPasswordController;
    @service notifications;
    @service urlSearchParams;
    @service session;
    @service router;
    @service intl;
    @service fetch;
    @service oauth;

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
     * Authentication token.
     *
     * @memberof AuthLoginController
     */
    @tracked token;

    /**
     * Action to login user.
     *
     * @param {Event} event
     * @return {void}
     * @memberof AuthLoginController
     */
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

            // Handle password reset required
            if (error.toString().includes('reset required')) {
                return this.sendUserForPasswordReset(identity);
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

    // -----------------------------------------------------------------------
    // OAuth provider sign-in (issue #453)
    // -----------------------------------------------------------------------
    //
    // Each action delegates the provider-side handshake to the `oauth`
    // service, then hands the resulting credential to the existing
    // FleetbaseAuthenticator with the `auth/oauth/<provider>` path. The
    // server verifies the token, creates / links the user, and issues a
    // Sanctum token — so the session state below is identical to a
    // successful password login.
    //
    // We DON'T pre-check 2FA here (unlike the password path) because the
    // server-side OAuth endpoint may return the same 2FA challenge
    // payload on demand. The `success`/`failure` reset semantics are
    // shared with `login`.

    /** Google Sign-In. */
    @action loginWithGoogle() {
        return this._oauthSignIn('google', () => this.oauth.signInWithGoogle(), 'auth/oauth/google');
    }

    /** Facebook Login. */
    @action loginWithFacebook() {
        return this._oauthSignIn('facebook', () => this.oauth.signInWithFacebook(), 'auth/oauth/facebook');
    }

    /** Microsoft / Office365 Sign-In. */
    @action loginWithOffice365() {
        return this._oauthSignIn('office365', () => this.oauth.signInWithOffice365(), 'auth/oauth/office365');
    }

    /** Sign in with Apple. */
    @action loginWithApple() {
        return this._oauthSignIn('apple', () => this.oauth.signInWithApple(), 'auth/oauth/apple');
    }

    /**
     * Shared OAuth login flow. Catches both the provider-side handshake
     * failures (popup blocked, user cancelled, SDK load failed) and the
     * server-side verification failures (HTTP 400 from the AuthController)
     * with provider-specific notification copy.
     */
    async _oauthSignIn(providerKey, obtainCredential, authPath) {
        if (this.isLoading) return;
        this.set('isLoading', true);
        this.setRedirect();

        let credentials;
        try {
            credentials = await obtainCredential();
        } catch (error) {
            this.notifications.error(
                this.intl.t(`auth.login.oauth.${providerKey}.handshake-failed`, {
                    error: error && error.message ? error.message : String(error),
                })
            );
            this.reset('error');
            return;
        }

        try {
            await this.session.authenticate('authenticator:fleetbase', credentials, false, authPath);
        } catch (error) {
            this.notifications.serverError(error);
            this.reset('error');
            return;
        }

        if (this.session.isAuthenticated) {
            this.success();
        }
    }

    /** True when the corresponding provider has a clientId/appId set. */
    get isGoogleConfigured()    { return this.oauth.isConfigured('google'); }
    get isFacebookConfigured()  { return this.oauth.isConfigured('facebook'); }
    get isOffice365Configured() { return this.oauth.isConfigured('microsoft'); }
    get isAppleConfigured()     { return this.oauth.isConfigured('apple'); }

    /** True when at least one OAuth provider is configured — controls the divider. */
    get anyOauthConfigured() {
        return this.isGoogleConfigured
            || this.isFacebookConfigured
            || this.isOffice365Configured
            || this.isAppleConfigured;
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
     * Sends user to forgot password flow.
     *
     * @param {String} email
     * @return {Promise<Transition>}
     * @memberof AuthLoginController
     */
    @action sendUserForPasswordReset(email) {
        this.notifications.warning(this.intl.t('auth.login.password-reset-required'));
        return this.router.transitionTo('auth.forgot-password', { queryParams: { email } }).then(() => {
            this.reset('error');
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
