import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | console/admin/organizations/index | query', function (hooks) {
    setupTest(hooks);

    test('every filter param refreshes the model', function (assert) {
        const route = this.owner.lookup('route:console/admin/organizations/index');
        const params = [
            'page',
            'query',
            'sort',
            'limit',
            'name',
            'country',
            'status',
            'owner_email',
            'onboarding_completed',
            'billing_status',
            'created_at',
            'needs_attention',
            'missing_owner',
            'inactive_status',
        ];

        for (const param of params) {
            assert.true(route.queryParams[param]?.refreshModel, `${param} refreshes the list`);
        }
    });

    test('model queries companies through the admin view with the current filters', function (assert) {
        const route = this.owner.lookup('route:console/admin/organizations/index');
        const queries = [];
        route.store.query = (type, params) => {
            queries.push({ type, params });
            return Promise.resolve([]);
        };

        route.model({ page: 2, status: 'active' });

        assert.deepEqual(queries, [{ type: 'company', params: { view: 'admin', page: 2, status: 'active' } }]);
    });
});
