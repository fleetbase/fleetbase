import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export default class ConsoleAdminScheduleMonitorLogsController extends Controller {
    /**
     * The router service.
     *
     * @memberof ConsoleAdminScheduleMonitorLogsController
     */
    @service router;
    /**
     * The fetch service.
     *
     * @memberof ConsoleAdminScheduleMonitorLogsController
     */
    @service fetch;

    /**
     * Tracked property for logs.
     * @type {Array}
     */
    @tracked logs = [];

    /**
     * Tracked property for the context API.
     * @type {Object}
     */
    @tracked contextApi;

    /**
     * Periodically reloads logs every 3 seconds.
     *
     * @memberof ConsoleAdminScheduleMonitorLogsController
     */
    @task *reload(task) {
        this.logs = yield this.fetch.get(`schedule-monitor/${task.id}/logs`);
    }

    /**
     * Set the overlay component context object.
     *
     * @param {Object} contextApi
     * @memberof ConsoleAdminOrganizationsIndexUsersController
     */
    @action setOverlayContext(contextApi) {
        this.contextApi = contextApi;
    }

    /**
     * Handle closing the overlay.
     *
     * @return {Promise<Transition>}
     * @memberof ConsoleAdminOrganizationsIndexUsersController
     */
    @action onPressClose() {
        if (this.contextApi && typeof this.contextApi.close === 'function') {
            this.contextApi.close();
        }

        return this.router.transitionTo('console.admin.schedule-monitor');
    }
}
