import { module, test } from 'qunit';
import { initialize } from '@fleetbase/console/instance-initializers/register-default-onboarding-flow';

module('Unit | Instance Initializer | register-default-onboarding-flow', function () {
    test('it registers the default signup flow', function (assert) {
        let registered;
        initialize({
            lookup: () => ({
                registerFlow(flow) {
                    registered = flow;
                },
            }),
        });

        assert.strictEqual(registered.id, 'default@v1');
        assert.strictEqual(registered.entry, 'signup');
        assert.deepEqual(
            registered.steps.map((step) => step.id),
            ['signup', 'verify-email']
        );
        assert.strictEqual(registered.steps[0].next, 'verify-email', 'signup advances to verification');
        assert.strictEqual(registered.steps[1].next, undefined, 'verification ends the flow');
    });

    test('it is a no-op without an onboarding registry', function (assert) {
        initialize({ lookup: () => undefined });

        assert.ok(true, 'no error is thrown without a registry');
    });
});
