import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import { cancel } from '@ember/runloop';

// Captures whatever the controller hands to the modals manager so the modal's
// `confirm` callback can be driven directly.
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

    getOption(key) {
        return this.lastOptions[key];
    }
}

class NotificationsStub extends Service {
    warnings = [];
    successes = [];
    errors = [];
    warning(m) {
        this.warnings.push(m);
    }
    success(m) {
        this.successes.push(m);
    }
    serverError(e) {
        this.errors.push(e);
    }
}

class IntlStub extends Service {
    t(key) {
        return key;
    }
}

// A stand-in for the modal instance passed to `confirm`. Backed by the same options
// object the controller passed to the modals manager, since some confirm handlers read
// their values back out via modal.getOption().
function fakeModal(options = {}) {
    return {
        loading: false,
        startLoading() {
            this.loading = true;
        },
        stopLoading() {
            this.loading = false;
        },
        getOption(key) {
            return options[key];
        },
        setOption(key, value) {
            options[key] = value;
        },
    };
}

function organization(attrs = {}) {
    return {
        name: 'Acme',
        uuid: 'org_1',
        owner_uuid: 'user_1',
        users_count: 1,
        calls: [],
        loadUsers(params) {
            this.calls.push(['loadUsers', params]);
        },
        transferOwnership(newOwnerId, params) {
            this.calls.push(['transferOwnership', newOwnerId, params]);
            return Promise.resolve();
        },
        destroyRecord() {
            this.calls.push(['destroyRecord']);
            return Promise.resolve();
        },
        leave() {
            this.calls.push(['leave']);
            return Promise.resolve();
        },
        save() {
            this.calls.push(['save']);
            return Promise.resolve();
        },
        ...attrs,
    };
}

