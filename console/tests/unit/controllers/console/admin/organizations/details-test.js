import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

class NotificationsStub extends Service {
    successes = [];
    infos = [];
    errors = [];
    success(m) {
        this.successes.push(m);
    }
    info(m) {
        this.infos.push(m);
    }
    error(m) {
        this.errors.push(m);
    }
    serverError(e) {
        this.errors.push(e);
    }
}

class ModalsManagerStub extends Service {
    lastOptions = null;
    shown = [];
    show(name, options) {
        this.shown.push(name);
        this.lastOptions = options;
        return Promise.resolve();
    }
}

function fakeModal() {
    return {
        loading: false,
        startLoading() {
            this.loading = true;
        },
        stopLoading() {
            this.loading = false;
        },
    };
}

function organization(attrs = {}) {
    return {
        public_id: 'pub_1',
        uuid: 'uuid_1',
        saved: 0,
        save() {
            this.saved++;
            return Promise.resolve();
        },
        ...attrs,
    };
}

module('Unit | Controller | console/admin/organizations/details', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const self = this;
        this.posted = [];
        this.shouldReject = false;

        class FetchStub extends Service {
            post(path, payload) {
                self.posted.push({ path, payload });
                return self.shouldReject ? Promise.reject(new Error('nope')) : Promise.resolve({ token: 'imp-token' });
            }
        }
        class SessionStub extends Service {
            data = { authenticated: { user: { id: 'me' } } };
            manuallyAuthenticate() {}
        }

        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:session', SessionStub);

        this.controller = this.owner.lookup('controller:console/admin/organizations/details');
        this.notifications = this.owner.lookup('service:notifications');
        this.modals = this.owner.lookup('service:modals-manager');

        this.menuItems = {};
        Object.defineProperty(this.controller.menuService, 'getMenuItems', {
            configurable: true,
            value: (registry) => this.menuItems[registry],
        });

        this.refreshed = 0;
        this.transitions = [];
        Object.defineProperty(this.controller.router, 'refresh', { configurable: true, value: () => this.refreshed++ });
        Object.defineProperty(this.controller.router, 'transitionTo', {
            configurable: true,
            value: (...args) => {
                this.transitions.push(args);
                return Promise.resolve();
            },
        });
        this.setRoute = (name, params = {}) => {
            Object.defineProperty(this.controller.router, 'currentRouteName', { configurable: true, value: name });
            Object.defineProperty(this.controller.router, 'currentRoute', { configurable: true, value: { params } });
        };
        this.setRoute('console.admin.organizations.details.index');
    });

    test('the status getters fall back sensibly', function (assert) {
        assert.strictEqual(this.controller.organizationStatus, 'active', 'no organization reads as active');
        assert.strictEqual(this.controller.onboardingStatus, 'incomplete');
        assert.strictEqual(this.controller.billingStatus, 'not configured');

        this.controller.model = organization({ status: 'suspended', onboarding_completed: true, billing_status: 'paid' });
        assert.strictEqual(this.controller.organizationStatus, 'suspended');
        assert.strictEqual(this.controller.onboardingStatus, 'complete');
        assert.strictEqual(this.controller.billingStatus, 'paid');
        assert.strictEqual(this.controller.organization, this.controller.model, 'organization proxies the model');
    });

    test('resolveBelongsTo unwraps a loaded relationship and rejects pending ones', function (assert) {
        const c = this.controller;

        assert.strictEqual(c.resolveBelongsTo(null), null);
        assert.deepEqual(c.resolveBelongsTo({ content: { id: 'u1' } }), { id: 'u1' });
        assert.strictEqual(c.resolveBelongsTo({ isPending: true }), null);
        assert.strictEqual(c.resolveBelongsTo({ isFulfilled: false }), null);
        assert.strictEqual(c.resolveBelongsTo({ then: () => {} }), null);

        const plain = { id: 'u1' };
        assert.strictEqual(c.resolveBelongsTo(plain), plain);
    });

    test('the owner getters read through the relationship and fall back to the uuid', function (assert) {
        this.controller.model = organization({ owner: { content: { id: 'u1', name: 'Ron', email: 'ron@fleetbase.io' } } });

        assert.strictEqual(this.controller.ownerId, 'u1');
        assert.strictEqual(this.controller.ownerName, 'Ron');
        assert.strictEqual(this.controller.ownerEmail, 'ron@fleetbase.io');
        assert.true(this.controller.hasOwner);

        this.controller.model = organization({ owner: { isPending: true }, owner_uuid: 'u-from-uuid' });
        assert.strictEqual(this.controller.ownerId, 'u-from-uuid', 'an unloaded relationship falls back to owner_uuid');
        assert.true(this.controller.hasOwner);

        this.controller.model = organization({});
        assert.notOk(this.controller.ownerId);
        assert.false(this.controller.hasOwner);
    });

    test('the core tabs are always present and ordered by priority', function (assert) {
        const labels = this.controller.tabs.map((t) => t.label);

        assert.deepEqual(labels, ['Overview', 'Users', 'Extensions', 'Activity', 'Settings']);
    });

    test('registered tabs are merged in, filtered and sorted', function (assert) {
        this.menuItems['console:admin:organization:tabs'] = [
            { slug: 'billing', component: 'billing-tab', label: 'Billing', priority: 5 },
            { slug: 'no-component', label: 'Dropped' },
            { component: 'no-slug', label: 'Also dropped' },
            { slug: 'hidden', component: 'x', label: 'Hidden', isVisible: () => false },
            { slug: 'shown', component: 'y', label: 'Shown', isVisible: () => true },
        ];

        const labels = this.controller.tabs.map((t) => t.label);

        assert.ok(labels.includes('Billing'), 'a registered tab appears');
        assert.strictEqual(labels[1], 'Billing', 'priority 5 sorts it after Overview');
        assert.notOk(labels.includes('Dropped'), 'a tab without a component is dropped');
        assert.notOk(labels.includes('Also dropped'), 'a tab without a slug is dropped');
        assert.notOk(labels.includes('Hidden'), 'isVisible false hides the tab');
        assert.ok(labels.includes('Shown'), 'isVisible true keeps it');

        const billing = this.controller.tabs.find((t) => t.label === 'Billing');
        assert.strictEqual(billing.route, 'console.admin.organizations.details.extensions-tab');
        assert.strictEqual(billing.model, 'billing', 'the slug becomes the route model');
    });

    test('a non-array tab registry is tolerated', function (assert) {
        this.menuItems['console:admin:organization:tabs'] = undefined;

        assert.deepEqual(this.controller.visibleRegisteredTabs, []);
        assert.strictEqual(this.controller.tabs.length, 5, 'only the core tabs remain');
    });

    test('isTabActive matches the current route, including nested routes', function (assert) {
        this.setRoute('console.admin.organizations.details.users');
        assert.true(this.controller.tabs.find((t) => t.label === 'Users').active);
        assert.false(this.controller.tabs.find((t) => t.label === 'Overview').active);

        this.setRoute('console.admin.organizations.details.users.detail');
        assert.true(this.controller.tabs.find((t) => t.label === 'Users').active, 'a nested route keeps the tab active');
    });

    test('an extension tab is active only for its own slug', function (assert) {
        this.menuItems['console:admin:organization:tabs'] = [{ slug: 'billing', component: 'c', label: 'Billing' }];

        this.setRoute('console.admin.organizations.details.extensions-tab', { slug: 'billing' });
        assert.true(this.controller.tabs.find((t) => t.label === 'Billing').active);

        this.setRoute('console.admin.organizations.details.extensions-tab', { slug: 'other' });
        assert.false(this.controller.tabs.find((t) => t.label === 'Billing').active, 'a different slug is not active');
    });

    test('registeredActions are filtered by visibility and sorted', function (assert) {
        this.menuItems['console:admin:organization:actions'] = [
            { label: 'Late', priority: 90 },
            { label: 'Early', priority: 1 },
            { label: 'Hidden', isVisible: () => false },
        ];

        assert.deepEqual(
            this.controller.registeredActions.map((a) => a.label),
            ['Early', 'Late']
        );

        this.menuItems['console:admin:organization:actions'] = undefined;
        assert.deepEqual(this.controller.registeredActions, [], 'a non-array registry is tolerated');
    });

    test('actionMenuItems include the core actions and any registered ones', function (assert) {
        this.controller.model = organization({ owner_uuid: 'u1' });
        this.menuItems['console:admin:organization:actions'] = [{ label: 'Extension Action' }];

        const items = this.controller.actionMenuItems;
        const labels = items.map((i) => i.label);

        assert.deepEqual(labels, ['Impersonate Owner', 'Copy Public ID', 'Copy UUID', 'Refresh', 'Edit Settings', 'Extension Action']);
        assert.false(items[0].disabled, 'impersonation is enabled when there is an owner');

        this.controller.model = organization({});
        assert.true(this.controller.actionMenuItems[0].disabled, 'and disabled when there is not');
    });

    test('the copy actions copy the public id and uuid', function (assert) {
        this.controller.model = organization();

        const written = [];
        const originalClipboard = navigator.clipboard;
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (v) => written.push(v) } });

        try {
            const items = this.controller.actionMenuItems;
            items.find((i) => i.label === 'Copy Public ID').onClick();
            items.find((i) => i.label === 'Copy UUID').onClick();

            assert.deepEqual(written, ['pub_1', 'uuid_1']);
            assert.deepEqual(this.notifications.successes, ['Public ID copied to clipboard.', 'UUID copied to clipboard.']);

            this.controller.copyId('');
            assert.deepEqual(written, ['pub_1', 'uuid_1'], 'an empty value is not copied');
        } finally {
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
        }
    });

    test('refresh re-runs the route', function (assert) {
        this.controller.refresh();

        assert.strictEqual(this.refreshed, 1);
    });

    test('editOrganization saves the organization and refreshes', async function (assert) {
        const org = organization();
        this.controller.model = org;

        this.controller.editOrganization();
        assert.strictEqual(this.modals.shown.at(-1), 'modals/edit-organization');

        await this.modals.lastOptions.confirm(fakeModal());

        assert.strictEqual(org.saved, 1);
        assert.deepEqual(this.notifications.successes.at(-1), 'Organization updated.');
        assert.strictEqual(this.refreshed, 1);
    });

    test('a failed save is reported and does not refresh', async function (assert) {
        this.controller.model = organization({
            save: () => Promise.reject(new Error('bad')),
        });

        this.controller.editOrganization();
        await this.modals.lastOptions.confirm(fakeModal());

        assert.strictEqual(this.notifications.errors.length, 1);
        assert.strictEqual(this.refreshed, 0);
    });

    test('runRegisteredAction prefers onClick, then a route', function (assert) {
        const org = organization();
        this.controller.model = org;

        let receivedContext;
        this.controller.runRegisteredAction({ onClick: (ctx) => (receivedContext = ctx) });
        assert.strictEqual(receivedContext.organization, org, 'the extension context carries the organization');
        assert.strictEqual(receivedContext.currentUser.id, 'me', 'and the current user');

        this.controller.runRegisteredAction({ route: 'some.route' });
        assert.deepEqual(this.transitions.at(-1), ['some.route', org]);

        assert.strictEqual(this.controller.runRegisteredAction({}), undefined, 'an action with neither is a no-op');
    });

    test('impersonateOwner refuses without an owner', async function (assert) {
        this.controller.model = organization({});

        await this.controller.impersonateOwner.perform();

        assert.deepEqual(this.notifications.errors, ['This organization does not have an owner to impersonate.']);
        assert.deepEqual(this.posted, []);
    });

    test('impersonateOwner posts the owner id', async function (assert) {
        this.controller.model = organization({ owner_uuid: 'u1' });
        // The success path schedules window.location.reload(); make the transition reject so
        // the task stops at its catch rather than reloading the test runner.
        Object.defineProperty(this.controller.router, 'transitionTo', {
            configurable: true,
            value: () => Promise.reject(new Error('halted before reload')),
        });

        await this.controller.impersonateOwner.perform();

        assert.deepEqual(this.posted.at(-1), { path: 'auth/impersonate', payload: { user: 'u1' } });
        assert.strictEqual(this.notifications.errors.length, 1, 'the halted transition is surfaced');
    });

    test('a failed impersonation request is reported', async function (assert) {
        this.controller.model = organization({ owner_uuid: 'u1' });
        this.shouldReject = true;

        await this.controller.impersonateOwner.perform();

        assert.strictEqual(this.notifications.errors.length, 1);
        assert.deepEqual(this.transitions, [], 'no transition on failure');
    });
});
