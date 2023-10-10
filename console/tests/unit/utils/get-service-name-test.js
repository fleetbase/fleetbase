import getServiceName from '@fleetbase/console/utils/get-service-name';
import { module, test } from 'qunit';

module('Unit | Utility | get-service-name', function () {
    // TODO: Replace this with your real tests.
    test('it works', function (assert) {
        let result = getServiceName();
        assert.ok(result);
    });
});
