import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';

export default class DashboardComponent extends Component {
    @service store;
    @service notifications;
    @service modalsManager;

    @tracked dashboards = [];
    @tracked currentDashboard;
    @tracked isEditingDashboard = false;

    constructor() {
        super(...arguments);

        this.loadDashboards.perform();
    }

    @task *loadDashboards() {
        try {
            this.dashboards = yield this.store.findAll('dashboard');

            if (this.dashboards.length > 0) {
                this.currentDashboard = this.dashboards[0];

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

    @action onChangeEdit(state = true) {
        this.isEditingDashboard = state;
    }

    @action createDashboard(dashboard, options = {}) {
        this.modalsManager.show('modals/create-dashboard', {
            title: `Create a new dashboard`,
            acceptButtonText: 'Save Changes',
            confirm: (modal, done) => {
                modal.startLoading();

                // Get the name from the modal options
                const { name } = modal.getOptions();

                const newDashboard = this.store.createRecord('dashboard', { name });

                newDashboard
                    .save()
                    .then((response) => {
                        this.currentDashboard = response;
                        this.isEditingDashboard = true;
                        if (typeof options.successNotification === 'function') {
                            this.notifications.success(options.successNotification(response));
                            this.notifications.warning;
                        } else {
                            this.notifications.success(options.successNotification || `${response.name} created.`);
                        }

                        done();
                    })
                    .catch((error) => {
                        modal.stopLoading();
                        this.notifications.serverError(error);
                    });
            },
            ...options,
        });
    }

    @action deleteDashboard(dashboard, options = {}) {
        if (this.dashboards.length === 1) {
            this.notifications.error('You cannot delete the last dashboard.');
            return;
        }
        this.modalsManager.confirm({
            title: `Are you sure to delete this ${dashboard.name}?`,
            confirm: (modal) => {
                if (typeof options.onConfirm === 'function') {
                    options.onConfirm(model);
                }

                modal.startLoading();

                return dashboard
                    .destroyRecord()
                    .then((model) => {
                        this.notifications.success(options.successNotification || `${dashboard.name} has been deleted.`);
                        if (typeof options.onSuccess === 'function') {
                            options.onSuccess(model);
                        }
                        this.currentDashboard = this.dashboards[0];
                    })
                    .catch((error) => {
                        this.notifications.serverError(error);

                        if (typeof options.onError === 'function') {
                            options.onError(error, model);
                        }
                    })
                    .finally(() => {
                        if (typeof options.callback === 'function') {
                            options.callback(this.currentDashboard);
                        }
                    });
            },
            ...options,
        });
    }
}
