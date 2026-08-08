import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Controller | console/admin/organizations/details/index', function (hooks) {
    setupTest(hooks);

    function lookup(owner) {
        return owner.lookup('controller:console/admin/organizations/details/index');
    }

    test('owner getters resolve from the organization model', function (assert) {
        const controller = lookup(this.owner);
        controller.model = {
            status: 'active',
            users_count: 7,
            onboarding_completed: true,
            owner: { name: 'Ron', email: 'ron@fleetbase.io', phone: '555-1234' },
        };

        assert.strictEqual(controller.organization, controller.model);
        assert.strictEqual(controller.ownerName, 'Ron');
        assert.strictEqual(controller.ownerEmail, 'ron@fleetbase.io');
        assert.strictEqual(controller.ownerPhone, '555-1234');
        assert.strictEqual(controller.ownerState, 'Assigned');
        assert.strictEqual(controller.onboardingState, 'Complete');
        assert.strictEqual(controller.statusLabel, 'active');
    });

    test('getters fall back sensibly when the owner and flags are missing', function (assert) {
        const controller = lookup(this.owner);
        controller.model = { status: 'suspended', owner: null };

        assert.strictEqual(controller.owner, null);
        assert.strictEqual(controller.ownerState, 'Missing');
        assert.strictEqual(controller.onboardingState, 'Incomplete');
        assert.strictEqual(controller.statusLabel, 'suspended');
    });

    test('metrics builds a four-card KPI summary from the model', function (assert) {
        const controller = lookup(this.owner);
        controller.model = { status: 'active', users_count: 3, onboarding_completed: false, owner: { email: 'o@x.co' } };

        const metrics = controller.metrics;
        assert.strictEqual(metrics.length, 4);
        assert.deepEqual(
            metrics.map((m) => m.label),
            ['Users', 'Owner', 'Onboarding', 'Status']
        );
        assert.strictEqual(metrics[0].value, 3, 'users metric reads users_count');
        assert.strictEqual(metrics[2].value, 'Incomplete', 'onboarding metric reflects the flag');
    });

    test('resolveBelongsTo unwraps content and drops pending proxies', function (assert) {
        const controller = lookup(this.owner);

        assert.strictEqual(controller.resolveBelongsTo(null), null);
        assert.deepEqual(controller.resolveBelongsTo({ content: { id: 'x' } }), { id: 'x' });
        assert.strictEqual(controller.resolveBelongsTo({ isPending: true }), null);
    });
});