module('Unit | Controller | console/account/organizations', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:modals-manager', ModalsManagerStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:intl', IntlStub);

        // Registered before the controller is looked up — the controller resolves its
        // injections on creation, so a stub registered later would never reach it and the
        // real fetch service would issue a request.
        this.posted = [];
        const posted = this.posted;
        class FetchStub extends Service {
            post(path, payload) {
                posted.push({ path, payload });
                return this.postResponse ? this.postResponse(path, payload) : Promise.resolve({});
            }
            flushRequestCache(path) {
                posted.push({ flushed: path });
            }
        }
        this.owner.register('service:fetch', FetchStub);

        this.controller = this.owner.lookup('controller:console/account/organizations');
        this.modals = this.owner.lookup('service:modals-manager');
        this.notifications = this.owner.lookup('service:notifications');

        // router is the built-in RouterService, which owner.register cannot swap.
        this.refreshed = 0;
        this.controller.router.refresh = () => this.refreshed++;
    });

    test('leaveOrganization refuses to leave your only organization', async function (assert) {
        this.controller.model = [organization()];

        await this.controller.leaveOrganization(organization());

        assert.deepEqual(this.notifications.warnings, ['Unable to leave your only organization.']);
        assert.strictEqual(this.modals.lastOptions, null, 'no modal is opened');
    });

    test('leaveOrganization offers ownership transfer when the owner has other members', async function (assert) {
        this.controller.currentUser.userSnapshot = { id: 'user_1' };
        const org = organization({ users_count: 3 });
        this.controller.model = [org, organization()];

        await this.controller.leaveOrganization(org);

        const options = this.modals.lastOptions;
        assert.strictEqual(options.title, 'Transfer Ownership and Leave');
        assert.true(options.isOwner);
        assert.true(options.hasOtherMembers);
        assert.false(options.willBeDeleted);
        assert.true(options.acceptButtonDisabled, 'confirming is blocked until a new owner is chosen');
        assert.deepEqual(org.calls, [['loadUsers', { exclude: ['user_1'] }]], 'other members are loaded for selection');

        options.selectNewOwner('user_2');
        assert.strictEqual(options.newOwnerId, 'user_2');
        assert.false(options.acceptButtonDisabled, 'choosing an owner unblocks confirm');

        await options.confirm(fakeModal());
        assert.deepEqual(org.calls.at(-1), ['transferOwnership', 'user_2', { leave: true }]);
        assert.strictEqual(this.refreshed, 1, 'the route is refreshed');
    });

    test('leaveOrganization deletes the organization when the sole owner leaves', async function (assert) {
        this.controller.currentUser.userSnapshot = { id: 'user_1' };
        const org = organization({ users_count: 1 });
        this.controller.model = [org, organization()];

        await this.controller.leaveOrganization(org);

        const options = this.modals.lastOptions;
        assert.strictEqual(options.title, 'Delete Organization');
        assert.true(options.willBeDeleted);

        await options.confirm(fakeModal());
        assert.deepEqual(org.calls.at(-1), ['destroyRecord']);
        assert.strictEqual(this.refreshed, 1);
    });

    test('leaveOrganization simply leaves when the user is not the owner', async function (assert) {
        this.controller.currentUser.userSnapshot = { id: 'user_2' };
        const org = organization({ owner_uuid: 'user_1', users_count: 4 });
        this.controller.model = [org, organization()];

        await this.controller.leaveOrganization(org);

        const options = this.modals.lastOptions;
        assert.strictEqual(options.title, 'Leave Organization');
        assert.false(options.isOwner);
        assert.false(options.acceptButtonDisabled);

        await options.confirm(fakeModal());
        assert.deepEqual(org.calls.at(-1), ['leave']);
    });

    test('deleteOrganization refuses for the only organization and for non-owners', async function (assert) {
        this.controller.currentUser.userSnapshot = { id: 'user_2' };

        this.controller.model = [organization()];
        this.controller.deleteOrganization(organization());
        assert.deepEqual(this.notifications.warnings, ['Unable to delete your only organization.']);

        this.controller.model = [organization(), organization()];
        this.controller.deleteOrganization(organization({ owner_uuid: 'user_1' }));
        assert.deepEqual(this.notifications.warnings.at(-1), 'You do not have rights to delete this organization.');
    });

    test('deleteOrganization destroys the record through crud.delete for the owner', async function (assert) {
        this.controller.currentUser.userSnapshot = { id: 'user_1' };
        const org = organization();
        this.controller.model = [org, organization()];

        // crud.delete is an @action, which is exposed as a getter — shadow it with an
        // own value property instead of assigning.
        let deleted;
        Object.defineProperty(this.controller.crud, 'delete', {
            configurable: true,
            value: (record, options) => {
                deleted = { record, options };
            },
        });

        this.controller.deleteOrganization(org);

        assert.strictEqual(deleted.record, org);
        assert.strictEqual(deleted.options.acceptButtonText, 'Delete Organization');

        await deleted.options.confirm(fakeModal());
        assert.deepEqual(org.calls.at(-1), ['destroyRecord']);
        assert.strictEqual(this.refreshed, 1);
    });

    test('editOrganization saves the record and refreshes', async function (assert) {
        const org = organization();
        this.controller.currentUser.userSnapshot = { id: 'user_1' };

        this.controller.editOrganization(org);

        const options = this.modals.lastOptions;
        assert.strictEqual(options.title, 'Edit Organization');
        assert.true(options.isOwner);

        await options.confirm(fakeModal());
        assert.deepEqual(org.calls.at(-1), ['save']);
        assert.strictEqual(this.refreshed, 1);
    });

    test('createOrganization posts the new organization and refreshes', async function (assert) {
        this.controller.createOrganization();

        const options = this.modals.lastOptions;
        options.organization.name = 'New Co';

        // this confirm handler reads the edited organization back via modal.getOption()
        await options.confirm(fakeModal(options));

        assert.strictEqual(this.posted[0].path, 'auth/create-organization');
        assert.strictEqual(this.posted[0].payload.name, 'New Co');
        assert.deepEqual(this.posted[1], { flushed: 'auth/organizations' });
        assert.strictEqual(this.refreshed, 1);
    });

    test('switchOrganization reports a server error without reloading', async function (assert) {
        this.controller.fetch.postResponse = () => Promise.reject(new Error('nope'));

        this.controller.switchOrganization(organization());

        const modal = fakeModal();
        await this.modals.lastOptions.confirm(modal);

        assert.strictEqual(this.notifications.errors.length, 1, 'the failure is surfaced');
        assert.false(modal.loading, 'the modal stops loading');
    });

    test('switchOrganization posts the switch and schedules a reload on success', async function (assert) {
        const posted = this.posted;
        this.controller.switchOrganization(organization());

        // The success path returns the `later` timer that reloads the page — cancel it
        // so the pending reload never fires against the test runner.
        const timer = await this.modals.lastOptions.confirm(fakeModal());
        cancel(timer);

        assert.deepEqual(posted[0], { path: 'auth/switch-organization', payload: { next: 'org_1' } });
        assert.deepEqual(posted[1], { flushed: 'auth/organizations' });
        assert.strictEqual(this.notifications.successes.length, 1);
    });
});
