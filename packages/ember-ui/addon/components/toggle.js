import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';

export default class ToggleComponent extends Component {
    @service abilities;

    /**
     * The active color of the toggle
     *
     * @var {Boolean}
     */
    @tracked isToggled = false;

    /**
     * The active color of the toggle
     *
     * @var {String}
     */
    @tracked activeColor = 'green';

    /**
     * The permission required.
     *
     * @memberof ToggleComponent
     */
    @tracked permissionRequired;

    /**
     * If the button is disabled by permissions.
     *
     * @memberof ToggleComponent
     */
    @tracked disabledByPermission = false;

    /**
     * Determines the visibility of the button
     *
     * @memberof ToggleComponent
     */
    @tracked visible = true;

    /**
     * The active color class.
     * Defaults to `bg-green-400` but could also be:
     * `bg-organge-400` `bg-yellow-400` `bg-red-400` `bg-blue-400`
     *
     * @var {String}
     */
    @computed('activeColor') get activeColorClass() {
        return `bg-${this.activeColor}-400`;
    }

    /**
     * Creates an instance of ToggleComponent.
     *
     * @memberof ToggleComponent
     */
    constructor(owner, { value = false, isToggled = false, activeColor = 'green', permission = null, disabled = false, visible = true }) {
        super(...arguments);

        this.isToggled = isToggled;
        this.activeColor = activeColor;
        this.checked = value;
        this.permissionRequired = permission;
        this.visible = visible;
        this.disabled = disabled;
        if (!disabled) {
            this.disabled = this.disabledByPermission = permission && this.abilities.cannot(permission);
        }
    }

    /**
     * Event for on/of toggle
     *
     * @void
     */
    @action toggle(isToggled) {
        if (this.disabled) {
            return;
        }

        this.isToggled = !isToggled;

        if (typeof this.args.onToggle === 'function') {
            this.args.onToggle(this.isToggled);
        }
    }

    /**
     * Handle toggle argument change.
     *
     * @param {HTMLElement} el
     * @param {Array} [isToggled]
     * @memberof ToggleComponent
     */
    @action onChange(el, [isToggled, disabled = null]) {
        this.isToggled = isToggled === true;
        if (disabled !== null) {
            this.disabled = disabled;
        }
    }
}
