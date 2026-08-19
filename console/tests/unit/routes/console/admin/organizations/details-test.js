import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Route | console/admin/organizations/details', function (hooks) {
    setupTest(hooks);

    test('model fetches the organization by public id, normalized into the store', async function (assert) {
        const requests = [];
        class FetchStub extends Service {
            get(path, query, options) {
                requests.push({ path, query, options });
                return Promise.resolve({ id: 'co_1' });
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const route = this.owner.lookup('route:console/admin/organizations/details');
        const model = await route.model({ public_id: 'company_abc' });

        assert.deepEqual(requests, [
            {
                path: 'companies/find/company_abc',
                query: {},
                options: { normalizeToEmberData: true, normalizeModelType: 'company' },
            },
        ]);
        assert.deepEqual(model, { id: 'co_1' });
    });
});

module('Unit | Route | console/admin/organizations/details/activity', function (hooks) {
    setupTest(hooks);

    test('model reuses the organization already loaded by the parent route', function (assert) {
        const route = this.owner.lookup('route:console/admin/organizations/details/activity');
        const organization = { id: 'co_1' };
        let askedFor;
        route.modelFor = (name) => {
            askedFor = name;
            return organization;
        };

        assert.strictEqual(route.model(), organization, 'no second request is made');
        assert.strictEqual(askedFor, 'console.admin.organizations.details');
    });
});

module('Unit | Route | console/admin/organizations/details/extensions', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.response = { extensions: [{ id: 'ext_1' }] };
        const context = this;
        class FetchStub extends Service {
            get(path) {
                context.requested = path;
                return Promise.resolve(context.response);
            }
        }
        this.owner.register('service:fetch', FetchStub);

        this.build = () => {
            const route = this.owner.lookup('route:console/admin/organizations/details/extensions');
            route.modelFor = () => ({ uuid: 'co-uuid-1' });
            return route;
        };
    });

    test('model loads the extensions installed for the organization', async function (assert) {
        const model = await this.build().model();

        assert.strictEqual(this.requested, 'companies/co-uuid-1/extensions');
        assert.deepEqual(model.extensions, [{ id: 'ext_1' }]);
        assert.deepEqual(model.organization, { uuid: 'co-uuid-1' }, 'the organization travels with them');
    });

    test('a response with no extensions yields an empty list', async function (assert) {
        this.response = {};

        const model = await this.build().model();

        assert.deepEqual(model.extensions, [], 'the template can iterate safely');
    });
});

module('Unit | Route | console/admin/organizations/details/extensions-tab', function (hooks) {
    setupTest(hooks);

    test('model pairs the organization with the requested tab slug', function (assert) {
        const route = this.owner.lookup('route:console/admin/organizations/details/extensions-tab');
        const organization = { uuid: 'co-uuid-1' };
        route.modelFor = () => organization;

        const model = route.model({ slug: 'fleet-ops' });

        assert.strictEqual(model.organization, organization);
        assert.strictEqual(model.slug, 'fleet-ops');
    });

    test('setupController exposes both to the template', function (assert) {
        const route = this.owner.lookup('route:console/admin/organizations/details/extensions-tab');
        const organization = { uuid: 'co-uuid-1' };
        const controller = {};

        route.setupController(controller, { organization, slug: 'fleet-ops' });

        assert.strictEqual(controller.organization, organization);
        assert.strictEqual(controller.slug, 'fleet-ops');
    });
});

module('Unit | Route | console/admin/organizations/details/users', function (hooks) {
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

        this.build = () => {
            const route = this.owner.lookup('route:console/admin/organizations/details/users');
            route.modelFor = () => ({ public_id: 'company_abc' });
            return route;
        };
    });

    test('every nested list param refreshes the model', function (assert) {
        const route = this.build();

        for (const param of ['nestedPage', 'nestedLimit', 'nestedSort', 'nestedQuery']) {
            assert.true(route.queryParams[param].refreshModel, `${param} refreshes`);
        }
    });

    test('model requests a paginated page of the organization members', async function (assert) {
        const model = await this.build().model({ nestedPage: 2, nestedLimit: 10, nestedSort: '-created_at', nestedQuery: 'ron' });

        assert.strictEqual(this.request.path, 'companies/company_abc/users');
        assert.deepEqual(this.request.query, { page: 2, limit: 10, sort: '-created_at', query: 'ron', paginate: 1 });
        assert.deepEqual(model.meta, { total: 1 }, 'the paging meta is kept for the table');
        assert.deepEqual(model.toArray(), [{ uuid: 'user_1', modelName: 'user' }], 'each row is turned into a user model');
    });

    test('a response that is not a list is passed through untouched', async function (assert) {
        this.response = { users: undefined, meta: {} };

        const model = await this.build().model({});

        assert.strictEqual(model.get('content'), undefined, 'nothing is mapped');
    });

    test('setupController hands the organization to the controller', function (assert) {
        const route = this.build();
        const controller = {};

        route.setupController(controller);

        assert.deepEqual(controller.company, { public_id: 'company_abc' });
    });
});
