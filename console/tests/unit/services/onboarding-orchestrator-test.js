import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

// Register a flow on the real onboarding-registry singleton the orchestrator injects.
// Using the real registry (rather than a stub) exercises the true production wiring;
// stubbing `service:onboarding-registry` via owner.register does not reliably override
// the injected instance here.
function registerFlow(owner, flow) {
    owner.lookup('service:onboarding-registry').registerFlow(flow, { default: true });
}

module('Unit | Service | onboarding-orchestrator', function (hooks) {
    setupTest(hooks);

    test('start throws for an unknown flow', async function (assert) {
        const service = this.owner.lookup('service:onboarding-orchestrator');
        await assert.rejects(service.start('missing'), /not found/);
    });

    test('start enters the entry step, next advances then completes the flow', async function (assert) {
        registerFlow(this.owner, { id: 'f', entry: 'a', steps: [{ id: 'a', next: 'b' }, { id: 'b' }] });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('f');
        assert.strictEqual(service.current.id, 'a', 'entered entry step');

        await service.next();
        assert.strictEqual(service.current.id, 'b', 'advanced to next step');

        await service.next();
        assert.strictEqual(service.current, null, 'flow complete');
    });

    test('goto throws for an unknown step', async function (assert) {
        registerFlow(this.owner, { id: 'g', entry: 'a', steps: [{ id: 'a', next: 'b' }, { id: 'b' }] });
        const service = this.owner.lookup('service:onboarding-orchestrator');
        await service.start('g');
        await assert.rejects(service.goto('nope'), /not found/);
    });

    test('next supports a function next() and runs lifecycle hooks', async function (assert) {
        const calls = [];
        registerFlow(this.owner, {
            id: 'h',
            entry: 'a',
            steps: [
                { id: 'a', next: () => 'b', afterLeave: () => calls.push('afterLeave:a') },
                { id: 'b', beforeEnter: () => calls.push('beforeEnter:b') },
            ],
        });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('h');
        await service.next();

        assert.strictEqual(service.current.id, 'b');
        assert.deepEqual(calls, ['afterLeave:a', 'beforeEnter:b']);
    });

    test('back returns to the previous step', async function (assert) {
        registerFlow(this.owner, { id: 'i', entry: 'a', steps: [{ id: 'a', next: 'b' }, { id: 'b' }] });
        const service = this.owner.lookup('service:onboarding-orchestrator');

        await service.start('i');
        await service.next();
        await service.back();

        assert.strictEqual(service.current.id, 'a');
    });
});
