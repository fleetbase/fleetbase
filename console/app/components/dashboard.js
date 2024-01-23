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
        this.loadDashboards.perform();
    }

    @task *loadDashboards() {
        this.dashboards = yield this.store.findAll('dashboard');
        this.currentDashboard = this.dashboards[0];
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
