import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleAdminScheduleMonitorRoute extends Route {
    @service fetch;

    model() {
        return this.fetch.get('schedule-monitor/tasks');
    }
}
