import { action } from '@ember/object';
import { isBlank } from '@ember/utils';
import Component from '@glimmer/component';
import { next } from '@ember/runloop';
import deprecateSubclassing from '@fleetbase/ember-ui/utils/deprecate-subclassing';
import { ref } from 'ember-ref-bucket';
import { tracked } from '@glimmer/tracking';
import { guidFor } from '@ember/object/internals';

/**
 Internal component for modal's markup and event handling. Should not be used directly.

 @class ModalDialog
 @namespace Components
 @extends Glimmer.Component
 @private
 */
@deprecateSubclassing
export default class ModalDialog extends Component {
    /**
     * @property id
     * @type null | HTMLElement
     */
    @ref('mainNode') _element = null;

    /**
     * Name of the size class
     *
     * @property sizeClass
     * @type string
     * @readOnly
     * @private
     */
    get sizeClass() {
        const { size } = this.args;
        return isBlank(size) ? null : `flb--modal-${size}`;
    }

    /**
     * The id of the `.flb--modal-title` element
     *
     * @property titleId
     * @type string
     * @default null
     * @private
     */
    @tracked titleId = null;

    /**
     * Gets or sets the id of the title element for aria accessibility tags
     *
     * @method getSetTitleID
     * @private
     */
    @action getOrSetTitleId(modalNode) {
        //Title element may be set by user so we have to try and find it to set the id
        let nodeId = null;

        if (modalNode) {
            const titleNode = modalNode.querySelector('.flb--modal-title');
            if (titleNode) {
                //Get title id of .flb--modal-title
                nodeId = titleNode.id;
                if (!nodeId) {
                    //no title id so we set one
                    nodeId = `${guidFor(this)}-title`;
                    titleNode.id = nodeId;
                }
            }
        }
        this.titleId = nodeId;
    }

    @action setInitialFocus(element) {
        let autofocus = element && element.querySelector('[autofocus]');
        if (autofocus) {
            next(() => autofocus.focus());
        }
    }

    /**
     * If true clicking on the backdrop will be ignored and will not close modal.
     *
     * @property ignoreBackdropClick
     * @type boolean
     * @default false
     * @private
     */
    ignoreBackdropClick = false;

    /**
     * The target DOM element of mouse down event.
     *
     * @property mouseDownElement
     * @type object
     * @default null
     * @private
     */
    mouseDownElement = null;

    /**
     * @event onClose
     * @public
     */

    @action handleKeyDown(e) {
        let code = e.keyCode || e.which;
        if (code === 27 && this.args.keyboard) {
            this.args.onClose?.();
        }
    }

    @action handleClick(e) {
        if (this.ignoreBackdropClick) {
            this.ignoreBackdropClick = false;
            return;
        }
        if (e.target !== this._element || !this.args.backdropClose) {
            return;
        }
        this.args.onClose?.();
    }

    @action handleMouseDown(e) {
        this.mouseDownElement = e.target;
    }

    @action handleMouseUp(e) {
        if (this.mouseDownElement !== this._element && e.target === this._element) {
            this.ignoreBackdropClick = true;
        }
    }
}
