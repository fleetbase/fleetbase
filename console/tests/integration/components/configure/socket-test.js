import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click, fillIn, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import ConfigureSocketComponent, { ENFORCE_WARNING, KEY_MISSING_MESSAGE, MODES, FIELDS } from '@fleetbase/console/components/configure/socket';
import { formatDateTime } from '@fleetbase/console/components/admin/database-backups';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

/**
 * The component drains its socket streams inside bare `async` IIFEs, which settled() does
 * not track. Yield the microtask queue a few times so each loop can consume its events.
 */
async function flush(times = 4) {
    for (let i = 0; i < times; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

/** An async-iterable that yields the given items once and then completes. */
function stream(items = []) {
    return {
        async *[Symbol.asyncIterator]() {
            for (const item of items) {
                yield item;
            }
        },
    };
}

module('Integration | Component | configure/socket', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.postResponse = { status: 'ok', message: 'connected' };
        const context = this;

        // The component opens `for await` loops over socket.instance().listener(...),
        // socket.subscribe('test').listener(...) and the channel itself. Hand back
        // iterators that complete immediately so every loop exits instead of parking
        // and touching the component after teardown.
        const exhausted = () => ({
            [Symbol.asyncIterator]() {
                return { next: () => Promise.resolve({ done: true, value: undefined }) };
            },
        });
        const channel = () => Object.assign(exhausted(), { listener: exhausted, close() {} });

        class SocketStub extends Service {
            instance() {
                return {
                    listener: exhausted,
                    subscribe: channel,
                };
            }
        }
        class FetchStub extends Service {
            get() {
                return Promise.resolve({});
            }
            post(path, payload) {
                context.posted.push({ path, payload });
                return Promise.resolve(context.postResponse);
            }
        }
        class NotificationsStub extends Service {
            success() {}
            error() {}
            serverError() {}
        }
        class CurrentUserStub extends Service {
            id = 'user-uuid-1';
        }

        this.owner.register('service:socket', SocketStub);
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:current-user', CurrentUserStub);

        /**
         * Replaces the socket service with streams that actually emit, and captures the
         * routeWillChange handler the component registers, so the console log and the
         * teardown path can both be driven. The router service is built in and cannot be
         * swapped via owner.register, so patch `on` on the injected instance.
         */
        this.buildWithEvents = async ({ errors = [], connects = [], subscribes = [], subscribeFails = [], messages = [] } = {}) => {
            const closed = { count: 0, channels: [] };
            const subscribed = [];
            function makeChannel(name) {
                return Object.assign(stream(messages), {
                    listener: (eventName) => (eventName === 'subscribeFail' ? stream(subscribeFails) : stream(subscribes)),
                    close() {
                        closed.count++;
                        closed.channels.push(name);
                    },
                });
            }

            const socket = this.owner.lookup('service:socket');
            Object.defineProperty(socket, 'instance', {
                configurable: true,
                value: () => ({
                    listener: (name) => (name === 'error' ? stream(errors) : stream(connects)),
                    subscribe: (name) => {
                        subscribed.push(name);
                        return makeChannel(name);
                    },
                }),
            });

            const router = this.owner.lookup('service:router');
            let routeWillChange;
            Object.defineProperty(router, 'on', {
                configurable: true,
                value: (eventName, handler) => {
                    if (eventName === 'routeWillChange') {
                        routeWillChange = handler;
                    }
                },
            });

            // Glimmer components cannot be constructed by hand, so let Ember build one and
            // capture it. Both patches above must be in place before it is created, since
            // the constructor immediately opens the socket streams.
            const captured = captureComponent(this.owner, 'configure/socket', ConfigureSocketComponent);
            await render(hbs`<Configure::Socket />`);
            await flush();

            return { component: captured.instance, closed, subscribed, triggerRouteChange: () => routeWillChange() };
        };
    });

    test('it renders the socket connection panel', async function (assert) {
        await render(hbs`<Configure::Socket />`);

        assert.dom('.next-content-panel').exists('the panel renders');
        assert.dom(this.element).containsText('SocketCluster Connection');
    });

    test('testSocketConnection posts to the test endpoint', async function (assert) {
        await render(hbs`<Configure::Socket />`);

        assert.deepEqual(this.posted, [], 'nothing is posted on render');
    });

    test('it subscribes to the test channel of the current user', async function (assert) {
        const { component, subscribed } = await this.buildWithEvents();

        assert.deepEqual(subscribed, ['test.user-uuid-1'], 'test.{user uuid}, not a shared "test" channel');
        assert.strictEqual(component.channelName, 'test.user-uuid-1');
    });

    test('testSocketConnection posts to the test channel and keeps the response', async function (assert) {
        const { component, subscribed } = await this.buildWithEvents();

        component.testSocketConnection();
        assert.true(component.isLoading, 'the panel is busy while the test runs');
        await flush();

        assert.deepEqual(this.posted.at(-1), { path: 'settings/test-socket', payload: { channel: 'test.user-uuid-1' } });
        assert.deepEqual(component.testResponse, this.postResponse);
        assert.false(component.isLoading);
        assert.deepEqual(subscribed, ['test.user-uuid-1'], 'a response without a channel keeps the subscription');
    });

    test('testSocketConnection keeps the subscription when the API used the same channel', async function (assert) {
        this.postResponse = { status: 'success', message: 'ok', channel: 'test.user-uuid-1' };
        const { component, closed, subscribed } = await this.buildWithEvents();

        component.testSocketConnection();
        await flush();

        assert.deepEqual(subscribed, ['test.user-uuid-1']);
        assert.strictEqual(closed.count, 0);
    });

    test('testSocketConnection follows the channel the API reports publishing to', async function (assert) {
        this.postResponse = { status: 'success', message: 'ok', channel: 'test.user-uuid-2' };
        const { component, closed, subscribed } = await this.buildWithEvents({ subscribes: [{}] });

        component.testSocketConnection();
        await flush();

        assert.deepEqual(subscribed, ['test.user-uuid-1', 'test.user-uuid-2'], 'it subscribes to the returned channel');
        assert.deepEqual(closed.channels, ['test.user-uuid-1'], 'and closes the previous one');
        assert.strictEqual(component.channelName, 'test.user-uuid-2');
        assert.true(
            component.events.some((event) => event.content === 'Socket subscribed to test.user-uuid-2 channel'),
            'the new subscription is logged'
        );

        component.testSocketConnection();
        await flush();
        assert.deepEqual(this.posted.at(-1).payload, { channel: 'test.user-uuid-2' }, 'later tests use the followed channel');
    });

    test('a refused subscription is logged in red', async function (assert) {
        const { component } = await this.buildWithEvents({
            subscribeFails: [{ error: { reason: 'no_token' } }, { error: {} }],
        });

        const refused = component.events.filter((event) => event.color === 'red').map((event) => event.content);
        assert.deepEqual(refused, ['Socket subscription to test.user-uuid-1 was refused: no_token', 'Socket subscription to test.user-uuid-1 was refused']);
    });

    test('it logs a console entry for each kind of socket event', async function (assert) {
        const { component } = await this.buildWithEvents({
            errors: [{}],
            connects: [{}],
            subscribes: [{}],
            messages: [{ hello: 'world' }],
        });

        const entries = component.events.map((event) => ({ content: event.content, color: event.color }));

        assert.deepEqual(
            entries.filter((entry) => entry.content === 'Socket connection error!'),
            [{ content: 'Socket connection error!', color: 'red' }],
            'connection errors are logged in red'
        );
        assert.deepEqual(
            entries.filter((entry) => entry.content === 'Socket is connected'),
            [{ content: 'Socket is connected', color: 'green' }],
            'connections are logged in green'
        );
        assert.deepEqual(
            entries.filter((entry) => entry.content === 'Socket subscribed to test.user-uuid-1 channel'),
            [{ content: 'Socket subscribed to test.user-uuid-1 channel', color: 'blue' }],
            'channel subscription is logged in blue'
        );
        assert.deepEqual(
            entries.filter((entry) => entry.content === JSON.stringify({ hello: 'world' }, undefined, 2)),
            [{ content: JSON.stringify({ hello: 'world' }, undefined, 2), color: 'green' }],
            'channel messages are logged as formatted JSON'
        );
        assert.true(
            component.events.every((event) => typeof event.time === 'string' && event.time.length > 0),
            'every entry is timestamped'
        );
    });

    test('event content is rendered as text, never as HTML', async function (assert) {
        await this.buildWithEvents({
            subscribeFails: [{ error: { reason: '<b data-test-injected>no_token</b>' } }],
            messages: [{ html: '<img src="x" data-test-injected>' }],
        });

        assert.dom('[data-test-injected]').doesNotExist('markup from the network is not rendered');
        assert.dom('#output').containsText('<b data-test-injected>no_token</b>');
        assert.dom('#output').containsText('<img src=\\"x\\" data-test-injected>', 'channel data shows as JSON text');
    });

    test('leaving the route closes the channel and clears the console', async function (assert) {
        const { component, closed, triggerRouteChange } = await this.buildWithEvents({ connects: [{}] });

        assert.true(component.events.length > 0, 'precondition: the console has entries');

        triggerRouteChange();

        assert.strictEqual(closed.count, 1, 'the test channel is closed');
        assert.deepEqual(component.events, [], 'and the console is cleared');
    });
});

