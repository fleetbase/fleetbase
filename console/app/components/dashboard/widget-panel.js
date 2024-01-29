import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class DashboardWidgetPanelComponent extends Component {
    @service universe;
    @tracked availableWidgets = [];
    @tracked dashboard;
    @tracked isOpen = true;
    /**
     * Constructs the component and applies initial state.
     */
    constructor(owner, { dashboard }) {
        super(...arguments);

        this.availableWidgets = this.universe.getWidgets();
        this.dashboard = dashboard;

        console.log(this.availableWidgets);
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
        console.log('Adding widget to dashboard: ', widget);
        this.args.dashboard.addWidget(widget);
    }

    /**
     * Handles cancel button press.
     *
     * @action
     */
    @action onPressClose() {
        this.isOpen = false;
        console.log(this.args);
        this.args.onClose();
    }
}
