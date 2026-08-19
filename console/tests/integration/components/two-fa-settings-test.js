import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import TwoFaSettingsComponent from '@fleetbase/console/components/two-fa-settings';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

module('Integration | Component | two-fa-settings', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('methods', [
            { key: 'email', name: 'Email' },
            { key: 'sms', name: 'SMS', recommended: true },
        ]);
    });

    test('it renders the enable toggle and hides the details when 2FA is off', async function (assert) {
        this.set('settings', { enabled: false });

        await render(hbs`<TwoFaSettings @twoFaSettings={{this.settings}} @twoFaMethods={{this.methods}} />`);

        assert.dom(this.element).containsText('Enable Two-Factor Authentication');
        assert.dom(this.element).doesNotContainText('Choose an authentication method', 'method selection is hidden while disabled');
    });

    test('it shows the method selection when 2FA is enabled', async function (assert) {
        this.set('settings', { enabled: true, method: 'sms' });

        await render(hbs`<TwoFaSettings @twoFaSettings={{this.settings}} @twoFaMethods={{this.methods}} />`);

        assert.dom(this.element).containsText('Choose an authentication method');
    });

    test('the enforce option is only offered when requested', async function (assert) {
        this.set('settings', { enabled: true, enforced: true });

        await render(hbs`<TwoFaSettings @twoFaSettings={{this.settings}} @twoFaMethods={{this.methods}} />`);
        assert.dom(this.element).doesNotContainText('Require Users to Set-Up 2FA', 'hidden by default');

        await render(hbs`<TwoFaSettings @twoFaSettings={{this.settings}} @twoFaMethods={{this.methods}} @showEnforceOption={{true}} />`);
        assert.dom(this.element).containsText('Require Users to Set-Up 2FA');
    });

    test('method selection can be suppressed', async function (assert) {
        this.set('settings', { enabled: true, method: 'email' });

        await render(hbs`<TwoFaSettings @twoFaSettings={{this.settings}} @twoFaMethods={{this.methods}} @showMethodSelection={{false}} />`);

        assert.dom(this.element).doesNotContainText('Choose an authentication method');
    });
});

/**
 * The toggle and selection handlers are wired to third-party toggle components, so drive
 * them on the captured instance instead of through the DOM.
 */
