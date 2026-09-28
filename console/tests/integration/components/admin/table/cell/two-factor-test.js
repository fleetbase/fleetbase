import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | admin/table/cell/two-factor', function (hooks) {
    setupRenderingTest(hooks);

    test('shows enabled state and the enrolled method', async function (assert) {
        for (const [method, label] of [
            ['authenticator_app', 'Authenticator app'],
            ['sms', 'SMS'],
            ['email', 'Email'],
            ['hardware_key', 'hardware_key'],
            [null, 'System default'],
        ]) {
            this.set('row', { two_factor_enabled: true, two_factor_method: method });
            await render(hbs`<Admin::Table::Cell::TwoFactor @row={{this.row}} />`);
            assert.dom('[data-test-two-factor-enabled]').includesText('Enabled');
            assert.dom('[data-test-two-factor-method]').hasText(label);
            assert.dom('[data-test-two-factor-disabled]').doesNotExist();
        }
    });

    test('disabled authentication does not advertise a stale method', async function (assert) {
        this.set('row', { two_factor_enabled: false, two_factor_method: 'sms' });
        await render(hbs`<Admin::Table::Cell::TwoFactor @row={{this.row}} />`);
        assert.dom('[data-test-two-factor-disabled]').hasText('Disabled');
        assert.dom('[data-test-two-factor-method]').doesNotExist();
    });

    test('missing security data is shown as unavailable rather than disabled', async function (assert) {
        await render(hbs`<Admin::Table::Cell::TwoFactor />`);
        assert.dom('[data-test-two-factor-unavailable]').hasText('Unavailable');
        assert.dom('[data-test-two-factor-disabled]').doesNotExist();
    });
});
