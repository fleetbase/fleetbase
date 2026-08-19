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

/**
 * Every getter on this controller is a chain of optional access and fallbacks. The tests
 * above cover the populated and owner-less shapes; these drive the arms neither reaches —
 * no model at all, the alternate fallback in each `||`/`??`, and the opposite side of every
 * ternary the KPI cards use to pick an icon and accent.
 */
module('Unit | Controller | console/admin/organizations/details/index | fallbacks', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.controller = this.owner.lookup('controller:console/admin/organizations/details/index');
    });

    test('every getter is safe before a model has loaded', function (assert) {
        assert.strictEqual(this.controller.organization, undefined);
        assert.strictEqual(this.controller.owner, null);
        assert.strictEqual(this.controller.ownerName, undefined);
        assert.strictEqual(this.controller.ownerEmail, undefined);
        assert.strictEqual(this.controller.ownerPhone, undefined);
        assert.strictEqual(this.controller.ownerState, 'Missing');
        assert.strictEqual(this.controller.onboardingState, 'Incomplete');
        assert.strictEqual(this.controller.statusLabel, 'active', 'an unknown organization is presented as active');
    });

    test('statusLabel prefers a supplied label over the raw status', function (assert) {
        this.controller.model = { statusLabel: 'Suspended by billing', status: 'suspended' };

        assert.strictEqual(this.controller.statusLabel, 'Suspended by billing');
    });

    test('the metrics fall back for an organization with no users, owner or status', function (assert) {
        this.controller.model = { owner: null };

        const [users, owner, onboarding, status] = this.controller.metrics;

        assert.strictEqual(users.value, 0, 'an absent user count reads as zero');
        assert.strictEqual(owner.value, 'Missing');
        assert.strictEqual(owner.caption, 'Needs assignment', 'with no owner email the card says what to do');
        assert.strictEqual(owner.icon, 'user-slash');
        assert.true(owner.accentClass.endsWith('amber'), 'a missing owner is flagged amber');
        assert.strictEqual(onboarding.caption, 'Needs review');
        assert.strictEqual(onboarding.icon, 'triangle-exclamation');
        assert.true(onboarding.accentClass.endsWith('amber'));
        assert.strictEqual(status.value, 'active');
        assert.strictEqual(status.icon, 'shield-check', 'an active organization gets the reassuring icon');
        assert.true(status.accentClass.endsWith('green'));
    });

    test('the metrics reflect a fully set up, non-active organization', function (assert) {
        this.controller.model = {
            status: 'suspended',
            users_count: 12,
            onboarding_completed: true,
            owner: { email: 'owner@fleetbase.io' },
        };

        const [users, owner, onboarding, status] = this.controller.metrics;

        assert.strictEqual(users.value, 12);
        assert.strictEqual(owner.caption, 'owner@fleetbase.io', 'the owner email is used as the caption');
        assert.strictEqual(owner.icon, 'user-check');
        assert.true(owner.accentClass.endsWith('green'));
        assert.strictEqual(onboarding.caption, 'Ready for operations');
        assert.strictEqual(onboarding.icon, 'circle-check');
        assert.true(onboarding.accentClass.endsWith('green'));
        assert.strictEqual(status.icon, 'circle-exclamation', 'a suspended organization is flagged');
        assert.true(status.accentClass.endsWith('rose'));
    });

    test('resolveBelongsTo withholds every unresolved proxy shape and passes a record through', function (assert) {
        const record = { id: 'user_1' };

        assert.strictEqual(this.controller.resolveBelongsTo({ isFulfilled: false }), null, 'an unfulfilled proxy');
        assert.strictEqual(this.controller.resolveBelongsTo({ then: () => {} }), null, 'a bare thenable');
        assert.strictEqual(this.controller.resolveBelongsTo(record), record, 'a plain record is used as-is');
    });
});
