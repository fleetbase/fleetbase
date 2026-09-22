import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class OnboardIndexRoute extends Route {
    @service store;
    @service oauth;
    @service('onboarding-orchestrator') orchestrator;

    queryParams = {
        step: { refreshModel: false },
        session: { refreshModel: false },
        code: { refreshModel: false },
    };

    beforeModel() {
        // Resume from previous session if data exists in localStorage
        this.orchestrator.start(null, { resume: true });

        // For the "Continue with ..." buttons on the sign-up form. Not awaited: a failure
        // leaves the list empty and the form is exactly what it was before OAuth.
        this.oauth.loadProviders();
    }

    model() {
        return this.store.findRecord('brand', 1);
    }
}
