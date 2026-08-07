import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';

class IntlStub extends Service {
    t(key) {
        return key;
    }
}

class NotificationsStub extends Service {
    errors = [];
    successes = [];
    infos = [];
    error(m) {
        this.errors.push(m);
    }
    success(m) {
        this.successes.push(m);
    }
    info(m) {
        this.infos.push(m);
    }
    serverError(e) {
        this.errors.push(e);
    }
}

module('Unit | Controller | console/admin/organizations/index', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.postResponse = () => Promise.resolve({ token: 'imp-token' });
        const self = this;

        class FetchStub extends Service {
            post(path, payload) {
                self.posted.push({ path, payload });
                return self.postResponse();
            }
        }
        class SessionStub extends Service {
            authenticated = [];
            manuallyAuthenticate(token) {
                this.authenticated.push(token);
            }
        }

        // Registered before the lookup — the controller resolves its injections on
        // creation and reads intl.t while building its `columns` class field.
        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:session', SessionStub);

        this.controller = this.owner.lookup('controller:console/admin/organizations/index');
        this.notifications = this.owner.lookup('service:notifications');

        this.transitions = [];
        Object.defineProperty(this.controller.router, 'transitionTo', {
            configurable: true,
            value: (...args) => {
                this.transitions.push(args);
                return Promise.resolve();
            },
        });
    });

    test('search sets the query and returns to the first page', function (assert) {
        this.controller.page = 5;

        this.controller.search({ target: { value: 'acme' } });

        assert.strictEqual(this.controller.query, 'acme');
        assert.strictEqual(this.controller.page, 1, 'paging resets on a new search');

        this.controller.search({ target: {} });
        assert.strictEqual(this.controller.query, '', 'a missing value becomes an empty query');
    });

    test('goToCompany and openActivity transition with the public id', function (assert) {
        this.controller.goToCompany({ public_id: 'company_1' });
        assert.deepEqual(this.transitions.at(-1), ['console.admin.organizations.details', 'company_1']);

        this.controller.openActivity({ public_id: 'company_1' });
        assert.deepEqual(this.transitions.at(-1), ['console.admin.organizations.details.activity', 'company_1']);
    });

    test('resolveBelongsTo unwraps a loaded relationship and rejects pending ones', function (assert) {
        const controller = this.controller;

        assert.strictEqual(controller.resolveBelongsTo(null), null, 'nothing to resolve');
        assert.deepEqual(controller.resolveBelongsTo({ content: { id: 'u1' } }), { id: 'u1' }, 'proxied records unwrap to content');
        assert.strictEqual(controller.resolveBelongsTo({ isPending: true }), null, 'pending relationships are not usable');
        assert.strictEqual(controller.resolveBelongsTo({ isFulfilled: false }), null);
        assert.strictEqual(controller.resolveBelongsTo({ then: () => {} }), null, 'a thenable is still loading');

        const plain = { id: 'u1' };
        assert.strictEqual(controller.resolveBelongsTo(plain), plain, 'a plain record passes through');
    });

    test('impersonateOwner refuses when the organization has no owner', async function (assert) {
        await this.controller.impersonateOwner({});

        assert.deepEqual(this.notifications.errors, ['This organization does not have an owner to impersonate.']);
        assert.deepEqual(this.posted, [], 'nothing is requested without an owner');
    });

    test('impersonateOwner posts the resolved owner id', async function (assert) {
        // The success path ends in window.location.reload(); make the transition reject so
        // the handler stops at its catch rather than reloading the test runner.
        Object.defineProperty(this.controller.router, 'transitionTo', {
            configurable: true,
            value: () => Promise.reject(new Error('halted before reload')),
        });

        await this.controller.impersonateOwner({ owner: { content: { id: 'user_9', email: 'owner@fleetbase.io' } } });

        assert.deepEqual(this.posted.at(-1), { path: 'auth/impersonate', payload: { user: 'user_9' } });
        assert.strictEqual(this.notifications.errors.length, 1, 'the halted transition is surfaced');
    });

    test('impersonateOwner falls back to the owner_uuid when the relationship is unloaded', async function (assert) {
        Object.defineProperty(this.controller.router, 'transitionTo', {
            configurable: true,
            value: () => Promise.reject(new Error('halted before reload')),
        });

        await this.controller.impersonateOwner({ owner: { isPending: true }, owner_uuid: 'user_from_uuid' });

        assert.deepEqual(this.posted.at(-1).payload, { user: 'user_from_uuid' });
    });

    test('impersonateOwner reports a failed impersonation request', async function (assert) {
        this.postResponse = () => Promise.reject(new Error('forbidden'));

        await this.controller.impersonateOwner({ owner_uuid: 'user_9' });

        assert.strictEqual(this.notifications.errors.length, 1);
        assert.deepEqual(this.transitions, [], 'no transition happens when impersonation fails');
    });

    test('copyId writes to the clipboard and confirms, ignoring empty values', function (assert) {
        const written = [];
        const originalClipboard = navigator.clipboard;
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText: (v) => written.push(v) },
        });

        try {
            this.controller.copyId('');
            assert.deepEqual(written, [], 'nothing is copied for an empty value');
            assert.strictEqual(this.notifications.successes.length, 0);

            this.controller.copyId('pub_1', 'Public ID');
            assert.deepEqual(written, ['pub_1']);
            assert.deepEqual(this.notifications.successes, ['Public ID copied to clipboard.']);

            this.controller.copyId('uuid_1');
            assert.strictEqual(this.notifications.successes.at(-1), 'ID copied to clipboard.', 'the label defaults to ID');
        } finally {
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
        }
    });

    test('exportOrganization exports the selected rows', function (assert) {
        let exported;
        Object.defineProperty(this.controller.crud, 'export', {
            configurable: true,
            value: (type, options) => (exported = { type, options }),
        });

        this.controller.exportOrganization();
        assert.deepEqual(exported, { type: 'companies', options: { params: { selections: [] } } }, 'no table means no selections');

        this.controller.table = { selectedRows: [{ id: 'a' }, { id: 'b' }] };
        this.controller.exportOrganization();
        assert.deepEqual(exported.options.params.selections, ['a', 'b']);
    });

    test('applySavedView sets exactly one filter and resets paging', function (assert) {
        const controller = this.controller;
        controller.page = 4;

        controller.applySavedView('needs_attention');
        assert.strictEqual(controller.needs_attention, 1);
        assert.strictEqual(controller.missing_owner, null);
        assert.strictEqual(controller.page, 1);

        controller.applySavedView('missing_owner');
        assert.strictEqual(controller.missing_owner, 1);
        assert.strictEqual(controller.needs_attention, null, 'switching views clears the previous one');

        controller.applySavedView('incomplete_onboarding');
        assert.false(controller.onboarding_completed);

        controller.applySavedView('inactive_status');
        assert.strictEqual(controller.inactive_status, 1);
        assert.strictEqual(controller.onboarding_completed, null);

        controller.applySavedView('unknown-view');
        assert.strictEqual(controller.inactive_status, null, 'an unknown view just clears');
    });

    test('clearSavedView resets every saved-view filter', function (assert) {
        const controller = this.controller;
        Object.assign(controller, { needs_attention: 1, missing_owner: 1, inactive_status: 1, onboarding_completed: false, page: 7 });

        controller.clearSavedView();

        assert.strictEqual(controller.needs_attention, null);
        assert.strictEqual(controller.missing_owner, null);
        assert.strictEqual(controller.inactive_status, null);
        assert.strictEqual(controller.onboarding_completed, null);
        assert.strictEqual(controller.page, 1);
    });

    test('actionButtons expose the saved views and wire them to the controller', function (assert) {
        const [views, exportButton] = this.controller.actionButtons;

        assert.strictEqual(views.text, 'Views');
        assert.deepEqual(
            views.items.filter((i) => i.label).map((i) => i.label),
            ['Needs Attention', 'Missing Owner', 'Incomplete Onboarding', 'Inactive Status', 'Clear View']
        );
        assert.ok(
            views.items.some((i) => i.separator),
            'the clear action is separated'
        );

        views.items[0].onClick();
        assert.strictEqual(this.controller.needs_attention, 1, 'the first view applies needs_attention');

        assert.strictEqual(exportButton.text, 'Export');
        assert.strictEqual(exportButton.onClick, this.controller.exportOrganization);
    });

    test('bulkActions offer exporting the selection', function (assert) {
        const [exportAction] = this.controller.bulkActions;

        assert.strictEqual(exportAction.label, 'Export selected');
        assert.strictEqual(exportAction.fn, this.controller.exportOrganization);
    });

    test('the table columns cover the organization fields and row actions', function (assert) {
        const columns = this.controller.columns;

        assert.strictEqual(columns[0].valuePath, 'name');
        assert.true(columns[0].sticky, 'the name column is pinned');
        assert.ok(
            columns.some((c) => c.valuePath === 'users_count'),
            'the user count is shown'
        );
        assert.ok(
            columns.some((c) => c.valuePath === 'onboardingStatus'),
            'onboarding status is shown'
        );

        const actions = columns.at(-1).actions;
        assert.deepEqual(
            actions.map((a) => a.label),
            ['View Organization', 'Open Activity', 'Impersonate Owner', 'Copy Public ID', 'Copy UUID']
        );

        // the copy actions are inline arrows — drive them to prove they pass the right field
        const written = [];
        const originalClipboard = navigator.clipboard;
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (v) => written.push(v) } });
        try {
            actions[3].fn({ public_id: 'pub_1', uuid: 'uuid_1' });
            actions[4].fn({ public_id: 'pub_1', uuid: 'uuid_1' });
            assert.deepEqual(written, ['pub_1', 'uuid_1']);
        } finally {
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
        }
    });
});
