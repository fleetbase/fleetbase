import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/leave-organization', function (hooks) {
    setupRenderingTest(hooks);

    test('an owner with other members is asked to nominate a new owner', async function (assert) {
        this.set('options', {
            isOwner: true,
            hasOtherMembers: true,
            organization: { name: 'Acme', users: [] },
        });

        await render(hbs`<Modals::LeaveOrganization @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.dom(this.element).containsText('nominate a new owner');
        assert.dom(this.element).containsText('Acme');
    });

    test('a non-owner is not asked to transfer ownership', async function (assert) {
        this.set('options', {
            isOwner: false,
            hasOtherMembers: true,
            organization: { name: 'Acme', users: [] },
        });

        await render(hbs`<Modals::LeaveOrganization @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.dom(this.element).doesNotContainText('nominate a new owner');
    });
});
