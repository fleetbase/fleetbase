import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';

module('Unit | Controller | console/account/index', function (hooks) {
    setupTest(hooks);

    test('loadTimezones populates the timezones list on construction', async function (assert) {
        class FetchStub extends Service {
            get(path) {
                this.path = path;
                return Promise.resolve(['UTC', 'Europe/Berlin']);
            }
        }
        this.owner.register('service:fetch', FetchStub);

        const controller = this.owner.lookup('controller:console/account/index');
        await settled();

        assert.strictEqual(this.owner.lookup('service:fetch').path, 'lookup/timezones');
        assert.deepEqual(controller.timezones, ['UTC', 'Europe/Berlin']);
    });
});
