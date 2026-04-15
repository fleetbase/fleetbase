import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

/**
 * Unit tests for the operations settings controller.
 *
 * Scenarios covered:
 *   1. Empty model -> category getters return empty objects.
 *   2. accessDenied is exposed from model to template.
 *   3. saveCategory wraps the flat payload under `settings` and PUTs it
 *      to v1/company-settings/current (Task 2 contract).
 *   4. 422 routes through notifications.error with the first validation
 *      message.
 *   5. 403 routes through notifications.error with the permission message.
 *   6. Non-object payloads are ignored.
 *   7. setActiveTab flips the tracked `activeTab` property.
 *   8. `payFiles` getter reads `settings.pay_files` (backend underscore)
 *      even though the controller exposes it as `payFiles`.
 */
module('Unit | Controller | console/settings/operations', function (hooks) {
    setupTest(hooks);

    function buildController(owner) {
        const controller = owner.lookup('controller:console/settings/operations');
        const requests = [];
        const notifications = {
            calls: [],
            success(msg) {
                this.calls.push(['success', msg]);
            },
            error(msg) {
                this.calls.push(['error', msg]);
            },
        };

        controller.fetch = {
            get(path) {
                requests.push(['GET', path, null]);
                return Promise.resolve({ settings: {} });
            },
            put(path, body) {
                requests.push(['PUT', path, body]);
                return Promise.resolve({ settings: {} });
            },
        };
        controller.notifications = notifications;
        controller.router = { refresh: () => null };

        return { controller, requests, notifications };
    }

    test('scenario 1: empty model -> category getters default to empty objects', function (assert) {
        const { controller } = buildController(this.owner);
        controller.model = { settings: {}, accessDenied: false };

        assert.deepEqual(controller.billing, {});
        assert.deepEqual(controller.tendering, {});
        assert.deepEqual(controller.documents, {});
        assert.deepEqual(controller.payFiles, {});
        assert.deepEqual(controller.fuel, {});
        assert.deepEqual(controller.audit, {});
    });

    test('scenario 2: accessDenied exposed to template', function (assert) {
        const { controller } = buildController(this.owner);
        controller.model = { settings: {}, accessDenied: true };

        assert.strictEqual(controller.accessDenied, true);
        assert.deepEqual(controller.settings, {});
    });

    test('scenario 3: saveCategory wraps flat payload under `settings` and PUTs to Task 2 endpoint', async function (assert) {
        const { controller, requests, notifications } = buildController(this.owner);
        controller.model = { settings: {}, accessDenied: false };

        const payload = {
            'billing.default_payment_terms_days': 45,
            'billing.default_billing_frequency': 'weekly',
            'billing.invoice_number_prefix': 'INV',
            'billing.invoice_number_next': 1,
            'billing.default_currency': 'USD',
        };
        await controller.saveCategory(payload);

        assert.deepEqual(
            requests,
            [['PUT', 'v1/company-settings/current', { settings: payload }]],
            'PUT body wraps the flat dot-notation payload under `settings`'
        );
        assert.strictEqual(notifications.calls[0][0], 'success', 'success notification fired');
        assert.strictEqual(controller.isSaving, false, 'isSaving resets after save');
    });

    test('scenario 3b: saveCategory PUTs pay_files.* keys (backend underscore)', async function (assert) {
        const { controller, requests } = buildController(this.owner);
        controller.model = { settings: {}, accessDenied: false };

        const payload = {
            'pay_files.default_format': 'csv',
            'pay_files.default_frequency': 'weekly',
            'pay_files.default_day_of_week': 1,
            'pay_files.default_recipients': ['ops@example.com'],
            'pay_files.default_payment_method': 'ach',
        };
        await controller.saveCategory(payload);

        assert.deepEqual(requests, [['PUT', 'v1/company-settings/current', { settings: payload }]]);
    });

    test('scenario 4: 422 -> notifications.error with first validation message', async function (assert) {
        const { controller, notifications } = buildController(this.owner);
        controller.model = { settings: {}, accessDenied: false };
        controller.fetch = {
            get: () => Promise.resolve({ settings: {} }),
            put: () => {
                const err = new Error('Validation failed');
                err.status = 422;
                err.response = { json: { errors: { 'billing.default_currency': ['Must be ISO-4217'] } } };
                return Promise.reject(err);
            },
        };

        await controller.saveCategory({ 'billing.default_currency': 'US' });

        const [call] = notifications.calls;
        assert.strictEqual(call[0], 'error', '422 routed through error');
        assert.strictEqual(call[1], 'Must be ISO-4217', 'surfaces the first validation message');
    });

    test('scenario 5: 403 -> notifications.error with permission message', async function (assert) {
        const { controller, notifications } = buildController(this.owner);
        controller.model = { settings: {}, accessDenied: false };
        controller.fetch = {
            get: () => Promise.resolve({ settings: {} }),
            put: () => {
                const err = new Error('Forbidden');
                err.status = 403;
                return Promise.reject(err);
            },
        };

        await controller.saveCategory({ 'billing.default_currency': 'USD' });

        const [call] = notifications.calls;
        assert.strictEqual(call[0], 'error');
        assert.ok(call[1].toLowerCase().includes('permission'));
    });

    test('scenario 6: saveCategory ignores non-object payloads', async function (assert) {
        const { controller, requests } = buildController(this.owner);
        controller.model = { settings: {}, accessDenied: false };

        await controller.saveCategory(null);
        await controller.saveCategory('not-an-object');
        await controller.saveCategory(undefined);

        assert.deepEqual(requests, [], 'no network calls for invalid payloads');
    });

    test('scenario 7: setActiveTab flips the tracked active tab', function (assert) {
        const { controller } = buildController(this.owner);
        controller.model = { settings: {}, accessDenied: false };

        assert.strictEqual(controller.activeTab, 'billing', 'defaults to billing');
        controller.setActiveTab('audit');
        assert.strictEqual(controller.activeTab, 'audit');
        controller.setActiveTab('pay-files');
        assert.strictEqual(controller.activeTab, 'pay-files');
    });

    test('scenario 8: payFiles getter reads settings.pay_files (backend underscore)', function (assert) {
        const { controller } = buildController(this.owner);
        controller.model = {
            settings: {
                pay_files: { default_format: 'ach_nacha', default_frequency: 'monthly' },
            },
            accessDenied: false,
        };

        assert.deepEqual(controller.payFiles, {
            default_format: 'ach_nacha',
            default_frequency: 'monthly',
        });
    });

    test('tabs getter returns the 6 locked tab keys in order', function (assert) {
        const { controller } = buildController(this.owner);
        assert.deepEqual(controller.tabs, ['billing', 'tendering', 'documents', 'pay-files', 'fuel', 'audit']);
    });
});
