import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, fillIn, triggerEvent } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | admin/filter/date', function (hooks) {
    setupRenderingTest(hooks);

    test('passes inclusive calendar dates and clearing back to the filter picker', async function (assert) {
        this.filter = { param: 'created_at_after' };
        this.changed = [];
        this.onChange = (filter, value) => this.changed.push({ filter, value });
        await render(hbs`<Admin::Filter::Date @value="2026-09-01" @placeholder="Registered on or after" @filter={{this.filter}} @onChange={{this.onChange}} />`);
        assert.dom('input').hasAttribute('type', 'date');
        assert.dom('input').hasAttribute('aria-label', 'Registered on or after');
        assert.dom('input').hasValue('2026-09-01');
        await fillIn('input', '2026-09-28');
        await triggerEvent('input', 'change');
        assert.deepEqual(this.changed.at(-1), { filter: this.filter, value: '2026-09-28' });
        await fillIn('input', '');
        await triggerEvent('input', 'change');
        assert.strictEqual(this.changed.at(-1).value, '');
    });
});
