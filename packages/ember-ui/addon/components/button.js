import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { computed, action } from '@ember/object';
import { not, equal } from '@ember/object/computed';

export default class ButtonComponent extends Component {
    /**
     * Inject abilities service.
     *
     * @memberof ButtonComponent
     */
    @service abilities;

    /**
     * Determines if the button should be disabled
     *
     * @var {Boolean}
     */
    @computed('args.{disabled,disabledByPermission,isLoading}', 'disabledByPermission') get isDisabled() {
        const { isLoading, disabled } = this.args;

        return this.disabledByPermission || disabled || isLoading;
    }

    /**
     * Determines if the button should be disabled
     *
     * @var {Boolean}
     */
    @equal('args.type', 'secondary') isSecondary;

    /**
     * Determines if the button should be disabled
     *
     * @var {Boolean}
     */
    @not('isSecondary') isNotSecondary;

    /**
     * Determines if icon be displayed
     *
     * @var {Boolean}
     */
    @computed('args.{icon,isLoading}') get showIcon() {
        const { icon, isLoading } = this.args;

        return icon && !isLoading;
    }

    /**
     * The permission required.
     *
     * @memberof ButtonComponent
     */
    @tracked permissionRequired;

    /**
     * If the button is disabled by permissions.
     *
     * @memberof ButtonComponent
     */
    @tracked disabledByPermission = false;

    /**
     * Determines the visibility of the button
     *
     * @memberof ButtonComponent
     */
    @tracked visible = true;

    /**
     * Creates an instance of ButtonComponent.
     * @param {*} owner
     * @param {*} { permission = null }
     * @memberof ButtonComponent
     */
    constructor(owner, { permission = null, disabled = false, visible = true }) {
        super(...arguments);
        this.permissionRequired = permission;
        this.visible = visible;
        if (!disabled) {
            this.disabledByPermission = permission && this.abilities.cannot(permission);
        }
    }

    /**
     * Setup this component
     *
     * @void
     */
    @action setupComponent() {
        const { onInsert } = this.args;

        if (typeof onInsert === 'function') {
            onInsert();
        }
    }

    /**
     * Dispatches the `onClick` event with all arguments.
     * If button `this.isDisable` then event is not executed.
     *
     * @void
     */
    @action onClick() {
        const { onClick } = this.args;

        if (this.isDisabled) {
            return;
        }

        if (typeof onClick === 'function') {
            onClick(...arguments);
        }
    }
}
