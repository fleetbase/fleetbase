import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import AdminTableCellOwnerComponent from '@fleetbase/console/components/admin/table/cell/owner';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

/**
 * The cell renders whatever `owner` resolves to. `resolveBelongsTo` exists to unwrap an
 * Ember Data belongsTo proxy without ever showing a half-loaded record, so each of its
 * shapes is asserted on the captured instance.
 */
module('Integration | Component | admin/table/cell/owner', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        const captured = captureComponent(this.owner, 'admin/table/cell/owner', AdminTableCellOwnerComponent);
        this.build = async () => {
            await render(hbs`<Admin::Table::Cell::Owner @row={{this.row}} />`);
            return captured.instance;
        };
    });

    test('a row with no owner resolves to null', async function (assert) {
        this.set('row', {});
        const component = await this.build();

        assert.strictEqual(component.owner, null);
    });

    test('a missing row resolves to null rather than throwing', async function (assert) {
        this.set('row', undefined);
        const component = await this.build();

        assert.strictEqual(component.owner, null);
    });

    test('a resolved belongsTo proxy is unwrapped to its content', async function (assert) {
        const record = { name: 'Fleetbase' };
        this.set('row', { owner: { content: record, isFulfilled: true } });
        const component = await this.build();

        assert.strictEqual(component.owner, record, 'the underlying record is shown');
    });

    test('a plain record is used as-is', async function (assert) {
        const record = { name: 'Fleetbase' };
        this.set('row', { owner: record });
        const component = await this.build();

        assert.strictEqual(component.owner, record);
    });

    test('an unresolved belongsTo proxy is withheld until it loads', async function (assert) {
        const component = await this.build();

        assert.strictEqual(component.resolveBelongsTo({ isPending: true }), null, 'a pending proxy shows nothing');
        assert.strictEqual(component.resolveBelongsTo({ isFulfilled: false }), null, 'an unfulfilled proxy shows nothing');
        assert.strictEqual(component.resolveBelongsTo({ then: () => {} }), null, 'a bare thenable shows nothing');
    });
});
