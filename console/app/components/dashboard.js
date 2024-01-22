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
    @tracked isOpenWidget = false;

    constructor() {
        super(...arguments);
        this.loadExtensions();
    }

    @action async loadExtensions() {
        this.extensions = await loadExtensions();
        console.log('Extensions:', this.extensions);
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
        console.log('Extensions with Dashboards:', extensionsWithDashboards);

        for (let i = 0; i < extensionsWithDashboards.length; i++) {
            const extension = extensionsWithDashboards[i];
            yield this.loadDashboard.perform(extension);
        }
    }

    @action openWidget() {
        this.isOpenWidget = !this.isOpenWidget;
        console.log(this.isOpenWidget);
    }
}
