import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import Service from '@ember/service';
import window from 'ember-window-mock';

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

module('Unit | Controller | console/admin/organizations/index | actions', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.postRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            post(path, payload) {
                context.posted.push({ path, payload });
                return context.postRejectsWith ? Promise.reject(context.postRejectsWith) : Promise.resolve({ token: 'impersonation-token' });
            }
        }
        class SessionStub extends Service {
            authenticated = [];
            manuallyAuthenticate(token) {
                this.authenticated.push(token);
            }
        }
        class NotificationsStub extends Service {
            errors = [];
            infos = [];
            successes = [];
            serverErrors = [];
            error(message) {
                this.errors.push(message);
            }
            info(message) {
                this.infos.push(message);
            }
            success(message) {
                this.successes.push(message);
            }
            serverError(error) {
                this.serverErrors.push(error);
            }
        }
        class CrudStub extends Service {
            exported = [];
            export(type, options) {
                this.exported.push({ type, options });
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:session', SessionStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:crud', CrudStub);

        this.build = () => {
            const controller = this.owner.lookup('controller:console/admin/organizations/index');
            this.transitions = [];
            Object.defineProperty(controller.router, 'transitionTo', {
                configurable: true,
                value: (...args) => {
                    this.transitions.push(args);
                    return Promise.resolve();
                },
            });
            this.reloads = 0;
            window.location.reload = () => this.reloads++;
            return controller;
        };
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('search stores the term and returns to the first page', function (assert) {
        const controller = this.build();
        controller.page = 5;

        controller.search({ target: { value: 'fleetbase' } });
        assert.strictEqual(controller.query, 'fleetbase');
        assert.strictEqual(controller.page, 1);

        controller.search({ target: {} });
        assert.strictEqual(controller.query, '', 'a cleared box searches for nothing');
    });

    test('the row actions navigate to the organization and its activity', function (assert) {
        const controller = this.build();

        controller.goToCompany({ public_id: 'company_1' });
        controller.openActivity({ public_id: 'company_1' });

        assert.deepEqual(this.transitions, [
            ['console.admin.organizations.details', 'company_1'],
            ['console.admin.organizations.details.activity', 'company_1'],
        ]);
    });

    test('resolveBelongsTo unwraps a loaded owner and withholds an unloaded one', function (assert) {
        const controller = this.build();
        const record = { id: 'user_1' };

        assert.strictEqual(controller.resolveBelongsTo(null), null);
        assert.strictEqual(controller.resolveBelongsTo({ content: record }), record, 'a resolved proxy yields its content');
        assert.strictEqual(controller.resolveBelongsTo(record), record, 'a plain record is used as-is');
        assert.strictEqual(controller.resolveBelongsTo({ isPending: true }), null);
        assert.strictEqual(controller.resolveBelongsTo({ isFulfilled: false }), null);
        assert.strictEqual(controller.resolveBelongsTo({ then: () => {} }), null);
    });

    test('impersonateOwner refuses when the organization has no owner', async function (assert) {
        const controller = this.build();

        await controller.impersonateOwner({ name: 'Ownerless Co' });

        assert.deepEqual(this.notifications().errors, ['This organization does not have an owner to impersonate.']);
        assert.deepEqual(this.posted, [], 'nothing is requested');
    });

    test('impersonateOwner switches into the owner session and reloads', async function (assert) {
        const controller = this.build();

        await controller.impersonateOwner({ owner: { content: { id: 'user_1', email: 'owner@fleetbase.io' } } });

        assert.deepEqual(this.posted, [{ path: 'auth/impersonate', payload: { user: 'user_1' } }]);
        assert.deepEqual(this.transitions, [['console']]);
        assert.deepEqual(this.owner.lookup('service:session').authenticated, ['impersonation-token']);
        assert.deepEqual(this.notifications().infos, ['Now impersonating owner@fleetbase.io...']);
        assert.strictEqual(this.reloads, 1, 'the window is reloaded into the new session');
    });

    test('impersonateOwner falls back to the owner uuid on the organization', async function (assert) {
        const controller = this.build();

        await controller.impersonateOwner({ owner_uuid: 'user_2' });

        assert.deepEqual(this.posted, [{ path: 'auth/impersonate', payload: { user: 'user_2' } }]);
        assert.deepEqual(this.notifications().infos, ['Now impersonating organization owner...'], 'with no email it says so generically');
    });

    test('a failed impersonation is reported and nothing reloads', async function (assert) {
        const failure = new Error('not permitted');
        this.postRejectsWith = failure;
        const controller = this.build();

        await controller.impersonateOwner({ owner_uuid: 'user_2' });

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.strictEqual(this.reloads, 0);
    });

    test('copyId writes to the clipboard and reports what was copied', function (assert) {
        const controller = this.build();
        const written = [];
        const original = navigator.clipboard;
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (value) => written.push(value) } });

        try {
            controller.copyId('company_1', 'Public ID');
            controller.copyId('uuid-1');
            controller.copyId(null);
        } finally {
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: original });
        }

        assert.deepEqual(written, ['company_1', 'uuid-1'], 'an empty value is not copied');
        assert.deepEqual(this.notifications().successes, ['Public ID copied to clipboard.', 'ID copied to clipboard.'], 'the label defaults to ID');
    });

    test('exportOrganization exports the selected rows, or all of them', function (assert) {
        const controller = this.build();
        const crud = this.owner.lookup('service:crud');

        controller.exportOrganization();
        assert.deepEqual(crud.exported.at(-1), { type: 'companies', options: { params: { selections: [] } } }, 'no table means no selection');

        controller.table = { selectedRows: [{ id: 'a' }, { id: 'b' }] };
        controller.exportOrganization();
        assert.deepEqual(crud.exported.at(-1), { type: 'companies', options: { params: { selections: ['a', 'b'] } } });
    });

    test('each saved view sets its own filter and clears the others', function (assert) {
        const controller = this.build();
        controller.page = 3;

        controller.applySavedView('needs_attention');
        assert.strictEqual(controller.needs_attention, 1);
        assert.strictEqual(controller.page, 1, 'paging restarts');

        controller.applySavedView('missing_owner');
        assert.strictEqual(controller.missing_owner, 1);
        assert.strictEqual(controller.needs_attention, null, 'the previous view is cleared');

        controller.applySavedView('incomplete_onboarding');
        assert.false(controller.onboarding_completed);

        controller.applySavedView('inactive_status');
        assert.strictEqual(controller.inactive_status, 1);
        assert.strictEqual(controller.onboarding_completed, null);

        controller.applySavedView('not-a-view');
        assert.strictEqual(controller.inactive_status, null, 'an unknown view just clears everything');
    });

    test('clearSavedView drops every filter and returns to the first page', function (assert) {
        const controller = this.build();
        controller.applySavedView('needs_attention');
        controller.page = 4;

        controller.clearSavedView();

        assert.strictEqual(controller.needs_attention, null);
        assert.strictEqual(controller.missing_owner, null);
        assert.strictEqual(controller.inactive_status, null);
        assert.strictEqual(controller.onboarding_completed, null);
        assert.strictEqual(controller.page, 1);
    });

    test('the toolbar offers the saved views and an export action', function (assert) {
        const controller = this.build();
        const [views, exportButton] = controller.actionButtons;

        assert.deepEqual(
            views.items.filter((item) => item.label).map((item) => item.label),
            ['Needs Attention', 'Missing Owner', 'Incomplete Onboarding', 'Inactive Status', 'Clear View']
        );
        assert.strictEqual(exportButton.onClick, controller.exportOrganization);
        assert.deepEqual(
            controller.bulkActions.map((action) => action.label),
            ['Export selected']
        );

        views.items[0].onClick();
        assert.strictEqual(controller.needs_attention, 1, 'the menu item applies its view');
    });

    test('the row dropdown copies the public id and uuid through copyId', function (assert) {
        const controller = this.build();
        const written = [];
        const original = navigator.clipboard;
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (value) => written.push(value) } });
        const actions = controller.columns.at(-1).actions;

        try {
            actions.find((action) => action.label === 'Copy Public ID').fn({ public_id: 'company_1', uuid: 'uuid-1' });
            actions.find((action) => action.label === 'Copy UUID').fn({ public_id: 'company_1', uuid: 'uuid-1' });
        } finally {
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: original });
        }

        assert.deepEqual(written, ['company_1', 'uuid-1']);
    });
});

