import Component from '@glimmer/component';
import AirDatepicker from 'air-datepicker';
import localeEn from 'air-datepicker/locale/en';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';

export default class DatePickerComponent extends Component {
    @tracked nodeRef;
    @tracked airDatePickerRef;
    @tracked currentValue = null;

    defaultOptions = {
        inline: false,
        locale: localeEn,
        dateFormat: 'yyyy-MM-dd',
    };

    get hasValue() {
        const value = this.currentValue;

        if (!value) {
            return false;
        }

        if (typeof value === 'object' && value !== null) {
            if (value.date instanceof Date && !isNaN(value.date)) {
                return true;
            }
            if (typeof value.formattedDate === 'string' && value.formattedDate.trim() !== '') {
                return true;
            }
            return false;
        }

        if (isArray(value)) {
            return value.length > 0;
        }

        return Boolean(value);
    }

    @action setupComponent(node) {
        this.nodeRef = node;
        this.airDatePickerRef = new AirDatepicker(node, this.getOptions());
    }

    formatRangeDisplay(dates) {
        if (isArray(dates) && dates.length === 2) {
            const [start, end] = dates.map(date => new Date(date));
            const options = { month: 'short', day: '2-digit' };
            const year = start.getFullYear();
            return `${start.toLocaleDateString(undefined, options)} - ${end.toLocaleDateString(undefined, options)}, ${year}`;
        }
        return '';
    }

    @action onDateChange(...args) {
        if (typeof this.args.onChange === 'function') {
            this.args.onChange(...args);
        }
        if (typeof this.args.onSelect === 'function') {
            this.args.onSelect(...args);
        }

        const newValue = args[0];

        if (newValue && typeof newValue === 'object') {
            // Check for clear (undefined date/formattedDate)
            if (newValue.date === undefined && newValue.formattedDate === undefined) {
                this.currentValue = null;
                if (this.nodeRef) {
                    this.nodeRef.value = '';
                }
            } else {
                this.currentValue = newValue;
                // If range, format display
                if (isArray(newValue.formattedDate) && newValue.formattedDate.length === 2 && this.nodeRef) {
                    this.nodeRef.value = this.formatRangeDisplay(newValue.formattedDate);
                } else if (typeof newValue.formattedDate === 'string' && this.nodeRef) {
                    this.nodeRef.value = newValue.formattedDate;
                }
            }
        } else {
            this.currentValue = null;
            if (this.nodeRef) {
                this.nodeRef.value = '';
            }
        }
    }

    @action clear(event) {
        event.preventDefault();
        event.stopPropagation();

        if (this.airDatePickerRef) {
            this.airDatePickerRef.clear();
        }

        if (this.nodeRef) {
            this.nodeRef.value = '';
            this.nodeRef.dispatchEvent(new Event('input', { bubbles: true }));
            this.nodeRef.dispatchEvent(new Event('change', { bubbles: true }));
        }

        this.currentValue = null;

        if (typeof this.args.onSelect === 'function') {
            this.args.onSelect({ date: undefined, formattedDate: undefined, datepicker: this.airDatePickerRef });
        }

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(null);
        }
    }

    @action handleInput(event) {
        // Prevent infinite recursion: only clear if not already cleared
        if (event.target.value === '' && this.currentValue !== null) {
            this.clear(event);
        }
    }

    getOptions() {
        const options = this.defaultOptions;
        const { value } = this.args;

        // Normalize initial value to object form
        if (value) {
            if (typeof value === 'object' && value.date !== undefined) {
                this.currentValue = value;
            } else {
                this.currentValue = {
                    date: value instanceof Date ? value : (typeof value === 'string' ? new Date(value) : undefined),
                    formattedDate: typeof value === 'string' ? value : (value instanceof Date ? value.toISOString().split('T')[0] : undefined)
                };
            }
            options.selectedDates = this.parseValue(value);
        } else {
            this.currentValue = null;
        }

        if (this.nodeRef) {
            options.container = this.nodeRef.parentNode;
        }

        options.onSelect = this.onDateChange.bind(this);

        Object.keys(this.args).forEach((key) => {
            if (key === 'value' || key === 'onSelect') {
                return;
            }

            if (this.args[key]) {
                options[key] = this.args[key];
            }
        });

        return options;
    }

    parseValue(value) {
        if (isArray(value)) {
            return value;
        }

        if (typeof value === 'string' && value.includes(',')) {
            value = value.split(',').map((date) => new Date(date));
        }

        return [value];
    }
}
