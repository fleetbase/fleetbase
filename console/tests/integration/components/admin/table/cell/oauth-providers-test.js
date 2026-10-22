import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | admin/table/cell/oauth-providers', function (hooks) {
    setupRenderingTest(hooks);

    test('shows every linked provider', async function (assert) {
        this.set('row', { oauth_providers: ['google', 'github'] });
        await render(hbs`<Admin::Table::Cell::OauthProviders @row={{this.row}} />`);
        assert.dom('[data-test-oauth-provider]').exists({ count: 2 });
        assert.dom('[data-test-oauth-provider]').hasText('google');
        assert.dom('[data-test-oauth-none]').doesNotExist();
    });

    test('an empty provider list explicitly states none are linked', async function (assert) {
        this.set('row', { oauth_providers: [] });
        await render(hbs`<Admin::Table::Cell::OauthProviders @row={{this.row}} />`);
        assert.dom('[data-test-oauth-none]').hasText('None linked');
    });

    test('missing provider data is unavailable rather than a false empty list', async function (assert) {
        await render(hbs`<Admin::Table::Cell::OauthProviders />`);
        assert.dom('[data-test-oauth-unavailable]').hasText('Unavailable');
        assert.dom('[data-test-oauth-none]').doesNotExist();
    });
});
