import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { computed, action } from '@ember/object';
import { inject as service } from '@ember/service';
import { guidFor } from '@ember/object/internals';

export default class CheckboxComponent extends Component {
    @service abilities;

    /**
     * Generates a unique ID for this checkbox instance
     *
     * @var {String}
     */
    @computed('args.id') get id() {
        const { id } = this.args;

        if (id) {
            return id;
        }

        return guidFor(this);
    }

    /**
     * Whether this checkbox is checked or not
     *
     * @param {Boolean} checked
     */
    @tracked checked = false;

    /**
     * The color class to use for the checkbox
     *
     * @param {String} colorClass
     */
    @tracked colorClass = 'text-black';

    /**
     * The permission required.
     *
     * @memberof CheckboxComponent
     */
    @tracked permissionRequired;

    /**
     * If the button is disabled by permissions.
     *
     * @memberof CheckboxComponent
     */
    @tracked disabledByPermission = false;

    /**
     * Determines the visibility of the button
     *
     * @memberof CheckboxComponent
     */
    @tracked visible = true;

    /**
     * Creates an instance of ButtonComponent.
     * @param {*} owner
     * @param {*} { permission = null }
     * @memberof ButtonComponent
     */
    constructor(owner, { value = false, checked = null, permission = null, disabled = false, visible = true }) {
        super(...arguments);
        this.checked = checked === null ? value : checked;
        this.permissionRequired = permission;
        this.visible = visible;
        this.disabled = disabled;
        if (!disabled) {
            this.disabled = this.disabledByPermission = permission && this.abilities.cannot(permission);
        }
    }

    /**
     * Toggles the checkbox and sends up an action
     *
     * @void
     */
    @action toggle(event) {
        const { onToggle, onChange } = this.args;
        const { target } = event;
        const { checked } = target;

        this.checked = checked;

        if (typeof onToggle === 'function') {
            onToggle(checked, target);
        }

        if (typeof onChange === 'function') {
            onChange(checked, event);
        }
    }

    /**
     * Track when the value argument changes
     *
     * @param {HTMLElement} el
     * @param {Array} [value = false]
     * @memberof CheckboxComponent
     */
    @action trackValue(el, [value = false]) {
        this.checked = value;
    }
}
