export function initialize(owner) {
    const registry = owner.lookup('service:onboarding-registry');
    if (registry) {
        const defaultFlow = {
            id: 'default@v1',
            entry: 'signup',
            steps: [
                { id: 'signup', component: 'onboarding/form', next: 'verify-email' },
                { id: 'verify-email', component: 'onboarding/verify-email' },
            ],
        };

        registry.registerFlow(defaultFlow);
    }
}

export default {
    initialize,
};
