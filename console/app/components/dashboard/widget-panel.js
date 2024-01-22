import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class DashboardWidgetPanelComponent extends Component {
    @tracked isLoading = false;
    @tracked isOpen = false;
    @service universe;

    /**
     * Constructs the component and applies initial state.
     */
    constructor() {
        super(...arguments);

        console.log(this.args);
    }

    didReceiveArguments() {
        if (this.args.isOpen !== this.isOpen) {
            // Handle the change in isOpen here
            this.isOpen = this.args.isOpen;
            console.log('Parent isOpen changed:', this.isOpen);
        }
    }

    /**
     * Sets the overlay context.
     *
     * @action
     * @param {OverlayContextObject} overlayContext
     */
    @action setOverlayContext(overlayContext) {
        this.context = overlayContext;
        console.log('Context: ', this.context, arguments);
        if (typeof this.args.onLoad === 'function') {
            this.args.onLoad(...arguments);
        }
    }

    /**
     * Saves the widget changes.
     *
     * @action
     * @returns {Promise<any>}
     */
    @action save() {}

    /**
     * Handles cancel button press.
     *
     * @action
     * @returns {any}
     */
    @action onPressCancel() {
        // return contextComponentCallback(this, 'onPressCancel', this.widget);
    }

    get widgets() {
        console.log(this.universe.getWidgets());
        return this.universe.getWidgets();
    }
}
