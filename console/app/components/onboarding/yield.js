import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { next } from '@ember/runloop';

export default class OnboardingYieldComponent extends Component {
    @service('onboarding-orchestrator') orchestrator;
    @service('onboarding-context') context;
    @tracked initialized = false;

    get currentComponent() {
        return this.orchestrator.current && this.orchestrator.current.component;
    }

    constructor(owner, { step, session, code }) {
        super(...arguments);
        next(() => this.#initialize(step, session, code));
    }

    #initialize(step, session, code) {
        if (step) this.orchestrator.goto(step);
        if (session) this.context.persist('session', session);
        if (code) this.context.set('code', code);

        this.initialized = true;
    }
}
