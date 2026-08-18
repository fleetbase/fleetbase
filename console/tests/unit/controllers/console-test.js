import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';
import { cancel } from '@ember/runloop';
import window from 'ember-window-mock';

class IntlStub extends Service {
    t(key) {
        return key;
    }
}

class NotificationsStub extends Service {
    successes = [];
    errors = [];
    success(m) {
        this.successes.push(m);
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
    confirm(options) {
        this.shown.push('confirm');
        this.lastOptions = options;
        return Promise.resolve();
    }
    setOption(key, value) {
        this.lastOptions[key] = value;
    }
    getOptions() {
        return this.lastOptions;
    }
}

function fakeModal(options = {}) {
    return {
        loading: false,
        startLoading() {
            this.loading = true;
        },
        stopLoading() {
            this.loading = false;
        },
        getOptions() {
            return options;
        },
        getOption(key) {
            return options[key];
        },
    };
}

module('Unit | Controller | console', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        const self = this;
        this.posted = [];
        this.shouldReject = false;

        class FetchStub extends Service {
            post(path, payload) {
                self.posted.push({ path, payload });
                return self.shouldReject ? Promise.reject(new Error('nope')) : Promise.resolve({});
            }
            flushRequestCache(path) {
                self.posted.push({ flushed: path });
            }
        }
        class SessionStub extends Service {
            invalidated = 0;
            invalidateWithLoader() {
                this.invalidated++;
                return Promise.resolve();
            }
        }

        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:session', SessionStub);

        this.controller = this.owner.lookup('controller:console');
        this.notifications = this.owner.lookup('service:notifications');
        this.modals = this.owner.lookup('service:modals-manager');
        this.session = this.owner.lookup('service:session');

        // currentUser.currency/country/timezone are all getters over whois(), so the stub
        // has to answer per key rather than returning one value for everything.
        this.whoisData = { timezone: 'Asia/Singapore' };
        Object.defineProperty(this.controller.currentUser, 'whois', {
            configurable: true,
            value: (key) => this.whoisData[key],
        });
    });

    test('currentRouteClass dasherizes the current route name', function (assert) {
        Object.defineProperty(this.controller.router, 'currentRouteName', { configurable: true, value: 'console.admin.organizations' });

        assert.strictEqual(this.controller.currentRouteClass, 'console-admin-organizations');
    });

    test('onAction dispatches to a matching controller method and ignores unknown ones', function (assert) {
        // viewChangelog is an @action, exposed as a getter — shadow it with a value.
        const called = [];
        Object.defineProperty(this.controller, 'viewChangelog', {
            configurable: true,
            value: (...args) => called.push(args),
        });

        this.controller.onAction('viewChangelog', 'a', 'b');
        assert.deepEqual(called, [['a', 'b']], 'the named action runs with its params');

        this.controller.onAction('notAFunction');
        assert.deepEqual(called, [['a', 'b']], 'an unknown action is a no-op');
    });

    test('invalidateSession stops the event and invalidates with the loader', async function (assert) {
        let prevented = false;

        await this.controller.invalidateSession(null, { preventDefault: () => (prevented = true) });

        assert.true(prevented, 'the link default is suppressed');
        assert.strictEqual(this.session.invalidated, 1);
    });

    test('viewChangelog opens the changelog modal without a decline button', function (assert) {
        this.controller.viewChangelog();

        assert.strictEqual(this.modals.shown.at(-1), 'modals/changelog');
        assert.true(this.modals.lastOptions.hideDeclineButton);
    });

    test('createOrJoinOrg seeds the modal from the current company', function (assert) {
        this.controller.currentUser.company = { currency: 'SGD', country: 'SG', timezone: 'Asia/Singapore' };

        this.controller.createOrJoinOrg();

        const options = this.modals.lastOptions;
        assert.strictEqual(this.modals.shown.at(-1), 'modals/create-or-join-org');
        assert.strictEqual(options.action, 'join', 'it opens on the join tab');
        assert.strictEqual(options.currency, 'SGD');
        assert.strictEqual(options.country, 'SG');
        assert.strictEqual(options.timezone, 'Asia/Singapore');
    });

    test('createOrJoinOrg falls back to USD and the whois timezone without a company', function (assert) {
        this.controller.currentUser.company = null;

        this.controller.createOrJoinOrg();

        const options = this.modals.lastOptions;
        assert.strictEqual(options.currency, 'USD', 'currency falls back to USD');
        assert.strictEqual(options.timezone, 'Asia/Singapore', 'the timezone comes from whois');
    });

    test('changeAction switches the modal between join and create', function (assert) {
        this.controller.createOrJoinOrg();

        this.modals.lastOptions.changeAction('create');

        assert.strictEqual(this.modals.lastOptions.action, 'create');
    });

    test('confirming a join posts the selected organization', async function (assert) {
        this.controller.createOrJoinOrg();

        const timer = await this.modals.lastOptions.confirm(fakeModal({ action: 'join', next: 'org_2' }));
        cancel(timer);

        assert.deepEqual(this.posted[0], { path: 'auth/join-organization', payload: { next: 'org_2' } });
        assert.deepEqual(this.posted[1], { flushed: 'auth/organizations' });
        assert.strictEqual(this.notifications.successes.length, 1);
    });

    test('a failed join is reported and stops the modal loading', async function (assert) {
        this.shouldReject = true;
        this.controller.createOrJoinOrg();

        const modal = fakeModal({ action: 'join', next: 'org_2' });
        await this.modals.lastOptions.confirm(modal);

        assert.strictEqual(this.notifications.errors.length, 1);
        assert.false(modal.loading);
    });

    test('confirming a create posts the new organization details', async function (assert) {
        this.controller.createOrJoinOrg();

        const timer = await this.modals.lastOptions.confirm(
            fakeModal({ action: 'create', name: 'New Co', description: 'movers', phone: '+1', currency: 'USD', country: 'US', timezone: 'UTC' })
        );
        cancel(timer);

        assert.strictEqual(this.posted[0].path, 'auth/create-organization');
        assert.strictEqual(this.posted[0].payload.name, 'New Co');
        assert.strictEqual(this.posted[0].payload.timezone, 'UTC');
        assert.deepEqual(this.posted[1], { flushed: 'auth/organizations' });
    });

    test('a failed create is reported and stops the modal loading', async function (assert) {
        this.shouldReject = true;
        this.controller.createOrJoinOrg();

        const modal = fakeModal({ action: 'create', name: 'New Co' });
        await this.modals.lastOptions.confirm(modal);

        assert.strictEqual(this.notifications.errors.length, 1);
        assert.false(modal.loading);
    });

    test('switchOrganization confirms then posts the switch', async function (assert) {
        this.controller.switchOrganization({ uuid: 'org_9', name: 'Acme' });

        // The success path returns the later() timer that reloads the page — cancel it so
        // the pending reload never fires against the test runner.
        const timer = await this.modals.lastOptions.confirm(fakeModal());
        cancel(timer);

        assert.deepEqual(this.posted[0], { path: 'auth/switch-organization', payload: { next: 'org_9' } });
        assert.deepEqual(this.posted[1], { flushed: 'auth/organizations' });
        assert.strictEqual(this.notifications.successes.length, 1);
    });

    test('switchOrganization unwraps an array of organizations', async function (assert) {
        this.controller.switchOrganization([{ uuid: 'org_first', name: 'First' }, { uuid: 'org_second' }]);

        const timer = await this.modals.lastOptions.confirm(fakeModal());
        cancel(timer);

        assert.strictEqual(this.posted[0].payload.next, 'org_first', 'the first organization is used');
    });

    test('a failed switch is reported without reloading', async function (assert) {
        this.shouldReject = true;
        this.controller.switchOrganization({ uuid: 'org_9', name: 'Acme' });

        const modal = fakeModal();
        await this.modals.lastOptions.confirm(modal);

        assert.strictEqual(this.notifications.errors.length, 1);
        assert.false(modal.loading);
    });
});

