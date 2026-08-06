import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

function registerSession(owner, authenticated) {
    class SessionStub extends Service {
        data = { authenticated };
        manuallyAuthenticate() {}
    }
    owner.register('service:session', SessionStub);
}

module('Integration | Component | impersonator-tray', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders nothing when the session is not an impersonation', async function (assert) {
        registerSession(this.owner, {});

        await render(hbs`
            <div id="view-header-actions"></div>
            <ImpersonatorTray />
        `);

        assert.dom('.locale-selector-tray').doesNotExist('the tray stays hidden for a normal session');
    });

    test('it wormholes the tray into the header while impersonating', async function (assert) {
        registerSession(this.owner, { impersonator: 'admin@fleetbase.io' });

        // The component wormholes into an element that only exists in the app shell.
        await render(hbs`
            <div id="view-header-actions"></div>
            <ImpersonatorTray />
        `);

        assert.dom('#view-header-actions .locale-selector-tray').exists('the tray renders into the header');
    });
});
