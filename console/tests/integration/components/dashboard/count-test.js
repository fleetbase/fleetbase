import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import DashboardCountComponent from '@fleetbase/console/components/dashboard/count';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';

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

/**
 * The value shown is derived from an options hash by a formatter chosen per `format`, so
 * assert each branch of that switch.
 */
module('Integration | Component | dashboard/count | formatting', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        const captured = captureComponent(this.owner, 'dashboard/count', DashboardCountComponent);
        this.build = async () => {
            await render(hbs`<Dashboard::Count @title={{this.title}} @options={{this.options}} @value={{this.value}} />`);
            return captured.instance;
        };
    });

    test('an explicit value wins over anything in the options', async function (assert) {
        this.set('title', 'Orders');
        this.set('value', 'explicit');
        this.set('options', { format: 'money', value: 1000 });

        const component = await this.build();

        assert.strictEqual(component.title, 'Orders');
        assert.strictEqual(component.value, 'explicit', 'the options are not consulted when a value is given');
    });

    test('an unformatted option value is passed through untouched', async function (assert) {
        this.set('options', { value: 42 });

        const component = await this.build();

        assert.strictEqual(component.value, 42);
    });

    test('money, meters, bytes, duration and date each get their own formatter', async function (assert) {
        this.set('options', { value: 'seed' });
        const component = await this.build();

        // Drive the switch directly: re-rendering once per format would rebuild the
        // component for no benefit.
        component.createRenderValueFromOptions({ format: 'meters', value: 1500 });
        assert.strictEqual(component.value, '2km', 'meters are rounded to kilometres');

        component.createRenderValueFromOptions({ format: 'bytes', value: 2048 });
        assert.strictEqual(component.value, '2 KB', 'bytes are scaled');

        component.createRenderValueFromOptions({ format: 'duration', value: 3600 });
        assert.notStrictEqual(component.value, 3600, `duration is formatted (got ${component.value})`);
        assert.ok(String(component.value).length > 0);

        component.createRenderValueFromOptions({ format: 'date', value: '2026-01-15T12:00:00Z', dateFormat: 'yyyy-MM-dd' });
        assert.strictEqual(component.value, '2026-01-15', 'the configured date format is applied');

        component.createRenderValueFromOptions({ format: 'unknown-format', value: 'passed through' });
        assert.strictEqual(component.value, 'passed through', 'an unrecognised format is left alone');
    });

    test('the configured currency is used for money values', async function (assert) {
        this.set('options', { value: 'seed' });
        const component = await this.build();

        component.createRenderValueFromOptions({ format: 'money', value: 1234, currency: 'USD' });
        const inDollars = component.value;

        component.createRenderValueFromOptions({ format: 'money', value: 1234, currency: 'EUR' });
        const inEuros = component.value;

        assert.notStrictEqual(inDollars, 1234, `money is formatted (got ${inDollars})`);
        assert.notStrictEqual(inDollars, inEuros, `the currency changes the output (${inDollars} vs ${inEuros})`);
    });

    test('a count with no options at all still builds', async function (assert) {
        this.set('options', undefined);
        this.set('value', undefined);

        const component = await this.build();

        assert.strictEqual(component.value, undefined, 'nothing to derive a value from');
    });
});
