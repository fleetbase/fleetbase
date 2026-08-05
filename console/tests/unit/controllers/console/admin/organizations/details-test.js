import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Controller | console/admin/organizations/details', function (hooks) {
    setupTest(hooks);

    function lookup(owner) {
        return owner.lookup('controller:console/admin/organizations/details');
    }

    test('status getters read the organization model with defaults', function (assert) {
        const controller = lookup(this.owner);
        controller.model = { status: 'active', onboarding_completed: true, billing_status: 'active' };

        assert.strictEqual(controller.organization, controller.model);
        assert.strictEqual(controller.organizationStatus, 'active');
        assert.strictEqual(controller.onboardingStatus, 'complete');
        assert.strictEqual(controller.billingStatus, 'active');
    });

    test('status getters fall back when the model is sparse', function (assert) {
        const controller = lookup(this.owner);
        controller.model = {};

        assert.strictEqual(controller.organizationStatus, 'active');
        assert.strictEqual(controller.onboardingStatus, 'incomplete');
        assert.strictEqual(controller.billingStatus, 'not configured');
    });

    test('owner getters resolve the belongsTo and expose identity fields', function (assert) {
        const controller = lookup(this.owner);
        controller.model = { owner_uuid: 'owner_1', owner: { id: 'owner_1', name: 'Ron', email: 'ron@fleetbase.io' } };

        assert.strictEqual(controller.ownerName, 'Ron');
        assert.strictEqual(controller.ownerEmail, 'ron@fleetbase.io');
        assert.strictEqual(controller.ownerId, 'owner_1');
        assert.true(controller.hasOwner);
    });

    test('hasOwner is true from owner_uuid even without a loaded owner record', function (assert) {
        const controller = lookup(this.owner);
        controller.model = { owner_uuid: 'owner_2', owner: null };

        assert.strictEqual(controller.owner, null);
        assert.strictEqual(controller.ownerId, 'owner_2', 'falls back to owner_uuid');
        assert.true(controller.hasOwner);
    });
});
