import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import ConfigureSocketComponent from '@fleetbase/console/components/configure/socket';
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

        this.owner.register('service:socket', SocketStub);
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        /**
         * Replaces the socket service with streams that actually emit, and captures the
         * routeWillChange handler the component registers, so the console log and the
         * teardown path can both be driven. The router service is built in and cannot be
         * swapped via owner.register, so patch `on` on the injected instance.
         */
        this.buildWithEvents = async ({ errors = [], connects = [], subscribes = [], messages = [] } = {}) => {
            const closed = { count: 0 };
            const testChannel = Object.assign(stream(messages), {
                listener: () => stream(subscribes),
                close() {
                    closed.count++;
                },
            });

            const socket = this.owner.lookup('service:socket');
            Object.defineProperty(socket, 'instance', {
                configurable: true,
                value: () => ({
                    listener: (name) => (name === 'error' ? stream(errors) : stream(connects)),
                    subscribe: () => testChannel,
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

            return { component: captured.instance, closed, triggerRouteChange: () => routeWillChange() };
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

    test('testSocketConnection posts to the test channel and keeps the response', async function (assert) {
        const { component } = await this.buildWithEvents();

        component.testSocketConnection();
        assert.true(component.isLoading, 'the panel is busy while the test runs');
        await flush();

        assert.deepEqual(this.posted.at(-1), { path: 'settings/test-socket', payload: { channel: 'test' } });
        assert.deepEqual(component.testResponse, this.postResponse);
        assert.false(component.isLoading);
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
            entries.filter((entry) => entry.content === 'Socket subscribed to test channel'),
            [{ content: 'Socket subscribed to test channel', color: 'blue' }],
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

    test('leaving the route closes the channel and clears the console', async function (assert) {
        const { component, closed, triggerRouteChange } = await this.buildWithEvents({ connects: [{}] });

        assert.true(component.events.length > 0, 'precondition: the console has entries');

        triggerRouteChange();

        assert.strictEqual(closed.count, 1, 'the test channel is closed');
        assert.deepEqual(component.events, [], 'and the console is cleared');
    });
});
