import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Route | console/admin/organizations/details/index', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const context = this;
        this.organization = { uuid: 'org_1', name: 'Acme' };
        this.usage = { users_count: 2, drivers_count: 0, orders_count: 17, customers_count: null };
        class FetchStub extends Service {
            get(path) {
                context.requested = path;
                return context.reject ? Promise.reject(new Error('Unavailable')) : Promise.resolve({ usage: context.usage });
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.route = this.owner.lookup('route:console/admin/organizations/details/index');
        this.route.modelFor = (name) => {
            assertRouteName(name);
            return this.organization;
        };
    });

    function assertRouteName(name) {
        if (name !== 'console.admin.organizations.details') {
            throw new Error(`Unexpected parent route: ${name}`);
        }
    }

    test('loads tenant-scoped operational totals without refetching the company', async function (assert) {
        const model = await this.route.model();
        assert.strictEqual(this.requested, 'companies/org_1/usage');
        assert.strictEqual(model.organization, this.organization);
        assert.strictEqual(model.usage, this.usage);
        assert.false(model.usageError);
    });

    test('a totals failure preserves the organization and exposes a retry state', async function (assert) {
        this.reject = true;
        const model = await this.route.model();
        assert.strictEqual(model.organization, this.organization);
        assert.strictEqual(model.usage, null);
        assert.true(model.usageError);
    });
});

module('Unit | Route | console/admin/organizations/details/settings', function (hooks) {
    setupTest(hooks);

    test('reuses the parent organization', function (assert) {
        const route = this.owner.lookup('route:console/admin/organizations/details/settings');
        const organization = { uuid: 'org_1', name: 'Acme' };
        const requested = [];
        route.modelFor = (name) => {
            requested.push(name);
            return organization;
        };
        assert.strictEqual(route.model(), organization);
        assert.deepEqual(requested, ['console.admin.organizations.details']);
    });
});
