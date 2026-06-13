import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';

export default class AdminWidgetKpiTileComponent extends Component {
    @service fetch;

    @tracked data = null;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.load.perform();
    }

    get slug() {
        return this.args.options?.slug;
    }

    get title() {
        return this.args.options?.title ?? this.data?.title ?? 'Metric';
    }

    get icon() {
        return this.args.options?.icon ?? this.data?.icon ?? 'chart-simple';
    }

    get displayIcon() {
        if (this.error) {
            return 'triangle-exclamation';
        }

        if (this.status === 'success') {
            return 'circle-check';
        }

        if (this.status === 'warning') {
            return 'triangle-exclamation';
        }

        if (this.status === 'danger') {
            return 'circle-exclamation';
        }

        return this.icon;
    }

    get footnote() {
        return this.args.options?.footnote ?? this.data?.footnote ?? 'vs previous 30d';
    }

    get formattedValue() {
        const value = this.data?.value;

        if (value === null || value === undefined) {
            return '0';
        }

        return value.toLocaleString?.() ?? value;
    }

    get deltaPct() {
        return this.data?.delta_pct;
    }

    get hasDelta() {
        return typeof this.deltaPct === 'number';
    }

    get deltaText() {
        if (!this.hasDelta) {
            return 'n/a';
        }

        if (this.deltaPct === 0) {
            return '0%';
        }

        return `${this.deltaPct > 0 ? '+' : ''}${this.deltaPct}%`;
    }

    get deltaIcon() {
        if (!this.hasDelta || this.deltaPct === 0) {
            return 'minus';
        }

        return this.deltaPct > 0 ? 'arrow-trend-up' : 'arrow-trend-down';
    }

    get status() {
        return this.data?.status ?? 'neutral';
    }

    get accentClass() {
        if (this.status === 'danger') {
            return 'border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-100/70 dark:border-rose-900 dark:from-rose-950/40 dark:via-gray-800 dark:to-rose-900/20';
        }

        if (this.status === 'warning') {
            return 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100/70 dark:border-amber-900 dark:from-amber-950/40 dark:via-gray-800 dark:to-amber-900/20';
        }

        if (this.status === 'success') {
            return 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70 dark:border-emerald-900 dark:from-emerald-950/40 dark:via-gray-800 dark:to-emerald-900/20';
        }

        return 'border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:border-blue-900/70 dark:from-blue-950/30 dark:via-gray-800 dark:to-indigo-950/20';
    }

    get iconClass() {
        if (this.error || this.status === 'danger') {
            return 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-200';
        }

        if (this.status === 'warning') {
            return 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-200';
        }

        if (this.status === 'success') {
            return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200';
        }

        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-200';
    }

    get valueTextClass() {
        if (this.error || this.status === 'danger') {
            return 'text-rose-700 dark:text-rose-200';
        }

        if (this.status === 'warning') {
            return 'text-amber-700 dark:text-amber-200';
        }

        if (this.status === 'success') {
            return 'text-emerald-700 dark:text-emerald-200';
        }

        return 'text-gray-900 dark:text-gray-100';
    }

    get deltaClass() {
        if (!this.hasDelta || this.deltaPct === 0) {
            return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200';
        }

        return this.deltaPct > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200';
    }

    @task *load() {
        if (!this.slug) {
            this.error = 'Missing metric slug.';
            return;
        }

        try {
            this.data = yield this.fetch.get(`metrics/admin/kpis/${this.slug}`);
            this.error = null;
        } catch (error) {
            this.error = error?.message ?? 'Unable to load metric.';
        }
    }
}
