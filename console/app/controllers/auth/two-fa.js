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
     * Tracked property for storing the verification token.
     *
     * @property {string} token
     * @tracked
     */
    @tracked token;

    /**
     * The current 2FA identity in memory
     */
    @tracked identity;

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
     * Tracked property representing the client token from the validated 2fa session.
     *
     * @property {number} clientToken
     * @tracked
     * @default null
     */
    @tracked newClientSessionToken;

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
     * Query parameters for the controller.
     *
     * @property {Array} queryParams
     */
    queryParams = ['token', 'clientToken', 'newClientSessionToken'];

    constructor() {
        super(...arguments);
    }

    /**
     * Action method for verifying the entered verification code.
     *
     * @method verifyCode
     * @action
     */
    @action async verifyCode(event) {
        // prevent form default behaviour
        event.preventDefault();

        try {
            const { token, verificationCode, clientToken, identity, newClientSessionToken } = this;

            if (!clientToken && !newClientSessionToken) {
                this.notifications.error('Invalid session. Please try again.');
                return;
            }

            console.log("Verification Code to be verified:", verificationCode);

            // Call the backend API to verify the entered verification code
            const { authToken } = await this.fetch.post('two-fa/verify-code', {
                token,
                verificationCode,
                clientToken,
                identity,
                newClientSessionToken,
            });

            // If verification is successful, transition to the desired route
            this.notifications.success('Verification successful!');

            // authenticate user
            return this.session.authenticate('authenticator:fleetbase', { authToken }).then((response) => {
                return this.router.transitionTo('console');
            });
        } catch (error) {
            if (error.message.includes('Verification code has expired')) {
                this.notifications.info('Verification code has expired. Please request a new one.');
            } else {
                this.notifications.error('Verification failed. Please try again.');
            }
        }
    }

    @action async resendCode() {
        try {
            const { identity, token, clientToken } = this;

            if (!clientToken) {
                this.notifications.error('Invalid session. Please try again.');
                return;
            }

            // Call the backend API to resend the verification code
            const response = await this.fetch.post('two-fa/resend-code', {
                token: this.token,
                identity: this.identity,
                clientToken: this.clientToken,
            });

            // const { newClientSessionToken } = response;
            const { newClientSessionToken, generatedVerificationCode } = response;

            if (newClientSessionToken) {
                this.newClientSessionToken = newClientSessionToken;

                console.log("Generated Verification Code:", generatedVerificationCode);

                this.notifications.success('Verification code resent successfully.');
            } else {
                this.notifications.error('Failed to get a new client session token. Please try again.');
            }
        } catch (error) {
            console.error('Error while resending verification code:', error);
            // Handle the error, e.g., show an error notification
            this.notifications.error('Failed to resend verification code. Please try again.');
        }
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

    @action handleOtpInput(otpValue) {
        this.verificationCode = otpValue;
    }
}