module('Integration | Component | two-fa-settings | actions', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('methods', [
            { key: 'email', name: 'Email' },
            { key: 'sms', name: 'SMS', recommended: true },
        ]);
        this.set('settings', { enabled: false });
        this.calls = [];
        this.set('onTwoFaToggled', (...args) => this.calls.push(['toggled', ...args]));
        this.set('onTwoFaMethodSelected', (...args) => this.calls.push(['method', ...args]));
        this.set('onTwoFaEnforcedToggled', (...args) => this.calls.push(['enforced', ...args]));

        const captured = captureComponent(this.owner, 'two-fa-settings', TwoFaSettingsComponent);
        this.build = async () => {
            await render(hbs`
                <TwoFaSettings
                    @twoFaSettings={{this.settings}}
                    @twoFaMethods={{this.methods}}
                    @showEnforceOption={{true}}
                    @onTwoFaToggled={{this.onTwoFaToggled}}
                    @onTwoFaMethodSelected={{this.onTwoFaMethodSelected}}
                    @onTwoFaEnforcedToggled={{this.onTwoFaEnforcedToggled}}
                />
            `);
            return captured.instance;
        };
        this.buildBare = async () => {
            await render(hbs`<TwoFaSettings @twoFaSettings={{this.settings}} @twoFaMethods={{this.methods}} />`);
            return captured.instance;
        };
    });

    test('it adopts the stored method and flags when they are set', async function (assert) {
        this.set('settings', { enabled: true, enforced: true, method: 'sms' });

        const component = await this.build();

        assert.true(component.isTwoFaEnabled);
        assert.true(component.isTwoFaEnforced);
        assert.true(component.showEnforceOption);
        assert.true(component.showMethodSelection, 'method selection is on unless explicitly disabled');
        assert.strictEqual(component.selectedTwoFaMethod, 'sms');
    });

    test('an unrecognised stored method falls back to email', async function (assert) {
        this.set('settings', { enabled: true, method: 'carrier-pigeon' });

        const component = await this.build();

        assert.strictEqual(component.selectedTwoFaMethod, 'email');
    });

    test('a missing method list falls back to email', async function (assert) {
        this.set('methods', undefined);
        this.set('settings', { enabled: true, method: 'sms' });

        const component = await this.build();

        assert.strictEqual(component.selectedTwoFaMethod, 'email', 'with no methods to match against, the default is used');
    });

    test('enabling 2FA selects the recommended method and reports both changes', async function (assert) {
        const component = await this.build();

        component.onTwoFaToggled(true);

        assert.true(component.isTwoFaEnabled);
        assert.strictEqual(component.selectedTwoFaMethod, 'sms', 'the recommended method is pre-selected');
        assert.deepEqual(this.calls, [
            ['toggled', true],
            ['method', 'sms'],
        ]);
    });

    test('enabling 2FA with no recommended method keeps the current selection', async function (assert) {
        this.set('methods', [{ key: 'email', name: 'Email' }]);
        const component = await this.build();

        component.onTwoFaToggled(true);

        assert.strictEqual(component.selectedTwoFaMethod, 'email', 'nothing is recommended, so the existing choice stands');
    });

    test('disabling 2FA clears the selected method', async function (assert) {
        this.set('settings', { enabled: true, method: 'sms' });
        const component = await this.build();

        component.onTwoFaToggled(false);

        assert.false(component.isTwoFaEnabled);
        assert.strictEqual(component.selectedTwoFaMethod, null);
        assert.deepEqual(this.calls, [
            ['toggled', false],
            ['method', null],
        ]);
    });

    test('toggling works without any callbacks wired up', async function (assert) {
        const component = await this.buildBare();

        component.onTwoFaToggled(true);
        component.onTwoFaSelected('email');
        component.onTwoFaEnforcedToggled(true);
        component.onRequireUsersToSetUpToggled(false);

        assert.true(component.isTwoFaEnabled, 'state still updates with no listeners attached');
        assert.strictEqual(component.selectedTwoFaMethod, 'email');
        assert.false(component.isTwoFaEnforced);
    });

    test('selecting a method records it and reports the choice', async function (assert) {
        const component = await this.build();

        component.onTwoFaSelected('email');

        assert.strictEqual(component.selectedTwoFaMethod, 'email');
        assert.deepEqual(this.calls, [['method', 'email']]);
    });

    test('both enforcement toggles update the flag and report it', async function (assert) {
        const component = await this.build();

        component.onTwoFaEnforcedToggled(true);
        assert.true(component.isTwoFaEnforced);

        component.onRequireUsersToSetUpToggled(false);
        assert.false(component.isTwoFaEnforced);

        assert.deepEqual(this.calls, [
            ['enforced', true],
            ['enforced', false],
        ]);
    });
});

module('Integration | Component | two-fa-settings | no methods', function (hooks) {
    setupRenderingTest(hooks);

    test('enabling 2FA with no method list leaves the selection untouched', async function (assert) {
        this.set('settings', { enabled: false });
        const captured = captureComponent(this.owner, 'two-fa-settings', TwoFaSettingsComponent);

        await render(hbs`<TwoFaSettings @twoFaSettings={{this.settings}} />`);
        const component = captured.instance;

        assert.strictEqual(component.selectedTwoFaMethod, 'email', 'the constructor defaulted it');

        component.onTwoFaToggled(true);

        assert.true(component.isTwoFaEnabled);
        assert.strictEqual(component.selectedTwoFaMethod, 'email', 'with nothing to recommend, the default stands');
    });
});
