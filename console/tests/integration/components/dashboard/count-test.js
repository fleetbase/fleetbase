import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | dashboard/count', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the title and an explicit value', async function (assert) {
        await render(hbs`<Dashboard::Count @title="Orders" @value="42" />`);

        assert.dom(this.element).containsText('Orders');
        assert.dom(this.element).containsText('42');
    });

    test('an explicit value wins over the options format', async function (assert) {
        await render(hbs`<Dashboard::Count @title="Revenue" @value="explicit" @options={{hash format="money" value=1000 currency="USD"}} />`);

        assert.dom(this.element).containsText('explicit', 'the provided value is not reformatted');
    });

    test('it formats a money value from options', async function (assert) {
        await render(hbs`<Dashboard::Count @title="Revenue" @options={{hash format="money" value=1000 currency="USD"}} />`);

        assert.dom(this.element).containsText('$', 'the money format is applied');
    });

    test('it formats a bytes value from options', async function (assert) {
        await render(hbs`<Dashboard::Count @title="Storage" @options={{hash format="bytes" value=1024}} />`);

        assert.dom(this.element).doesNotContainText('1024', 'the raw byte count is formatted');
    });

    test('an unrecognized format passes the value through unchanged', async function (assert) {
        await render(hbs`<Dashboard::Count @title="Drivers" @options={{hash value=7}} />`);

        assert.dom(this.element).containsText('7');
    });
});
