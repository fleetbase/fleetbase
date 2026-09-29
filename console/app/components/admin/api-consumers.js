import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';

export const WINDOWS = [
    { value: 5, label: '5m' },
    { value: 15, label: '15m' },
    { value: 60, label: '1h' },
    { value: 360, label: '6h' },
    { value: 1440, label: '24h' },
    { value: 10080, label: '7d' },
];

const WINDOW_DESCRIPTIONS = {
    5: 'last 5 minutes',
    15: 'last 15 minutes',
    60: 'last hour',
    360: 'last 6 hours',
    1440: 'last 24 hours',
    10080: 'last 7 days',
};

export const CONSUMER_TYPES = {
    api_key: { label: 'API key', icon: 'key' },
    token: { label: 'Access token', icon: 'id-badge' },
    user: { label: 'User', icon: 'user' },
    ip: { label: 'Anonymous', icon: 'globe' },
    unknown: { label: 'Unrecognized', icon: 'circle-question' },
};

function number(value) {
    return new Intl.NumberFormat().format(value ?? 0);
}

function parseDate(value) {
    if (!value) return null;
    const date = parseISO(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Which API consumers drive traffic and which are being throttled, platform-wide.
 *
 * Counts come from the throttle middleware, so they include requests rejected with 429 —
 * something the API request log never sees.
 */
export default class AdminApiConsumersComponent extends Component {
    @service fetch;
    @service notifications;
    @service router;
    @service currentUser;

    windows = WINDOWS;

    @tracked window = 15;
    @tracked sort = 'hits';
    @tracked data = null;

    columns = [
        {
            label: 'Consumer',
            valuePath: 'label',
            cellComponent: 'admin/table/cell/api-consumer',
            width: '320px',
            sticky: true,
            resizable: true,
        },
        {
            label: 'Organization',
            valuePath: 'organization',
            cellComponent: 'table/cell/identity',
            resourceType: 'company',
            resourcePath: 'organization',
            labelPath: 'name',
            popover: false,
            hideBadges: true,
            emptyText: '—',
            onClick: this.openOrganization,
            width: '220px',
            resizable: true,
        },
        { label: 'Scope', valuePath: 'scopeLabel', width: '80px', cellClassNames: 'font-mono text-xs' },
        { label: 'Requests', valuePath: 'hitsLabel', width: '100px', resizable: true },
        { label: 'Avg / min', valuePath: 'avgLabel', width: '90px' },
        { label: 'Peak / min', valuePath: 'peakLabel', width: '90px' },
        { label: 'Throttled', valuePath: 'throttledLabel', cellComponent: 'admin/table/cell/throttled', width: '110px' },
        { label: 'Limit', valuePath: 'limitLabel', width: '100px' },
        { label: 'Share', valuePath: 'share', cellComponent: 'admin/table/cell/share', width: '130px' },
        { label: 'Last seen', valuePath: 'lastSeenLabel', cellComponent: 'admin/table/cell/date-time', width: '210px', resizable: true },
        {
            label: '',
            cellComponent: 'table/cell/dropdown',
            ddButtonText: false,
            ddButtonIcon: 'ellipsis-h',
            ddButtonIconPrefix: 'fas',
            ddMenuLabel: 'Consumer Actions',
            cellClassNames: 'overflow-visible',
            wrapperClass: 'flex items-center justify-end mx-2',
            sticky: 'right',
            width: 60,
            actions: [
                {
                    label: 'Clear rate-limit window',
                    icon: 'unlock',
                    fn: (consumer) => this.resetConsumer.perform(consumer),
                },
                {
                    label: 'View organization',
                    icon: 'building',
                    fn: (consumer) => this.openOrganization(consumer.organization),
                },
                {
                    label: 'Manage rate limits',
                    icon: 'gauge',
                    fn: () => this.router.transitionTo('console.admin.rate-limits'),
                },
            ],
        },
    ];

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get windowDescription() {
        return WINDOW_DESCRIPTIONS[this.window];
    }

    get isMinuteGranularity() {
        return (this.data?.granularity ?? 'minute') === 'minute';
    }

    get consumers() {
        return (this.data?.consumers ?? []).map((consumer) => {
            const type = CONSUMER_TYPES[consumer.type] ?? { label: consumer.type ?? 'Unknown', icon: 'circle-question' };
            const isUnlimited = consumer.limit === null || consumer.limit === undefined;
            const lastSeen = parseDate(consumer.last_seen_at);

            return {
                ...consumer,
                label: consumer.label ?? 'Unknown',
                typeLabel: type.label,
                typeIcon: type.icon,
                isUnlimited,
                isThrottled: consumer.throttled > 0,
                organization: consumer.company_id
                    ? { id: consumer.company_uuid, uuid: consumer.company_uuid, public_id: consumer.company_id, name: consumer.company_name ?? consumer.company_id }
                    : null,
                scopeLabel: `/${consumer.scope ?? ''}`,
                hitsLabel: number(consumer.hits),
                avgLabel: String(consumer.avg_per_minute ?? 0),
                peakLabel: consumer.peak_per_minute ? number(consumer.peak_per_minute) : '—',
                throttledLabel: number(consumer.throttled),
                limitLabel: isUnlimited ? 'Unlimited' : `${number(consumer.limit)} / ${this.data?.decay_minutes ?? 1}m`,
                lastSeenLabel: lastSeen ? this.formatDateTime(lastSeen) : null,
                lastSeenRelative: lastSeen ? formatDistanceToNowStrict(lastSeen, { addSuffix: true }) : null,
            };
        });
    }

    /**
     * Date and time in the viewer's timezone (their account's, else the browser's), with the
     * zone named so a screenshot shared across timezones is unambiguous.
     */
    formatDateTime(date) {
        const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZoneName: 'short' };
        try {
            return new Intl.DateTimeFormat(undefined, { ...options, timeZone: this.currentUser.timezone }).format(date);
        } catch {
            // An unknown zone name throws; fall back to the browser's zone.
            return new Intl.DateTimeFormat(undefined, options).format(date);
        }
    }

    get throttledRate() {
        const total = this.data?.total_requests ?? 0;

        return total > 0 ? Math.round(((this.data.total_throttled ?? 0) / total) * 10000) / 100 : 0;
    }

    /**
     * The busiest bucket in the window, per minute or per hour.
     */
    get peak() {
        const series = this.data?.series ?? [];

        return series.reduce((max, point) => Math.max(max, point.hits), 0);
    }

    get stats() {
        const data = this.data ?? {};
        const unit = this.isMinuteGranularity ? 'min' : 'hour';

        return [
            { key: 'requests', label: 'Requests', value: number(data.total_requests) },
            { key: 'throttled', label: 'Throttled (429)', value: number(data.total_throttled), hint: `${this.throttledRate}%`, isAlert: (data.total_throttled ?? 0) > 0 },
            { key: 'peak', label: `Peak / ${unit}`, value: number(this.peak) },
            { key: 'consumers', label: 'Consumers', value: number(data.consumer_count) },
            { key: 'limit', label: 'Default limit', value: number(data.default_limit), hint: `/ ${data.decay_minutes ?? 1}m per consumer` },
        ];
    }

    /**
     * One entry per load so the chart is re-created with the new data; <Chart> only draws
     * when it is inserted.
     */
    get charts() {
        const series = this.data?.series ?? [];
        if (!series.length) return [];

        const labelFormat = this.isMinuteGranularity ? 'HH:mm' : this.window > 1440 ? 'EEE d, HH:mm' : 'HH:mm';
        const titleFormat = this.isMinuteGranularity ? 'EEE d MMM, HH:mm' : 'EEE d MMM, HH:00';
        const dates = series.map((point) => parseDate(point.bucket));
        const unit = this.isMinuteGranularity ? 'minute' : 'hour';

        return [
            {
                labels: dates.map((date, index) => (date ? format(date, labelFormat) : String(index))),
                datasets: [
                    {
                        label: 'Requests',
                        data: series.map((point) => point.hits),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 2,
                    },
                    {
                        label: 'Throttled (429)',
                        data: series.map((point) => point.throttled),
                        borderColor: '#f43f5e',
                        backgroundColor: 'rgba(244, 63, 94, 0.15)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 2,
                    },
                ],
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: true, position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } } },
                        tooltip: {
                            callbacks: {
                                title: (items) => {
                                    const date = dates[items[0]?.dataIndex];
                                    return date ? format(date, titleFormat) : '';
                                },
                                label: (item) => `${item.dataset.label}: ${number(item.parsed.y)} / ${unit}`,
                            },
                        },
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { maxTicksLimit: 8, maxRotation: 0, font: { size: 10 } } },
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0, font: { size: 10 } },
                            title: { display: true, text: `Requests / ${unit}`, font: { size: 10 } },
                        },
                    },
                },
            },
        ];
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

    @action openOrganization(organization) {
        if (!organization?.public_id) return;
        this.router.transitionTo('console.admin.organizations.details', organization.public_id);
    }
}
