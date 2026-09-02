import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

/**
 * The extensions tab is a thin shell: it looks its own definition up in the tab registry by
 * slug and hands extension components the context they are documented to receive.
 */
module('Unit | Controller | console/admin/organizations/details/extensions-tab', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.controller = this.owner.lookup('controller:console/admin/organizations/details/extensions-tab');

        this.registered = [];
        Object.defineProperty(this.controller.menuService, 'getMenuItems', {
            configurable: true,
            value: () => this.registered,
        });
    });

    test('tab finds the registered definition matching the current slug', function (assert) {
        const billing = { slug: 'billing', component: 'billing/tab', label: 'Billing' };
        this.registered = [{ slug: 'audit', component: 'audit/tab' }, billing];
        this.controller.slug = 'billing';

        assert.strictEqual(this.controller.tab, billing);
    });

    test('a slug nothing has registered resolves to no tab', function (assert) {
        this.registered = [{ slug: 'audit', component: 'audit/tab' }];
        this.controller.slug = 'billing';

        assert.strictEqual(this.controller.tab, undefined, 'the template renders nothing rather than throwing');
    });

    test('context carries the organization and the signed-in user', function (assert) {
        const organization = { uuid: 'org_1', name: 'Acme' };
        this.controller.organization = organization;
        Object.defineProperty(this.controller.session, 'data', {
            configurable: true,
            value: { authenticated: { user: { id: 'user_1' } } },
        });

        assert.deepEqual(this.controller.context, {
            organization,
            currentUser: { id: 'user_1' },
            capabilities: {},
        });
    });

    test('an unauthenticated session yields no current user rather than throwing', function (assert) {
        Object.defineProperty(this.controller.session, 'data', { configurable: true, value: {} });

        assert.strictEqual(this.controller.context.currentUser, undefined);
        assert.deepEqual(this.controller.context.capabilities, {});
    });
});
