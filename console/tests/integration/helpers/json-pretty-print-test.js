import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | json-pretty-print', function (hooks) {
    setupRenderingTest(hooks);

    test('pretty-prints an object with two-space indentation', async function (assert) {
        this.set('value', { a: 1, b: [2, 3] });

        await render(hbs`{{json-pretty-print this.value}}`);

        assert.strictEqual(this.element.textContent.trim(), JSON.stringify({ a: 1, b: [2, 3] }, null, '  '));
    });

    test('stringifies primitive values', async function (assert) {
        this.set('value', '1234');

        await render(hbs`{{json-pretty-print this.value}}`);

        assert.strictEqual(this.element.textContent.trim(), '"1234"');
    });
});
