import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Controller | console/notifications', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        // The controller's constructor subscribes to the universe event bus; the real
        // singleton can't be swapped via owner.register, so neutralize .on on the instance.
        this.owner.lookup('service:universe').on = () => {};
    });

    test('selectNotification toggles a notification in the selection', function (assert) {
        const controller = this.owner.lookup('controller:console/notifications');
        const a = { id: '1' };

        controller.selectNotification(a);
        assert.deepEqual(controller.selected, [a], 'adds when not selected');

        controller.selectNotification(a);
        assert.deepEqual(controller.selected, [], 'removes when already selected');
    });

    test('selectAll selects every model row then clears on a second call', function (assert) {
        const controller = this.owner.lookup('controller:console/notifications');
        const a = { id: '1' };
        const b = { id: '2' };
        controller.model = { length: 2, toArray: () => [a, b] };

        controller.selectAll();
        assert.deepEqual(controller.selected, [a, b], 'selects all rows');

        controller.selectAll();
        assert.deepEqual(controller.selected, [], 'clears when all are already selected');
    });
});

module('Unit | Controller | console/notifications | bulk actions', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.requests = [];
        this.rejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            delete(path, payload) {
                context.requests.push({ method: 'delete', path, payload });
                return context.rejectsWith ? Promise.reject(context.rejectsWith) : Promise.resolve({ ok: true });
            }
            put(path, payload) {
                context.requests.push({ method: 'put', path, payload });
                return context.rejectsWith ? Promise.reject(context.rejectsWith) : Promise.resolve({ ok: true });
            }
        }
        class NotificationsStub extends Service {
            successes = [];
            infos = [];
            serverErrors = [];
            success(message) {
                this.successes.push(message);
            }
            info(message) {
                this.infos.push(message);
            }
            serverError(error) {
                this.serverErrors.push(error);
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        // The universe singleton cannot be swapped, so record what the controller publishes
        // on the instance it is actually handed. `on` must be neutralised before lookup,
        // since the constructor subscribes immediately.
        const universe = this.owner.lookup('service:universe');
        this.published = [];
        Object.defineProperty(universe, 'on', { configurable: true, value: () => {} });
        Object.defineProperty(universe, 'trigger', {
            configurable: true,
            value: (event, payload) => this.published.push({ event, payload }),
        });

        this.build = () => {
            const controller = this.owner.lookup('controller:console/notifications');
            this.refreshes = 0;
            Object.defineProperty(controller.router, 'refresh', {
                configurable: true,
                value: () => {
                    this.refreshes++;
                    return 'refreshed';
                },
            });
            return controller;
        };
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('the controller starts on the first page, newest first', function (assert) {
        const controller = this.build();

        assert.strictEqual(controller.page, 1);
        assert.strictEqual(controller.limit, 20);
        assert.strictEqual(controller.sort, '-created_at', 'newest notifications lead');
        assert.deepEqual(controller.selected, []);
    });

    test('the constructor refreshes the list when a notification arrives', function (assert) {
        const universe = this.owner.lookup('service:universe');
        let subscribed;
        Object.defineProperty(universe, 'on', {
            configurable: true,
            value: (event, handler) => (subscribed = { event, handler }),
        });

        const controller = this.build();

        assert.strictEqual(subscribed.event, 'notification.received');
        subscribed.handler();
        assert.strictEqual(this.refreshes, 1, 'an incoming notification reloads the page');
        assert.ok(controller);
    });

    test('delete removes the selected notifications and announces it', async function (assert) {
        const controller = this.build();
        const selected = [{ id: 'n_1' }, { id: 'n_2' }];
        controller.selected.pushObjects(selected);

        await controller.delete();

        assert.deepEqual(this.requests, [{ method: 'delete', path: 'notifications/bulk-delete', payload: { notifications: ['n_1', 'n_2'] } }]);
        assert.deepEqual(this.notifications().successes, ['2 notifications deleted']);
        assert.strictEqual(this.published[0].event, 'notifications.deleted');
        assert.deepEqual(this.published[0].payload, selected, 'the deleted rows are published for other views');
        assert.deepEqual(controller.selected, [], 'the selection is cleared');
        assert.strictEqual(this.refreshes, 1);
    });

    test('a failed delete is reported and the selection is kept', async function (assert) {
        const failure = new Error('bulk delete failed');
        this.rejectsWith = failure;
        const controller = this.build();
        controller.selected.pushObject({ id: 'n_1' });

        await controller.delete();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.strictEqual(controller.selected.length, 1, 'nothing was cleared, so the user can retry');
        assert.strictEqual(this.refreshes, 0);
    });

    test('read only marks the unread notifications in the selection', async function (assert) {
        const controller = this.build();
        controller.selected.pushObjects([
            { id: 'n_1', unread: true },
            { id: 'n_2', unread: false },
            { id: 'n_3', unread: true },
        ]);

        await controller.read();

        assert.deepEqual(this.requests, [{ method: 'put', path: 'notifications/mark-as-read', payload: { notifications: ['n_1', 'n_3'] } }]);
        assert.deepEqual(this.notifications().successes, ['2 notifications marked as read'], 'the already-read one is not counted');
        assert.strictEqual(this.published[0].event, 'notifications.read');
        assert.deepEqual(controller.selected, []);
        assert.strictEqual(this.refreshes, 1);
    });

    test('a failed read is reported and the selection is kept', async function (assert) {
        const failure = new Error('mark as read failed');
        this.rejectsWith = failure;
        const controller = this.build();
        controller.selected.pushObject({ id: 'n_1', unread: true });

        await controller.read();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.strictEqual(controller.selected.length, 1);
    });

    test('markNotificationAsRead marks one row and announces it', async function (assert) {
        const controller = this.build();
        let marked = 0;
        const notification = {
            id: 'n_1',
            markAsRead: () => {
                marked++;
                return Promise.resolve();
            },
        };

        await controller.markNotificationAsRead(notification);

        assert.strictEqual(marked, 1);
        assert.deepEqual(this.notifications().infos, ['Notification marked as read.']);
        assert.deepEqual(this.published[0], { event: 'notifications.read', payload: [notification] });
    });
});
