import { action, computed } from '@ember/object';
import { assert } from '@ember/debug';
import Component from '@glimmer/component';
import { next, schedule } from '@ember/runloop';
import { inject as service } from '@ember/service';
import transitionEnd from '@fleetbase/ember-ui/utils/transition-end';
import { getDestinationElement } from '@fleetbase/ember-ui/utils/dom';
import usesTransition from '@fleetbase/ember-ui/utils/decorators/uses-transition';
import isFastBoot from '@fleetbase/ember-ui/utils/is-fastboot';
import deprecateSubclassing from '@fleetbase/ember-ui/utils/deprecate-subclassing';
import arg from '../utils/decorators/arg';
import { tracked } from '@glimmer/tracking';
import { ref } from 'ember-ref-bucket';

function nextRunloop() {
    return new Promise((resolve) => next(resolve));
}

function afterRender() {
    return new Promise((resolve) => schedule('afterRender', resolve));
}

/**
  Component for creating [Bootstrap modals](http://getbootstrap.com/javascript/#modals) with custom markup.

  ### Usage

  ```hbs
  <Modal @onSubmit={{action "submit"}} as |Modal|>
    <Modal.header>
      <h4 class="flb--modal-title"><i class="glyphicon glyphicon-alert"></i> Alert</h4>
    </Modal.header>
    <Modal.body>
      Are you absolutely sure you want to do that???
    </Modal.body>
    <Modal.footer as |footer|>
      <Button @onClick={{action Modal.close}} @type="danger">Oh no, forget it!</Button>
      <Button @onClick={{action Modal.submit}} @type="success">Yeah!</Button>
    </Modal.footer>
  </Modal>
  ```

  The component yields references to the following contextual components, that you can use to further customize the output:

  * [modal.body](Components.ModalBody.html)
  * [modal.header](Components.ModalHeader.html)
  * [modal.footer](Components.ModalFooter.html)

  Furthermore references to the following actions are yielded:

  * `close`: triggers the `onHide` action and closes the modal
  * `submit`: triggers the `onSubmit` action (or the submit event on a form if present in the body element)

  ### Further reading

  See the documentation of the [bs-modal-simple](Components.ModalSimple.html) component for further examples.

  *Note that only invoking the component in a template as shown above is considered part of its public API. Extending from it (subclassing) is generally not supported, and may break at any time.*

  @class Modal
  @namespace Components
  @extends Glimmer.Component
  @public
*/
@deprecateSubclassing
export default class Modal extends Component {
    @service('-document') document;

    /**
     * @property _isOpen
     * @private
     */
    _isOpen = false;

    /**
     * Set to false to disable fade animations.
     *
     * @property fade
     * @type boolean
     * @default true
     * @public
     */

    get _fade() {
        let isFB = isFastBoot(this);
        return this.args.fade === undefined ? !isFB : this.args.fade;
    }

    /**
     * Used to apply Bootstrap's visibility classes.
     *
     * @property showModal
     * @type boolean
     * @default false
     * @private
     */
    @tracked showModal = this.open && (!this._fade || isFastBoot(this));

    /**
     * Render modal markup?
     *
     * @property inDom
     * @type boolean
     * @default false
     * @private
     */
    @tracked inDom = this.open;

    /**
     * @property paddingLeft
     * @type number|undefined
     * @private
     */
    @tracked paddingLeft;

    /**
     * @property paddingRight
     * @type number|undefined
     * @private
     */
    @tracked paddingRight;

    /**
     * Visibility of the modal. Toggle to show/hide with CSS transitions.
     *
     * When the modal is closed by user interaction this property will not update by using two-way bindings in order
     * to follow DDAU best practices. If you want to react to such changes, subscribe to the `onHide` action
     *
     * @property open
     * @type boolean
     * @default true
     * @public
     */
    @arg open = true;

    /**
     * Use a semi-transparent modal background to hide the rest of the page.
     *
     * @property backdrop
     * @type boolean
     * @default true
     * @public
     */
    @arg backdrop = true;

    /**
     * @property shouldShowBackdrop
     * @type boolean
     * @private
     */
    @tracked shouldShowBackdrop = this.open && this.backdrop;

    /**
     * Closes the modal when escape key is pressed.
     *
     * @property keyboard
     * @type boolean
     * @default true
     * @public
     */
    @arg keyboard = true;

    /**
     * [BS4 only!] Vertical position, either 'top' (default) or 'center'
     * 'center' will apply the `flb--modal-dialog-centered` class
     *
     * @property position
     * @type {string}
     * @default 'top'
     * @public
     */
    @arg position = 'top';

    /**
     * [BS4 only!] Allows scrolling within the modal body
     * 'true' will apply the `flb--modal-dialog-scrollable` class
     *
     * @property scrollable
     * @type boolean
     * @default false
     * @public
     */
    @arg scrollable = false;

