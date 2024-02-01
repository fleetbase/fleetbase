import { action, computed } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

import { inject as service } from '@ember/service';
export default class DashboardCreateComponent extends Component {
    @tracked dashboard;

    @service notifications;

    constructor(owner, args) {
        super(...arguments);

        const { dashboard } = args;
        // Access the dashboard property from the arguments
        this.dashboard = dashboard || this.args.dashboard;
        console.log('Dashboard in Create: ', this.args.dashboard, args, dashboard);
    }

    @action
    toggleFloat() {
        this.shouldFloat = !this.shouldFloat;
    }

    @action onQueryParamsChanged(changedParams) {
        this.reloadDashboard.perform(changedParams);
    }

    @action onChangeGrid(event) {
        console.log('Grid Stack event: ', event);
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
