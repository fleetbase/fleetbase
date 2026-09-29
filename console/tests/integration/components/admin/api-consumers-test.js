import { module, test } from 'qunit';
import { setupRenderingTest } from '@fleetbase/console/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { captureComponent } from '@fleetbase/console/tests/helpers/capture-component';
import AdminApiConsumersComponent from '@fleetbase/console/components/admin/api-consumers';

function metrics(overrides = {}) {
    return {
        available: true,
        tracking: true,
        window: 15,
        granularity: 'minute',
        sort: 'hits',
        total_requests: 400,
        total_throttled: 40,
        consumer_count: 3,
        default_limit: 120,
        decay_minutes: 1,
        consumers: [
            {
                signature: 'a'.repeat(40),
                type: 'api_key',
                label: 'Pharma integration',
                detail: 'flb_live_abc…',
                test_mode: false,
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
                last_seen_at: '2026-09-29T10:00:00+00:00',
            },
            { signature: 'b'.repeat(40), type: 'ip', label: '197.0.0.3', scope: 'int', limit: null, hits: 30, throttled: 0, share: 7.5, avg_per_minute: 2 },
            { signature: 'c'.repeat(40), type: 'webhook', scope: 'v1', hits: 10, throttled: 0, share: 2.5, avg_per_minute: 0.67 },
            { signature: 'e'.repeat(40), scope: 'v1', limit: 60, hits: 0, throttled: 0, share: 0, avg_per_minute: 0 },
        ],
        series: [
            { bucket: '2026-09-29T09:59:00+00:00', hits: 0, throttled: 0 },
            { bucket: '2026-09-29T10:00:00+00:00', hits: 400, throttled: 40 },
        ],
        ...overrides,
    };
}

/**
 * Lets the task's fetch (a native promise, which settled() does not track) resolve.
 */
function flush() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

module('Integration | Component | admin/api-consumers', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        const context = this;
        this.requests = [];
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

        // format-number reads the locale; set it before render so the first read does not
        // update tracked state mid-render.
        this.owner.lookup('service:intl').setLocale('en-us');
        this.owner.register('service:fetch', FetchStub);
        this.owner.register('service:notifications', NotificationsStub);
        this.notifications = () => this.owner.lookup('service:notifications');

        const captured = captureComponent(this.owner, 'admin/api-consumers', AdminApiConsumersComponent);
        this.build = async () => {
            await render(hbs`<Admin::ApiConsumers />`);
            await flush();
            return captured.instance;
        };
    });

    test('it shows platform totals, the timeline and each consumer', async function (assert) {
        const component = await this.build();

        assert.deepEqual(this.requests[0], { method: 'get', path: 'rate-limits/consumers', query: { window: 15, sort: 'hits', limit: 100 } });
        assert.dom('[data-test-total-requests]').containsText('400');
        assert.dom('[data-test-total-throttled]').containsText('40');
        assert.dom('[data-test-total-throttled]').containsText('10% of requests');
        assert.dom('[data-test-consumer-count]').containsText('3');
        assert.dom('[data-test-default-limit]').containsText('120');
        assert.dom('[data-test-timeline] > div').exists({ count: 2 });
        assert.dom(`[data-test-consumer="${'a'.repeat(40)}"]`).containsText('Pharma integration');
        assert.dom(`[data-test-consumer="${'a'.repeat(40)}"]`).containsText('Acme Pharma');
        assert.dom(`[data-test-consumer="${'a'.repeat(40)}"] [data-test-reset-consumer]`).exists('a throttled consumer can be unblocked');
        assert.dom(`[data-test-consumer="${'b'.repeat(40)}"]`).containsText('Unlimited');
        assert.dom(`[data-test-consumer="${'b'.repeat(40)}"] [data-test-reset-consumer]`).doesNotExist();
        assert.dom('[data-test-unavailable]').doesNotExist();
        assert.dom('[data-test-not-tracking]').doesNotExist();

        assert.deepEqual(
            component.consumers.map((consumer) => [consumer.typeLabel, consumer.isUnlimited, consumer.isThrottled]),
            [
                ['API key', false, true],
                ['Anonymous', true, false],
                ['webhook', true, false],
                ['Unknown', false, false],
            ]
        );
        assert.deepEqual(
            component.timeline.map((point) => [point.height, point.throttledHeight]),
            [
                [0, 0],
                [100, 10],
            ]
        );
    });

    test('it reloads when the window or sort changes', async function (assert) {
        const component = await this.build();

        await click('[data-test-window="60"]');
        assert.deepEqual(this.requests.at(-1).query, { window: 60, sort: 'hits', limit: 100 });
        assert.strictEqual(component.selectedWindow.label, 'Last hour');

        await click('[data-test-sort="throttled"]');
        assert.deepEqual(this.requests.at(-1).query, { window: 60, sort: 'throttled', limit: 100 });

        await click('[data-test-refresh]');
        assert.strictEqual(this.requests.length, 4);
    });

    test('it clears a throttled consumer window', async function (assert) {
        const component = await this.build();

        await click('[data-test-reset-consumer]');
        await flush();
        await component.resetConsumer.perform({ signature: 'd'.repeat(40) });

        assert.deepEqual(
            this.requests.filter((request) => request.method === 'post').map((request) => request.path),
            [`rate-limits/consumers/${'a'.repeat(40)}/reset`, `rate-limits/consumers/${'d'.repeat(40)}/reset`]
        );
        assert.deepEqual(this.notifications().successes, ['Rate limit window cleared for Pharma integration.', 'Rate limit window cleared for consumer.']);
    });

    test('it reports failures', async function (assert) {
        this.fail = { get: true, post: true };
        const component = await this.build();

        await component.resetConsumer.perform({ signature: 'a'.repeat(40) });

        assert.deepEqual(this.notifications().errors, ['get failed', 'post failed']);
        assert.strictEqual(component.data, null);
        assert.deepEqual(component.consumers, []);
        assert.deepEqual(component.timeline, []);
        assert.strictEqual(component.throttledRate, 0);
    });

    test('it explains when metrics are unavailable or not being tracked', async function (assert) {
        this.response = metrics({ available: false, tracking: false, consumers: [], series: [], total_requests: 0, total_throttled: undefined });
        const component = await this.build();

        assert.dom('[data-test-unavailable]').exists();
        assert.dom('[data-test-not-tracking]').exists();
        assert.dom('[data-test-empty]').exists();
        assert.dom('[data-test-timeline]').doesNotExist();
        assert.strictEqual(component.throttledRate, 0);

        component.data = metrics({ total_throttled: undefined });
        assert.strictEqual(component.throttledRate, 0, 'a missing throttled count reads as zero');
    });
});
