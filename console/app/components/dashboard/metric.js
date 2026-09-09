import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { task } from 'ember-concurrency';

export default class MetricComponent extends Component {
    @service fetch;
    // The constructor performs loadDashboard, which assigns this before anything can read it,
    // so the initializer below never runs.
    /* istanbul ignore next -- always assigned before first read */
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
            // Clear the flag before bailing out, otherwise a failed request leaves the
            // metric stuck on its loading state for the life of the dashboard.
            this.isLoading = false;
            return;
        }

        this.isLoading = false;

        if (isArray(dashboards)) {
            this.dashboard = dashboards.objectAt(0);
        }
    }
}
