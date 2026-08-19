import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Route | console/admin/organizations/index/users | nested list', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.response = { users: [{ uuid: 'user_1' }], meta: { total: 1 } };
        const context = this;
        class FetchStub extends Service {
            get(path, query) {
                context.request = { path, query };
                return Promise.resolve(context.response);
            }
            jsonToModel(json, modelName) {
                return { ...json, modelName };
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.store = this.owner.lookup('service:store');
        this.route = () => this.owner.lookup('route:console/admin/organizations/index/users');
    });

    test('model requests the members of the organization in the URL', async function (assert) {
        const model = await this.route().model({ public_id: 'company_abc', nestedPage: 1, nestedLimit: 20, nestedSort: '-created_at', nestedQuery: '' });

        assert.strictEqual(this.request.path, 'companies/company_abc/users');
        assert.deepEqual(this.request.query, { page: 1, limit: 20, sort: '-created_at', query: '', paginate: 1 });
        assert.deepEqual(model.toArray(), [{ uuid: 'user_1', modelName: 'user' }]);
        assert.deepEqual(model.meta, { total: 1 });
    });

    test('a response that is not a list is passed through untouched', async function (assert) {
        this.response = { users: null, meta: {} };

        const model = await this.route().model({ public_id: 'company_abc' });

        assert.strictEqual(model.get('content'), null);
    });

    test('getCompany finds the loaded organization by public id or id', async function (assert) {
        const route = this.route();
        this.store.push({ data: { id: 'co_1', type: 'company', attributes: { public_id: 'company_abc' } } });

        await route.model({ public_id: 'company_abc' });
        assert.strictEqual(route.getCompany()?.id, 'co_1', 'matched on public_id');

        await route.model({ public_id: 'co_1' });
        assert.strictEqual(route.getCompany()?.id, 'co_1', 'matched on the record id');

        await route.model({ public_id: 'not-loaded' });
        assert.strictEqual(route.getCompany(), undefined, 'an unknown organization yields nothing');
    });

    test('setupController hands the resolved organization to the controller', async function (assert) {
        const route = this.route();
        this.store.push({ data: { id: 'co_1', type: 'company', attributes: { public_id: 'company_abc' } } });
        await route.model({ public_id: 'company_abc' });
        const controller = {};

        route.setupController(controller);

        assert.strictEqual(controller.company?.id, 'co_1');
    });
});
