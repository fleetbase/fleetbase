import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class OnboardIndexRoute extends Route {
    @service store;
    @service('onboarding-orchestrator') orchestrator;

    queryParams = {
        step: { refreshModel: false },
        session: { refreshModel: false },
        code: { refreshModel: false },
    };

    beforeModel() {
        // Resume from previous session if data exists in localStorage
        this.orchestrator.start(null, { resume: true });
    }

    model() {
        return this.store.findRecord('brand', 1);
    }
}