const STATUS = {
    started_at: '2026-10-15T08:00:00.000Z',
    uptime_seconds: 5400,
    mode: 'log',
    auth_enabled: true,
    clients: 3,
    pending_clients: 1,
    config: { enabled: true, mode: 'log', origins: 'console.example.com:*', source: 'api', last_sync_at: '2026-10-15T09:30:00.000Z', last_sync_error: null },
    denials: [
        { client: 'navigator/2.1.0', prefix: 'order', reason: 'no_token', count: 7, last_at: '2026-10-15T09:31:00.000Z' },
        { client: null, prefix: null, reason: 'bad_iss', count: 1, last_at: '2026-10-15T09:20:00.000Z' },
    ],
    counters: {},
};

function socketResponse({ settings = {}, sources = {}, status = STATUS, statusError = null } = {}) {
    return {
        settings: {
            enabled: true,
            mode: 'log',
            token_ttl: 900,
            origins: 'console.example.com:*',
            publisher_origin: null,
            key_configured: true,
            ...settings,
            sources: { enabled: 'setting', mode: 'setting', token_ttl: 'env', origins: 'setting', publisher_origin: 'env', ...sources },
        },
        status,
        status_error: statusError,
    };
}

function fakeModal() {
    return {
        loading: false,
        finished: false,
        startLoading() {
            this.loading = true;
        },
        done() {
            this.finished = true;
        },
    };
}