module('Unit | Controller | console | reload timers and defaults', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.postRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            post() {
                return context.postRejectsWith ? Promise.reject(context.postRejectsWith) : Promise.resolve({ ok: true });
            }
            flushRequestCache() {}
        }
        class NotificationsStub extends Service {
            success() {}
            serverError() {}
        }
        class ModalsManagerStub extends Service {
            shown = [];
            confirmed = [];
            options = {};
            show(name, options) {
                this.shown.push({ name, options });
                this.options = options;
            }
            confirm(options) {
                this.confirmed.push(options);
                this.options = options;
            }
            getOptions() {
                return this.options;
            }
            setOption(key, value) {
                this.options[key] = value;
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);

        this.build = () => {
            const controller = this.owner.lookup('controller:console');
            this.reloads = 0;
            window.location.reload = () => this.reloads++;
            return controller;
        };
        this.modals = () => this.owner.lookup('service:modals-manager');
        this.modal = () => ({ startLoading() {}, stopLoading() {}, getOptions: () => this.modals().options });
    });

    test('the menus and organization list start empty', function (assert) {
        const controller = this.build();

        // Read before anything writes them: a @tracked initializer only runs on first access.
        assert.deepEqual(controller.organizations, []);
        assert.deepEqual(controller.menuItems, []);
        assert.deepEqual(controller.userMenuItems, []);
        assert.deepEqual(controller.organizationMenuItems, []);
    });

    test('joining an organization reloads the console once the timer fires', async function (assert) {
        const controller = this.build();
        controller.createOrJoinOrg();
        this.modals().options.action = 'join';

        await this.modals().options.confirm(this.modal());
        assert.strictEqual(this.reloads, 0, 'the reload is deferred, not immediate');

        await settled();

        assert.strictEqual(this.reloads, 1, 'the console reloads into the joined organization');
    });

    test('creating an organization reloads the console once the timer fires', async function (assert) {
        const controller = this.build();
        controller.createOrJoinOrg();
        this.modals().options.action = 'create';

        await this.modals().options.confirm(this.modal());
        await settled();

        assert.strictEqual(this.reloads, 1);
    });

    test('switching organization reloads the console once the timer fires', async function (assert) {
        const controller = this.build();
        controller.switchOrganization({ uuid: 'co_2', name: 'Other Co' });

        await this.modals().options.confirm(this.modal());
        await settled();

        assert.strictEqual(this.reloads, 1);
    });

    test('a failed switch never reaches the reload', async function (assert) {
        this.postRejectsWith = new Error('switch rejected');
        const controller = this.build();
        controller.switchOrganization({ uuid: 'co_2', name: 'Other Co' });

        await this.modals().options.confirm(this.modal());
        await settled();

        assert.strictEqual(this.reloads, 0);
    });
});
