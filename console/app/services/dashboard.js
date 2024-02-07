import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { task } from 'ember-concurrency-decorators';
import { action } from '@ember/object';
import { isArray } from '@ember/array';

/**
 * Service for managing dashboards, including loading, creating, and deleting dashboards, as well as managing the current dashboard and widget states.
 * Utilizes Ember services such as `store`, `fetch`, `notifications`, and `universe` for data management and user interaction.
 *
 * @extends Service
 */
export default class DashboardService extends Service {
    /**
     * Ember Data store service for managing model data.
     * @type {Service}
     */
    @service store;

    /**
     * Fetch service for making network requests.
     * @type {Service}
     */
    @service fetch;

    /**
     * Notifications service for displaying user notifications.
     * @type {Service}
     */
    @service notifications;

    /**
     * Universe service for accessing global application state or utility methods.
     * @type {Service}
     */
    @service universe;

    /**
     * Internationalization service.
     * @type {Service}
     */
    @service intl;

    /**
     * Tracked array of available dashboards.
     * @type {Array}
     */
    @tracked dashboards = [];

    /**
     * Tracked property representing the currently selected dashboard.
     * @type {Object}
     */
    @tracked currentDashboard;

    /**
     * Tracked boolean indicating if the dashboard is in editing mode.
     * @type {boolean}
     */
    @tracked isEditingDashboard = false;

    /**
     * Tracked boolean indicating if a widget is being added.
     * @type {boolean}
     */
    @tracked isAddingWidget = false;

    /**
     * Task for loading dashboards from the store. It sets the current dashboard and checks if adding widget is necessary.
     */
    @task *loadDashboards() {
        const dashboards = yield this.store.findAll('dashboard');

        if (isArray(dashboards)) {
            this.dashboards = dashboards.toArray();

            // insert default dashboard if it's not loaded
            const defaultDashboard = this._createDefaultDashboard();
            if (this._isDefaultDashboardNotLoaded()) {
                this.dashboards.unshiftObject(defaultDashboard);
            }

            // Set the current dashboard
            this.currentDashboard = this._getNextDashboard();
            if (this.currentDashboard && this.currentDashboard.widgets.length === 0) {
                this.onAddingWidget(true);
            }
        }
    }

    /**
     * Task for selecting a dashboard. Handles dashboard switching and updates the current dashboard.
     * @param {Object} dashboard - The dashboard object to select.
     */
    @task *selectDashboard(dashboard) {
        if (dashboard.user_uuid === 'system') {
            this.currentDashboard = dashboard;
            yield this.fetch.post('dashboards/reset-default');
            return;
        }

        const currentDashboard = yield this.fetch.post('dashboards/switch', { dashboard_uuid: dashboard.id }, { normalizeToEmberData: true }).catch((error) => {
            this.notifications.serverError(error);
        });

        if (currentDashboard) {
            this.currentDashboard = currentDashboard;
        }
    }

    /**
     * Task for creating a new dashboard. It handles dashboard creation, success notification, and dashboard selection.
     * @param {string} name - Name of the new dashboard.
     */
    @task *createDashboard(name) {
        const dashboardRecord = this.store.createRecord('dashboard', { name, is_default: true });
        const dashboard = yield dashboardRecord.save().catch((error) => {
            this.notifications.serverError(error);
        });

        if (dashboard) {
            this.notifications.success(this.intl.t('services.dashboard-service.create-dashboard-success-notification', { dashboardName: dashboard.name }));
            this.selectDashboard.perform(dashboard);
            this.dashboards.pushObject(dashboard);
        }
    }

    /**
     * Task for deleting a dashboard. Handles dashboard deletion and success notification.
     * @param {Object} dashboard - The dashboard object to delete.
     * @param {Object} [options={}] - Optional configuration options.
     */
    @task *deleteDashboard(dashboard, options = {}) {
        yield dashboard.destroyRecord().catch((error) => {
            this.notification.serverError(error);

            if (typeof options.onError === 'function') {
                options.onError(error, dashboard);
            }
        });

        this.notifications.success(this.intl.t('services.dashboard-service.delete-dashboard-success-notification', { dashboardName: dashboard.name }));
        yield this.loadDashboards.perform();
        yield this.selectDashboard.perform(this._getNextDashboard());

        if (typeof options.callback === 'function') {
            options.callback(this.currentDashboard);
        }
    }

    /**
     * Task for setting the current dashboard.
     * @param {Object} dashboard - The dashboard object to set as current.
     */
    @task *setCurrentDashboard(dashboard) {
        const currentDashboard = yield this.fetch.post('dashboards/switch', { dashboard_uuid: dashboard.id }, { normalizeToEmberData: true }).catch((error) => {
            this.notifications.serverError(error);
        });

        if (currentDashboard) {
            this.currentDashboard = currentDashboard;
        }
    }

    /**
     * Action to toggle dashboard editing state.
     * @param {boolean} [state=true] - State to set for editing.
     */
    @action onChangeEdit(state = true) {
        this.isEditingDashboard = state;
    }

    /**
     * Action to toggle the state of adding a widget.
     * @param {boolean} [state=true] - State to set for adding a widget.
     */
    @action onAddingWidget(state = true) {
        this.isAddingWidget = state;
    }

    /**
     * Creates a default dashboard with predefined widgets.
     * @private
     * @returns {Object} The default dashboard object.
     */
    _createDefaultDashboard() {
        let defaultDashboard;

        // check store for default dashboard
        const loadedDashboars = this.store.peekAll('dashboard');

        // check for default dashboard loaded in store
        defaultDashboard = loadedDashboars.find((dashboard) => dashboard.id === 'system');
        if (defaultDashboard) {
            return defaultDashboard;
        }

        // create new default dashboard
        defaultDashboard = this.store.createRecord('dashboard', {
            id: 'system',
            uuid: 'system',
            name: 'Default Dashboard',
            is_default: false,
            user_uuid: 'system',
            widgets: this._createDefaultDashboardWidgets(),
        });

        return defaultDashboard;
    }

    /**
     * Creates default widgets for the default dashboard.
     * @private
     * @returns {Array} An array of default dashboard widgets.
     */
    _createDefaultDashboardWidgets() {
        const widgets = this.universe.getDefaultDashboardWidgets().map((defaultWidget) => {
            return this.store.createRecord('dashboard-widget', defaultWidget);
        });

        return widgets;
    }

    /**
     * Checks if default dashboard is already loaded.
     * @private
     * @return {Boolean}
     * @memberof DashboardService
     */
    _isDefaultDashboardLoaded() {
        const defaultDashboard = this._createDefaultDashboard();
        return this.dashboards.some((dashboard) => dashboard.id === defaultDashboard.id);
    }

    /**
     * Checks if default dashboard is not already loaded.
     * @private
     * @return {Boolean}
     * @memberof DashboardService
     */
    _isDefaultDashboardNotLoaded() {
        return !this._isDefaultDashboardLoaded();
    }

    /**
     * Gets the current dasbhoard or next available dashboard.
     *
     * @return {DashboardModel}
     * @memberof DashboardService
     */
    _getNextDashboard() {
        return this.dashboards.find((dashboard) => dashboard.is_default) || this.dashboards[0];
    }
}
