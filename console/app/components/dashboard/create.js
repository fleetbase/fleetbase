import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';
import { inject as service } from '@ember/service';

/**
 * Component responsible for creating and managing the dashboard layout.
 * Provides functionalities such as toggling widget float, changing grid layout, and removing widgets.
 *
 * @extends Component
 */
export default class DashboardCreateComponent extends Component {
    /**
     * Notifications service for displaying alerts or errors.
     * @type {Service}
     */
    @service notifications;

    /**
     * Tracked array to keep track of widgets that have been updated.
     * @type {Array}
     */
    @tracked updatedWidgets = [];

    /**
     * Action to toggle the floating state of widgets on the grid.
     */
    @action toggleFloat() {
        this.shouldFloat = !this.shouldFloat;
    }

    /**
     * Handles changes to the grid layout, such as repositioning or resizing widgets.
     * Iterates over each widget event detail and updates the corresponding widget's properties if necessary.
     *
     * @param {Event} event - Event containing details about the grid change.
     * @action
     */
    @action onChangeGrid(event) {
        const { dashboard } = this.args;

        event.detail.forEach((currentWidgetEvent) => {
            const alreadyUpdated = this.updatedWidgets.find((item) => item.id === currentWidgetEvent.id);
            if (alreadyUpdated || !this.dashboard) {
                return;
            }

            const changedWidget = dashboard.widgets.find((widget) => widget.id === currentWidgetEvent.id);
            if (!changedWidget) {
                return;
            }

            const { x, y, w, h } = currentWidgetEvent;
            const response = changedWidget.updateProperties({
                grid_options: { x, y, w, h },
            });
            if (response) {
                this.updatedWidgets.push(changedWidget);
            }
        });
    }

    /**
     * Removes a specified widget from the dashboard.
     * Performs a removal operation on the dashboard and handles any errors that occur during the process.
     *
     * @param {Object} widget - The widget object to be removed.
     * @action
     */
    @action removeWidget(widget) {
        const { dashboard } = this.args;

        if (dashboard) {
            dashboard.removeWidget(widget.id).catch((error) => {
                this.notifications.serverError(error);
            });
        }
    }

    /**
     * Computed property that returns grid options based on the current edit state.
     * Configures grid behavior such as floating, animation, and drag and resize capabilities.
     *
     * @computed
     * @returns {Object} An object containing grid configuration options.
     */
    @computed('args.isEdit') get gridOptions() {
        return {
            float: true,
            animate: true,
            acceptWidgets: true,
            alwaysShowResizeHandle: this.args.isEdit,
            disableDrag: !this.args.isEdit,
            disableResize: !this.args.isEdit,
            resizable: { handles: 'all' },
            cellHeight: 30,
        };
    }
}
