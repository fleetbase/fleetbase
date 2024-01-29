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
    @tracked isEditDashboard = false;

    constructor() {
        super(...arguments);

        this.loadDashboards.perform();
    }

    @task *loadDashboards() {
        try {
            this.dashboards = yield this.store.findAll('dashboard');

            if (this.dashboards.length > 0) {
                const currentDashboard = this.dashboards[0];

                currentDashboard.widgets = yield this.store.query('dashboard-widget', { dashboard_uuid: currentDashboard.uuid });
                this.currentDashboard = currentDashboard;

                console.log('Current Dashboard: ', this.currentDashboard);
            }
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

    @action closeWidgetSelector() {
        this.isSelectingWidgets = false;
    }

    @action onChangeEdit() {
        this.isEditDashboard = !this.isEditDashboard;
    }
}
