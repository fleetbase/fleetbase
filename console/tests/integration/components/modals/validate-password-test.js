import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import ModalsValidatePasswordComponent from '@fleetbase/console/components/modals/validate-password';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

module('Integration | Component | modals/validate-password', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        class FetchStub extends Service {
            post() {
                return Promise.resolve({ valid: true });
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

    test('it renders the password fields and the supplied body', async function (assert) {
        this.set('options', { body: 'Validate your current password.' });

        await render(hbs`<Modals::ValidatePassword @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.dom(this.element).containsText('Validate your current password.');
        assert.dom('input[type="password"]').exists({ count: 2 });
    });

    test('it rewrites the modal options on setup', async function (assert) {
        this.set('options', {});

        await render(hbs`<Modals::ValidatePassword @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.strictEqual(this.options.title, 'Validate Current Password');
        assert.strictEqual(this.options.acceptButtonText, 'Validate Password');
        assert.true(this.options.declineButtonHidden, 'the decline button is hidden');
        assert.strictEqual(typeof this.options.confirm, 'function', 'a confirm handler is installed');
    });
});

/**
 * The validation task is invoked by the modal's confirm handler, which the modals manager
 * normally supplies, so drive it on the captured instance.
 */
module('Integration | Component | modals/validate-password | task', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.posted = [];
        this.postRejectsWith = null;
        const context = this;

        class FetchStub extends Service {
            async post(path, payload) {
                context.posted.push({ path, payload });

                if (context.postRejectsWith) {
                    throw context.postRejectsWith;
                }

                return { valid: true };
            }
        }
        class NotificationsStub extends Service {
            serverErrors = [];
            success() {}
            error() {}
            serverError(error, message) {
                this.serverErrors.push([error, message]);
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);

        const captured = captureComponent(this.owner, 'modals/validate-password', ModalsValidatePasswordComponent);
        this.build = async () => {
            await render(hbs`<Modals::ValidatePassword @modalIsOpened={{true}} @options={{this.options}} />`);
            return captured.instance;
        };
    });

    test('a valid password posts both fields and reports success', async function (assert) {
        const validated = [];
        this.set('options', { onValidated: (result) => validated.push(result) });
        const component = await this.build();

        component.password = 'current-secret';
        component.confirmPassword = 'current-secret';

        const result = await component.validatePassword.perform();

        assert.deepEqual(this.posted, [{ path: 'users/validate-password', payload: { password: 'current-secret', password_confirmation: 'current-secret' } }]);
        assert.true(result);
        assert.deepEqual(validated, [true], 'the caller is told the password checked out');
    });

    test('a rejected password is reported and returns false', async function (assert) {
        const validated = [];
        this.set('options', { onValidated: (result) => validated.push(result) });
        const failure = new Error('wrong password');
        this.postRejectsWith = failure;
        const component = await this.build();

        const result = await component.validatePassword.perform();

        assert.false(result);
        assert.deepEqual(this.owner.lookup('service:notifications').serverErrors, [[failure, 'Invalid current password.']]);
        assert.deepEqual(validated, [false]);
    });

    test('it validates happily when no onValidated callback was supplied', async function (assert) {
        this.set('options', {});
        const component = await this.build();

        const result = await component.validatePassword.perform();

        assert.true(result, 'the result is still returned to the caller');
    });

    test('the installed confirm handler puts the modal into its loading state', async function (assert) {
        this.set('options', {});
        const component = await this.build();
        const calls = [];

        const result = await this.options.confirm({ startLoading: () => calls.push('startLoading') });

        assert.deepEqual(calls, ['startLoading'], 'the modal is told to show its spinner');
        assert.true(result, 'and the validation result is handed back to the modal');
        assert.strictEqual(this.posted.at(-1).path, 'users/validate-password');
        assert.strictEqual(component.options, this.options, 'the component works against the options object it was given');
    });
});
