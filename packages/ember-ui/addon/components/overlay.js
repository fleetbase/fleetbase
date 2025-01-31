import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { later } from '@ember/runloop';

export default class OverlayComponent extends Component {
    @tracked overlayNode;
    @tracked overlayContainerNode;
    @tracked overlayPanelNode;
    @tracked gutterNode;
    @tracked isOpen = false;
    @tracked isResizing = false;
    @tracked isMaximized = false;
    @tracked isMinimized = false;
    @tracked mouseX = 0;
    @tracked mouseY = 0;
    @tracked overlayWidth = 0;
    @tracked overlayHeight = 0;

    context = {
        toggle: this.toggle,
        open: this.open,
        close: this.close,
        minimize: this.minimize,
        maximize: this.maximize,
        onMinimize: this.args.onMinimize ?? this.args.isMinimizable,
        onMaximize: this.args.onMaximize ?? this.args.isMaximizable,
        isOpen: this.isOpen,
        isMinimized: this.isMinimized,
        isMaximized: this.isMaximized,
    };

    @action setupComponent(element) {
        this.overlayNode = element;

        later(
            this,
            () => {
                const open = this.args.isOpen !== false;
                if (open) {
                    this.open();
                }

                if (typeof this.args.onLoad === 'function') {
                    this.args.onLoad(this.context);
                }
            },
            600
        );
    }

    @action setupNode(property, node) {
        this[`${property}Node`] = node;
    }

    @action toggle() {
        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            if (typeof this.args.onOpen === 'function') {
                this.args.onOpen(this.context);
            }
        } else {
            if (typeof this.args.onClose === 'function') {
                this.args.onClose(this.context);
            }
        }

        if (typeof this.args.onToggle === 'function') {
            this.args.onToggle(this.context);
        }
    }

    @action open() {
        this.isOpen = true;

        if (typeof this.args.onOpen === 'function') {
            this.args.onOpen(this.context);
        }
    }

    @action close() {
        this.isOpen = false;

        if (typeof this.args.onClose === 'function') {
            this.args.onClose(this.context);
        }
    }

    @action undoMinimize() {
        const { overlayPanelNode } = this;

        this.isMinimized = false;
        overlayPanelNode.style.removeProperty('transform');
    }

    @action minimize() {
        const { position } = this.args;
        const { overlayPanelNode, isMinimized, isMaximized } = this;

        if (isMaximized) {
            this.undoMaximize();
        }

        if (isMinimized) {
            return this.undoMinimize();
        }

        const isHorizontal = position === 'left' || position === 'right' || !position;
        const multiplier = position === 'right' || position === 'bottom' ? 1 : -1;
        const minimizeSize = 45;

        const bounds = overlayPanelNode.getBoundingClientRect();
        const { height, width } = bounds;

        const MINIMIZED_WIDTH = (width - minimizeSize) * multiplier;
        const MINIMIZED_HEIGHT = (height - minimizeSize) * multiplier;

        // set to panel width or height
        if (isHorizontal) {
            overlayPanelNode.style.transform = `translateX(${MINIMIZED_WIDTH}px)`;
        } else {
            overlayPanelNode.style.transform = `translateY(${MINIMIZED_HEIGHT}px)`;
        }

        this.isMaximized = false;
        this.isMinimized = true;
    }

    @action undoMaximize() {
        const { position } = this.args;
        const { overlayPanelNode } = this;
        const isHorizontal = position === 'left' || position === 'right' || !position;

        if (isHorizontal) {
            overlayPanelNode.style.removeProperty('width');
        } else {
            overlayPanelNode.style.removeProperty('height');
        }

        this.isMaximized = false;
    }

    @action maximize() {
        const { position } = this.args;
        const { overlayPanelNode, overlayNode, isMinimized, isMaximized } = this;

        if (isMinimized) {
            this.undoMinimize();
        }

        if (isMaximized) {
            return this.undoMaximize();
        }

        const isHorizontal = position === 'left' || position === 'right' || !position;
        const bounds = overlayNode.getBoundingClientRect();

        const { height, width } = bounds;

        // set to panel width or height
        if (isHorizontal) {
            overlayPanelNode.style.width = `${width}px`;
        } else {
            overlayPanelNode.style.height = `${height}px`;
        }

        this.isMaximized = true;
    }

    @action resize(event) {
        const { disableResize, onResize, position } = this.args;
        const { overlayPanelNode } = this;

        if (disableResize === true || !overlayPanelNode) {
            return;
        }

        const isHorizontal = position === 'left' || position === 'right' || !position;
        const dx = event.clientX - this.mouseX;
        const dy = event.clientY - this.mouseY;
        const multiplier = position === 'right' || position === 'bottom' ? -1 : 1;
        const width = dx * multiplier + this.overlayWidth;
        const height = dy * multiplier + this.overlayHeight;
        const minResizeWidth = this.args.minResizeWidth ?? 560;
        const maxResizeWidth = this.args.maxResizeWidth ?? 900;

        // Min resize width
        if (width <= minResizeWidth) {
            overlayPanelNode.style.width = `${minResizeWidth}px`;
            return;
        }

        // Max resize width
        if (width >= maxResizeWidth) {
            overlayPanelNode.style.width = `${maxResizeWidth}px`;
            return;
        }

        // Style changes
        overlayPanelNode.style.userSelect = 'none';

        if (isHorizontal) {
            overlayPanelNode.style.width = `${width}px`;
            document.body.style.cursor = 'col-resize';
        } else {
            overlayPanelNode.style.height = `${height}px`;
            document.body.style.cursor = 'row-resize';
        }

        // Undo Maximize/Minimize
        this.isMaximized = false;
        this.isMinimized = false;

        if (typeof onResize === 'function') {
            onResize({ event, overlayPanelNode });
        }
    }

    @action startResize(event) {
        const { disableResize, onResizeStart, isResizable } = this.args;
        const { overlayPanelNode } = this;

        if (disableResize === true || !isResizable || !overlayPanelNode) {
            return;
        }

        const bounds = overlayPanelNode.getBoundingClientRect();

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
            onResizeStart({ event, overlayPanelNode });
        }
    }

    @action stopResize(event) {
        const { onResizeEnd } = this.args;
        const { overlayPanelNode } = this;

        // End resizing
        this.isResizing = false;

        // Remove style changes
        document.body.style.removeProperty('cursor');
        overlayPanelNode.style.userSelect = 'auto';

        // Remove the handlers of `mousemove` and `mouseup`
        document.removeEventListener('mousemove', this.resize);
        document.removeEventListener('mouseup', this.stopResize);

        if (typeof onResizeEnd === 'function') {
            onResizeEnd({ event, overlayPanelNode });
        }
    }
}