module('Unit | Controller | console/admin/organizations/index | saved views', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:intl', IntlStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.controller = this.owner.lookup('controller:console/admin/organizations/index');
        this.viewItems = () => this.controller.actionButtons[0].items.filter((item) => !item.separator);
    });

    test('the table starts on its first page, twenty at a time, newest first', function (assert) {
        assert.strictEqual(this.controller.page, 1);
        assert.strictEqual(this.controller.limit, 20);
        assert.strictEqual(this.controller.sort, '-created_at');
        assert.deepEqual(this.controller.companies, [], 'nothing is listed before the model loads');
    });

    test('each saved view in the Views menu applies its own filter', function (assert) {
        const expected = [
            { label: 'Needs Attention', filter: 'needs_attention', value: 1 },
            { label: 'Missing Owner', filter: 'missing_owner', value: 1 },
            { label: 'Incomplete Onboarding', filter: 'onboarding_completed', value: false },
            { label: 'Inactive Status', filter: 'inactive_status', value: 1 },
        ];

        expected.forEach(({ label, filter, value }) => {
            this.controller.page = 4;
            const item = this.viewItems().find((entry) => entry.label === label);

            item.onClick();

            assert.strictEqual(this.controller[filter], value, `${label} sets ${filter}`);
            assert.strictEqual(this.controller.page, 1, `${label} returns to the first page`);
        });
    });

    test('applying one saved view clears the previous one', function (assert) {
        this.viewItems()
            .find((entry) => entry.label === 'Missing Owner')
            .onClick();
        this.viewItems()
            .find((entry) => entry.label === 'Inactive Status')
            .onClick();

        assert.strictEqual(this.controller.inactive_status, 1);
        assert.strictEqual(this.controller.missing_owner, null, 'the earlier filter is dropped rather than stacked');
    });

    test('Clear View drops every saved filter', function (assert) {
        this.viewItems()
            .find((entry) => entry.label === 'Needs Attention')
            .onClick();

        this.viewItems()
            .find((entry) => entry.label === 'Clear View')
            .onClick();

        assert.strictEqual(this.controller.needs_attention, null);
        assert.strictEqual(this.controller.missing_owner, null);
        assert.strictEqual(this.controller.inactive_status, null);
        assert.strictEqual(this.controller.onboarding_completed, null);
    });
});
