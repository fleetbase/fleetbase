import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
/**
 * Controller responsible for handling two-factor authentication.
 * @class AuthTwoFaController
 * @extends Controller
 */
export default class AuthTwoFaController extends Controller {
    /**
     * Tracked property for storing the verification token.
     *
     * @property {string} token
     * @tracked
     */
    @tracked token;

    /**
     * Tracked property representing the remaining time in seconds for the countdown.
     *
     * @property {number} timeRemaining
     * @tracked
     * @default 60
     */
    @tracked timeRemaining = 60;

    /**
     * Tracked property representing the client token from the validated 2fa session.
     *
     * @property {number} clientToken
     * @tracked
     * @default null
     */
    @tracked clientToken;

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
     * Query parameters for the controller.
     *
     * @property {Array} queryParams
     */
    queryParams = ['token'];

    /**
     * Action method for verifying the entered verification code.
     *
     * @method verifyCode
     * @action
     */
    @action async verifyCode() {
        try {
            const { token, verificationCode } = this;

            // Call the backend API to verify the entered verification code
            const { authToken } = await this.fetch.post('two-fa/verify-code', {
                token,
                verificationCode,
            });

            // If verification is successful, transition to the desired route
            this.notifications.success('Verification successful!');

            // authenticate user
            this.session.manuallyAuthenticate(authToken);
            this.router.transitionTo('console');
        } catch (error) {
            // Handle verification failure
            this.notifications.error('Verification failed. Please try again.');
        }
    }

    /**
     * Action method for resending the verification code.
     *
     * @method resendCode
     * @action
     */
    @action resendCode() {}

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