    /**
     *  [BS5 only!] Allows adding fullscreen mode for modals. It will
     *  apply the `flb--modal-fullscreen` class when using `true` and
     *  `flb--modal-fullscreen-[x]-down` class when using BS breakpoints
     *   ([x] = `sm`, `md`, `lg`, `xl`, `xxl`).
     *
     * Also see the [Bootstrap docs](https://getbootstrap.com/docs/5.1/components/modal/#fullscreen-modal)
     *
     * @property fullscreen
     * @type {(Boolean|String)}
     * @default false
     * @public
     */

    /**
     * @property dialogComponent
     * @type {String}
     * @private
     */

    /**
     * @property headerComponent
     * @type {String}
     * @private
     */

    /**
     * @property bodyComponent
     * @type {String}
     * @private
     */

    /**
     * @property footerComponent
     * @type {String}
     * @private
     */

    /**
     * Property for size styling, set to null (default), 'lg' or 'sm'
     *
     * Also see the [Bootstrap docs](http://getbootstrap.com/javascript/#modals-sizes)
     *
     * @property size
     * @type String
     * @public
     */

    /**
     * If true clicking on the backdrop will close the modal.
     *
     * @property backdropClose
     * @type boolean
     * @default true
     * @public
     */
    @arg backdropClose = true;

    /**
     * If true component will render in place, rather than be wormholed.
     *
     * @property renderInPlace
     * @type boolean
     * @default false
     * @public
     */
    @arg renderInPlace = false;

    /**
     * @property _renderInPlace
     * @type boolean
     * @private
     */
    get _renderInPlace() {
        return this.renderInPlace || !this.destinationElement;
    }

    /**
     * The duration of the fade transition
     *
     * @property transitionDuration
     * @type number
     * @default 300
     * @public
     */
    @arg transitionDuration = 300;

    /**
     * The duration of the backdrop fade transition
     *
     * @property backdropTransitionDuration
     * @type number
     * @default 150
     * @public
     */
    @arg backdropTransitionDuration = 150;

    /**
     * Use CSS transitions?
     *
     * @property usesTransition
     * @type boolean
     * @readonly
     * @private
     */
    @usesTransition('_fade') usesTransition;

    destinationElement = getDestinationElement(this);

    /**
     * The DOM element of the `.flb--modal` element.
     *
     * @property modalElement
     * @type HTMLElement
     * @readonly
     * @private
     */
    @ref('modalElement') modalElement;

    /**
     * The DOM element of the backdrop element.
     *
     * @property backdropElement
     * @type HTMLElement
     * @readonly
     * @private
     */
    @ref('backdropElement') backdropElement;

    /**
     * @type boolean
     * @readonly
     * @private
     */
    isFastBoot = isFastBoot(this);

    /**
     * The action to be sent when the modal footer's submit button (if present) is pressed.
     * Note that if your modal body contains a form (e.g. [Components.Form](Components.Form.html)) this action will
     * not be triggered. Instead, a submit event will be triggered on the form itself. See the class description for an
     * example.
     *
     * @property onSubmit
     * @type function
     * @public
     */

    /**
     * The action to be sent when the modal is closing.
     * This will be triggered by pressing the modal header's close button (x button) or the modal footer's close button.
     * Note that this will happen before the modal is hidden from the DOM, as the fade transitions will still need some
     * time to finish. Use the `onHidden` if you need the modal to be hidden when the action triggers.
     *
     * You can return false to prevent closing the modal automatically, and do that in your action by
     * setting `open` to false.
     *
     * @property onHide
     * @type function
     * @public
     */

    /**
     * The action to be sent after the modal has been completely hidden (including the CSS transition).
     *
     * @property onHidden
     * @type function
     * @default null
     * @public
     */

    /**
     * The action to be sent when the modal is opening.
     * This will be triggered immediately after the modal is shown (so it's safe to access the DOM for
     * size calculations and the like). This means that if fade=true, it will be shown in between the
     * backdrop animation and the fade animation.
     *
     * @property onShow
     * @type function
     * @default null
     * @public
     */

    /**
     * The action to be sent after the modal has been completely shown (including the CSS transition).
     *
     * @property onShown
     * @type function
     * @public
     */

    @action close() {
        if (typeof this.args.onHide === 'function') {
            this.args.onHide();
        }

        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }

