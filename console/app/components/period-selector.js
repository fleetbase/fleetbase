import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

const STORAGE_KEY = 'bitacora-period-selector';

const DEFAULT_OPTIONS = [
    { value: 'today', label: 'Hoy' },
    { value: 'last_7_days', label: 'Últimos 7 días' },
    { value: 'last_30_days', label: 'Últimos 30 días' },
    { value: 'this_month', label: 'Este mes' },
    { value: 'previous_month', label: 'Mes anterior' },
    { value: 'custom', label: 'Rango personalizado' },
];

export default class PeriodSelectorComponent extends Component {
    @tracked selected = this.args.value ?? this._loadFromStorage()?.value ?? DEFAULT_OPTIONS[1].value;
    @tracked customStart = this.args.startDate ?? this._loadFromStorage()?.start ?? '';
    @tracked customEnd = this.args.endDate ?? this._loadFromStorage()?.end ?? '';
    @tracked customError = null;

    get label() {
        return this.args.label ?? 'Período';
    }

    get showLabelRow() {
        return this.args.showLabelRow ?? true;
    }

    get options() {
        return this.args.options ?? DEFAULT_OPTIONS;
    }

    get showCustomRange() {
        return this.selected === 'custom';
    }

    get displayLabel() {
        const match = this.options.find((option) => option.value === this.selected);
        return match ? match.label : null;
    }

    get storageKey() {
        return this.args.storageKey ?? STORAGE_KEY;
    }

    @action
    selectPeriod(value) {
        this.selected = value;
        this.customError = null;

        if (value !== 'custom') {
            this.customStart = '';
            this.customEnd = '';
            this._persist({ value });
            this.args.onChange?.({ value });
            return;
        }

        const stored = this._loadFromStorage();
        if (stored?.start) {
            this.customStart = stored.start;
        }
        if (stored?.end) {
            this.customEnd = stored.end;
        }
        this._persist({ value });
    }

    @action
    updateCustomRange(field, event) {
        this[field] = event.target.value;
        this.customError = null;
    }

    @action
    applyCustomRange() {
        if (!this.customStart || !this.customEnd) {
            this.customError = 'Selecciona fecha de inicio y fin';
            return;
        }

        const start = new Date(this.customStart);
        const end = new Date(this.customEnd);

        if (start > end) {
            this.customError = 'El rango debe iniciar antes de terminar';
            return;
        }

        const payload = {
            value: 'custom',
            start: start.toISOString(),
            end: end.toISOString(),
        };

        this._persist(payload);
        this.args.onChange?.(payload);
    }

    _loadFromStorage() {
        if (!this._hasStorage()) {
            return null;
        }

        try {
            const stored = window.localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('[PeriodSelector] No se pudo leer localStorage', error);
            return null;
        }
    }

    _persist(payload = {}) {
        if (!this._hasStorage()) {
            return;
        }

        const state = {
            value: this.selected,
            start: this.customStart,
            end: this.customEnd,
            ...payload,
        };

        try {
            window.localStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (error) {
            // eslint-disable-next-line no-console
            console.warn('[PeriodSelector] No se pudo guardar en localStorage', error);
        }
    }

    _hasStorage() {
        return typeof window !== 'undefined' && window?.localStorage;
    }
}

