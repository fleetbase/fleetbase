import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

/**
 * DashboardComponent for managing dashboards in an Ember application.
 * This component handles actions such as selecting, creating, deleting dashboards,
 * and managing widget selectors and dashboard editing states.
 *
 * @extends Component
 */
export default class DashboardComponent extends Component {
    @service store;
    @service intl;
    @service notifications;
    @service modalsManager;
    @service fetch;
    @service dashboard;
    @service universe;

    /**
     * Creates an instance of DashboardComponent.
     * @memberof DashboardComponent
     */
    constructor(owner, { defaultDashboardId = 'dashboard', defaultDashboardName = 'Default Dashboard', showPanelWhenZeroWidgets = false }) {
        super(...arguments);
        this.dashboard.showPanelWhenZeroWidgets = showPanelWhenZeroWidgets;
        this.dashboard.loadDashboards.perform(defaultDashboardId, defaultDashboardName);
    }

    /**
     * Action to select a dashboard.
     * @param {Object} dashboard - The dashboard to be selected.
     */
    @action selectDashboard(dashboard) {
        this.dashboard.selectDashboard.perform(dashboard);
    }

    /**
     * Sets the context for the widget selector panel.
     * @param {Object} widgetSelectorContext - The context object for the widget selector.
     */
    @action setWidgetSelectorPanelContext(widgetSelectorContext) {
        this.widgetSelectorContext = widgetSelectorContext;
    }

    /**
     * Creates a new dashboard.
     * @param {Object} dashboard - The dashboard to be created.
     * @param {Object} [options={}] - Optional parameters for dashboard creation.
     */
    @action createDashboard(dashboard, options = {}) {
        this.modalsManager.show('modals/create-dashboard', {
            title: this.intl.t('component.dashboard.create-a-new-dashboard'),
            acceptButtonText: this.intl.t('component.dashboard.confirm-create-dashboard'),
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

    /**
     * Deletes a dashboard.
     * @param {Object} dashboard - The dashboard to be deleted.
     * @param {Object} [options={}] - Optional parameters for dashboard deletion.
     */
    @action deleteDashboard(dashboard, options = {}) {
        if (this.dashboard.dashboards?.length === 1) {
            return this.notifications.error(this.intl.t('component.dashboard.you-cannot-delete-this-dashboard'));
        }

        this.modalsManager.confirm({
            title: this.intl.t('component.dashboard.are-you-sure-you-want-delete-dashboard', { dashboardName: dashboard.name }),
            confirm: async (modal, done) => {
                modal.startLoading();
                await this.dashboard.deleteDashboard.perform(dashboard);
                done();
            },
            ...options,
        });
    }

    /**
     * Action to handle the addition of a widget.
     * @param {boolean} [state=true] - The state to set for adding a widget.
     */
    @action onAddingWidget(state = true) {
        this.dashboard.onAddingWidget(state);
    }

    /**
     * Sets the current dashboard.
     * @param {Object} dashboard - The dashboard to be set as current.
     */
    @action setCurrentDashboard(dashboard) {
        this.dashboard.setCurrentDashboard.perform(dashboard);
    }

    /**
     * Changes the editing state of the dashboard.
     * @param {boolean} [state=true] - The state to set for editing the dashboard.
     */
    @action onChangeEdit(state = true) {
        this.dashboard.onChangeEdit(state);
    }
}
