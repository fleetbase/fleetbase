import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

/**
 * Controller responsible for handling two-factor authentication.
 * @class AuthTwoFaController
 * @extends Controller
 */
export default class AuthTwoFaController extends Controller {
    /**
     * Router service.
     *
     * @var {Service}
     */
    @service router;

    /**
     * Fetch service for making HTTP requests.
     *
     * @var {Service}
     */
    @service fetch;

    /**
     * Notifications service for handling notifications.
     *
     * @var {Service}
     */
    @service notifications;

    /**
     * Session service for managing user sessions.
     *
     * @var {Service}
     */
    @service session;

    /**
     * Internationalization service.
     *
     * @var {Service}
     */
    @service intl;

    /**
     * Tracked property for storing the verification token.
     *
     * @property {string} token
     * @tracked
     */
    @tracked token;

    /**
     * The current 2FA identity in memory
     * @property {string} identity
     * @tracked
     */
    @tracked identity;

    /**
     * Tracked property representing the client token from the validated 2fa session.
     *
     * @property {number} clientToken
     * @tracked
     * @default null
     */
    @tracked clientToken;

    /**
     * Tracked property for storing the verification code.
     *
     * @property {string} verificationCode
     * @tracked
     */
    @tracked verificationCode = '';

    /**
     * Tracked property for storing the verification code.
     *
     * @property {string} verificationCode
     * @tracked
     */
    @tracked otpValue = '';

    /**
     * Tracked property representing the date the 2fa session will expire
     * @property {Date|null} twoFactorSessionExpiresAfter
     * @tracked
     * @default null
     */
    @tracked twoFactorSessionExpiresAfter;

    /**
     * Tracked property representing when the countdown is ready to start.
     *
     * @property {Boolean} countdownReady
     * @tracked
     * @default false
     */
    @tracked countdownReady = false;

    /**
     * Tracked property representing when verification code has expired.
     *
     * @property {Boolean} isCodeExpired
     * @tracked
     * @default false
     */
    @tracked isCodeExpired = false;

    /**
     * Query parameters for the controller.
     *
     * @property {Array} queryParams
     */
    queryParams = ['token', 'clientToken'];

    /**
     * Action method for verifying the entered verification code.
     *
     * @method verifyCode
     * @action
     */
    @action async verifyCode(event) {
        // prevent form default behaviour
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }

        try {
            const { token, verificationCode, clientToken, identity } = this;

            if (!clientToken) {
                this.notifications.error(this.intl.t('auth.two-fa.verify-code.invalid-session-error-notification'));
                return;
            }

            // Call the backend API to verify the entered verification code
            const { authToken } = await this.fetch.post('two-fa/verify', {
                token,
                code: verificationCode,
                clientToken,
                identity,
            });

            // If verification is successful, transition to the desired route
            this.notifications.success(this.intl.t('auth.two-fa.verify-code.verification-successful-notification'));

            // authenticate user
            return this.session.authenticate('authenticator:fleetbase', { authToken }).then(() => {
                return this.router.transitionTo('console');
            });
        } catch (error) {
            if (error.message.includes('Verification code has expired')) {
                this.notifications.info(this.intl.t('auth.two-fa.verify-code.verification-code-expired-notification'));
            } else {
                this.notifications.error(this.intl.t('auth.two-fa.verify-code.verification-code-failed-notification'));
            }
        }
    }

    /**
     * Resends the verification code for Two-Factor Authentication.
     * Disables the countdown timer while processing and handles success or error notifications.
     *
     * @returns {Promise<void>}
     * @action
     */
    @action async resendCode() {
        // disable countdown timer
        this.countdownReady = false;

        try {
            const { identity, token } = this;
            const { clientToken } = await this.fetch.post('two-fa/resend', {
                identity,
                token,
            });

            if (clientToken) {
                this.clientToken = clientToken;
                this.twoFactorSessionExpiresAfter = this.getExpirationDateFromClientToken(clientToken);
                this.countdownReady = true;
                this.isCodeExpired = false;
                this.notifications.success(this.intl.t('auth.two-fa.resend-code.verification-code-resent-notification'));
            } else {
                this.notifications.error(this.intl.t('auth.two-fa.resend-code.verification-code-resent-error-notification'));
            }
        } catch (error) {
            // Handle errors, show error notifications, etc.
            this.notifications.error(this.intl.t('auth.two-fa.resend-code.verification-code-resent-error-notification'));
        }
    }

    /**
     * Cancels the current Two-Fa session and redirects to login screen.
     *
     * @returns {Promise<Transition>}
     * @memberof AuthTwoFaController
     */
    @action cancelTwoFactor() {
        return this.fetch
            .post('two-fa/invalidate', {
                identity: this.identity,
                token: this.token,
            })
            .then(() => {
                return this.router.transitionTo('auth.login');
            });
    }

    /**
     * Set that the verification code has expired and allow user to resend.
     *
     * @memberof AuthTwoFaController
     */
    @action handleCodeExpired() {
        this.isCodeExpired = true;
        this.countdownReady = false;
    }

    /**
     * Handles the input of the OTP (One-Time Password) and triggers the verification process.
     *
     * @param {string} otpValue - The OTP value entered by the user.
     * @returns {void}
     * @action
     */
    @action handleOtpInput(otpValue) {
        this.verificationCode = otpValue;
        this.verifyCode();
    }

    /**
     * Converts a base64 encoded client token to a Date representing the expiration date.
     *
     * @method getExpirationDateFromClientToken
     * @param {string} clientToken - Base64 encoded client token.
     * @returns {Date|null} - Date representing the expiration date, or null if invalid.
     */
    getExpirationDateFromClientToken(clientToken) {
        const decoder = new TextDecoder();
        const binString = atob(clientToken);
        const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
        const decodedString = decoder.decode(bytes);

        if (typeof decodedString === 'string' && decodedString.includes('|')) {
            const parts = decodedString.split('|');
            const expiresAt = this.convertUtcToClientTime(parts[0]);

            if (expiresAt instanceof Date) {
                return expiresAt;
            }
        }

        return null;
    }

    /**
     * Converts a UTC date-time string to client time zone.
     *
     * @method convertUtcToClientTime
     * @param {string} utcDateTimeString - UTC date-time string.
     * @returns {Date} - Date in client time zone.
     */
    convertUtcToClientTime(utcDateTimeString) {
        const utcDate = new Date(utcDateTimeString);
        const clientTimezoneOffset = new Date().getTimezoneOffset();
        const clientDate = new Date(utcDate.getTime() - clientTimezoneOffset * 60 * 1000);
        return clientDate;
    }
}
