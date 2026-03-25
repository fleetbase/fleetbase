import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import removeBootLoader from '../../utils/remove-boot-loader';

export default class InviteForDriverRoute extends Route {
    @service fetch;

    model(params) {
        return this.fetch.get(`driver-portal/${params.public_id}`, {}, { namespace: 'api/v1' });
    }

    setupController(controller, model) {
        super.setupController(controller, model);
        controller.hydrate(model);
        controller.restoreDriverSession();
        controller.startAutoRefresh();
    }

    afterModel() {
        removeBootLoader();
    }

    activate() {
        document.body.classList.add('scrollable');
    }

    deactivate() {
        document.body.classList.remove('scrollable');
        this.controllerFor('invite.for-driver').stopAutoRefresh();
    }
}
