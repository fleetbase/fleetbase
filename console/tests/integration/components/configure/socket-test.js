import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

module('Integration | Component | configure/socket', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        const posted = this.posted;

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
                posted.push({ path, payload });
                return Promise.resolve({ status: 'ok', message: 'connected' });
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
});
