import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { guidFor } from '@ember/object/internals';
import { later, cancel } from '@ember/runloop';
import { isArray } from '@ember/array';
import { formatDistanceToNow } from 'date-fns';

const DEFAULT_PERIOD = 'last_7_days';
const REFRESH_INTERVAL = 5 * 60 * 1000;

const PERIOD_PRESETS = [
    { value: 'today', label: 'Today' },
    { value: 'last_7_days', label: 'Last 7 days' },
    { value: 'last_30_days', label: 'Last 30 days' },
    { value: 'this_month', label: 'This month' },
    { value: 'previous_month', label: 'Previous month' },
];

export default class BitacoraReportCardComponent extends Component {
    @service fetch;
    @service intl;
    @service notifications;
    @service router;

    @tracked selectedPeriod = this.args.period ?? DEFAULT_PERIOD;
    @tracked sections = [];
    @tracked isLoading = true;
    @tracked errorMessage = null;
    @tracked lastUpdated = null;

    #refreshTimer = null;

    constructor() {
        super(...arguments);
        if (this.hasExternalSections) {
            this.isLoading = false;
            this.sections = this.normalizeSections(this.args.sections);
            this.lastUpdated = new Date();
        } else {
            this.loadReportData();
            if (!this.disableAutoRefresh) {
                this.#scheduleAutoRefresh();
            }
        }
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.#clearAutoRefresh();
    }

    get disableAutoRefresh() {
        return Boolean(this.args.disableAutoRefresh);
    }

    get hasExternalSections() {
        return isArray(this.args.sections) && this.args.sections.length > 0;
    }

    get resolvedSections() {
        if (this.hasExternalSections) {
            return this.normalizeSections(this.args.sections);
        }

        return this.sections;
    }

    get periodOptions() {
        return PERIOD_PRESETS;
    }

    get hasSections() {
        return isArray(this.resolvedSections) && this.resolvedSections.length > 0;
    }

    get chartSections() {
        const limit = this.args.chartLimit ?? 5;
        return this.resolvedSections.slice(0, limit);
    }

    get chartData() {
        const labels = this.chartSections.map((section) => section.name);
        const data = this.chartSections.map((section) => section.total);

        if (!labels.length) {
            return { labels: [], datasets: [] };
        }

        return {
            labels,
            datasets: [
                {
                    label: this.intl?.t?.('bitacora.report-card.chartLabel') ?? 'Actividades',
                    data,
                    backgroundColor: this.buildDatasetColors(data.length),
                    borderRadius: 6,
                    barThickness: 20,
                },
            ],
        };
    }

    get chartOptions() {
        const textColor = this.args.chartTickColor ?? '#1f2937';
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${context.parsed.y ?? context.parsed}`,
                    },
                },
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                    },
                    ticks: {
                        color: textColor,
                    },
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        color: textColor,
                    },
                },
            },
            ...(this.args.chartOptions ?? {}),
        };
    }

    get showChart() {
        return this.chartData?.datasets?.length > 0;
    }

    get lastUpdatedLabel() {
        if (!this.lastUpdated) {
            return null;
        }

        return formatDistanceToNow(this.lastUpdated, { addSuffix: true });
    }

    get periodSelectId() {
        return `${guidFor(this)}-period-select`;
    }

    get title() {
        return this.intl?.t?.('bitacora.report-card.title') ?? 'Reportes por sección';
    }

    get subtitle() {
        return this.intl?.t?.('bitacora.report-card.subtitle') ?? 'Resumen de actividad agrupado por módulo';
    }

    get loadingLabel() {
        return this.intl?.t?.('bitacora.report-card.loading') ?? 'Cargando reportes...';
    }

    get emptyLabel() {
        return this.intl?.t?.('bitacora.report-card.empty') ?? 'No hay actividad en el período seleccionado.';
    }

    get errorLabel() {
        return this.intl?.t?.('bitacora.report-card.error') ?? 'No pudimos cargar los reportes. Inténtalo de nuevo.';
    }

    #scheduleAutoRefresh() {
        this.#clearAutoRefresh();
        this.#refreshTimer = later(this, async () => {
            await this.loadReportData({ silent: true });
            this.#scheduleAutoRefresh();
        }, REFRESH_INTERVAL);
    }

    #clearAutoRefresh() {
        if (this.#refreshTimer) {
            cancel(this.#refreshTimer);
            this.#refreshTimer = null;
        }
    }

    buildQueryParams(extra = {}) {
        return {
            period: this.selectedPeriod,
            ...(this.args.query ?? {}),
            ...extra,
        };
    }

    normalizeSections(rawSections = []) {
        if (!isArray(rawSections)) {
            return [];
        }

        return rawSections.map((section) => {
            const actions = Object.entries(section?.actions ?? {}).map(([key, count]) => ({
                key,
                label: this.formatActionLabel(key),
                count,
            }));

            return {
                id: section.slug ?? section.name ?? section.log_name ?? guidFor(section),
                name: section.name ?? section.log_name ?? '—',
                slug: section.slug,
                total: section.total ?? section.total_activities ?? 0,
                trend: section.trend ?? 0,
                trendDirection: section.trend_direction ?? (section.trend >= 0 ? 'up' : 'down'),
                lastActivity: section.last_activity,
                lastActivityLabel: section.last_activity ? formatDistanceToNow(new Date(section.last_activity), { addSuffix: true }) : null,
                actions,
            };
        });
    }

    formatActionLabel(key = '') {
        return key
            .toString()
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    buildDatasetColors(length = 0) {
        const palette = this.args.chartPalette ?? ['#1D9A6C', '#2FBF71', '#4BD38C', '#7EE5B0', '#A6F1C7', '#CDF9DF'];
        if (!length) {
            return [];
        }

        if (palette.length >= length) {
            return palette.slice(0, length);
        }

        const colors = [];
        for (let i = 0; i < length; i++) {
            colors.push(palette[i % palette.length]);
        }
        return colors;
    }

    async fetchReportData(params = {}) {
        return this.fetch.get('activity/reports-by-section', params, { namespace: 'api/v1' });
    }

    @action
    async loadReportData(options = {}) {
        if (this.hasExternalSections) {
            return;
        }

        if (!options.silent) {
            this.isLoading = true;
        }

        this.errorMessage = null;

        try {
            const response = await this.fetchReportData(this.buildQueryParams(options.params));
            this.sections = this.normalizeSections(response?.sections ?? response?.current_period?.sections ?? []);
            this.lastUpdated = new Date();
        } catch (error) {
            this.errorMessage = this.errorLabel;
            if (this.notifications?.danger) {
                this.notifications.danger(this.errorLabel);
            }
            // eslint-disable-next-line no-console
            console.error('[BitacoraReportCard] Failed to load report data', error);
        } finally {
            this.isLoading = false;
        }
    }

    @action
    handlePeriodChange(event) {
        const nextValue = event?.target?.value;

        if (!nextValue || nextValue === this.selectedPeriod) {
            return;
        }

        this.selectedPeriod = nextValue;
        this.loadReportData();
    }

    @action
    handleRefresh() {
        this.loadReportData();
    }

    @action
    handleViewDetails() {
        if (typeof this.args.onViewDetails === 'function') {
            return this.args.onViewDetails();
        }

        if (this.router?.transitionTo) {
            return this.router.transitionTo('console.bitacora.reports');
        }
    }
}

