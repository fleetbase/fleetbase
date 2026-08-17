import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | console/notifications', function (hooks) {
    setupTest(hooks);

    test('every listed query param refreshes the model', function (assert) {
        const route = this.owner.lookup('route:console/notifications');

        assert.deepEqual(Object.keys(route.queryParams), ['page', 'limit', 'sort', 'query', 'created_at']);
        Object.entries(route.queryParams).forEach(([key, options]) => {
            assert.true(options.refreshModel, `${key} refreshes the model`);
        });
    });

    test('model queries notifications with the given params', function (assert) {
        const route = this.owner.lookup('route:console/notifications');

        let queried;
        route.store.query = (type, params) => {
            queried = { type, params };
            return 'result';
        };

        assert.strictEqual(route.model({ page: 2 }), 'result');
        assert.deepEqual(queried, { type: 'notification', params: { page: 2 } });
    });

    test('activate disables the sidebar and deactivate re-enables it', function (assert) {
        const route = this.owner.lookup('route:console/notifications');

        // enable/disable are @action, which are exposed as getters — shadow with values.
        const calls = [];
        Object.defineProperty(route.sidebar, 'disable', { configurable: true, value: () => calls.push('disable') });
        Object.defineProperty(route.sidebar, 'enable', { configurable: true, value: () => calls.push('enable') });

        route.activate();
        route.deactivate();

        assert.deepEqual(calls, ['disable', 'enable']);
    });
});

module('Unit | Route | console/notifications | model', function (hooks) {
    setupTest(hooks);

    test('the notification list is queried with whatever params the route was given', function (assert) {
        const route = this.owner.lookup('route:console/notifications');
        const queries = [];
        Object.defineProperty(route, 'store', {
            configurable: true,
            value: {
                query: (type, params) => {
                    queries.push({ type, params });
                    return Promise.resolve([]);
                },
            },
        });

        route.model({ page: 2, limit: 10 });
        route.model();

        assert.deepEqual(queries, [
            { type: 'notification', params: { page: 2, limit: 10 } },
            { type: 'notification', params: {} },
        ]);
    });
});
