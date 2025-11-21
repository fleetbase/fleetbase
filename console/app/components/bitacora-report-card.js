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
    { value: 'today', label: 'Hoy' },
    { value: 'last_7_days', label: 'Últimos 7 días' },
    { value: 'last_30_days', label: 'Últimos 30 días' },
    { value: 'this_month', label: 'Este mes' },
    { value: 'previous_month', label: 'Mes anterior' },
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
        const trends = this.chartSections.map((section) => section.trend);

        if (!labels.length) {
            return { labels: [], datasets: [] };
        }

        return {
            labels,
            datasets: [
                {
                    label: this.intl?.t?.('bitacora.report-card.chartLabel') ?? 'Actividades',
                    data,
                    backgroundColor: '#1D9A6C',
                    borderRadius: 4,
                    barThickness: 16,
                },
            ],
            trends, // Para mostrar en tooltips
        };
    }

    get chartOptions() {
        const textColor = this.args.chartTickColor ?? '#94a3b8';
        const trends = this.chartData.trends || [];
        
        return {
            indexAxis: 'y', // Barras horizontales
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    padding: 12,
                    titleColor: '#f1f5f9',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    callbacks: {
                        label: (context) => {
                            const value = context.parsed.x;
                            const trend = trends[context.dataIndex] || '';
                            return `${value} actividades ${trend ? '(' + trend + ')' : ''}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: 'rgba(148, 163, 184, 0.1)',
                    },
                    ticks: {
                        precision: 0,
                        color: textColor,
                        font: {
                            size: 11,
                        },
                    },
                },
                y: {
                    grid: {
                        display: false,
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            size: 12,
                            weight: '500',
                        },
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

    isPeriodSelected(value) {
        return value === this.selectedPeriod;
    }

    isTrendDown(direction) {
        return direction === 'down';
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
        const dates = this.getPeriodDates(this.selectedPeriod);
        return {
            start_date: dates.start,
            end_date: dates.end,
            ...(this.args.query ?? {}),
            ...extra,
        };
    }

    getPeriodDates(period) {
        console.log('[BitacoraReportCard] getPeriodDates called with period:', period);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let start, end;

        switch (period) {
            case 'today':
                console.log('[BitacoraReportCard] Using TODAY range');
                start = today;
                end = now;
                break;
            case 'last_7_days':
                start = new Date(today);
                start.setDate(start.getDate() - 7);
                end = now;
                break;
            case 'last_30_days':
                start = new Date(today);
                start.setDate(start.getDate() - 30);
                end = now;
                break;
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = now;
                break;
            case 'previous_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                break;
            default:
                start = new Date(today);
                start.setDate(start.getDate() - 7);
                end = now;
        }

        return {
            start: start.toISOString(),
            end: end.toISOString(),
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

            const trendValue = typeof section.trend === 'number' ? section.trend : parseFloat(section.trend) || 0;
            const trendDirection = section.trend_direction ?? (trendValue > 0 ? 'up' : (trendValue < 0 ? 'down' : 'neutral'));
            const trendSign = trendValue > 0 ? '+' : '';
            const trendFormatted = `${trendSign}${trendValue.toFixed(1)}%`;

            return {
                id: section.slug ?? section.name ?? section.log_name ?? guidFor(section),
                name: section.name ?? section.log_name ?? '—',
                slug: section.slug,
                total: section.total ?? section.total_activities ?? 0,
                trend: trendFormatted,
                trendValue: trendValue,
                trendDirection: trendDirection,
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
    handlePeriodChange(value) {
        console.log('[BitacoraReportCard] Period changed to:', value);
        
        if (!value || value === this.selectedPeriod) {
            return;
        }

        this.selectedPeriod = value;
        console.log('[BitacoraReportCard] Loading data for new period...');
        this.loadReportData();
    }

    @action
    handlePeriodChangeNative(event) {
        const value = event.target.value;
        console.log('[BitacoraReportCard] Period changed (native) to:', value);
        
        if (!value || value === this.selectedPeriod) {
            return;
        }

        this.selectedPeriod = value;
        console.log('[BitacoraReportCard] Loading data for new period...');
        this.loadReportData();
    }

    isPeriodSelected(value) {
        return value === this.selectedPeriod;
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

    @action
    async loadReportData(options = {}) {
        if (this.hasExternalSections) {
            console.log('[BitacoraReportCard] Skipping load - using external sections');
            return;
        }

        if (!options.silent) {
            this.isLoading = true;
        }

        this.errorMessage = null;

        try {
            const params = this.buildQueryParams(options.params);
            console.log('[BitacoraReportCard] Fetching with params:', params);
            const response = await this.fetchReportData(params);
            console.log('[BitacoraReportCard] Response received:', response);
            this.sections = this.normalizeSections(response?.sections ?? response?.current_period?.sections ?? []);
            this.lastUpdated = new Date();
            console.log('[BitacoraReportCard] Sections updated:', this.sections.length);
        } catch (error) {
            this.errorMessage = this.errorLabel;
            if (this.notifications?.danger) {
                this.notifications.danger(this.errorLabel);
            }
            // eslint-disable-next-line no-console
            console.error('[BitacoraReportCard] Failed to load report data', error);
        } finally {
            this.isLoading = false;
            console.log('[BitacoraReportCard] isLoading set to false');
        }
    }

}




