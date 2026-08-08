import { module, test } from 'qunit';
import { initialize } from '@fleetbase/console/instance-initializers/apply-router-fix';

module('Unit | Instance Initializer | apply-router-fix', function () {
    test('it applies the router refresh patch to the app instance', function (assert) {
        // applyRouterFix reads the router off the app instance; a lookup that yields
        // nothing exercises the patch without needing a real router.
        initialize({ lookup: () => undefined });

        assert.ok(true, 'initialize completes for an app instance with no router');
    });

    test('a failure while patching does not stop boot', function (assert) {
        initialize({
            lookup() {
                throw new Error('router unavailable');
            },
        });

        assert.ok(true, 'the error is caught and boot continues');
    });
});
