import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

/**
 * Both leaf routes under the organization details screen reuse the organization their
 * parent already loaded rather than refetching it.
 */
const ROUTES = [{ name: 'route:console/admin/organizations/details/index' }, { name: 'route:console/admin/organizations/details/settings' }];

module('Unit | Route | console/admin/organizations/details leaf routes', function (hooks) {
    setupTest(hooks);

    ROUTES.forEach(({ name }) => {
        test(`${name} reuses the parent organization`, function (assert) {
            const route = this.owner.lookup(name);
            const organization = { uuid: 'org_1', name: 'Acme' };
            const requested = [];

            route.modelFor = (routeName) => {
                requested.push(routeName);
                return organization;
            };

            assert.strictEqual(route.model(), organization);
            assert.deepEqual(requested, ['console.admin.organizations.details'], 'it asks the details route, not the API');
        });
    });
});
