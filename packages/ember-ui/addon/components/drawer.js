import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

/**
 * DrawerComponent provides a UI drawer element with several features such as
 * open, close, toggle, and resize capabilities.
 */
export default class DrawerComponent extends Component {
    /** Node of the drawer element. */
    @tracked drawerNode;

    /** Node of the drawer container element. */
    @tracked drawerContainerNode;

    /** Node of the drawer panel element. */
    @tracked drawerPanelNode;

    /** Node of the gutter element. */
    @tracked gutterNode;

    /** Indicates if the backdrop is not present. */
    @tracked noBackdrop = true;

    /** Indicates if the drawer is open. */
    @tracked isOpen = true;

    /** Indicates if the drawer is resizable. */
    @tracked isResizable = true;

    /** Indicates if the drawer is currently being resized. */
    @tracked isResizing = false;

    /** Indicates if the drawer is minimized. */
    @tracked isMinimized = false;

    /** Current X position of the mouse. */
    @tracked mouseX = 0;

    /** Current Y position of the mouse. */
    @tracked mouseY = 0;

    /** Height of the drawer. */
    @tracked height = 300;

    /** Indicates if the drawer has been rendered. */
    @tracked _rendered = false;

    /** Context object providing drawer control functions and state. */
    context = {
        toggle: this.toggle,
        open: this.open,
        close: this.close,
        toggleMinimize: this.toggleMinimize,
        minimize: this.minimize,
        maximize: this.maximize,
        isOpen: this.isOpen,
        isMinimized: this.isMinimized,
    };

    getContext() {
        return {
            toggle: this.toggle,
            open: this.open,
            close: this.close,
            toggleMinimize: this.toggleMinimize,
            minimize: this.minimize,
            maximize: this.maximize,
            isOpen: this.isOpen,
            isMinimized: this.isMinimized,
        };
    }

    /**
     * Sets up the component, establishes default properties, and calls the onLoad callback if provided.
     * @param {HTMLElement} element - The element to be used as the drawer node.
     */
    @action setupComponent(element) {
        this.drawerNode = element;
        this.height = getWithDefault(this.args, 'height', this.height);
        this.isMinimized = getWithDefault(this.args, 'isMinimized', this.isMinimized);

        later(
            this,
            () => {
                this.isOpen = getWithDefault(this.args, 'isOpen', this.isOpen);
                this.isResizable = getWithDefault(this.args, 'isResizable', this.isResizable);
                this.noBackdrop = getWithDefault(this.args, 'noBackdrop', this.noBackdrop);

                if (typeof this.args.onLoad === 'function') {
                    this.args.onLoad(this.getContext());
                }

                this._rendered = true;
            },
            300
        );
    }

    /**
     * Assigns a DOM node to a tracked property.
     * @param {string} property - The property name to which the node will be assigned.
     * @param {HTMLElement} node - The DOM node to be tracked.
     */
    @action setupNode(property, node) {
        this[`${property}Node`] = node;
    }

    /** Toggles the open state of the drawer. */
    @action toggle() {
        this.isOpen = !this.isOpen;
    }

    /** Opens the drawer. */
    @action open() {
        this.isOpen = true;

        if (typeof this.args.onOpen === 'function') {
            this.args.onOpen(this.getContext());
        }
    }

    /** Closes the drawer. */
    @action close() {
        this.isOpen = false;

        if (typeof this.args.onClose === 'function') {
            this.args.onClose(this.getContext());
        }
    }

    /** Toggles the minimized state of the drawer. */
    @action toggleMinimize(options = {}) {
        if (this.isMinimized) {
            this.maximize();
        } else {
            this.minimize();
        }

        if (typeof options.onToggle === 'function') {
            options.onToggle(this.getContext());
        }
    }

    /** Minimizes the drawer. */
    @action minimize(options = {}) {
        this.isMinimized = true;

        if (typeof options.onMinimize === 'function') {
            options.onMinimize(this.getContext());
        }
    }

    /** Maximizes the drawer. */
    @action maximize(options = {}) {
        this.isMinimized = false;

        if (typeof options.onMaximize === 'function') {
            options.onMaximize(this.getContext());
        }
    }

    /**
     * Starts the resize process for the drawer.
     * @param {MouseEvent} event - The mouse event that initiates the resize.
     */
    @action startResize(event) {
        const disableResize = getWithDefault(this.args, 'disableResize', false);
        const onResizeStart = getWithDefault(this.args, 'onResizeStart', null);
        const { drawerPanelNode, drawerNode, isResizable } = this;

        if (disableResize === true || !isResizable || !drawerPanelNode) {
            return;
        }

        // if minimized undo
        if (this.isMinimized) {
            return this.maximize();
        }

        const bounds = drawerPanelNode.getBoundingClientRect();

        // Set the overlay width/height
        this.overlayWidth = bounds.width;
        this.overlayHeight = bounds.height;

        // Start resizing
        this.isResizing = true;

        // Get the current mouse position
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;

        // Attach the listeners
        document.addEventListener('mousemove', this.resize);
        document.addEventListener('mouseup', this.stopResize);

        // Send up event
        if (typeof onResizeStart === 'function') {
            onResizeStart({ event, drawerNode, drawerPanelNode, context: this.getContext() });
        }
    }

    /**
     * Resizes the drawer during a mousemove event.
     * @param {MouseEvent} event - The mouse event that triggers the resize.
     */
    @action resize(event) {
        const disableResize = getWithDefault(this.args, 'disableResize', false);
        const onResize = getWithDefault(this.args, 'onResize', null);
        const { drawerPanelNode, drawerNode, isResizable } = this;

        if (disableResize === true || !isResizable || !drawerPanelNode) {
            return;
        }

        const dy = event.clientY - this.mouseY;
        const multiplier = -1;
        const height = dy * multiplier + this.overlayHeight;
        const minResizeHeight = getWithDefault(this.args, 'minResizeHeight', 0);
        const maxResizeHeight = getWithDefault(this.args, 'maxResizeHeight', 600);

        // Min resize height
        if (height <= minResizeHeight) {
            drawerPanelNode.style.height = `${minResizeHeight}px`;
            return;
        }

        // Max resize height
        if (height >= maxResizeHeight) {
            drawerPanelNode.style.height = `${maxResizeHeight}px`;
            return;
        }

        // Style changes
        drawerPanelNode.style.userSelect = 'none';
        drawerPanelNode.style.height = `${height}px`;
        document.body.style.cursor = 'row-resize';

        // Send callback
        if (typeof onResize === 'function') {
            onResize({ event, drawerNode, drawerPanelNode, context: this.getContext() });
        }
    }

    /**
     * Stops the resizing process and cleans up event listeners.
     * @param {MouseEvent} event - The mouse event that ends the resize.
     */
    @action stopResize(event) {
        const onResizeEnd = getWithDefault(this.args, 'onResizeEnd', null);
        const { drawerPanelNode, drawerNode } = this;

        // End resizing
        this.isResizing = false;

        // Remove style changes
        document.body.style.removeProperty('cursor');
        drawerPanelNode.style.userSelect = 'auto';

        // Remove the handlers of `mousemove` and `mouseup`
        document.removeEventListener('mousemove', this.resize);
        document.removeEventListener('mouseup', this.stopResize);

        if (typeof onResizeEnd === 'function') {
            onResizeEnd({ event, drawerNode, drawerPanelNode, context: this.getContext() });
        }
    }
}
