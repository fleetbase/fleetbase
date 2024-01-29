import { action } from '@ember/object';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class DashboardCreateComponent extends Component {
    @tracked dashboard;

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

    @action onDragToDashboard(event) {
        console.log('Grid Stack drag event: ', event);
    }

    @action removeWidget(widget) {
        console.log('Removing widget: ', widget);
        this.args.dashboard.removeWidget(widget.id);
    }
}
