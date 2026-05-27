import { module, test } from 'qunit';
import Service from '@ember/service';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Controller | install', function (hooks) {
    setupTest(hooks);

    test('it exists', function (assert) {
        let controller = this.owner.lookup('controller:install');
        assert.ok(controller);
    });

    test('it exposes docs links without installer actions', function (assert) {
        let controller = this.owner.lookup('controller:install');

        assert.strictEqual(controller.runningLocallyDocsUrl, 'https://www.fleetbase.io/docs/platform/quickstart/running-locally');
        assert.strictEqual(controller.cloudDocsUrl, 'https://www.fleetbase.io/docs/platform/quickstart/deploy-in-cloud');
        assert.strictEqual(controller.startInstall, undefined);
        assert.strictEqual(controller.install, undefined);
    });

    test('it exposes install refresh state from installation service', function (assert) {
        class InstallationStub extends Service {
            isRefreshing = true;
        }

        this.owner.register('service:installation', InstallationStub);

        let controller = this.owner.lookup('controller:install');

        assert.true(controller.isRefreshing);
    });
});
