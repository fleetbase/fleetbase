import { module, test } from 'qunit';
import Service from '@ember/service';
import { setupTest } from '@fleetbase/console/tests/helpers';

module('Unit | Service | installation', function (hooks) {
    setupTest(hooks);

    test('it detects Fleetbase not configured errors', function (assert) {
        const service = this.owner.lookup('service:installation');

        assert.true(service.isNotConfiguredError({ error: 'fleetbase_not_configured' }));
        assert.true(service.isNotConfiguredError({ errors: ['fleetbase_not_configured'] }));
        assert.true(service.isNotConfiguredError({ payload: { error: 'fleetbase_not_configured' } }));
        assert.true(service.isNotConfiguredError(new Error('fleetbase_not_configured')));
        assert.false(service.isNotConfiguredError({ error: 'server_error' }));
    });

    test('it checks onboarding state', async function (assert) {
        let request;

        class FetchStub extends Service {
            get(path, query, options) {
                request = { path, query, options };
                return Promise.resolve({ should_onboard: true });
            }
        }

        this.owner.register('service:fetch', FetchStub);

        const service = this.owner.lookup('service:installation');
        const result = await service.checkOnboarding();

        assert.strictEqual(request.path, 'onboard/should-onboard');
        assert.true(request.options.rawError);
        assert.false(result.notConfigured);
        assert.true(result.shouldOnboard);
        assert.strictEqual(service.status, 'configured');
    });

    test('it redirects to install when onboarding check reports unconfigured state', async function (assert) {
        let transitionedTo;

        class FetchStub extends Service {
            get() {
                return Promise.reject({ error: 'fleetbase_not_configured' });
            }
        }

        class RouterStub extends Service {
            currentRouteName = 'auth.login';

            transitionTo(routeName) {
                transitionedTo = routeName;
                return 'install-transition';
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:router', RouterStub);

        const service = this.owner.lookup('service:installation');
        const result = await service.checkOnboarding();

        assert.true(result.notConfigured);
        assert.false(result.shouldOnboard);
        assert.strictEqual(result.transition, 'install-transition');
        assert.strictEqual(transitionedTo, 'install');
        assert.strictEqual(service.status, 'not-configured');
    });

    test('it rethrows non configuration onboarding failures', async function (assert) {
        const expectedError = new Error('server_error');

        class FetchStub extends Service {
            get() {
                return Promise.reject(expectedError);
            }
        }

        this.owner.register('service:fetch', FetchStub);

        const service = this.owner.lookup('service:installation');

        try {
            await service.checkOnboarding();
            assert.true(false, 'Expected checkOnboarding to reject');
        } catch (error) {
            assert.strictEqual(error, expectedError);
        }
    });

    test('it redirects install route to onboard when onboarding is required', async function (assert) {
        let transitionedTo;

        class FetchStub extends Service {
            get() {
                return Promise.resolve({ should_onboard: true });
            }
        }

        class RouterStub extends Service {
            transitionTo(routeName) {
                transitionedTo = routeName;
                return 'onboard-transition';
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:router', RouterStub);

        const service = this.owner.lookup('service:installation');
        const result = await service.redirectIfConfiguredFromInstall();

        assert.strictEqual(result, 'onboard-transition');
        assert.strictEqual(transitionedTo, 'onboard');
        assert.true(service.shouldOnboard);
        assert.strictEqual(service.status, 'configured');
    });

    test('it redirects install route to login when configured and onboarding is not required', async function (assert) {
        let transitionedTo;

        class FetchStub extends Service {
            get() {
                return Promise.resolve({ should_onboard: false });
            }
        }

        class RouterStub extends Service {
            transitionTo(routeName) {
                transitionedTo = routeName;
                return 'login-transition';
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:router', RouterStub);

        const service = this.owner.lookup('service:installation');
        const result = await service.redirectIfConfiguredFromInstall();

        assert.strictEqual(result, 'login-transition');
        assert.strictEqual(transitionedTo, 'auth.login');
        assert.false(service.shouldOnboard);
        assert.strictEqual(service.status, 'configured');
    });

    test('it stays on install route when Fleetbase is not configured', async function (assert) {
        class FetchStub extends Service {
            get() {
                return Promise.reject({ error: 'fleetbase_not_configured' });
            }
        }

        this.owner.register('service:fetch', FetchStub);

        const service = this.owner.lookup('service:installation');
        const result = await service.redirectIfConfiguredFromInstall();

        assert.false(result);
        assert.false(service.shouldOnboard);
        assert.strictEqual(service.status, 'not-configured');
    });

    test('it subscribes to install completion socket channel', async function (assert) {
        assert.expect(3);

        let subscribedChannel;

        class SocketStub extends Service {
            instance() {
                return {
                    subscribe(channelId) {
                        subscribedChannel = channelId;

                        return {
                            listener(eventName) {
                                assert.strictEqual(eventName, 'subscribe');

                                return {
                                    once() {
                                        return Promise.resolve();
                                    },
                                };
                            },
                            async *[Symbol.asyncIterator]() {},
                        };
                    },
                };
            }
        }

        this.owner.register('service:socket', SocketStub);

        const service = this.owner.lookup('service:installation');

        await service.listenForInstallComplete();

        assert.strictEqual(subscribedChannel, 'fleetbase.install');
        assert.ok(service.installChannel);
    });

    test('it reloads on install complete event only', function (assert) {
        const service = this.owner.lookup('service:installation');
        let reloadCount = 0;

        service.reloadConsole = () => {
            reloadCount++;
        };

        service.handleInstallCompleteEvent({ event: 'other.event', installed: true });
        assert.strictEqual(reloadCount, 0);
        assert.false(service.isRefreshing);

        service.handleInstallCompleteEvent({ event: 'fleetbase.installed', installed: true });
        assert.strictEqual(reloadCount, 1);
        assert.true(service.isRefreshing);
    });

    test('it closes the install socket channel', function (assert) {
        const service = this.owner.lookup('service:installation');
        let closed = false;

        service.installChannel = {
            close() {
                closed = true;
            },
        };

        service.stopListeningForInstallComplete();

        assert.true(closed);
        assert.strictEqual(service.installChannel, null);
    });

    test('it retries when the socket client global is not ready', function (assert) {
        const service = this.owner.lookup('service:installation');

        assert.true(service.shouldRetrySocketListen(new ReferenceError('socketClusterClient is not defined')));
        assert.false(service.shouldRetrySocketListen(new Error('socket unavailable')));
    });
});
