import Component from '@glimmer/component';
import loadExtensions from '@fleetbase/ember-core/utils/load-extensions';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';

export default class DashboardComponent extends Component {
    @service store;
    @tracked dashboards = [];
    @tracked currentDashboard;
    @tracked isSelectingWidgets = false;

    constructor() {
        super(...arguments);
        console.log(arguments);

        this.loadDashboards.perform();
    }

    @task *loadDashboards() {
        try {
            this.dashboards = yield this.store.findAll('dashboard');

            const currentDashboard = this.dashboards[0];
            console.log(currentDashboard);

            currentDashboard.widgets = yield this.store.query('dashboard-widget', { params: { dashboard_uuid: currentDashboard.uuid } });
            currentDashboard.widgets = yield this.store.query('dashboard-widget', { dashboard_uuid: currentDashboard.uuid });
            this.currentDashboard = currentDashboard;

            console.log('Current Dashboard: ', this.currentDashboard);
        } catch (error) {
            console.error('Error loading dashboards:', error);
        }
    }

    @action selectDashboard(dashboard) {
        this.currentDashboard = dashboard;
    }

    @action setWidgetSelectorPanelContext(widgetSelectorContext) {
        this.widgetSelectorContext = widgetSelectorContext;
        console.log('widgetSelectorContext', widgetSelectorContext);
    }

    @action openWidgetSelector() {
        this.isSelectingWidgets = true;
    }
}