        this.hide();
    }

    @action doSubmit() {
        if (typeof this.args.onSubmit === 'function') {
            this.args.onSubmit();
        }

        let forms = this.modalElement.querySelectorAll('.flb--modal-body form');
        if (forms.length > 0) {
            // trigger submit event on body forms
            let event = document.createEvent('Events');
            event.initEvent('submit', true, true);
            Array.prototype.slice.call(forms).forEach((form) => form.dispatchEvent(event));
        }
    }

    /**
     * Show the modal
     *
     * @method show
     * @private
     */
    async show() {
        if (this._isOpen) {
            return;
        }
        this._isOpen = true;

        this.addBodyClass();

        this.inDom = true;

        await this.showBackdrop();

        if (this.isDestroyed) {
            return;
        }

        if (!isFastBoot(this)) {
            this.checkScrollbar();
            this.setScrollbar();
        }

        await afterRender();

        const { modalElement } = this;
        if (!modalElement) {
            return;
        }

        if (!isFastBoot(this)) {
            modalElement.scrollTop = 0;
            this.adjustDialog();
        }

        this.showModal = true;
        this.args.onShow?.();

        if (this.usesTransition) {
            await transitionEnd(modalElement, this.transitionDuration);
        }

        this.args.onShown?.();
    }

    /**
     * Hide the modal
     *
     * @method hide
     * @private
     */
    async hide() {
        if (!this._isOpen) {
            return;
        }
        this._isOpen = false;

        this.showModal = false;

        if (this.usesTransition) {
            await transitionEnd(this.modalElement, this.transitionDuration);
        }

        await this.hideModal();
    }

    /**
     * Clean up after modal is hidden and call onHidden
     *
     * @method hideModal
     * @private
     */
    async hideModal() {
        if (this.isDestroyed) {
            return;
        }

        await this.hideBackdrop();

        this.removeBodyClass();

        if (!isFastBoot(this)) {
            this.resetAdjustments();
            this.resetScrollbar();
        }

        this.inDom = false;
        this.args.onHidden?.();
    }

    /**
     * Show the backdrop
     *
     * @method showBackdrop
     * @async
     * @private
     */
    async showBackdrop() {
        if (!this.backdrop || !this.usesTransition) {
            return;
        }

        this.shouldShowBackdrop = true;

        await nextRunloop();

        const { backdropElement } = this;
        assert('Backdrop element should be in DOM', backdropElement);

        await transitionEnd(backdropElement, this.backdropTransitionDuration);
    }

    /**
     * Hide the backdrop
     *
     * @method hideBackdrop
     * @async
     * @private
     */
    async hideBackdrop() {
        if (!this.backdrop) {
            return;
        }

        if (this.usesTransition) {
            const { backdropElement } = this;
            assert('Backdrop element should be in DOM', backdropElement);

            await transitionEnd(backdropElement, this.backdropTransitionDuration);
        }

        if (this.isDestroyed) {
            return;
        }

        this.shouldShowBackdrop = false;
    }

    /**
     * @method adjustDialog
     * @private
     */
    @action adjustDialog() {
        let modalIsOverflowing = this.modalElement.scrollHeight > document.documentElement.clientHeight;
        this.paddingLeft = !this.bodyIsOverflowing && modalIsOverflowing ? this.scrollbarWidth : undefined;
        this.paddingRight = this.bodyIsOverflowing && !modalIsOverflowing ? this.scrollbarWidth : undefined;
    }

    /**
     * @method resetAdjustments
     * @private
     */
    resetAdjustments() {
        this.paddingLeft = undefined;
        this.paddingRight = undefined;
    }

    /**
     * @method checkScrollbar
     * @private
     */
    checkScrollbar() {
        const fullWindowWidth = window.innerWidth;
        this.bodyIsOverflowing = document.body.clientWidth < fullWindowWidth;
    }

    /**
     * @method setScrollbar
     * @private
     */
    setScrollbar() {
        let bodyPad = parseInt(document.body.style.paddingRight || 0, 10);
        this._originalBodyPad = document.body.style.paddingRight || '';
        if (this.bodyIsOverflowing) {
            document.body.style.paddingRight = bodyPad + this.scrollbarWidth;
        }
    }

    /**
     * @method resetScrollbar
     * @private
     */
    resetScrollbar() {
        document.body.style.paddingRight = this._originalBodyPad;
    }

    addBodyClass() {
        // special handling for FastBoot, where real `document` is not available
        if (isFastBoot(this)) {
            // a SimpleDOM instance with just a subset of the DOM API!
            let document = this.document;

            let existingClasses = document.body.getAttribute('class') || '';
            if (!existingClasses.includes('flb--modal-open')) {
                document.body.setAttribute('class', `flb--modal-open ${existingClasses}`);
            }
        } else {
            document.body.classList.add('flb--modal-open');
        }
    }

    removeBodyClass() {
        if (isFastBoot(this)) {
            // no need for FastBoot support here
            return;
        }

        document.body.classList.remove('flb--modal-open');
    }

    /**
     * @property scrollbarWidth
     * @type number
     * @readonly
     * @private
     */
    @computed('modalElement') get scrollbarWidth() {
        let scrollDiv = document.createElement('div');
        scrollDiv.className = 'flb--modal-scrollbar-measure';
        let modalEl = this.modalElement;
        modalEl.parentNode.insertBefore(scrollDiv, modalEl.nextSibling);
        let scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
        scrollDiv.parentNode.removeChild(scrollDiv);
        return scrollbarWidth;
    }

    willDestroy() {
        super.willDestroy(...arguments);

        this.removeBodyClass();

        if (!isFastBoot(this)) {
            this.resetScrollbar();
        }
    }

    @action handleVisibilityChanges() {
        const { onOpen } = this.args;

        if (this.open) {
            this.show();

            if (typeof onOpen === 'function') {
                onOpen();
            }
        } else {
            this.hide();
        }
    }
}
