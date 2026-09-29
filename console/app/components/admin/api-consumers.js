import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';

export const WINDOWS = [
    { value: 5, label: 'Last 5 minutes' },
    { value: 15, label: 'Last 15 minutes' },
    { value: 60, label: 'Last hour' },
    { value: 360, label: 'Last 6 hours' },
    { value: 1440, label: 'Last 24 hours' },
    { value: 10080, label: 'Last 7 days' },
];

const TYPE_LABELS = {
    api_key: 'API key',
    token: 'Access token',
    user: 'User',
    ip: 'Anonymous',
    unknown: 'Unrecognized',
};

/**
 * Which API consumers drive traffic and which are being throttled, platform-wide.
 *
 * Counts come from the throttle middleware, so they include requests rejected with 429 —
 * something the API request log never sees.
 */
export default class AdminApiConsumersComponent extends Component {
    @service fetch;
    @service notifications;

    windows = WINDOWS;

    @tracked window = 15;
    @tracked sort = 'hits';
    @tracked data = null;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get selectedWindow() {
        return this.windows.find((option) => option.value === this.window);
    }

    get consumers() {
        return (this.data?.consumers ?? []).map((consumer) => ({
            ...consumer,
            typeLabel: TYPE_LABELS[consumer.type] ?? consumer.type ?? 'Unknown',
            isUnlimited: consumer.limit === null || consumer.limit === undefined,
            isThrottled: consumer.throttled > 0,
        }));
    }

    get throttledRate() {
        const total = this.data?.total_requests ?? 0;

        return total > 0 ? Math.round(((this.data.total_throttled ?? 0) / total) * 10000) / 100 : 0;
    }

    /**
     * Bar heights for the request timeline, scaled to the busiest bucket.
     */
    get timeline() {
        const series = this.data?.series ?? [];
        const peak = Math.max(1, ...series.map((point) => point.hits));

        return series.map((point) => ({
            ...point,
            height: Math.max(point.hits > 0 ? 2 : 0, Math.round((point.hits / peak) * 100)),
            throttledHeight: Math.round((point.throttled / peak) * 100),
        }));
    }

    @task({ restartable: true }) *load() {
        try {
            this.data = yield this.fetch.get('rate-limits/consumers', { window: this.window, sort: this.sort, limit: 100 });
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @task *resetConsumer(consumer) {
        try {
            yield this.fetch.post(`rate-limits/consumers/${consumer.signature}/reset`);
            this.notifications.success(`Rate limit window cleared for ${consumer.label ?? 'consumer'}.`);
        } catch (error) {
            this.notifications.serverError(error);
        }
    }

    @action setWindow(option) {
        this.window = option.value;
        this.load.perform();
    }

    @action setSort(sort) {
        this.sort = sort;
        this.load.perform();
    }
}
