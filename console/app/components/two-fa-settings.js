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
const DEFAULT_2FA_METHOD = 'authenticator_app';

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
     * Class constructor to initialize the component.
     *
     * @constructor
     * @param {Object} owner - The owner of the component.
     * @param {Object} options - Options passed during component instantiation.
     * @param {Object} options.twoFaSettings - The current Two-Factor Authentication settings.
     * @param {Array} options.twoFaMethods - Available Two-Factor Authentication methods.
     */
    constructor(owner, { twoFaSettings, twoFaMethods }) {
        super(...arguments);

        const userSelectedMethod = isArray(twoFaMethods) ? twoFaMethods.find(({ key }) => key === twoFaSettings.method) : null;

        this.isTwoFaEnabled = twoFaSettings.enabled === true;
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
            const recommendedMethod = isArray(this.args.twoFaMethods) ? this.args.twoFaMethods.find((method) => method.recommended) : null;
            if (recommendedMethod) {
                this.selectedTwoFaMethod = recommendedMethod.key;
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
     * Action handler for selecting a Two-Factor Authentication method.
     *
     * @method onTwoFaSelected
     * @param {string} method - The selected Two-Factor Authentication method.
     * @return {void}
     * @public
     */
    @action onTwoFaSelected(method) {
        this.selectedTwoFaMethod = method;

        if (typeof this.args.onTwoFaMethodSelected === 'function') {
            this.args.onTwoFaMethodSelected(...arguments);
        }
    }
}
