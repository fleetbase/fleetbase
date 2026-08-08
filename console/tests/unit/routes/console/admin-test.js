import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

module('Unit | Route | console/admin', function (hooks) {
    setupTest(hooks);

    test('beforeModel bounces non-admins back to the console with an error', async function (assert) {
        class NotificationsStub extends Service {
            errors = [];
            error(message) {
                this.errors.push(message);
            }
        }
        this.owner.register('service:notifications', NotificationsStub);

        const route = this.owner.lookup('route:console/admin');

        // isAdmin is @alias('userSnapshot.is_admin') — set the backing tracked property.
        route.currentUser.userSnapshot = { is_admin: false };

        let transitionedTo;
        Object.defineProperty(route.router, 'transitionTo', {
            configurable: true,
            value: (routeName) => {
                transitionedTo = routeName;
                return Promise.resolve();
            },
        });

        await route.beforeModel();

        assert.strictEqual(transitionedTo, 'console');
        assert.deepEqual(route.notifications.errors, ['You do not have authorization to access admin!']);
    });

    test('beforeModel lets admins through', function (assert) {
        const route = this.owner.lookup('route:console/admin');
        route.currentUser.userSnapshot = { is_admin: true };

        Object.defineProperty(route.router, 'transitionTo', {
            configurable: true,
            value: () => {
                throw new Error('admins should not be redirected');
            },
        });

        assert.strictEqual(route.beforeModel(), undefined);
    });
});
