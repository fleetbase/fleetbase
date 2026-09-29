import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';
import AdminApiConsumersComponent from '@fleetbase/console/components/admin/api-consumers';

/**
 * Lets the task's fetch (a native promise, which settled() does not track) resolve.
 */
function flush() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

const KEY = 'a'.repeat(40);
// Relative to now: a fixed timestamp reads "in 26 minutes" instead of "... ago" when the
// suite happens to run before it.
const LAST_SEEN = new Date(Date.now() - 5 * 60 * 1000);
// The component's format, built independently so assertions do not depend on the CI
// browser's locale.
const FORMAT = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZoneName: 'short' };
const ANON = 'b'.repeat(40);

function metrics(overrides = {}) {
    return {
        available: true,
        tracking: true,
        window: 15,
        granularity: 'minute',
        sort: 'hits',
        total_requests: 400,
        total_throttled: 40,
        consumer_count: 4,
        default_limit: 120,
        decay_minutes: 1,
        consumers: [
            {
                signature: KEY,
                type: 'api_key',
                label: 'Pharma integration',
                detail: 'flb_live_abc…',
                test_mode: true,
                company_uuid: 'company-uuid',
                company_id: 'company_abc',
                company_name: 'Acme Pharma',
                scope: 'v1',
                ip: '41.0.0.1',
                limit: 120,
                hits: 360,
                throttled: 40,
                share: 90,
                avg_per_minute: 24,
                peak_per_minute: 160,
                last_seen_at: LAST_SEEN.toISOString(),
            },
            { signature: ANON, type: 'ip', label: '197.0.0.3', scope: 'int', limit: null, hits: 30, throttled: 0, share: 7.5, avg_per_minute: 2, last_seen_at: 'not a date' },
            { signature: 'c'.repeat(40), type: 'webhook', company_id: 'company_def', scope: 'v1', hits: 10, throttled: 0, share: 2.5 },
            { signature: 'e'.repeat(40), limit: 60, hits: 0, throttled: 0, share: 0 },
        ],
        series: [
            { bucket: '2026-09-29T09:59:00+00:00', hits: 0, throttled: 0 },
            { bucket: '2026-09-29T10:00:00+00:00', hits: 400, throttled: 40 },
        ],
        ...overrides,
    };
}

