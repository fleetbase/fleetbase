import { action, computed } from '@ember/object';
import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

export default class DashboardCreateComponent extends Component {
    @service notifications;

    @action toggleFloat() {
        this.shouldFloat = !this.shouldFloat;
    }

    @action onChangeGrid(event) {
        const updatedWidgets = [];

        event.detail.forEach((currentWidgetEvent) => {
            const alreadyUpdated = updatedWidgets.find((item) => item.uuid === currentWidgetEvent.id);
            if (alreadyUpdated) {
                return; // Skip updating if already updated
            }

            const changedWidget = this.args.dashboard.widgets.find((widget) => widget.id === currentWidgetEvent.id);
            if (!changedWidget) {
                return;
            }

            const { x, y, w, h } = currentWidgetEvent;
            const response = changedWidget.updateProperties({
                grid_options: { x, y, w, h },
            });
            if (response) {
                updatedWidgets.push(changedWidget);
            }
        });
    }

    @action removeWidget(widget) {
        this.args.dashboard.removeWidget(widget.id).catch((error) => {
            this.notifications.serverError(error);
        });
    }

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
