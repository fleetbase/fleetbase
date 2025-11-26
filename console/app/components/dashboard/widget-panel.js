import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class DashboardWidgetPanelComponent extends Component {
    @service universe;
    @tracked availableWidgets = [];
    @tracked dashboard;
    @tracked isOpen = true;
    @service notifications;

    /**
     * Constructs the component and applies initial state.
     */
    constructor(owner, { dashboard }) {
        super(...arguments);

        this.availableWidgets = this.universe.getDashboardWidgets();
        this.dashboard = dashboard;
    }

    /**
     * Sets the overlay context.
     *
     * @action
     * @param {OverlayContextObject} overlayContext
     */
    @action setOverlayContext(overlayContext) {
        this.context = overlayContext;

        if (typeof this.args.onLoad === 'function') {
            this.args.onLoad(...arguments);
        }
    }

    @action addWidgetToDashboard(widget) {
        // If widget is a component definition/class
        if (typeof widget.component === 'function') {
            widget.component = widget.component.name;
        }

        this.args.dashboard.addWidget(widget).catch((error) => {
            this.notifications.serverError(error);
        });
    }

    /**
     * Handles cancel button press.
     *
     * @action
     */
    @action onPressClose() {
        this.isOpen = false;

        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }
}
