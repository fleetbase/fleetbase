import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class DashboardWidgetPanelComponent extends Component {
    @service universe;
    @tracked availableWidgets = [];

    /**
     * Constructs the component and applies initial state.
     */
    constructor(owner, { dashboard }) {
        super(...arguments);

        this.availableWidgets = this.universe.getWidgets();
        this.dashboard = dashboard;

        console.log(this.dashboard, dashboard, arguments);
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
        this.dashboard.addWidget(widget);
    }

    /**
     * Handles cancel button press.
     *
     * @action
     * @returns {any}
     */
    @action onPressCancel() {
        this.context.close();
        // return contextComponentCallback(this, 'onPressCancel', this.widget);
    }

    @action onDragToDashboard(item) {
        console.log('Event: ', item);
    }
}
