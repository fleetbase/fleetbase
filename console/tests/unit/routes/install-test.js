import { module, test } from 'qunit';
import Service from '@ember/service';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Route | install', function (hooks) {
    setupTest(hooks);

    test('it exists', function (assert) {
        let route = this.owner.lookup('route:install');
        assert.ok(route);
    });

    test('it starts and stops the install completion listener', function (assert) {
        let started = false;
        let stopped = false;

        class InstallationStub extends Service {
            listenForInstallComplete() {
                started = true;
            }

            stopListeningForInstallComplete() {
                stopped = true;
            }
        }

        this.owner.register('service:installation', InstallationStub);

        let route = this.owner.lookup('route:install');
        let controller = {};

        route.setupController(controller, {});
        route.resetController(controller, true);

        assert.true(started);
        assert.true(stopped);
    });

    test('it checks install route status before entering', function (assert) {
        class InstallationStub extends Service {
            redirectIfConfiguredFromInstall() {
                return 'install-status-transition';
            }
        }

        this.owner.register('service:installation', InstallationStub);

        let route = this.owner.lookup('route:install');

        assert.strictEqual(route.beforeModel(), 'install-status-transition');
    });
});

module('Unit | Route | install | teardown', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.route = this.owner.lookup('route:install');
        this.stopped = 0;
        Object.defineProperty(this.route.installation, 'stopListeningForInstallComplete', {
            configurable: true,
            value: () => this.stopped++,
        });
    });

    test('leaving the install screen stops listening for the completion event', function (assert) {
        this.route.resetController(this.owner.lookup('controller:install'), true);

        assert.strictEqual(this.stopped, 1);
    });

    test('a query-param change within the install screen keeps the listener alive', function (assert) {
        this.route.resetController(this.owner.lookup('controller:install'), false);

        assert.strictEqual(this.stopped, 0, 'the socket subscription survives an in-route transition');
    });
});
