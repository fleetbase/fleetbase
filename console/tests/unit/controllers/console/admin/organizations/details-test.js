import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import { settled } from '@ember/test-helpers';
import window from 'ember-window-mock';

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

/**
 * The tab and action registries are built from extension-supplied menu items, so nearly
 * every field has a fallback. These drive the arms the happy-path tests do not: items with
 * no priority, no visibility predicate, or a label under one of its alternative keys, and
 * the owner/status getters when the organization supplies nothing.
 */
module('Unit | Controller | console/admin/organizations/details | registry fallbacks', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.controller = this.owner.lookup('controller:console/admin/organizations/details');
        this.menuItems = {};
        // universe/menu-service is a pre-resolved singleton; patch the injected instance.
        Object.defineProperty(this.controller.menuService, 'getMenuItems', {
            configurable: true,
            value: (key) => this.menuItems[key],
        });
    });

    test('a registry that returns nothing yields no extra tabs or actions', function (assert) {
        this.menuItems = {};

        assert.deepEqual(this.controller.visibleRegisteredTabs, [], 'a non-array tab registry is ignored');
        assert.deepEqual(this.controller.registeredActions, [], 'so is a non-array action registry');
        assert.strictEqual(this.controller.tabs.length, 5, 'only the five core tabs remain');
    });

    test('registered tabs must declare both a slug and a component', function (assert) {
        this.menuItems['console:admin:organization:tabs'] = [{ slug: 'billing', component: 'billing-tab', label: 'Billing' }, { slug: 'no-component' }, { component: 'no-slug' }, {}];

        assert.deepEqual(
            this.controller.visibleRegisteredTabs.map((tab) => tab.slug),
            ['billing'],
            'incomplete registrations are dropped'
        );
    });

    test('a tab visibility predicate receives the extension context and can hide the tab', function (assert) {
        let received;
        this.menuItems['console:admin:organization:tabs'] = [
            { slug: 'always', component: 'c' },
            {
                slug: 'conditional',
                component: 'c',
                isVisible: (context) => {
                    received = context;
                    return false;
                },
            },
        ];
        this.controller.model = { public_id: 'company_1' };

        const slugs = this.controller.visibleRegisteredTabs.map((tab) => tab.slug);

        assert.deepEqual(slugs, ['always'], 'a tab with no predicate is shown, one returning false is not');
        assert.strictEqual(received.organization, this.controller.model, 'the predicate sees the organization');
    });

    test('registered tabs without a priority sort after the core tabs', function (assert) {
        this.menuItems['console:admin:organization:tabs'] = [
            { slug: 'late', component: 'c', label: 'Late' },
            { slug: 'early', component: 'c', label: 'Early', priority: 5 },
        ];

        const labels = this.controller.tabs.map((tab) => tab.label);

        assert.strictEqual(labels[0], 'Overview', 'priority 0 still leads');
        assert.strictEqual(labels[1], 'Early', 'an explicit priority slots the tab in');
        assert.strictEqual(labels.at(-1), 'Late', 'no priority defaults to the end');
    });

    test('an action visibility predicate can hide it, and unprioritised actions sort last', function (assert) {
        this.menuItems['console:admin:organization:actions'] = [{ label: 'Hidden', isVisible: () => false }, { label: 'Unprioritised' }, { label: 'First', priority: 1 }];

        assert.deepEqual(
            this.controller.registeredActions.map((action) => action.label),
            ['First', 'Unprioritised']
        );
    });

    test('a registered action label falls back through text and title', function (assert) {
        this.menuItems['console:admin:organization:actions'] = [{ label: 'By label' }, { text: 'By text' }, { title: 'By title' }];

        const labels = this.controller.actionMenuItems.slice(5).map((item) => item.label);

        assert.deepEqual(labels, ['By label', 'By text', 'By title']);
    });

    test('the impersonate action is disabled until the organization has an owner', function (assert) {
        this.controller.model = {};
        assert.true(this.controller.actionMenuItems[0].disabled, 'nothing to impersonate');

        this.controller.model = { owner_uuid: 'user_1' };
        assert.false(this.controller.actionMenuItems[0].disabled, 'an owner uuid alone is enough');
    });

    test('ownerId falls back from the record id to its uuid to the organization owner_uuid', function (assert) {
        this.controller.model = { owner: { id: 'user_1', uuid: 'uuid_1' }, owner_uuid: 'uuid_2' };
        assert.strictEqual(this.controller.ownerId, 'user_1', 'the record id wins');

        this.controller.model = { owner: { uuid: 'uuid_1' }, owner_uuid: 'uuid_2' };
        assert.strictEqual(this.controller.ownerId, 'uuid_1', 'then the record uuid');

        this.controller.model = { owner: null, owner_uuid: 'uuid_2' };
        assert.strictEqual(this.controller.ownerId, 'uuid_2', 'then the organization owner_uuid');

        this.controller.model = {};
        assert.strictEqual(this.controller.ownerId, undefined, 'and nothing when none are set');
    });

    test('hasOwner accepts either a loaded owner or a bare owner_uuid', function (assert) {
        this.controller.model = { owner: { id: 'user_1' } };
        assert.true(this.controller.hasOwner);

        this.controller.model = { owner_uuid: 'user_1' };
        assert.true(this.controller.hasOwner, 'an unloaded owner still counts');

        this.controller.model = {};
        assert.false(this.controller.hasOwner);
    });

    test('the status getters fall back for an organization with nothing set', function (assert) {
        this.controller.model = {};

        assert.strictEqual(this.controller.organizationStatus, 'active');
        assert.strictEqual(this.controller.onboardingStatus, 'incomplete');
        assert.strictEqual(this.controller.billingStatus, 'not configured');
        assert.strictEqual(this.controller.ownerName, undefined);
        assert.strictEqual(this.controller.ownerEmail, undefined);
    });

    test('the status getters read the organization when it is populated', function (assert) {
        this.controller.model = {
            status: 'suspended',
            onboarding_completed: true,
            billing_status: 'past due',
            owner: { name: 'Ron', email: 'ron@fleetbase.io' },
        };

        assert.strictEqual(this.controller.organizationStatus, 'suspended');
        assert.strictEqual(this.controller.onboardingStatus, 'complete');
        assert.strictEqual(this.controller.billingStatus, 'past due');
        assert.strictEqual(this.controller.ownerName, 'Ron');
        assert.strictEqual(this.controller.ownerEmail, 'ron@fleetbase.io');
    });

    test('the extension context carries the signed-in user when the session has one', function (assert) {
        this.controller.model = { public_id: 'company_1' };

        assert.strictEqual(this.controller.extensionContext.currentUser, undefined, 'an anonymous session contributes nothing');

        // session.data is a read-only alias, so shadow it rather than assigning.
        Object.defineProperty(this.controller.session, 'data', { configurable: true, value: { authenticated: { user: 'user_1' } } });
        assert.strictEqual(this.controller.extensionContext.currentUser, 'user_1');
        assert.strictEqual(this.controller.extensionContext.organization, this.controller.model);
    });
});

