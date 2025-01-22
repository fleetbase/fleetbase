import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * Glimmer component for handling OTP (One-Time Password) input.
 * This component is responsible for rendering an OTP input field and managing its state.
 *
 * @class OtpInputComponent
 * @extends Component
 */
export default class OtpInputComponent extends Component {
    /**
     * Tracks the size of the OTP, typically the number of characters the OTP should have.
     * @property size
     * @type {Number}
     * @default 6
     */
    @tracked size = 6;

    /**
     * Tracks the current value entered by the user in the OTP input.
     * @property value
     * @type {String}
     */
    @tracked value;

    /**
     * The placeholder for the OTP input.
     *
     * @type {String}
     * @memberof OtpInputComponent
     */
    @tracked placeholder;

    /**
     * Component constructor that initializes the component with specified properties.
     * Allows setting the initial `size` and `value` of the OTP input upon component instantiation.
     *
     * @constructor
     * @param owner The owner object of this component instance.
     * @param {Object} args Component arguments.
     */
    constructor(owner, { size, value, placeholder }) {
        super(...arguments);
        this.value = value;
        this.size = size;
        this.placeholder = placeholder ?? '0'.repeat(size);
    }

    /**
     * Focus action that sets the focus on the given HTML element.
     * Typically used to focus the input element when the component is rendered.
     *
     * @method focus
     * @param {HTMLElement} el The element to be focused.
     */
    @action setup(inputEl) {
        inputEl.focus();
    }

    /**
     * Validates the input as the user types into the OTP field.
     * Checks the length of the entered value and triggers appropriate callbacks on certain conditions.
     *
     * @method validate
     * @param {Event} event The input event that triggered this action.
     */
    @action validate({ target }) {
        const value = target.value;

        // Update value
        this.value = value;

        // Call the onInput function if provided in the component's arguments.
        if (typeof this.args.onInput === 'function') {
            this.args.onInput(value);
        }

        // Check if the entered value meets the required size and if so, trigger the onInputCompleted callback.
        if (typeof value === 'string' && value.length === this.size) {
            if (typeof this.args.onInputCompleted === 'function') {
                this.args.onInputCompleted(value);
            }
        }
    }
}
