import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class OnboardingOrchestratorService extends Service {
    @service onboardingRegistry;
    @service onboardingContext;

    @tracked flow = null;
    @tracked wrapper = null;
    @tracked current = null;
    @tracked history = [];
    @tracked sessionId = null;

    start(flowId = null, opts = {}) {
        const flow = this.onboardingRegistry.getFlow(flowId ?? this.onboardingRegistry.defaultFlow);
        if (!flow) throw new Error(`Onboarding flow '${flowId}' not found`);
        this.flow = flow;
        this.wrapper = flow.wrapper || null;
        this.sessionId = opts.sessionId || null;
        this.history = [];
        this.goto(flow.entry);
    }

    async goto(stepId) {
        if (!this.flow) throw new Error('No active onboarding flow');
        const step = this.flow.steps.find((s) => s.id === stepId);
        if (!step) throw new Error(`Step '${stepId}' not found`);

        if (typeof step.guard === 'function' && !step.guard(this.onboardingContext)) {
            return this.next();
        }

        if (typeof step.beforeEnter === 'function') {
            await step.beforeEnter(this.onboardingContext);
        }

        this.current = step;
    }

    async next() {
        if (!this.flow || !this.current) return;

        const leaving = this.current;
        if (typeof leaving.afterLeave === 'function') {
            await leaving.afterLeave(this.onboardingContext);
        }

        if (!this.history.includes(leaving)) this.history.push(leaving);

        let nextId;
        if (typeof leaving.next === 'function') {
            nextId = leaving.next(this.onboardingContext);
        } else {
            nextId = leaving.next;
        }

        if (!nextId) {
            this.current = null; // finished
            return;
        }

        return this.goto(nextId);
    }

    async back() {
        if (!this.flow || this.history.length === 0) return;
        const prev = this.history[this.history.length - 1];
        if (prev && prev.allowBack === false) return;
        this.history = this.history.slice(0, -1);
        await this.goto(prev.id);
    }
}
