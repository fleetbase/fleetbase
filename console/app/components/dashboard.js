import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';

export default class DashboardComponent extends Component {
    @service store;
    @service notifications;
    @service modalsManager;
    @service fetch;
    @service dashboard;

    constructor() {
        super(...arguments);
        this.loadDashboards.perform();
    }

    @task *loadDashboards() {
        this.dashboard.loadDashboards.perform();
    }

    @action selectDashboard(dashboard) {
        this.dashboard.selectDashboard.perform(dashboard);
    }

    @action setWidgetSelectorPanelContext(widgetSelectorContext) {
        this.widgetSelectorContext = widgetSelectorContext;
    }

    @action onChangeEdit(state = true) {
        this.isEditingDashboard = state;
    }

    @action createDashboard(dashboard, options = {}) {
        this.modalsManager.show('modals/create-dashboard', {
            title: `Create a new dashboard`,
            acceptButtonText: 'Save Changes',
            confirm: async (modal, done) => {
                modal.startLoading();

                // Get the name from the modal options
                const { name } = modal.getOptions();

                await this.dashboard.createDashboard.perform(name);
                done();
            },
            ...options,
        });
    }

    @action deleteDashboard(dashboard, options = {}) {
        if (this.dashboard.dashboards?.length === 1) {
            return this.notifications.error('You cannot delete the last dashboard.');
        }

        this.modalsManager.confirm({
            title: `Are you sure to delete this ${dashboard.name}?`,
            confirm: async (modal, done) => {
                if (typeof options.onConfirm === 'function') {
                    options.onConfirm(model);
                }

                modal.startLoading();

                await this.dashboard.deleteDashboard.perform(dashboard);
                done();
            },
            ...options,
        });
    }

    setCurrentDashboard(dashboard) {
        this.dashboard.setCurrentDashboard.perform(dashboard);
    }

    onChangeEdit(state = true) {
        this.dashboard.onChangeEdit(state);
    }

    @action onAddingWidget(state = true) {
        this.dashboard.onAddingWidget(state);
    }
}
