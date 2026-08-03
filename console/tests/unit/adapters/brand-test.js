import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Adapter | brand', function (hooks) {
    setupTest(hooks);

    test('all branding record URLs resolve to settings/branding', function (assert) {
        const adapter = this.owner.lookup('adapter:brand');
        const expected = `${adapter.host}/${adapter.namespace}/settings/branding`;

        assert.strictEqual(adapter.urlForFindRecord(), expected);
        assert.strictEqual(adapter.urlForUpdateRecord(), expected);
        assert.strictEqual(adapter.urlForCreateRecord(), expected);
    });
});
