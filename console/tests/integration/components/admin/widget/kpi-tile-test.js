import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

module('Integration | Component | admin/widget/kpi-tile', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        const self = this;
        this.requested = [];
        this.getResponse = () => Promise.resolve({ value: 1234, delta_pct: 12, status: 'neutral' });

        class FetchStub extends Service {
            get(path) {
                self.requested.push(path);
                return self.getResponse();
            }
        }
        this.owner.register('service:fetch', FetchStub);

        // Every getter on this component is surfaced by the template — as text or as a
        // class on a known element — so rendering exercises them all.
        this.renderTile = (options = {}) => {
            this.set('options', options);
            return render(hbs`<Admin::Widget::KpiTile @options={{this.options}} />`);
        };
        this.tile = () => this.element.querySelector('.admin-kpi-tile');
    });

    test('it loads the metric for the configured slug and shows the value', async function (assert) {
        await this.renderTile({ slug: 'orders-today' });

        assert.deepEqual(this.requested, ['metrics/admin/kpis/orders-today']);
        assert.dom('.admin-kpi-tile').containsText((1234).toLocaleString(), 'the value is localized');
    });

    test('it refuses to fetch without a slug and shows the error', async function (assert) {
        await this.renderTile({});

        assert.deepEqual(this.requested, [], 'nothing is requested');
        assert.dom('.admin-kpi-tile').containsText('Missing metric slug.');
    });

    test('a failed load shows the error message', async function (assert) {
        this.getResponse = () => Promise.reject(new Error('upstream down'));

        await this.renderTile({ slug: 'orders-today' });

        assert.dom('.admin-kpi-tile').containsText('upstream down');
    });

    test('a failed load without a message falls back to a generic error', async function (assert) {
        this.getResponse = () => Promise.reject({});

        await this.renderTile({ slug: 'orders-today' });

        assert.dom('.admin-kpi-tile').containsText('Unable to load metric.');
    });

    test('title and footnote prefer options, then data, then a default', async function (assert) {
        await this.renderTile({ slug: 's', title: 'Orders', footnote: 'this week' });
        assert.dom('.admin-kpi-tile').containsText('Orders');
        assert.dom('.admin-kpi-tile').containsText('this week');

        this.getResponse = () => Promise.resolve({ title: 'From Data', footnote: 'from data' });
        await this.renderTile({ slug: 's' });
        assert.dom('.admin-kpi-tile').containsText('From Data');
        assert.dom('.admin-kpi-tile').containsText('from data');

        this.getResponse = () => Promise.resolve({});
        await this.renderTile({ slug: 's' });
        assert.dom('.admin-kpi-tile').containsText('Metric', 'the title falls back');
        assert.dom('.admin-kpi-tile').containsText('vs previous 30d', 'the footnote falls back');
    });

    test('a missing value renders as zero', async function (assert) {
        this.getResponse = () => Promise.resolve({ value: null });
        await this.renderTile({ slug: 's' });
        assert.dom('.admin-kpi-tile').containsText('0');

        this.getResponse = () => Promise.resolve({});
        await this.renderTile({ slug: 's' });
        assert.dom('.admin-kpi-tile').containsText('0');
    });

    test('the delta reads as a signed percentage and colours by direction', async function (assert) {
        this.getResponse = () => Promise.resolve({ value: 1, delta_pct: 12 });
        await this.renderTile({ slug: 's' });
        assert.dom('.admin-kpi-tile').containsText('+12%', 'rises are signed');
        assert.ok(this.tile().innerHTML.includes('emerald'), 'a rise is green');

        this.getResponse = () => Promise.resolve({ value: 1, delta_pct: -4 });
        await this.renderTile({ slug: 's' });
        assert.dom('.admin-kpi-tile').containsText('-4%');
        assert.ok(this.tile().innerHTML.includes('rose'), 'a fall is red');

        this.getResponse = () => Promise.resolve({ value: 1, delta_pct: 0 });
        await this.renderTile({ slug: 's' });
        assert.dom('.admin-kpi-tile').containsText('0%');

        this.getResponse = () => Promise.resolve({ value: 1 });
        await this.renderTile({ slug: 's' });
        assert.dom('.admin-kpi-tile').containsText('n/a', 'an absent delta reads n/a');
    });

    test('status drives the accent styling', async function (assert) {
        this.getResponse = () => Promise.resolve({ value: 1, status: 'danger' });
        await this.renderTile({ slug: 's' });
        assert.dom('.admin-kpi-tile').hasClass('border-rose-200');

        this.getResponse = () => Promise.resolve({ value: 1, status: 'warning' });
        await this.renderTile({ slug: 's' });
        assert.dom('.admin-kpi-tile').hasClass('border-amber-200');

        this.getResponse = () => Promise.resolve({ value: 1, status: 'success' });
        await this.renderTile({ slug: 's' });
        assert.dom('.admin-kpi-tile').hasClass('border-emerald-200');

        this.getResponse = () => Promise.resolve({ value: 1 });
        await this.renderTile({ slug: 's' });
        assert.dom('.admin-kpi-tile').hasClass('border-blue-100', 'no status is neutral');
    });

    test('the value text is coloured by status and by errors', async function (assert) {
        this.getResponse = () => Promise.resolve({ value: 1, status: 'success' });
        await this.renderTile({ slug: 's' });
        assert.ok(this.tile().innerHTML.includes('text-emerald-700'));

        this.getResponse = () => Promise.resolve({ value: 1, status: 'warning' });
        await this.renderTile({ slug: 's' });
        assert.ok(this.tile().innerHTML.includes('text-amber-700'));

        // an error styles the icon as a failure even with no status
        await this.renderTile({});
        assert.ok(this.tile().innerHTML.includes('rose'), 'errors render in red');
    });
});

module('Integration | Component | admin/widget/kpi-tile | unformattable values', function (hooks) {
    setupRenderingTest(hooks);

    test('a value that cannot format itself is shown as it came back', async function (assert) {
        // A payload value with no prototype has no toLocaleString; the tile must render
        // what it was given rather than "undefined".
        const raw = Object.create(null);
        raw.toString = () => 'RAW';

        class FetchStub extends Service {
            get() {
                return Promise.resolve({ value: raw, delta_pct: null, status: 'neutral' });
            }
        }
        this.owner.register('service:fetch', FetchStub);
        this.set('options', { slug: 'users-total', title: 'Users' });

        await render(hbs`<Admin::Widget::KpiTile @options={{this.options}} />`);

        assert.dom('.admin-kpi-tile').containsText('RAW', 'the raw value is passed straight through');
    });
});
