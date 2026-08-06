import { module, test } from 'qunit';
import { initialize } from '@fleetbase/console/instance-initializers/set-application-instance';

module('Unit | Instance Initializer | set-application-instance', function () {
    test('it hands the application instance to the universe service', function (assert) {
        let received;
        const appInstance = {
            lookup: () => ({
                setApplicationInstance(instance) {
                    received = instance;
                },
            }),
        };

        initialize(appInstance);

        assert.strictEqual(received, appInstance);
    });

    test('it is a no-op when the universe service is unavailable', function (assert) {
        initialize({ lookup: () => undefined });

        assert.ok(true, 'no error is thrown without a universe service');
    });
});
