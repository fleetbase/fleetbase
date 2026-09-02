import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import ConfigurePlatformApiTokenComponent from '@fleetbase/console/components/configure/platform-api-token';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

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
    confirm(options) {
        this.lastOptions = options;
        return Promise.resolve();
    }
}

function fakeModal() {
    return {
        loading: false,
        finished: false,
        startLoading() {
            this.loading = true;
        },
        stopLoading() {
            this.loading = false;
        },
        done() {
            this.finished = true;
        },
    };
}

module('Integration | Component | configure/platform-api-token', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        const self = this;
        this.calls = [];
        this.status = { configured: true, rotated_at: '2026-05-06T14:30:00Z', last_used_at: '2026-05-07T09:00:00Z' };
        this.postResponse = () => Promise.resolve({ configured: true, rotated_at: '2026-06-01T00:00:00Z', last_used_at: null, token: 'flb_live_secret' });
        this.deleteResponse = () => Promise.resolve({ configured: false });

        class FetchStub extends Service {
            get(path) {
                self.calls.push({ method: 'get', path });
                return Promise.resolve(self.status);
            }
            post(path) {
                self.calls.push({ method: 'post', path });
                return self.postResponse();
            }
            delete(path) {
                self.calls.push({ method: 'delete', path });
                return self.deleteResponse();
            }
        }

        // Use the real intl service with a locale resolved up front — replacing it with a
        // stub breaks ember-intl's {{t}} helper, which needs more than a t() method.
        this.owner.lookup('service:intl').setLocale('en-us');
        this.owner.register('service:notifications', NotificationsStub);
        this.owner.register('service:modals-manager', ModalsManagerStub);
        this.owner.register('service:fetch', FetchStub);

        this.notifications = this.owner.lookup('service:notifications');
        this.modals = this.owner.lookup('service:modals-manager');
        this.renderComponent = () => render(hbs`<Configure::PlatformApiToken />`);
    });

    test('it loads the token status on render', async function (assert) {
        await this.renderComponent();

        assert.deepEqual(this.calls.at(-1), { method: 'get', path: 'settings/platform-api-token' });
        assert.dom('.next-content-panel, div').exists('the panel renders');
    });

    test('an unconfigured token is reported as such', async function (assert) {
        this.status = { configured: false };

        await this.renderComponent();

        assert.dom('button').exists('an unconfigured token offers a generate button');
    });

    test('a failed status load is surfaced', async function (assert) {
        this.owner.unregister('service:fetch');
        class FailingFetch extends Service {
            get() {
                return Promise.reject(new Error('nope'));
            }
        }
        this.owner.register('service:fetch', FailingFetch);

        await this.renderComponent();

        assert.strictEqual(this.notifications.errors.length, 1);
    });

    test('the rotated and last-used timestamps are formatted', async function (assert) {
        await this.renderComponent();

        assert.dom(this.element).doesNotContainText('2026-05-06T14:30:00Z', 'the raw ISO string is not shown');
        assert.dom(this.element).containsText('2026', 'a formatted date is shown');
    });

    test('generating a token posts and reveals it', async function (assert) {
        this.status = { configured: false };
        await this.renderComponent();

        await click('[data-test-generate-token], button');

        assert.ok(
            this.calls.some((c) => c.method === 'post'),
            'the token is requested'
        );
        assert.strictEqual(this.notifications.successes.length, 1, 'success is reported');
        assert.dom('input[readonly]').exists('the new token is displayed for copying');
    });

    test('a failed generation is reported', async function (assert) {
        this.status = { configured: false };
        this.postResponse = () => Promise.reject(new Error('denied'));

        await this.renderComponent();
        await click('button');

        assert.strictEqual(this.notifications.errors.length, 1);
    });

    test('rotating asks for confirmation, then rotates', async function (assert) {
        await this.renderComponent();

        // the first button on a configured token is Rotate
        await click('button');
        assert.strictEqual(this.modals.lastOptions.acceptButtonScheme, 'warning', 'rotation warns');

        const modal = fakeModal();
        await this.modals.lastOptions.confirm(modal);

        assert.ok(
            this.calls.some((c) => c.method === 'post'),
            'the rotation is posted'
        );
        assert.strictEqual(this.notifications.successes.length, 1, 'success is reported');
        assert.true(modal.finished, 'the modal closes');
    });

    test('a failed rotation stops the modal loading and reports', async function (assert) {
        this.postResponse = () => Promise.reject(new Error('denied'));
        await this.renderComponent();
        await click('button');

        const modal = fakeModal();
        await this.modals.lastOptions.confirm(modal);

        assert.strictEqual(this.notifications.errors.length, 1);
        assert.false(modal.loading);
        assert.false(modal.finished, 'the modal stays open');
    });

    test('revoking asks for confirmation, then clears the token', async function (assert) {
        await this.renderComponent();

        const buttons = this.element.querySelectorAll('button');
        await click(buttons[buttons.length - 1]);
        assert.strictEqual(this.modals.lastOptions.acceptButtonScheme, 'danger', 'revocation is destructive');

        const modal = fakeModal();
        await this.modals.lastOptions.confirm(modal);

        assert.ok(
            this.calls.some((c) => c.method === 'delete'),
            'the token is revoked'
        );
        assert.strictEqual(this.notifications.successes.length, 1, 'success is reported');
        assert.true(modal.finished);
    });

    test('a failed revocation stops the modal loading and reports', async function (assert) {
        this.deleteResponse = () => Promise.reject(new Error('denied'));
        await this.renderComponent();

        const buttons = this.element.querySelectorAll('button');
        await click(buttons[buttons.length - 1]);

        const modal = fakeModal();
        await this.modals.lastOptions.confirm(modal);

        assert.strictEqual(this.notifications.errors.length, 1);
        assert.false(modal.loading);
    });

    test('copying the token writes it to the clipboard', async function (assert) {
        this.status = { configured: false };
        await this.renderComponent();
        await click('button');

        const written = [];
        const originalClipboard = navigator.clipboard;
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (v) => written.push(v) } });

        try {
            // once a token exists the copy button is rendered alongside it
            const copyButton = [...this.element.querySelectorAll('button')].find((b) => /copy/i.test(b.textContent));
            const successesBeforeCopy = this.notifications.successes.length;

            await click(copyButton);

            assert.deepEqual(written, ['flb_live_secret']);
            assert.strictEqual(this.notifications.successes.length, successesBeforeCopy + 1, 'copying confirms separately from generating');
        } finally {
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: originalClipboard });
        }
    });
});

