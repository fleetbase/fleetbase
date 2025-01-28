import Component from '@glimmer/component';
import { action } from '@ember/object';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';

export default class OrderConfigManagerOverlayComponent extends Component {
    /**
     * Sets the overlay context.
     *
     * @action
     * @param {OverlayContextObject} overlayContext
     */
    @action setOverlayContext(overlayContext) {
        this.context = overlayContext;
        contextComponentCallback(this, 'onLoad', ...arguments);
    }

    /**
     * Handles the cancel action.
     *
     * @method
     * @action
     * @returns {Boolean} Indicates whether the cancel action was overridden.
     */
    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel');
    }

    /**
     * Handles the open action.
     *
     * @method
     * @action
     * @returns {Boolean} Indicates whether the cancel action was overridden.
     */
    @action onOpen() {
        return contextComponentCallback(this, 'onOpen');
    }

    /**
     * Handles the close action.
     *
     * @method
     * @action
     * @returns {Boolean} Indicates whether the cancel action was overridden.
     */
    @action onClose() {
        return contextComponentCallback(this, 'onClose');
    }

    /**
     * Handles the toggle action.
     *
     * @method
     * @action
     * @returns {Boolean} Indicates whether the cancel action was overridden.
     */
    @action onToggle() {
        return contextComponentCallback(this, 'onToggle');
    }
}
