import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import ConfigureMailComponent from '@fleetbase/console/components/configure/mail';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

module('Integration | Component | configure/mail', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        const posted = this.posted;

        class FetchStub extends Service {
            get() {
                return Promise.resolve({ mailer: 'smtp', from: { address: 'no-reply@fleetbase.io' } });
            }
            post(path, payload) {
                posted.push({ path, payload });
                return Promise.resolve({ status: 'ok' });
            }
        }
        class NotificationsStub extends Service {
            success() {}
            error() {}
            serverError() {}
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
    });

    test('it renders the mail panel and wormholes its save button to the subheader', async function (assert) {
        await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::Mail />
        `);

        assert.dom('.next-content-panel').exists('the panel renders');
        assert.dom(this.element).containsText('Mail');
        assert.dom('#next-view-section-subheader-actions').containsText('Save Changes', 'the save button is wormholed into the subheader');
    });

    test('it saves the mail configuration when the wormholed button is clicked', async function (assert) {
        await render(hbs`
            <div id="next-view-section-subheader-actions"></div>
            <Configure::Mail />
        `);

        await click('#next-view-section-subheader-actions button');

        assert.strictEqual(this.posted.at(-1).path, 'settings/mail-config');
    });
});

/**
 * The panel's tasks and setters are not all reachable from the rendered UI — there is no
 * control for the encryption toggle or the test-send in this test's markup, and the error
 * paths need a failing endpoint — so this module drives the captured instance.
 */
module('Integration | Component | configure/mail | actions', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.getResponse = { mailer: 'smtp', smtpHost: 'smtp.acme.test' };
        this.getRejectsWith = null;
        this.postRejectsWith = null;
        this.postResponse = { status: 'ok' };
        const context = this;

        class FetchStub extends Service {
            async get() {
                if (context.getRejectsWith) {
                    throw context.getRejectsWith;
                }

                return context.getResponse;
            }
            async post(path, payload) {
                context.posted.push({ path, payload });

                if (context.postRejectsWith) {
                    throw context.postRejectsWith;
                }

                return context.postResponse;
            }
        }
        class RecordingNotificationsStub extends Service {
            successes = [];
            serverErrors = [];
            success(message) {
                this.successes.push(message);
            }
            serverError(error) {
                this.serverErrors.push(error);
            }
        }

        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', RecordingNotificationsStub);

        const captured = captureComponent(this.owner, 'configure/mail', ConfigureMailComponent);
        this.build = async () => {
            await render(hbs`
                <div id="next-view-section-subheader-actions"></div>
                <Configure::Mail />
            `);

            return captured.instance;
        };
        this.notifications = () => this.owner.lookup('service:notifications');
    });

    test('enabling SMTP encryption selects TLS and disabling it clears the setting', async function (assert) {
        const component = await this.build();

        component.enableSmtpEncryption(true);
        assert.strictEqual(component.smtpEncryption, 'tls');

        component.enableSmtpEncryption(false);
        assert.strictEqual(component.smtpEncryption, null, 'the field is cleared rather than set to a falsy string');
    });

    test('choosing a mailer switches which section is configured', async function (assert) {
        const component = await this.build();

        component.setMailer('mailgun');

        assert.strictEqual(component.mailer, 'mailgun');
    });

    test('a test send posts every provider section and keeps the response', async function (assert) {
        this.postResponse = { status: 'sent', message: 'Test email delivered.' };
        const component = await this.build();
        component.setMailer('postmark');
        component.postmarkToken = 'pm-token';
        component.fromAddress = 'no-reply@acme.test';

        await component.test.perform();

        const { path, payload } = this.posted.at(-1);
        assert.strictEqual(path, 'settings/test-mail-config');
        assert.strictEqual(payload.mailer, 'postmark');
        assert.deepEqual(payload.from, { address: 'no-reply@acme.test', name: null });
        assert.strictEqual(payload.postmark.token, 'pm-token', 'the selected provider is serialized');
        assert.strictEqual(payload.smtp.host, 'smtp.acme.test', 'and so are the ones that are not selected');
        assert.deepEqual(component.testResponse, this.postResponse, 'the result is held for the panel to render');
    });

    test('a failed test send is reported and leaves no response behind', async function (assert) {
        const failure = new Error('smtp unreachable');
        this.postRejectsWith = failure;
        const component = await this.build();

        await component.test.perform();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.strictEqual(component.testResponse, undefined, 'nothing is shown as a result');
    });

    test('a failed save is reported instead of thrown', async function (assert) {
        const failure = new Error('mail config rejected');
        const component = await this.build();
        this.postRejectsWith = failure;

        await component.save.perform();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.deepEqual(this.notifications().successes, [], 'nothing is claimed to have been saved');
    });

    test('a failed config load is reported and leaves the defaults in place', async function (assert) {
        const failure = new Error('mail config unavailable');
        this.getRejectsWith = failure;

        const component = await this.build();

        assert.deepEqual(this.notifications().serverErrors, [failure]);
        assert.strictEqual(component.smtpHost, 'smtp.mailgun.org', 'the shipped default survives');
    });
});