/**
 * The impersonation success path ends in a window reload. ember-window-mock makes that a
 * no-op in tests and lets the call be spied on, so the whole path can be driven.
 */
module('Unit | Controller | console/admin/organizations/details | impersonation', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const self = this;
        this.posted = [];

        class FetchStub extends Service {
            post(path, payload) {
                self.posted.push({ path, payload });
                return Promise.resolve({ token: 'imp-token' });
            }
        }
        class SessionStub extends Service {
            authenticated = [];
            data = { authenticated: { user: { id: 'me' } } };
            manuallyAuthenticate(token) {
                this.authenticated.push(token);
            }
        }

        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:session', SessionStub);

        this.controller = this.owner.lookup('controller:console/admin/organizations/details');
        this.notifications = this.owner.lookup('service:notifications');
        this.session = this.owner.lookup('service:session');

        this.transitions = [];
        Object.defineProperty(this.controller.router, 'transitionTo', {
            configurable: true,
            value: (...args) => {
                this.transitions.push(args);
                return Promise.resolve();
            },
        });

        this.reloads = 0;
        window.location.reload = () => this.reloads++;
    });

    test('impersonating an owner authenticates as them and reloads the console', async function (assert) {
        this.controller.model = organization({ owner_uuid: 'u1' });
        Object.defineProperty(this.controller, 'owner', { configurable: true, value: { id: 'u1', email: 'owner@acme.test' } });

        await this.controller.impersonateOwner.perform();

        assert.deepEqual(this.posted.at(-1), { path: 'auth/impersonate', payload: { user: 'u1' } });
        assert.deepEqual(this.transitions, [['console']], 'the console is entered before the session is swapped');
        assert.deepEqual(this.session.authenticated, ['imp-token'], 'the impersonation token replaces the current session');
        assert.deepEqual(this.notifications.infos, ['Now impersonating owner@acme.test...'], 'the owner is named');
        assert.strictEqual(this.reloads, 0, 'the reload is deferred rather than immediate');

        await settled();
        assert.strictEqual(this.reloads, 1, 'and lands once the timer fires');
    });

    test('an owner with no email address is described generically', async function (assert) {
        this.controller.model = organization({ owner_uuid: 'u1' });

        await this.controller.impersonateOwner.perform();
        await settled();

        assert.deepEqual(this.notifications.infos, ['Now impersonating organization owner...']);
        assert.strictEqual(this.reloads, 1);
    });

    test('a registered action in the action menu runs when clicked', async function (assert) {
        const clicked = [];
        Object.defineProperty(this.controller.menuService, 'getMenuItems', {
            configurable: true,
            value: (registry) =>
                registry === 'console:admin:organization:actions' ? [{ label: 'Sync Billing', icon: 'sync', class: 'danger', onClick: (context) => clicked.push(context) }] : [],
        });
        this.controller.model = organization({ uuid: 'uuid_1' });

        const item = this.controller.actionMenuItems.find((entry) => entry.label === 'Sync Billing');
        assert.strictEqual(item.icon, 'sync');
        assert.strictEqual(item.class, 'danger');

        item.onClick();

        assert.strictEqual(clicked.length, 1, 'the registered handler runs');
        assert.strictEqual(clicked[0].organization, this.controller.model, 'and receives the extension context');
    });
});
