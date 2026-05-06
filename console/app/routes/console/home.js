import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ConsoleHomeRoute extends Route {
    @service sidebar;

    activate() {
        this.sidebar.disable();
    }

    deactivate() {
        this.sidebar.enable();
    }
}
