import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleOpsIndexRoute extends Route {
    @service fetch;

    model() {
        return this.fetch.get('ops/dashboard/summary');
    }
}
