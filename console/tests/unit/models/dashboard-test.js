import { module, test } from 'qunit';
import { setupTest } from '@fleetbase/console/tests/helpers';
import { setOwner } from '@ember/application';
import DashboardModel from '@fleetbase/console/models/dashboard';

module('Unit | Model | dashboard', function (hooks) {
    setupTest(hooks);

    test('getRegistry delegates to the universe service for this dashboard id', function (assert) {
        // service:universe is a pre-resolved singleton and can't be swapped via owner.register,
        // so patch the method on the injected instance getRegistry actually calls.
        const universe = this.owner.lookup('service:universe');
        universe.getDashboardRegistry = (id) => ({ dashboardId: id });

        const store = this.owner.lookup('service:store');
        const dashboard = store.push({ data: { id: 'dash_1', type: 'dashboard' } });

        assert.deepEqual(dashboard.getRegistry(), { dashboardId: 'dash_1' });
    });
});

module('Unit | Model | dashboard | widgets', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
        this.store = this.owner.lookup('service:store');
        this.saved = [];
        const context = this;

        // addWidget creates the record itself, so intercept creation to control save()
        // rather than reaching for a network adapter.
        const createRecord = this.store.createRecord.bind(this.store);
        this.store.createRecord = (type, props) => {
            const record = createRecord(type, props);
            record.save = () => {
                context.saved.push(record);
                return context.saveRejectsWith ? Promise.reject(context.saveRejectsWith) : Promise.resolve(record);
            };
            return record;
        };

        this.unloaded = [];
        const unloadRecord = this.store.unloadRecord.bind(this.store);
        this.store.unloadRecord = (record) => {
            this.unloaded.push(record);
            return unloadRecord(record);
        };

        this.dashboard = () => this.store.push({ data: { id: 'dash_1', type: 'dashboard' } });
    });

    test('addWidget moves the registry slug into options and keeps the record id free', async function (assert) {
        const dashboard = this.dashboard();

        const widget = await dashboard.addWidget({
            id: 'fleet-ops-kpi-earnings-widget',
            default: true,
            name: 'Earnings',
            component: 'kpi-tile',
            options: { span: 2 },
        });

        assert.strictEqual(widget.name, 'Earnings');
        assert.strictEqual(widget.component, 'kpi-tile');
        assert.strictEqual(widget.options.widget_key, 'fleet-ops-kpi-earnings-widget', 'the slug is stashed so it can be resolved on reload');
        assert.strictEqual(widget.options.span, 2, 'the rest of the options survive');
        assert.notStrictEqual(widget.id, 'fleet-ops-kpi-earnings-widget', 'the slug is kept out of the record id');
        assert.strictEqual(dashboard.widgets.length, 1, 'the widget joins the dashboard');
        assert.strictEqual(this.saved.length, 1, 'and was persisted');
    });

    test('addWidget copes with a widget that carries no options', async function (assert) {
        const widget = await this.dashboard().addWidget({ id: 'slug-only', name: 'Bare' });

        assert.deepEqual(widget.options, { widget_key: 'slug-only' });
    });

    test('a widget that fails to save is unloaded and the failure surfaces', async function (assert) {
        const failure = new Error('save rejected');
        this.saveRejectsWith = failure;
        const dashboard = this.dashboard();

        await assert.rejects(dashboard.addWidget({ id: 'slug', name: 'Doomed' }), /save rejected/);

        assert.strictEqual(this.unloaded.length, 1, 'the half-created record is unloaded');
        assert.strictEqual(dashboard.widgets.length, 0, 'and never joins the dashboard');
    });

    test('removeWidget destroys the record and detaches it from the dashboard', async function (assert) {
        // Attach a persisted widget directly: removeWidget looks its argument up with
        // peekRecord, so the record needs the server id a real save would have assigned.
        const dashboard = this.dashboard();
        const widget = this.store.push({ data: { id: 'w_1', type: 'dashboard-widget' } });
        dashboard.widgets.pushObject(widget);
        widget.destroyRecord = () => Promise.resolve();

        await dashboard.removeWidget('w_1');

        assert.strictEqual(dashboard.widgets.length, 0);
    });

    test('a widget that fails to destroy leaves the dashboard untouched', async function (assert) {
        const dashboard = this.dashboard();
        const widget = this.store.push({ data: { id: 'w_1', type: 'dashboard-widget' } });
        dashboard.widgets.pushObject(widget);
        widget.destroyRecord = () => Promise.reject(new Error('destroy rejected'));

        await assert.rejects(dashboard.removeWidget('w_1'), /destroy rejected/);

        assert.strictEqual(dashboard.widgets.length, 1, 'the widget stays put');
    });

    test('removeWidget is a no-op for a widget the store does not know', async function (assert) {
        const dashboard = this.dashboard();

        assert.strictEqual(await dashboard.removeWidget('not-in-the-store'), undefined);
    });

    test('the timestamp getters format both dates in each style', function (assert) {
        const dashboard = this.store.createRecord('dashboard', {
            created_at: new Date('2026-01-15T10:30:00Z'),
            updated_at: new Date('2026-02-20T08:05:00Z'),
        });

        assert.ok(/^2026-01-15 /.test(dashboard.createdAt), `createdAt is date and time (got ${dashboard.createdAt})`);
        assert.ok(/^2026-02-20 /.test(dashboard.updatedAt), `updatedAt is date and time (got ${dashboard.updatedAt})`);
        assert.strictEqual(dashboard.createdAtShort, 'Jan 15, 2026');
        assert.strictEqual(dashboard.updatedAtShort, 'Feb 20, 2026');
        assert.ok(dashboard.createdAgo.length > 0, 'createdAgo is a relative description');
        assert.ok(dashboard.updatedAgo.length > 0, 'updatedAgo is a relative description');
    });
});

module('Unit | Model | dashboard | registry', function () {
    test('a dashboard whose container has no universe service has no registry', function (assert) {
        // getRegistry() looks the universe up through the owner. An owner that cannot
        // provide it — as in a teardown or a stripped-down container — must yield nothing
        // rather than throwing while a dashboard renders.
        const stand = { id: 'dash_1' };
        setOwner(stand, { lookup: () => undefined });

        assert.strictEqual(DashboardModel.prototype.getRegistry.call(stand), undefined);
    });

    test('the registry is looked up by the dashboard id', function (assert) {
        const stand = { id: 'dash_2' };
        const requested = [];
        setOwner(stand, {
            lookup: () => ({
                getDashboardRegistry: (id) => {
                    requested.push(id);
                    return { widgets: ['a'] };
                },
            }),
        });

        assert.deepEqual(DashboardModel.prototype.getRegistry.call(stand), { widgets: ['a'] });
        assert.deepEqual(requested, ['dash_2']);
    });
});
