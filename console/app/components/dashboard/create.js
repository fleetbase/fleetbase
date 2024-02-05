import { action, computed } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import { merge } from '@ember/object/internals';
import { inject as service } from '@ember/service';
export default class DashboardCreateComponent extends Component {
    @service notifications;

    constructor(owner, args) {
        super(...arguments);
    }

    @action
    toggleFloat() {
        this.shouldFloat = !this.shouldFloat;
    }

    @action onChangeGrid(event) {
        console.log('Grid Stack event: ', event);
        console.log(
            'dashboard: ',
            this.args.dashboard.widgets.map((widget) => widget.serialize())
        );
        const widgetEvent = event.detail[0];
        const changedWidget = this.args.dashboard.widgets.find((widget) => widget.id === widgetEvent.id);

        if (changedWidget) {
            const { id, x, y, w, h } = widgetEvent;
            changedWidget.grid_options = { x, y, w, h };
            changedWidget.updatePosition({ id, x, y, h, w });
        }
    }

    @action removeWidget(widget) {
        this.args.dashboard.removeWidget(widget.id).catch((error) => {
            this.notifications.serverError(error);
        });
    }

    @computed('args.isEdit')
    get gridOptions() {
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
