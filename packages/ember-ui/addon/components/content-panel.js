import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * Component representing a content panel with toggle functionality.
 *
 * @class ContentPanelComponent
 * @extends Component
 */
export default class ContentPanelComponent extends Component {
    @service abilities;

    /**
     * Indicates whether the content panel is currently open.
     *
     * @property {boolean} isOpen - Whether the content panel is open or closed.
     * @default false
     * @public
     */
    @tracked isOpen = false;

    /**
     * Determines whether the toggle action should be triggered only when clicking on the caret (icon-container).
     *
     * @property {boolean} toggleOnCaretOnly - Whether to toggle the content panel only when clicking on the caret.
     * @default false
     * @public
     */
    @tracked toggleOnCaretOnly = false;

    /**
     * Determines if the dropdown button should render in place.
     *
     * @property {boolean} dropdownButtonRenderInPlace - Whether the dropdown button should render in place..
     * @default false
     * @public
     */
    @tracked dropdownButtonRenderInPlace = false;

    /**
     * Array of icon containers used for checking if the user clicked on or within a caret.
     *
     * @property {HTMLElement[]} iconContainers - Array of icon containers.
     * @default []
     * @private
     */
    @tracked iconContainers = [];

    @tracked permissionRequired = null;
    @tracked disabled = false;
    @tracked doesntHavePermissions = false;

    /**
     * Initializes the content panel component.
     *
     * @constructor
     * @public
     */
    constructor(owner, { open = false, toggleOnCaretOnly = false, dropdownButtonRenderInPlace = true, disabled = false, permission = null, onInsert }) {
        super(...arguments);

        this.disabled = false;
        this.permissionRequired = permission;
        this.disabled = disabled;
        if (!disabled) {
            this.disabled = this.doesntHavePermissions = permission && this.abilities.cannot(permission);
        }
        this.isOpen = open === true;
        this.toggleOnCaretOnly = toggleOnCaretOnly === true;
        this.dropdownButtonRenderInPlace = dropdownButtonRenderInPlace === true;

        if (typeof onInsert === 'function') {
            onInsert(...arguments);
        }
    }

    /**
     * API context for content panel component
     *
     * @memberof ContentPanelComponent
     */
    context = {
        toggle: this.toggleDropdown.bind(this),
        open: this.open.bind(this),
        close: this.close.bind(this),
    };

    /**
     * Toggles the content panel's open/closed state based on click events.
     *
     * @method toggle
     * @param {Event} event - The click event.
     * @returns {void}
     * @public
     */
    @action toggle(event) {
        // Fire onclick
        this.fireOnClick();

        // Check if the click target is within any of the icon containers
        const clickedOnCaret = this.iconContainers.length > 0 && this.iconContainers.some((iconContainerNode) => iconContainerNode.contains(event.target));

        // If we only want to toggle via the caret (icon-container)
        if (clickedOnCaret) {
            this.fireOnClickCaret();

            if (this.toggleOnCaretOnly) {
                // Run toggle
                this.toggleDropdown();
                return;
            }
        } else {
            this.fireOnClickPanelTitle();
        }

        // Do not toggle
        if (this.toggleOnCaretOnly) {
            return;
        }

        // Toggle dropdown
        this.toggleDropdown();
    }

    /**
     * Opens the content panel.
     *
     * @method open
     * @returns {void}
     * @public
     */
    @action open() {
        this.isOpen = true;
    }

    /**
     * Closes the content panel.
     *
     * @method close
     * @returns {void}
     * @public
     */
    @action close() {
        this.isOpen = false;
    }

    /**
     * Tracks an icon container node to be used for checking if the user clicked on or within a caret.
     *
     * @method trackIconContainer
     * @param {HTMLElement} node - The icon container node.
     * @returns {void}
     * @public
     */
    @action trackIconContainer(node) {
        this.iconContainers.pushObject(node);
    }

    /**
     * Handles the click event on a dropdown item.
     *
     * @method onDropdownItemClick
     * @param {Object} action - The action associated with the clicked dropdown item.
     * @param {Object} dd - The dropdown object.
     * @returns {void}
     * @public
     */
    @action onDropdownItemClick(action, dd) {
        if (typeof dd.actions === 'object' && typeof dd.actions.close === 'function') {
            dd.actions.close();
        }

        if (typeof action.fn === 'function') {
            action.fn(action.context);
        }

        if (typeof action.onClick === 'function') {
            action.onClick(action.context);
        }
    }

    /**
     * Toggles the content panel's open/closed state and fires a callback.
     *
     * @method toggleDropdown
     * @returns {void}
     * @private
     */
    toggleDropdown() {
        this.isOpen = !this.isOpen;

        // Fire callback on toggle
        if (typeof this.args.onToggle === 'function') {
            this.args.onToggle(this.isOpen);
        }
    }

    /**
     * Fires the onClick callback if provided.
     *
     * @method fireOnClick
     * @returns {void}
     * @private
     */
    fireOnClick() {
        if (typeof this.args.onClick === 'function') {
            this.args.onClick(this.context);
        }
    }

    /**
     * Fires the onClickCaret callback if provided.
     *
     * @method fireOnClickCaret
     * @returns {void}
     * @private
     */
    fireOnClickCaret() {
        if (typeof this.args.onClickCaret === 'function') {
            this.args.onClickCaret(this.context);
        }
    }

    /**
     * Fires the onClickPanelTitle callback if provided.
     *
     * @method fireOnClickPanelTitle
     * @returns {void}
     * @private
     */
    fireOnClickPanelTitle() {
        if (typeof this.args.onClickPanelTitle === 'function') {
            this.args.onClickPanelTitle(this.context);
        }
    }
}
