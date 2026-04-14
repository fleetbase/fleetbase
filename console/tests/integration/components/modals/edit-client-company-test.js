import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/edit-client-company', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the client name and client code inputs', async function (assert) {
        this.options = {
            title: 'Add Client',
            isEdit: false,
            client: { name: '', client_code: '' },
        };
        this.modalIsOpened = true;
        this.onConfirm = () => null;
        this.onDecline = () => null;

        await render(hbs`<Modals::EditClientCompany
            @modalIsOpened={{this.modalIsOpened}}
            @options={{this.options}}
            @onConfirm={{this.onConfirm}}
            @onDecline={{this.onDecline}}
        />`);

        assert.dom('[data-test-client-name-input]').exists('client name input is rendered');
        assert.dom('[data-test-client-code-input]').exists('client code input is rendered');
    });

    test('it does NOT expose tenancy-scoped fields in the form', async function (assert) {
        this.options = {
            title: 'Edit Client',
            isEdit: true,
            client: {
                uuid: 'x',
                name: 'Existing',
                client_code: 'EX',
                // These should never be shown regardless of whether they
                // appear in the options object; the template has no
                // inputs for them.
                parent_company_uuid: 'should-not-show',
                company_type: 'should-not-show',
                is_client: true,
                public_id: 'should-not-show',
                owner_uuid: 'should-not-show',
            },
        };
        this.modalIsOpened = true;
        this.onConfirm = () => null;
        this.onDecline = () => null;

        await render(hbs`<Modals::EditClientCompany
            @modalIsOpened={{this.modalIsOpened}}
            @options={{this.options}}
            @onConfirm={{this.onConfirm}}
            @onDecline={{this.onDecline}}
        />`);

        // Confirm none of the tenancy-scoped values leak into the DOM.
        assert.dom().doesNotIncludeText('should-not-show', 'no tenancy field values rendered');
        assert.dom().doesNotIncludeText('parent_company_uuid', 'no tenancy field labels rendered');
        assert.dom().doesNotIncludeText('company_type', 'no tenancy field labels rendered');
        assert.dom().doesNotIncludeText('is_client', 'no tenancy field labels rendered');
    });
});
