import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Adapter | application', function (hooks) {
    setupTest(hooks);

    // The application adapter is re-exported from @fleetbase/ember-core; this
    // asserts it resolves and is wired into the container.
    test('it resolves from the container', function (assert) {
        const adapter = this.owner.lookup('adapter:application');
        assert.ok(adapter);
        assert.strictEqual(typeof adapter.urlForFindRecord, 'function');
    });
});