module('Integration | Component | admin/api-consumers', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        const context = this;
        this.requests = [];
        this.transitions = [];
        this.response = metrics();
        this.fail = {};

        class FetchStub extends Service {
            get(path, query) {
                context.requests.push({ method: 'get', path, query });
                return context.fail.get ? Promise.reject(new Error('get failed')) : Promise.resolve(context.response);
            }
            post(path) {
                context.requests.push({ method: 'post', path });
                return context.fail.post ? Promise.reject(new Error('post failed')) : Promise.resolve({ status: 'OK' });
            }
        }
        class NotificationsStub extends Service {
            successes = [];
            errors = [];
            success(message) {
                this.successes.push(message);
            }
            serverError(error) {
                this.errors.push(error.message);
            }
        }

        // The table reads the locale; set it before render so the first read does not
        // update tracked state mid-render.
        this.owner.lookup('service:intl').setLocale('en-us');
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.notifications = () => this.owner.lookup('service:notifications');

        const captured = captureComponent(this.owner, 'admin/api-consumers', AdminApiConsumersComponent);
        this.build = async () => {
            await render(hbs`
                <div id="next-view-section-subheader-actions"></div>
                <Admin::ApiConsumers />
            `);
            await flush();
            const component = captured.instance;
            // Framework-provided services are patched on the instance, not re-registered:
            // they resolve before a test's beforeEach can win the race.
            Object.defineProperty(component, 'router', {
                configurable: true,
                value: { transitionTo: (...args) => context.transitions.push(args) },
            });
            Object.defineProperty(component, 'currentUser', { configurable: true, value: { timezone: 'UTC' } });
            return component;
        };
    });

    test('it shows compact stats, a labelled timeline and a consumer table', async function (assert) {
        const component = await this.build();

        assert.deepEqual(this.requests[0], { method: 'get', path: 'rate-limits/consumers', query: { window: 15, sort: 'hits', limit: 100 } });
        assert.dom('#next-view-section-subheader-actions [data-test-window="15"]').hasAttribute('aria-pressed', 'true', 'controls live in the header');
        assert.dom('[data-test-stat="requests"]').containsText('400');
        assert.dom('[data-test-stat="throttled"]').containsText('10%');
        assert.dom('[data-test-stat="peak"]').containsText('Peak / min');
        assert.dom('[data-test-stat="peak"]').containsText('400');
        assert.dom('[data-test-stat="consumers"]').containsText('4');
        assert.dom('[data-test-stat="limit"]').containsText('/ 1m per consumer');
        assert.dom('[data-test-timeline]').containsText('Requests over the last 15 minutes');
        assert.dom('[data-test-timeline] canvas').exists();
        assert.dom('[data-test-api-consumer-label]').exists({ count: 4 });
        assert.dom('[data-test-consumers-table]').containsText('Pharma integration');
        assert.dom('[data-test-consumers-table]').containsText('Acme Pharma');
        assert.dom('[data-test-api-consumer-detail]').containsText('flb_live_abc… · 41.0.0.1');
        assert.dom('[data-test-throttled-cell]').exists();
        assert.dom('[data-test-share-cell]').exists();
        assert.dom('[data-test-date-time-cell]').exists();
        assert.dom('[data-test-unavailable]').doesNotExist();
        assert.dom('[data-test-not-tracking]').doesNotExist();
        assert.strictEqual(component.windowDescription, 'last 15 minutes');
    });

    test('it maps consumers to display rows', async function (assert) {
        const component = await this.build();
        const [key, anon, webhook, bare] = component.consumers;

        assert.deepEqual([key.typeLabel, key.typeIcon, key.isUnlimited, key.isThrottled], ['API key', 'key', false, true]);
        assert.deepEqual(key.organization, { id: 'company-uuid', uuid: 'company-uuid', public_id: 'company_abc', name: 'Acme Pharma' });
        assert.deepEqual([key.scopeLabel, key.hitsLabel, key.avgLabel, key.peakLabel, key.throttledLabel, key.limitLabel], ['/v1', '360', '24', '160', '40', '120 / 1m']);
        assert.strictEqual(key.lastSeenLabel, new Intl.DateTimeFormat(undefined, { ...FORMAT, timeZone: 'UTC' }).format(LAST_SEEN), 'absolute date and time in the viewer zone');
        assert.ok(key.lastSeenRelative.endsWith('ago'));

        assert.deepEqual([anon.typeLabel, anon.isUnlimited, anon.organization, anon.limitLabel, anon.peakLabel], ['Anonymous', true, null, 'Unlimited', '—']);
        assert.deepEqual([anon.lastSeenLabel, anon.lastSeenRelative], [null, null], 'an unparseable timestamp shows nothing');

        assert.deepEqual([webhook.typeLabel, webhook.typeIcon, webhook.avgLabel], ['webhook', 'circle-question', '0']);
        assert.strictEqual(webhook.organization.name, 'company_def', 'an organization without a name falls back to its id');

        assert.deepEqual([bare.typeLabel, bare.label, bare.scopeLabel, bare.lastSeenLabel], ['Unknown', 'Unknown', '/', null]);

        component.data = { ...metrics(), decay_minutes: undefined };
        assert.strictEqual(component.consumers[0].limitLabel, '120 / 1m', 'the window defaults to one minute');
    });

    test('it charts requests with dated tooltips and axis context', async function (assert) {
        const component = await this.build();
        const [chart] = component.charts;
        const { title, label } = chart.options.plugins.tooltip.callbacks;

        assert.deepEqual(
            chart.datasets.map((dataset) => [dataset.label, dataset.data]),
            [
                ['Requests', [0, 400]],
                ['Throttled (429)', [0, 40]],
            ]
        );
        assert.strictEqual(chart.labels.length, 2);
        assert.strictEqual(chart.options.scales.y.title.text, 'Requests / minute');
        assert.ok(title([{ dataIndex: 1 }]).length > 0, 'the tooltip title is the bucket time');
        assert.strictEqual(title([]), '', 'no item, no title');
        assert.strictEqual(label({ dataset: { label: 'Requests' }, parsed: { y: 1200 } }), `Requests: ${new Intl.NumberFormat().format(1200)} / minute`);

        component.window = 1440;
        component.data = metrics({ granularity: 'hour', series: [{ bucket: 'bad', hits: 1, throttled: 0 }] });
        const [hourly] = component.charts;
        assert.strictEqual(hourly.options.scales.y.title.text, 'Requests / hour');
        assert.deepEqual(hourly.labels, ['0'], 'an unparseable bucket is labelled by position');
        assert.strictEqual(hourly.options.plugins.tooltip.callbacks.title([{ dataIndex: 0 }]), '');
        assert.strictEqual(component.stats.find((stat) => stat.key === 'peak').label, 'Peak / hour');

        component.window = 10080;
        component.data = metrics({ granularity: 'hour' });
        assert.strictEqual(component.charts[0].labels.length, 2, 'the week view labels include the day');

        component.data = metrics({ series: [] });
        assert.deepEqual(component.charts, []);
    });

    test('it reloads when the window or sort changes', async function (assert) {
        const component = await this.build();

        await click('[data-test-window="60"]');
        assert.deepEqual(this.requests.at(-1).query, { window: 60, sort: 'hits', limit: 100 });
        assert.strictEqual(component.windowDescription, 'last hour');

        await click('[data-test-sort="throttled"]');
        assert.deepEqual(this.requests.at(-1).query, { window: 60, sort: 'throttled', limit: 100 });

        await click('[data-test-sort="hits"]');
        await click('[data-test-refresh]');
        assert.strictEqual(this.requests.length, 5);
    });

    test('its row actions clear a window, open the organization and manage limits', async function (assert) {
        const component = await this.build();
        const actions = component.columns.at(-1).actions;
        const [key, anon] = component.consumers;

        await actions[0].fn(key);
        await component.resetConsumer.perform({ signature: 'd'.repeat(40) });
        actions[1].fn(key);
        actions[1].fn(anon);
        actions[2].fn(key);
        component.openOrganization(undefined);

        assert.deepEqual(
            this.requests.filter((request) => request.method === 'post').map((request) => request.path),
            [`rate-limits/consumers/${KEY}/reset`, `rate-limits/consumers/${'d'.repeat(40)}/reset`]
        );
        assert.deepEqual(this.notifications().successes, ['Rate limit window cleared for Pharma integration.', 'Rate limit window cleared for consumer.']);
        assert.deepEqual(this.transitions, [['console.admin.organizations.details', 'company_abc'], ['console.admin.rate-limits']], 'no organization, no transition');
    });

    test('it formats times in the viewer timezone and survives an unknown zone', async function (assert) {
        const component = await this.build();
        const date = new Date('2026-09-29T10:00:00Z');

        Object.defineProperty(component, 'currentUser', { configurable: true, value: { timezone: 'Asia/Singapore' } });
        let singapore = null;
        try {
            singapore = new Intl.DateTimeFormat(undefined, { ...FORMAT, timeZone: 'Asia/Singapore' }).format(date);
        } catch {
            // A browser without that zone's data takes the component's fallback path instead.
        }
        assert.strictEqual(component.formatDateTime(date), singapore ?? new Intl.DateTimeFormat(undefined, FORMAT).format(date), 'converted to the account timezone');
        if (singapore) {
            assert.notStrictEqual(singapore, new Intl.DateTimeFormat(undefined, { ...FORMAT, timeZone: 'UTC' }).format(date), 'and not left in UTC');
        }

        Object.defineProperty(component, 'currentUser', { configurable: true, value: { timezone: 'Not/AZone' } });
        assert.strictEqual(component.formatDateTime(date), new Intl.DateTimeFormat(undefined, FORMAT).format(date), 'falls back to the browser timezone');
    });

    test('it reports failures', async function (assert) {
        this.fail = { get: true, post: true };
        const component = await this.build();

        await component.resetConsumer.perform({ signature: KEY });

        assert.deepEqual(this.notifications().errors, ['get failed', 'post failed']);
        assert.strictEqual(component.data, null);
        assert.deepEqual(component.consumers, []);
        assert.deepEqual(component.charts, []);
        assert.strictEqual(component.throttledRate, 0);
        assert.strictEqual(component.peak, 0);
        assert.true(component.isMinuteGranularity, 'minute granularity until data says otherwise');
        assert.deepEqual(
            component.stats.map((stat) => stat.value),
            ['0', '0', '0', '0', '0']
        );
    });

    test('it explains when metrics are unavailable or not being tracked', async function (assert) {
        this.response = metrics({ available: false, tracking: false, consumers: [], series: [], total_requests: 0, total_throttled: undefined });
        const component = await this.build();

        assert.dom('[data-test-unavailable]').exists();
        assert.dom('[data-test-not-tracking]').exists();
        assert.dom('[data-test-empty]').containsText('No API requests in the last 15 minutes');
        assert.dom('[data-test-timeline]').doesNotExist();
        assert.strictEqual(component.throttledRate, 0);

        component.data = metrics({ total_throttled: undefined });
        assert.strictEqual(component.throttledRate, 0, 'a missing throttled count reads as zero');
    });
});
