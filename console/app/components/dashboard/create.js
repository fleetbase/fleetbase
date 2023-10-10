import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { task } from 'ember-concurrency-decorators';

export default class DashboardCreateComponent extends Component {
    @service fetch;
    @tracked isLoading = false;
    @tracked dashboard;

    constructor() {
        super(...arguments);
        this.dashboard = this.args.dashboard;
    }

    @action onQueryParamsChanged(changedParams) {
        this.reloadDashboard.perform(changedParams);
    }

    @task *reloadDashboard(params) {
        const { extension } = this.args.dashboard;
        const index = this.args.index;
        let dashboards = [];

        this.isLoading = true;

        try {
            dashboards = yield this.fetch.get(extension.fleetbase.dashboard, params, { namespace: '' });
        } catch {
            return;
        }

        this.isLoading = false;

        if (isArray(dashboards)) {
            this.dashboard = dashboards.objectAt(index);
        }
    }
}
