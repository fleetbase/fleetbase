import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * A reusable password field component with toggle visibility feature
 * 
 * @class PasswordFieldComponent
 * @extends {Component}
 */
export default class PasswordFieldComponent extends Component {
    /**
     * Controls password visibility (show/hide)
     *
     * @var {Boolean}
     */
    @tracked showPassword = false;

    /**
     * Toggle password visibility
     */
    @action togglePasswordVisibility() {
        this.showPassword = !this.showPassword;
    }
}
