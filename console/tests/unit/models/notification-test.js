import { module, test } from 'qunit';

import { setupTest } from '@fleetbase/console/tests/helpers';
import { format, formatDistanceToNow } from 'date-fns';

module('Unit | Model | notification', function (hooks) {
    setupTest(hooks);

    // Replace this with your real tests.
    test('it exists', function (assert) {
        let store = this.owner.lookup('service:store');
        let model = store.createRecord('notification', {});
        assert.ok(model);
    });
});

module('Unit | Model | notification | read state', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.store = this.owner.lookup('service:store');
    });

    test('an unread notification reports itself as unread', function (assert) {
        const notification = this.store.createRecord('notification');

        assert.false(notification.isRead);
        assert.false(notification.read);
        assert.true(notification.unread);
    });

    test('a notification with a read timestamp reports itself as read', function (assert) {
        const readAt = new Date('2026-02-20T08:05:00Z');
        const notification = this.store.createRecord('notification', { read_at: readAt });

        assert.true(notification.isRead);
        assert.true(notification.read);
        assert.false(notification.unread);
        assert.strictEqual(notification.readAt, format(readAt, 'yyyy-MM-dd HH:mm'));
    });

    test('markAsRead stamps the time and saves', async function (assert) {
        const notification = this.store.push({ data: { id: 'n_1', type: 'notification' } });
        let saved = 0;
        notification.save = () => {
            saved++;
            return Promise.resolve(notification);
        };

        await notification.markAsRead();

        assert.strictEqual(saved, 1, 'the change is persisted');
        assert.true(notification.read_at instanceof Date, 'the read time is stamped');
        assert.true(notification.isRead);
    });

    test('markAsRead is a no-op for an already read notification', async function (assert) {
        const readAt = new Date('2026-02-20T08:05:00Z');
        const notification = this.store.push({ data: { id: 'n_2', type: 'notification', attributes: { read_at: readAt } } });
        let saved = 0;
        notification.save = () => {
            saved++;
            return Promise.resolve(notification);
        };

        assert.strictEqual(await notification.markAsRead(), undefined);
        assert.strictEqual(saved, 0, 'nothing is re-saved');
        assert.strictEqual(notification.read_at.getTime(), readAt.getTime(), 'the original read time is kept');
    });
});

module('Unit | Model | notification | created timestamps', function (hooks) {
    setupTest(hooks);

    test('createdAt and createdAgo describe when the notification arrived', function (assert) {
        const created = new Date('2026-01-15T10:30:00Z');
        const notification = this.owner.lookup('service:store').createRecord('notification', { created_at: created });

        assert.strictEqual(notification.createdAt, format(created, 'yyyy-MM-dd HH:mm'));
        assert.strictEqual(notification.createdAgo, formatDistanceToNow(created));
    });
});
