import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class OnboardingRegistryService extends Service {
    flows = new Map();
    @tracked defaultFlow = 'default@v1';

    useFlow(flowId) {
        this.defaultFlow = flowId;
    }

    registerFlow(flow) {
        if (!flow || !flow.id || !flow.entry || !Array.isArray(flow.steps)) {
            throw new Error('Invalid FlowDef: id, entry, steps are required');
        }
        const ids = new Set(flow.steps.map((s) => s.id));
        if (!ids.has(flow.entry)) {
            throw new Error(`Flow '${flow.id}' entry '${flow.entry}' not found in steps`);
        }
        for (const s of flow.steps) {
            if (typeof s.next === 'string' && s.next && !ids.has(s.next)) {
                throw new Error(`Flow '${flow.id}' step '${s.id}' has unknown next '${s.next}'`);
            }
        }
        this.flows.set(flow.id, flow);
    }

    getFlow(id) {
        return this.flows.get(id);
    }
}