module('Integration | Component | configure/platform-api-token | edge cases', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.lookup('service:intl').setLocale('en-us');
        this.posted = [];
        const context = this;

        class FetchStub extends Service {
            async get() {
                return { configured: false };
            }
            async post(path) {
                context.posted.push(path);
                return { configured: true, token: 'pat_generated', rotated_at: '2026-01-01T00:00:00Z', last_used_at: null };
            }
        }
        class NotificationsStub extends Service {
            successes = [];
            success(message) {
                this.successes.push(message);
            }
            serverError() {}
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const captured = captureComponent(this.owner, 'configure/platform-api-token', ConfigurePlatformApiTokenComponent);
        this.build = async () => {
            await render(hbs`<Configure::PlatformApiToken />`);
            return captured.instance;
        };
    });

    test('there is nothing to copy before a token has been generated', async function (assert) {
        const component = await this.build();
        const written = [];
        const original = navigator.clipboard;
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (text) => written.push(text) } });

        try {
            component.copyToken();

            assert.deepEqual(written, [], 'the clipboard is left alone');
            assert.deepEqual(this.owner.lookup('service:notifications').successes, [], 'and nothing is reported as copied');
        } finally {
            Object.defineProperty(navigator, 'clipboard', { configurable: true, value: original });
        }
    });

    test('generating a token for the first time is not treated as a rotation', async function (assert) {
        const component = await this.build();

        await component.rotateToken.perform();

        assert.deepEqual(this.posted, ['settings/platform-api-token']);
        assert.strictEqual(component.token, 'pat_generated', 'the new token is held for the user to copy');
        assert.true(component.status.configured);
    });
});
