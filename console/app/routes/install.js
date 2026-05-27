import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class InstallRoute extends Route {
    @service installation;

    beforeModel() {
        return this.installation.redirectIfConfiguredFromInstall();
    }

    setupController(controller, model, transition) {
        super.setupController(controller, model, transition);
        this.installation.listenForInstallComplete();
    }

    resetController(controller, isExiting) {
        super.resetController(controller, isExiting);

        if (isExiting) {
            this.installation.stopListeningForInstallComplete();
        }
    }
}
