import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleAdminScheduleMonitorLogsRoute extends Route {
    @service fetch;

    model({ id }) {
        return this.fetch.get(`schedule-monitor/${id}`);
    }

    async setupController(controller, model) {
        controller.logs = await this.fetch.get(`schedule-monitor/${model.id}/logs`);
    }
}
