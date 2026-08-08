import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Route | console/admin/organizations/index/users', function (hooks) {
    setupTest(hooks);

    test('every nested query param refreshes the model', function (assert) {
        const route = this.owner.lookup('route:console/admin/organizations/index/users');

        assert.deepEqual(Object.keys(route.queryParams), ['nestedPage', 'nestedLimit', 'nestedSort', 'nestedQuery']);
        Object.entries(route.queryParams).forEach(([key, options]) => {
            assert.true(options.refreshModel, `${key} refreshes the model`);
        });
    });

    test('model fetches the company users with the nested params mapped through', async function (assert) {
        let requested;
        class FetchStub extends Service {
            get(path, params) {
                requested = { path, params };
                return Promise.resolve({ users: [], meta: { total: 0 } });
            }
            jsonToModel(json) {
                return json;
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const route = this.owner.lookup('route:console/admin/organizations/index/users');
        await route.model({ public_id: 'company_1', nestedPage: 2, nestedLimit: 25, nestedSort: '-name', nestedQuery: 'ron' });

        assert.strictEqual(requested.path, 'companies/company_1/users');
        assert.deepEqual(requested.params, { page: 2, limit: 25, sort: '-name', query: 'ron', paginate: 1 });
        assert.strictEqual(route.companyId, 'company_1', 'the company id is retained for setupController');
    });

    test('transformResults maps users into models and preserves meta', function (assert) {
        class FetchStub extends Service {
            jsonToModel(json, type) {
                return { ...json, _type: type };
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const route = this.owner.lookup('route:console/admin/organizations/index/users');
        const proxy = route.transformResults({ users: [{ id: 'u1' }], meta: { total: 1 } });

        assert.deepEqual(proxy.get('meta'), { total: 1 });
        assert.deepEqual(proxy.get('content'), [{ id: 'u1', _type: 'user' }]);
    });

    test('transformResults passes non-array users through untouched', function (assert) {
        const route = this.owner.lookup('route:console/admin/organizations/index/users');
        const proxy = route.transformResults({ users: undefined, meta: {} });

        assert.strictEqual(proxy.get('content'), undefined);
    });

    test('getCompany matches the loaded company by public_id or id', function (assert) {
        const route = this.owner.lookup('route:console/admin/organizations/index/users');
        const store = this.owner.lookup('service:store');
        store.push({ data: { id: 'uuid-1', type: 'company', attributes: { public_id: 'company_1' } } });

        route.companyId = 'company_1';
        assert.strictEqual(route.getCompany().public_id, 'company_1', 'matched by public_id');

        route.companyId = 'uuid-1';
        assert.strictEqual(route.getCompany().id, 'uuid-1', 'matched by id');

        route.companyId = 'nope';
        assert.strictEqual(route.getCompany(), undefined, 'no match returns undefined');
    });
});
