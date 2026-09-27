import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import ModalsAuthenticatorAppComponent from '@fleetbase/console/components/modals/authenticator-app';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

/**
 * The steps are driven by the modal's confirm handler, which the modals manager normally
 * calls, so call it on the captured instance with a stand-in for the manager.
 */
module('Integration | Component | modals/authenticator-app', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.responses = {
            'users/two-fa/authenticator/setup': { secret: 'JBSWY3DPEHPK3PXP', otpauth_url: 'otpauth://totp/x', qr_code: 'data:image/svg+xml;base64,PHN2Zy8+' },
            'users/two-fa/authenticator/confirm': {
                recovery_codes: ['aaaaa-bbbbb', 'ccccc-ddddd'],
                status: { enabled: true },
                settings: { enabled: true, method: 'authenticator_app' },
            },
            'users/two-fa/authenticator/disable': { status: { enabled: false }, settings: { enabled: false, method: 'email' } },
            'users/two-fa/recovery-codes': { recovery_codes: ['eeeee-fffff'], status: { enabled: true } },
        };
        this.rejectWith = null;
        const context = this;

        class FetchStub extends Service {
            post(path, payload) {
                context.posted.push({ path, payload });
                return context.rejectWith ? Promise.reject(context.rejectWith) : Promise.resolve(context.responses[path]);
            }
        }
        class NotificationsStub extends Service {
            successes = [];
            errors = [];
            success(message) {
                this.successes.push(message);
            }
            error(message) {
                this.errors.push(message);
            }
            serverError(error) {
                this.errors.push(error);
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        this.changes = [];
        this.closed = [];
        this.modal = {
            options: {},
            loading: [],
            setOption(key, value) {
                this.options[key] = value;
            },
            startLoading() {
                this.loading.push(true);
            },
            stopLoading() {
                this.loading.push(false);
            },
        };
        this.done = () => this.closed.push('done');

        this.open = async (mode) => {
            const captured = captureComponent(this.owner, 'modals/authenticator-app', ModalsAuthenticatorAppComponent);
            this.set('options', {
                mode,
                onChanged: (response) => this.changes.push(response),
                onClosed: (changed) => this.closed.push(changed),
            });
            await render(hbs`<Modals::AuthenticatorApp @modalIsOpened={{true}} @options={{this.options}} />`);
            return captured.instance;
        };
        this.next = async (component) => {
            await component.next.perform(this.modal, this.done);
            await settled();
        };
    });

    test('setup checks the password, shows the QR code, confirms the code and shows recovery codes', async function (assert) {
        const component = await this.open('setup');

        assert.strictEqual(this.options.title, 'Set up an authenticator app');
        assert.true(this.options.keepOpen, 'the modal stays open between steps');
        assert.dom('input[type="password"]').exists();

        component.password = 'secret';
        await this.next(component);

        assert.deepEqual(this.posted[0], { path: 'users/two-fa/authenticator/setup', payload: { password: 'secret' } });
        assert.dom('img').hasAttribute('src', this.responses['users/two-fa/authenticator/setup'].qr_code);
        assert.dom(this.element).containsText('JBSW Y3DP EHPK 3PXP');
        assert.strictEqual(this.modal.options.acceptButtonText, 'Verify code');

        component.code = '123456';
        await this.next(component);

        assert.deepEqual(this.posted[1], { path: 'users/two-fa/authenticator/confirm', payload: { code: '123456' } });
        assert.dom(this.element).containsText('aaaaa-bbbbb');
        assert.dom(this.element).containsText('ccccc-ddddd');
        assert.true(this.modal.options.hideDeclineButton, 'the codes must be acknowledged');
        assert.deepEqual(this.changes, [this.responses['users/two-fa/authenticator/confirm']]);
        assert.strictEqual(component.password, undefined, 'the password is not kept');

        await this.next(component);

        assert.deepEqual(this.closed, [true, 'done']);
        assert.deepEqual(this.modal.loading, [true, false, true, false, true, false]);
    });

    test('removing the app checks the password and closes', async function (assert) {
        const component = await this.open('disable');

        assert.strictEqual(this.options.acceptButtonScheme, 'danger');

        component.password = 'secret';
        await this.next(component);

        assert.deepEqual(this.posted, [{ path: 'users/two-fa/authenticator/disable', payload: { password: 'secret' } }]);
        assert.deepEqual(this.changes, [this.responses['users/two-fa/authenticator/disable']]);
        assert.deepEqual(this.closed, [true, 'done']);
    });

    test('new recovery codes are shown once the password is checked', async function (assert) {
        const component = await this.open('recovery-codes');

        component.password = 'secret';
        await this.next(component);

        assert.deepEqual(this.posted, [{ path: 'users/two-fa/recovery-codes', payload: { password: 'secret' } }]);
        assert.dom(this.element).containsText('eeeee-fffff');
    });

    test('a failed step stays on the same step and reports the error', async function (assert) {
        const component = await this.open('setup');
        this.rejectWith = new Error('The current password provided is invalid.');

        component.password = 'wrong';
        await this.next(component);

        assert.strictEqual(component.step, 'password');
        assert.deepEqual(this.owner.lookup('service:notifications').errors, [this.rejectWith]);
        assert.deepEqual(this.modal.loading, [true, false], 'the loading state is cleared');
    });

    test('closing without finishing reports that nothing changed', async function (assert) {
        await this.open('setup');

        this.options.decline(this.modal, this.done);

        assert.deepEqual(this.closed, [false, 'done']);
    });
});
