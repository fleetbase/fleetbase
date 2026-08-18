import { module, test } from 'qunit';
import Service from '@ember/service';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { settled } from '@ember/test-helpers';
import { later } from '@ember/runloop';
import window from 'ember-window-mock';

/**
 * Builds a socket service whose channel yields the given payloads to the service's
 * `for await` loop, then completes.
 */
function socketStubYielding(payloads = [], onSubscribe = () => {}) {
    return class SocketStub extends Service {
        instance() {
            return {
                subscribe(channelId) {
                    onSubscribe(channelId);

                    return {
                        listener() {
                            return { once: () => Promise.resolve() };
                        },
                        async *[Symbol.asyncIterator]() {
                            for (const payload of payloads) {
                                yield payload;
                            }
                        },
                    };
                },
            };
        }
    };
}

/**
 * Captures console.warn for the duration of a callback so the service's warning path can be
 * asserted instead of just printed into the test output.
 */
async function captureWarnings(callback) {
    const warnings = [];
    const original = console.warn;
    console.warn = (...args) => warnings.push(args);

    try {
        await callback();
    } finally {
        console.warn = original;
    }

    return warnings;
}

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

        this.owner.register('service:fetch', FetchStub);

        const service = this.owner.lookup('service:installation');

        // Ember's built-in RouterService can't be replaced via owner.register in setupTest —
        // patch the injected instance the service actually calls.
        Object.defineProperty(service.router, 'currentRouteName', { configurable: true, value: 'auth.login' });
        Object.defineProperty(service.router, 'transitionTo', {
            configurable: true,
            value: (routeName) => {
                transitionedTo = routeName;
                return 'install-transition';
            },
        });

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

        this.owner.register('service:fetch', FetchStub);

        const service = this.owner.lookup('service:installation');

        Object.defineProperty(service.router, 'transitionTo', {
            configurable: true,
            value: (routeName) => {
                transitionedTo = routeName;
                return 'onboard-transition';
            },
        });

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

        this.owner.register('service:fetch', FetchStub);

        const service = this.owner.lookup('service:installation');

        Object.defineProperty(service.router, 'transitionTo', {
            configurable: true,
            value: (routeName) => {
                transitionedTo = routeName;
                return 'login-transition';
            },
        });

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

        window.location.reload = () => {
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

    test('it starts out in an unknown, non-onboarding, non-refreshing state', function (assert) {
        const service = this.owner.lookup('service:installation');

        // Reads the tracked defaults before any request writes over them.
        assert.strictEqual(service.status, 'unknown');
        assert.false(service.shouldOnboard);
        assert.false(service.isRefreshing);
        assert.strictEqual(service.installChannel, null);
        assert.strictEqual(service.listenRetry, null);
    });

    test('a response with no should_onboard flag is treated as not needing onboarding', async function (assert) {
        class FetchStub extends Service {
            get() {
                return Promise.resolve({});
            }
        }

        this.owner.register('service:fetch', FetchStub);

        const service = this.owner.lookup('service:installation');
        const result = await service.checkOnboarding();

        assert.false(result.shouldOnboard, 'an absent flag defaults to false');
        assert.false(result.notConfigured);
        assert.strictEqual(service.status, 'configured');
    });

    test('the install route sends a configured tenant to login when should_onboard is absent', async function (assert) {
        let transitionedTo;

        class FetchStub extends Service {
            get() {
                return Promise.resolve({});
            }
        }

        this.owner.register('service:fetch', FetchStub);

        const service = this.owner.lookup('service:installation');
        Object.defineProperty(service.router, 'transitionTo', {
            configurable: true,
            value: (routeName) => {
                transitionedTo = routeName;
                return 'login-transition';
            },
        });

        await service.redirectIfConfiguredFromInstall();

        assert.strictEqual(transitionedTo, 'auth.login');
        assert.false(service.shouldOnboard);
    });

    test('it rethrows non configuration failures raised from the install route', async function (assert) {
        const expectedError = new Error('server_error');

        class FetchStub extends Service {
            get() {
                return Promise.reject(expectedError);
            }
        }

        this.owner.register('service:fetch', FetchStub);

        const service = this.owner.lookup('service:installation');

        try {
            await service.redirectIfConfiguredFromInstall();
            assert.true(false, 'Expected redirectIfConfiguredFromInstall to reject');
        } catch (error) {
            assert.strictEqual(error, expectedError);
        }

        assert.strictEqual(service.status, 'unknown', 'an unrelated failure says nothing about configuration');
    });

    test('handleError redirects to install for a configuration error and ignores anything else', function (assert) {
        const service = this.owner.lookup('service:installation');

        Object.defineProperty(service.router, 'currentRouteName', { configurable: true, value: 'auth.login' });
        Object.defineProperty(service.router, 'transitionTo', { configurable: true, value: () => 'install-transition' });

        assert.strictEqual(service.handleError({ error: 'fleetbase_not_configured' }), 'install-transition');
        assert.strictEqual(service.status, 'not-configured');

        assert.false(service.handleError(new Error('server_error')), 'other errors are left to bubble');
    });

    test('it does not transition when already sitting on the install route', function (assert) {
        const service = this.owner.lookup('service:installation');
        let transitioned = false;

        Object.defineProperty(service.router, 'currentRouteName', { configurable: true, value: 'install' });
        Object.defineProperty(service.router, 'transitionTo', { configurable: true, value: () => (transitioned = true) });

        assert.true(service.transitionToInstall(), 'reports handled without moving');
        assert.false(transitioned);
    });

    test('it hands socket payloads to the install complete handler', async function (assert) {
        this.owner.register(
            'service:socket',
            socketStubYielding([
                { event: 'other.event', installed: true },
                { event: 'fleetbase.installed', installed: true },
            ])
        );

        const service = this.owner.lookup('service:installation');
        let reloads = 0;
        window.location.reload = () => reloads++;

        await service.listenForInstallComplete();

        assert.strictEqual(reloads, 1, 'only the installed event triggers a reload');
        assert.true(service.isRefreshing);
    });

    test('it does not resubscribe while a channel or retry is already in flight', async function (assert) {
        let subscribes = 0;
        this.owner.register(
            'service:socket',
            socketStubYielding([], () => subscribes++)
        );

        const service = this.owner.lookup('service:installation');

        service.installChannel = { close() {} };
        await service.listenForInstallComplete();
        assert.strictEqual(subscribes, 0, 'an open channel short-circuits');

        service.installChannel = null;
        service.listenRetry = 'pending-timer';
        await service.listenForInstallComplete();
        assert.strictEqual(subscribes, 0, 'a scheduled retry short-circuits too');

        // Regression guard: runloop timer ids are integers, so a pending retry can be timer
        // 0. Under a truthiness check that read as "nothing scheduled" and resubscribed.
        service.listenRetry = 0;
        await service.listenForInstallComplete();
        assert.strictEqual(subscribes, 0, 'timer id 0 still counts as a pending retry');

        service.listenRetry = null;
    });

    test('it retries listening once the socket client global appears', async function (assert) {
        let attempts = 0;

        class SocketStub extends Service {
            instance() {
                attempts++;

                if (attempts === 1) {
                    throw new ReferenceError('socketClusterClient is not defined');
                }

                return {
                    subscribe() {
                        return {
                            listener() {
                                return { once: () => Promise.resolve() };
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

        assert.strictEqual(attempts, 1, 'the first attempt failed');
        // Not assert.ok: a runloop timer id is an integer and can be 0.
        assert.notStrictEqual(service.listenRetry, null, 'and a retry was scheduled');
        assert.strictEqual(service.installChannel, null);

        await settled();

        assert.strictEqual(attempts, 2, 'the retry ran');
        assert.strictEqual(service.listenRetry, null, 'and cleared itself');
        assert.ok(service.installChannel, 'the channel is subscribed on the second go');
    });

    test('it warns and gives up on a socket failure it cannot retry', async function (assert) {
        class SocketStub extends Service {
            instance() {
                throw new Error('socket unavailable');
            }
        }

        this.owner.register('service:socket', SocketStub);
        const service = this.owner.lookup('service:installation');

        const warnings = await captureWarnings(() => service.listenForInstallComplete());

        assert.strictEqual(warnings.length, 1);
        assert.strictEqual(warnings[0][0], '[Install] Unable to listen for install completion:');
        assert.strictEqual(service.listenRetry, null, 'no retry is scheduled for an unrelated failure');
    });

    test('it stays silent when the failure arrives after the service is torn down', async function (assert) {
        let rejectSubscribe;

        class SocketStub extends Service {
            instance() {
                return {
                    subscribe() {
                        return {
                            listener() {
                                return {
                                    once() {
                                        return new Promise((resolve, reject) => {
                                            rejectSubscribe = reject;
                                        });
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

        const warnings = await captureWarnings(async () => {
            const pending = service.listenForInstallComplete();
            service.destroy();
            rejectSubscribe(new Error('socket closed during teardown'));
            await pending;
        });

        assert.deepEqual(warnings, [], 'a destroyed service does not log about its own teardown');
    });

    test('stopping cancels a scheduled retry before it can fire', async function (assert) {
        const service = this.owner.lookup('service:installation');
        let fired = false;

        service.listenRetry = later(() => (fired = true), 10);

        service.stopListeningForInstallComplete();

        assert.strictEqual(service.listenRetry, null);

        await new Promise((resolve) => setTimeout(resolve, 40));

        assert.false(fired, 'the cancelled retry never ran');
    });

    test('stopping tolerates a channel that cannot be closed', function (assert) {
        const service = this.owner.lookup('service:installation');

        service.installChannel = {};

        service.stopListeningForInstallComplete();

        assert.strictEqual(service.installChannel, null, 'a channel with no close() is simply dropped');
    });
});