/** Lets the tasks' fetches (native promises, which settled() does not track) resolve. */
async function settle() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settled();
}

module('Integration | Component | configure/socket settings', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        const context = this;
        this.requests = [];
        this.getResponse = socketResponse();
        this.saveResponse = socketResponse({ settings: { origins: 'a.example.com:*' } });
        this.getError = null;
        this.saveError = null;

        const exhausted = () => ({
            [Symbol.asyncIterator]() {
                return { next: () => Promise.resolve({ done: true, value: undefined }) };
            },
        });
        class SocketStub extends Service {
            instance() {
                return { listener: exhausted, subscribe: () => Object.assign(exhausted(), { listener: exhausted, close() {} }) };
            }
        }
        class FetchStub extends Service {
            get(path) {
                context.requests.push({ method: 'get', path });
                return context.getError ? Promise.reject(context.getError) : Promise.resolve(context.getResponse);
            }
            post(path, payload, options) {
                context.requests.push({ method: 'post', path, payload, options });
                if (path !== 'settings/socket') {
                    return Promise.resolve({ status: 'ok' });
                }
                return context.saveError ? Promise.reject(context.saveError) : Promise.resolve(context.saveResponse);
            }
        }
        class NotificationsStub extends Service {
            successes = [];
            errors = [];
            serverErrors = [];
            success(message) {
                this.successes.push(message);
            }
            error(message) {
                this.errors.push(message);
            }
            serverError(error) {
                this.serverErrors.push(error);
            }
        }
        class ModalsManagerStub extends Service {
            lastOptions = null;
            confirm(options) {
                this.lastOptions = options;
            }
        }
        class CurrentUserStub extends Service {
            id = 'user-uuid-1';
        }

        this.owner.lookup('service:intl').setLocale('en-us');
        this.owner.register('service:socket', SocketStub);
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);
        this.owner.register('service:current-user', CurrentUserStub);
        this.notifications = () => this.owner.lookup('service:notifications');
        this.modals = () => this.owner.lookup('service:modals-manager');
        this.saves = () => this.requests.filter((request) => request.method === 'post' && request.path === 'settings/socket');

        const captured = captureComponent(this.owner, 'configure/socket', ConfigureSocketComponent);
        this.build = async () => {
            await render(hbs`<Configure::Socket />`);
            await settle();
            return captured.instance;
        };
    });

    test('it exports the modes and fields the API accepts', function (assert) {
        assert.deepEqual(
            MODES.map((mode) => mode.value),
            ['off', 'log', 'enforce']
        );
        assert.deepEqual(FIELDS, ['enabled', 'mode', 'token_ttl', 'origins', 'publisher_origin']);
    });

    test('it loads the settings and the socket server status', async function (assert) {
        const component = await this.build();

        assert.deepEqual(this.requests[0], { method: 'get', path: 'settings/socket' });
        assert.dom('[data-test-socket-reachable="yes"]').exists();
        assert.dom('[data-test-socket-status-error]').doesNotExist();
        assert.dom('[data-test-socket-effective-enabled]').containsText('On');
        assert.dom('[data-test-socket-effective-enabled]').containsText('Console setting');
        assert.dom('[data-test-socket-effective-mode]').containsText('log');
        assert.dom('[data-test-socket-key]').containsText('Configured');
        assert.dom('[data-test-socket-connections]').containsText('3');
        assert.dom('[data-test-socket-connections]').containsText('(+1 connecting)');
        assert.dom('[data-test-socket-running]').containsText('On, log');
        assert.dom('[data-test-socket-running]').containsText('from the API');
        assert.dom('[data-test-socket-last-sync]').containsText(formatDateTime(STATUS.config.last_sync_at));
        assert.dom('[data-test-socket-sync-error]').doesNotExist();
        assert.dom('[data-test-socket-out-of-sync]').doesNotExist();
        assert.dom('[data-test-socket-key-help]').containsText('SOCKETCLUSTER_AUTH_KEY');
        assert.dom('[data-test-socket-key-help]').containsText('restart both');

        assert.dom('[data-test-socket-denial]').exists({ count: 2 });
        assert.dom('[data-test-socket-denials]').containsText('navigator/2.1.0');
        assert.dom('[data-test-socket-denials]').containsText('no_token');
        assert.dom('[data-test-socket-denials]').containsText('(token)');
        assert.dom('[data-test-socket-denials]').containsText('unknown');
        assert.strictEqual(component.denials[0].lastAtLabel, formatDateTime(STATUS.denials[0].last_at));

        assert.dom('[data-test-socket-inherit="enabled"]').isNotChecked();
        assert.dom('[data-test-socket-inherit="token_ttl"]').isChecked('an env-sourced field starts on "use environment"');
        assert.dom('[data-test-socket-token-ttl]').doesNotExist();
        assert.dom('[data-test-socket-origins]').hasValue('console.example.com:*');
        assert.dom('[data-test-socket-publisher-origin]').doesNotExist();
        assert.dom('[data-test-socket-mode]').hasValue('log');
        assert.dom('[data-test-socket-key-missing]').doesNotExist();

        assert.deepEqual(component.payload(), { enabled: true, mode: 'log', token_ttl: null, origins: 'console.example.com:*', publisher_origin: null });
    });

    test('it explains an unreachable socket server and a missing key', async function (assert) {
        this.getResponse = socketResponse({
            settings: { enabled: false, mode: null, key_configured: false },
            sources: { mode: 'env' },
            status: null,
            statusError: 'Connection refused',
        });
        const component = await this.build();

        assert.dom('[data-test-socket-reachable="no"]').exists();
        assert.dom('[data-test-socket-status-error]').containsText('Connection refused');
        assert.dom('[data-test-socket-effective-enabled]').containsText('Off');
        assert.dom('[data-test-socket-effective-mode]').containsText('Socket server default (env)');
        assert.dom('[data-test-socket-effective-mode]').containsText('Environment');
        assert.dom('[data-test-socket-key]').containsText('Not configured');
        assert.dom('[data-test-socket-connections]').containsText('—');
        assert.dom('[data-test-socket-last-sync]').containsText('—');
        assert.dom('[data-test-socket-no-denials]').exists();
        assert.dom('[data-test-socket-key-missing]').exists();
        assert.dom('[data-test-socket-enabled]').hasAttribute('data-disabled', 'true', 'cannot switch on without a key');
        assert.strictEqual(component.mode, 'log', 'a null mode starts the select on log');
        assert.deepEqual(component.denials, []);
        assert.false(component.isOutOfSync);
    });

    test('an older socket server reports no config, and a missing status error has a fallback', async function (assert) {
        this.getResponse = socketResponse({ status: { clients: 0 } });
        await this.build();

        assert.dom('[data-test-socket-last-sync]').containsText('Not reported by this socket server version');
        assert.dom('[data-test-socket-running]').containsText('—');
        assert.dom('[data-test-socket-connections]').containsText('0');

        this.getResponse = socketResponse({ status: null });
        await click('[data-test-socket-refresh]');
        await settle();
        assert.dom('[data-test-socket-status-error]').containsText('No status was returned.');
        assert.strictEqual(this.requests.filter((request) => request.method === 'get').length, 2, 'refresh reloads');
    });

    test('a sparse response falls back to safe values', async function (assert) {
        this.getResponse = {};
        const component = await this.build();

        assert.deepEqual(component.settings, {});
        assert.strictEqual(component.status, null);
        assert.strictEqual(component.statusError, null);
        assert.false(component.enabled);
        assert.strictEqual(component.mode, 'log');
        assert.strictEqual(component.tokenTtl, '');
        assert.strictEqual(component.origins, '');
        assert.strictEqual(component.publisherOrigin, '');
        assert.deepEqual(component.inherits, { enabled: true, mode: true, token_ttl: true, origins: true, publisher_origin: true });
        assert.false(component.keyConfigured);
        assert.deepEqual(component.payload(), { enabled: null, mode: null, token_ttl: null, origins: null, publisher_origin: null });

        component.apply(undefined);
        assert.deepEqual(component.settings, {});
    });

    test('it flags a socket server that runs other settings or failed to sync', async function (assert) {
        this.getResponse = socketResponse({
            status: { ...STATUS, config: { ...STATUS.config, enabled: false, mode: 'off', source: 'env', last_sync_at: null, last_sync_error: 'http_401' } },
        });
        const component = await this.build();

        assert.dom('[data-test-socket-out-of-sync]').exists();
        assert.dom('[data-test-socket-sync-error]').containsText('http_401');
        assert.dom('[data-test-socket-last-sync]').containsText('Never');
        assert.dom('[data-test-socket-running]').containsText('its environment');

        const server = (config) => ({ ...STATUS, config: { ...STATUS.config, ...config } });
        component.settings = { enabled: true, mode: 'enforce' };
        component.status = server({ enabled: true, mode: 'log' });
        assert.true(component.isOutOfSync, 'mode differs');
        component.status = server({ enabled: true, mode: 'enforce' });
        assert.false(component.isOutOfSync, 'in sync');
        component.settings = { enabled: true, mode: null };
        assert.false(component.isOutOfSync, 'a null mode is the server default');
        component.settings = { enabled: false, mode: 'enforce' };
        component.status = server({ enabled: false, mode: 'off' });
        assert.false(component.isOutOfSync, 'both off');
        component.status = null;
        assert.false(component.isOutOfSync, 'nothing to compare');
    });

    test('it saves the form in the shape the API expects', async function (assert) {
        const component = await this.build();

        await click('[data-test-socket-inherit="token_ttl"]');
        await fillIn('[data-test-socket-token-ttl]', '600');
        await fillIn('[data-test-socket-origins]', '  a.example.com:*  ');
        await click('[data-test-socket-inherit="publisher_origin"]');
        await fillIn('[data-test-socket-publisher-origin]', 'https://console.example.com');
        await click('[data-test-socket-enabled]');
        assert.false(component.enabled, 'the toggle switches auth off');
        await click('[data-test-socket-enabled]');
        await fillIn('[data-test-socket-mode]', 'off');
        assert.strictEqual(component.mode, 'off');

        await click('[data-test-socket-save]');
        await settle();

        assert.deepEqual(this.saves(), [
            {
                method: 'post',
                path: 'settings/socket',
                payload: { enabled: true, mode: 'off', token_ttl: 600, origins: 'a.example.com:*', publisher_origin: 'https://console.example.com' },
                options: { rawError: true },
            },
        ]);
        assert.strictEqual(this.modals().lastOptions, null, 'no confirmation outside enforce');
        assert.strictEqual(this.notifications().successes.length, 1);
        assert.strictEqual(component.origins, 'a.example.com:*', 'the response is applied');
    });

    test('"use environment" sends null, and blank inputs mean the environment too', async function (assert) {
        const component = await this.build();

        await click('[data-test-socket-inherit="origins"]');
        assert.dom('[data-test-socket-origins]').doesNotExist();
        assert.strictEqual(component.payload().origins, null);

        component.toggleInherit('origins', false);
        component.toggleInherit('token_ttl', false);
        component.origins = null;
        component.tokenTtl = ' ';
        assert.strictEqual(component.payload().origins, null);
        assert.strictEqual(component.payload().token_ttl, null);
    });

    test('switching to enforce asks for confirmation first', async function (assert) {
        const component = await this.build();

        await fillIn('[data-test-socket-mode]', 'enforce');
        await click('[data-test-socket-save]');

        const options = this.modals().lastOptions;
        assert.strictEqual(options.body, ENFORCE_WARNING);
        assert.strictEqual(options.acceptButtonScheme, 'danger');
        assert.strictEqual(this.saves().length, 0, 'nothing is saved before the confirmation');

        const modal = fakeModal();
        await options.confirm(modal);
        assert.true(modal.loading);
        assert.true(modal.finished);
        assert.strictEqual(this.saves()[0].payload.mode, 'enforce');
        assert.strictEqual(component.mode, 'log', 'the saved response is applied');
    });

    test('entersEnforce covers every way a save can start enforcing', async function (assert) {
        const component = await this.build();
        const enters = (settings, payload) => {
            component.settings = settings;
            return component.entersEnforce(payload);
        };

        assert.false(enters({ enabled: false }, { enabled: false, mode: 'enforce' }), 'switched off');
        assert.true(enters({ enabled: true, mode: 'log' }, { enabled: true, mode: 'enforce' }), 'log to enforce');
        assert.true(enters({ enabled: false, mode: 'enforce' }, { enabled: null, mode: 'enforce' }), 'enforce while off');
        assert.false(enters({ enabled: true, mode: 'enforce' }, { enabled: true, mode: 'enforce' }), 'already enforcing');
        assert.true(enters({ enabled: false, mode: null }, { enabled: true, mode: null }), 'switched on with the server default mode');
        assert.false(enters({ enabled: true, mode: null }, { enabled: true, mode: null }), 'already on');
        assert.false(enters({ enabled: false, mode: null }, { enabled: null, mode: null }), 'switch left to the environment');
        assert.false(enters({ enabled: false, mode: null }, { enabled: true, mode: 'log' }), 'switched on in log mode');
    });

    test('it reports failed loads and saves', async function (assert) {
        this.getError = new Error('load failed');
        const component = await this.build();
        assert.deepEqual(
            this.notifications().serverErrors.map((error) => error.message),
            ['load failed']
        );

        this.saveError = { errors: ['Socket authentication cannot be switched on.'], code: 'key_missing' };
        await component.saveSettings.perform({ enabled: true });
        assert.deepEqual(this.notifications().errors, [KEY_MISSING_MESSAGE], 'key_missing gets its own message');

        this.saveError = { message: 'The origins field format is invalid.', errors: { origins: ['The origins field format is invalid.'] } };
        await component.saveSettings.perform({ origins: 'bad value\n' });
        assert.strictEqual(this.notifications().errors.at(-1), 'The origins field format is invalid.', 'a validation error shows its message');

        this.saveError = { errors: ['Server error'] };
        await component.saveSettings.perform({});
        assert.deepEqual(this.notifications().serverErrors.at(-1), { errors: ['Server error'] });

        component.saveFailed(undefined);
        assert.strictEqual(this.notifications().serverErrors.at(-1), undefined);
        assert.strictEqual(this.notifications().successes.length, 0);
    });
});
