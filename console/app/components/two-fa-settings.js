import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { inject as service } from '@ember/service';

/**
 * Default Two-Factor Authentication method when not explicitly selected.
 *
 * @property {string} DEFAULT_2FA_METHOD
 * @private
 */
const DEFAULT_2FA_METHOD = 'email';

/**
 * Glimmer component for managing Two-Factor Authentication settings.
 *
 * @class TwoFaSettingsComponent
 * @extends Component
 */
export default class TwoFaSettingsComponent extends Component {
    /**
     * The fetch service for making HTTP requests.
     *
     * @property {Service} fetch
     * @public
     */
    @service fetch;

    /**
     * The notifications service for displaying user notifications.
     *
     * @property {Service} notifications
     * @public
     */
    @service notifications;

    /**
     * The currently selected Two-Factor Authentication method.
     *
     * @property {string} selectedTwoFaMethod
     * @public
     */
    @tracked selectedTwoFaMethod;

    /**
     * Indicates whether Two-Factor Authentication is currently enabled.
     *
     * @property {boolean} isTwoFaEnabled
     * @public
     */
    @tracked isTwoFaEnabled;

    /**
     * Indicates whether Two-Factor Authentication is required for all users.
     *
     * @property {boolean} isTwoFaEnforced
     * @public
     */
    @tracked isTwoFaEnforced;

    /**
     * Indicates whether the settings should render an option to `enforce`
     * Enforce is a flag that indicates that users either under a company or system must setup 2FA.
     *
     * @property {boolean} showEnforceOption
     * @public
     */
    @tracked showEnforceOption;

    /**
     * Indicates whether the settings should render an option to select 2fa `mn=ethod`
     * Method is a flag that indicates which method users can receive a 2FA code from.
     *
     * @property {boolean} showEnforceOption
     * @public
     */
    @tracked showMethodSelection;

    /**
     * Class constructor to initialize the component.
     *
     * @constructor
     * @param {Object} owner - The owner of the component.
     * @param {Object} options - Options passed during component instantiation.
     * @param {Object} options.twoFaSettings - The current Two-Factor Authentication settings.
     * @param {Array} options.twoFaMethods - Available Two-Factor Authentication methods.
     */
    constructor(owner, { twoFaSettings, twoFaMethods, showEnforceOption, showMethodSelection = true }) {
        super(...arguments);

        const userSelectedMethod = isArray(twoFaMethods) ? twoFaMethods.find(({ key }) => key === twoFaSettings.method) : null;

        this.showMethodSelection = showMethodSelection === true;
        this.showEnforceOption = showEnforceOption === true;
        this.isTwoFaEnabled = twoFaSettings.enabled === true;
        this.isTwoFaEnforced = twoFaSettings.enforced === true;
        this.selectedTwoFaMethod = userSelectedMethod ? userSelectedMethod.key : DEFAULT_2FA_METHOD;
    }

    /**
     * Action handler for toggling Two-Factor Authentication.
     *
     * @method onTwoFaToggled
     * @param {boolean} isTwoFaEnabled - Indicates whether Two-Factor Authentication is enabled.
     * @return {void}
     * @public
     */
    @action onTwoFaToggled(isTwoFaEnabled) {
        this.isTwoFaEnabled = isTwoFaEnabled;

        if (isTwoFaEnabled) {
            // A method that still needs setting up is never picked automatically
            const recommendedMethod = isArray(this.args.twoFaMethods) ? this.args.twoFaMethods.find((method) => method.recommended && !method.requiresSetup) : null;
            if (recommendedMethod) {
                this.selectedTwoFaMethod = recommendedMethod.key;
            } else if (!this.selectedTwoFaMethod) {
                this.selectedTwoFaMethod = DEFAULT_2FA_METHOD;
            }
        } else {
            this.selectedTwoFaMethod = null;
        }

        if (typeof this.args.onTwoFaToggled === 'function') {
            this.args.onTwoFaToggled(...arguments);
        }

        if (typeof this.args.onTwoFaMethodSelected === 'function') {
            this.args.onTwoFaMethodSelected(this.selectedTwoFaMethod);
        }
    }

    /**
     * Action handler for toggling Two-Factor Authentication.
     *
     * @method onTwoFaEnforcedToggled
     * @param {boolean} isTwoFaEnforced - Indicates whether Two-Factor Authentication is enabled.
     * @return {void}
     * @public
     */
    @action onTwoFaEnforcedToggled(isTwoFaEnforced) {
        this.isTwoFaEnforced = isTwoFaEnforced;

        if (typeof this.args.onTwoFaEnforcedToggled === 'function') {
            this.args.onTwoFaEnforcedToggled(...arguments);
        }
    }

    /**
     * Action handler for selecting a Two-Factor Authentication method.
     *
     * @method onTwoFaSelected
     * @param {string} method - The selected Two-Factor Authentication method.
     * @return {void}
     * @public
     */
    @action async onTwoFaSelected(method, event) {
        // Let the page set a method up first (e.g. an authenticator app); keep the
        // previous choice when it is not set up.
        if (typeof this.args.beforeTwoFaMethodSelected === 'function') {
            const previousMethod = this.selectedTwoFaMethod;
            const allowed = await this.args.beforeTwoFaMethodSelected(method);

            if (allowed === false) {
                const radios = event?.target?.form?.elements?.['2fa-method'] ?? document.querySelectorAll('input[name="2fa-method"]');
                Array.from(radios).forEach((radio) => (radio.checked = radio.value === previousMethod));
                return;
            }
        }

        this.selectedTwoFaMethod = method;

        if (typeof this.args.onTwoFaMethodSelected === 'function') {
            this.args.onTwoFaMethodSelected(method);
        }
    }

    @action onRequireUsersToSetUpToggled(isTwoFaEnforced) {
        this.isTwoFaEnforced = isTwoFaEnforced;

        if (typeof this.args.onTwoFaEnforcedToggled === 'function') {
            this.args.onTwoFaEnforcedToggled(isTwoFaEnforced);
        }
    }
}
