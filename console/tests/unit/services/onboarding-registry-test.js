import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

function validFlow(overrides = {}) {
    return {
        id: 'default@v1',
        entry: 'a',
        steps: [{ id: 'a', next: 'b' }, { id: 'b' }],
        ...overrides,
    };
}

module('Unit | Service | onboarding-registry', function (hooks) {
    setupTest(hooks);

    test('registerFlow stores a valid flow and getFlow returns it', function (assert) {
        const service = this.owner.lookup('service:onboarding-registry');
        const flow = validFlow();
        service.registerFlow(flow);
        assert.strictEqual(service.getFlow('default@v1'), flow);
    });

    test('registerFlow rejects an invalid flow definition', function (assert) {
        const service = this.owner.lookup('service:onboarding-registry');
        assert.throws(() => service.registerFlow(null), /Invalid FlowDef/);
        assert.throws(() => service.registerFlow({ id: 'x', entry: 'a' }), /Invalid FlowDef/, 'missing steps');
        assert.throws(() => service.registerFlow({ id: 'x', entry: 'z', steps: [{ id: 'a' }] }), /entry 'z' not found/);
        assert.throws(() => service.registerFlow({ id: 'x', entry: 'a', steps: [{ id: 'a', next: 'nope' }] }), /unknown next 'nope'/);
    });

    test('registerFlow with { default: true } sets the default flow', function (assert) {
        const service = this.owner.lookup('service:onboarding-registry');
        service.registerFlow(validFlow({ id: 'custom' }), { default: true });
        assert.strictEqual(service.defaultFlow, 'custom');
    });

    test('useFlow updates the default flow', function (assert) {
        const service = this.owner.lookup('service:onboarding-registry');
        service.useFlow('other@v2');
        assert.strictEqual(service.defaultFlow, 'other@v2');
    });
});
