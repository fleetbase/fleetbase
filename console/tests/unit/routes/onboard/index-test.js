import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | onboard/index', function (hooks) {
    setupTest(hooks);

    test('none of the onboarding query params refresh the model', function (assert) {
        const route = this.owner.lookup('route:onboard/index');

        assert.deepEqual(Object.keys(route.queryParams), ['step', 'session', 'code']);
        Object.entries(route.queryParams).forEach(([key, options]) => {
            assert.false(options.refreshModel, `${key} does not refresh the model`);
        });
    });

    test('beforeModel resumes the default onboarding flow', function (assert) {
        const route = this.owner.lookup('route:onboard/index');

        let started;
        route.orchestrator.start = (flowId, opts) => {
            started = { flowId, opts };
            return Promise.resolve();
        };

        route.beforeModel();

        assert.deepEqual(started, { flowId: null, opts: { resume: true } });
    });

    test('model loads the brand record', async function (assert) {
        const route = this.owner.lookup('route:onboard/index');
        route.store.findRecord = (type, id) => Promise.resolve(`${type}:${id}`);

        assert.strictEqual(await route.model(), 'brand:1');
    });
});
