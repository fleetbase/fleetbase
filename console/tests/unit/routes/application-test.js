import { module, test } from 'qunit';
import Service from '@ember/service';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | application', function (hooks) {
    setupTest(hooks);

    test('it exists', function (assert) {
        let route = this.owner.lookup('route:application');
        assert.ok(route);
    });

    test('it does not check installer status during app boot', function (assert) {
        let route = this.owner.lookup('route:application');

        assert.strictEqual(route.checkInstallationStatus, undefined);
        assert.notOk('defaultTheme' in route);
    });

    test('it handles unconfigured Fleetbase route errors', function (assert) {
        let handledError;

        class InstallationStub extends Service {
            handleError(error) {
                handledError = error;
                return true;
            }
        }

        this.owner.register('service:installation', InstallationStub);

        const route = this.owner.lookup('route:application');
        const error = { error: 'fleetbase_not_configured' };
        const result = route.error(error);

        assert.false(result);
        assert.strictEqual(handledError, error);
    });

    test('it bubbles route errors that are not configuration errors', function (assert) {
        class InstallationStub extends Service {
            handleError() {
                return false;
            }
        }

        this.owner.register('service:installation', InstallationStub);

        const route = this.owner.lookup('route:application');
        const result = route.error(new Error('server_error'));

        assert.true(result);
    });
});
