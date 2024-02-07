import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { task } from 'ember-concurrency-decorators';

export default class MetricComponent extends Component {
    @service fetch;
    @tracked isLoading = false;
    @tracked dashboard;

    constructor() {
        super(...arguments);
        this.loadDashboard.perform();
    }

    @action onQueryParamsChanged(changedParams) {
        this.loadDashboard.perform(changedParams);
    }

    @task *loadDashboard(params) {
        let dashboards = [];

        this.isLoading = true;

        try {
            dashboards = yield this.fetch.get(this.args.options.endpoint, params, { namespace: '' });
        } catch {
            return;
        }

        this.isLoading = false;

        if (isArray(dashboards)) {
            this.dashboard = dashboards.objectAt(0);
        }
    }
}
