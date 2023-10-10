import Component from '@glimmer/component';
import loadExtensions from '@fleetbase/ember-core/utils/load-extensions';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';

export default class DashboardComponent extends Component {
    @service fetch;
    @tracked extensions;
    @tracked dashboards = [];
    @tracked isLoading;

    constructor() {
        super(...arguments);
        this.loadExtensions();
    }

    @action async loadExtensions() {
        this.extensions = await loadExtensions();
        this.loadDashboardBuilds.perform();
    }

    @task *loadDashboard(extension) {
        this.isLoading = extension.extension;
        let dashboardBuild;

        try {
            dashboardBuild = yield this.fetch.get(extension.fleetbase.dashboard, {}, { namespace: '' });
        } catch {
            return;
        }

        if (isArray(dashboardBuild)) {
            this.dashboards = [...this.dashboards, ...dashboardBuild.map((build) => ({ ...build, extension }))];
        }
    }

    @task({ enqueue: true, maxConcurrency: 1 }) *loadDashboardBuilds() {
        const extensionsWithDashboards = this.extensions.filter((extension) => typeof extension.fleetbase?.dashboard === 'string');

        for (let i = 0; i < extensionsWithDashboards.length; i++) {
            const extension = extensionsWithDashboards[i];
            yield this.loadDashboard.perform(extension);
        }
    }
}
