import createNotificationKey from '@fleetbase/console/utils/create-notification-key';
import { module, test } from 'qunit';

module('Unit | Utility | create-notification-key', function () {
    // TODO: Replace this with your real tests.
    test('it works', function (assert) {
        let result = createNotificationKey();
        assert.ok(result);
    });
});
