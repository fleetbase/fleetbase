import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Controller | console/admin/organizations/details/index', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.controller = this.owner.lookup('controller:console/admin/organizations/details/index');
    });

    test('profile getters use the organization independently of usage totals', function (assert) {
        const organization = {
            status: 'active',
            onboarding_completed: true,
            owner: { name: 'Ron', email: 'ron@fleetbase.io', phone: '555-1234' },
        };
        this.controller.model = { organization, usage: null };

        assert.strictEqual(this.controller.organization, organization);
        assert.strictEqual(this.controller.ownerName, 'Ron');
        assert.strictEqual(this.controller.ownerEmail, 'ron@fleetbase.io');
        assert.strictEqual(this.controller.ownerPhone, '555-1234');
        assert.strictEqual(this.controller.onboardingState, 'Complete');
        assert.strictEqual(this.controller.statusLabel, 'active');
    });

    test('profile getters tolerate loading and ownerless organizations', function (assert) {
        assert.strictEqual(this.controller.organization, undefined);
        assert.strictEqual(this.controller.owner, null);
        assert.strictEqual(this.controller.ownerName, undefined);
        assert.strictEqual(this.controller.ownerEmail, undefined);
        assert.strictEqual(this.controller.ownerPhone, undefined);
        assert.strictEqual(this.controller.onboardingState, 'Incomplete');
        assert.strictEqual(this.controller.statusLabel, 'active');

        this.controller.model = { organization: { status: 'suspended', owner: null } };
        assert.strictEqual(this.controller.statusLabel, 'suspended');
        assert.strictEqual(this.controller.owner, null);

        this.controller.model = { organization: { statusLabel: 'Suspended by billing', status: 'suspended' } };
        assert.strictEqual(this.controller.statusLabel, 'Suspended by billing');
    });

    test('operational totals preserve zero and distinguish unavailable modules', function (assert) {
        this.controller.model = {
            usage: {
                users_count: 3,
                drivers_count: 0,
                customers_count: null,
                orders_count: 28,
                api_requests_count: 9124,
                webhook_callbacks_count: 71,
            },
        };

        assert.deepEqual(this.controller.usageRows, [
            { key: 'users_count', label: 'Organization users', value: 3 },
            { key: 'drivers_count', label: 'Drivers', value: 0 },
            { key: 'customers_count', label: 'Customers', value: null },
            { key: 'orders_count', label: 'Orders', value: 28 },
            { key: 'api_requests_count', label: 'API calls', value: 9124 },
            { key: 'webhook_callbacks_count', label: 'Webhook callbacks', value: 71 },
        ]);
    });

    test('missing usage remains unavailable instead of reporting false zero totals', function (assert) {
        assert.true(this.controller.usageRows.every((row) => row.value === null));
        this.controller.model = { usage: {} };
        assert.true(this.controller.usageRows.every((row) => row.value === null));
    });

    test('refresh retries loading the current organization overview', function (assert) {
        let refreshed = 0;
        Object.defineProperty(this.controller.router, 'refresh', { configurable: true, value: () => ++refreshed });

        assert.strictEqual(this.controller.refresh(), 1);
        assert.strictEqual(refreshed, 1);
    });

    test('owner resolution unwraps fulfilled records and withholds unresolved relationships', function (assert) {
        const record = { id: 'user_1' };
        assert.strictEqual(this.controller.resolveBelongsTo(null), null);
        assert.strictEqual(this.controller.resolveBelongsTo({ content: record }), record);
        assert.strictEqual(this.controller.resolveBelongsTo({ isPending: true }), null);
        assert.strictEqual(this.controller.resolveBelongsTo({ isFulfilled: false }), null);
        assert.strictEqual(this.controller.resolveBelongsTo({ then: () => {} }), null);
        assert.strictEqual(this.controller.resolveBelongsTo(record), record);
    });
});
