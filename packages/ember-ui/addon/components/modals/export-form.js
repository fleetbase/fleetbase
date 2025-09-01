import Component            from '@glimmer/component';
import { tracked }          from '@glimmer/tracking';
import { action }           from '@ember/object';
import { inject as service } from '@ember/service';

export default class ExportFormComponent extends Component {
    @service notifications;
    @service intl;

    filterOptions = [
        { label: 'fleet-ops.common.start-date', value: 'startDate' },
        { label: 'fleet-ops.common.created-at', value: 'createdAt' }
    ];

    @tracked filterBy = null;
    @tracked fromDate = null;
    @tracked toDate = null;
    @tracked dateError = null;
    @tracked format = null;

    get formatOptions() {
        return this.args.options.formatOptions || [];
    }

    get today() {
        return new Date().toISOString().split('T')[0];
    }

    get maxDate() {
        return this.filterBy?.value === 'createdAt' ? this.today : undefined;
    }

    @action setFilterBy(option) {
        this.filterBy = option;
        this.fromDate = null;
        this.toDate = null;
        this.args.options.filterBy = this.filterBy?.value || null;
        this.updateOptionsDate();
    }

    @action setFromDate(dateObj) {
        this.fromDate = dateObj?.formattedDate || null;
        this.validateDates();
        this.updateOptionsDate();
    }

    @action setToDate(dateObj) {
        this.toDate = dateObj?.formattedDate || null;
        this.validateDates();
        this.updateOptionsDate();
    }

    @action setFormat(format) {
        this.format = format;
        if (this.args.options) {
            this.args.options.format = format;
        }
    }

    validateDates() {
        this.dateError = false;
        
        // Check if toDate is selected without fromDate
        if (this.toDate && !this.fromDate) {
            this.dateError = true;
            this.notifications.error(this.intl.t('common.please-select-from-date'));
            return;
        }
        
        if (this.fromDate && this.toDate) {
            const from = new Date(this.fromDate);
            const to = new Date(this.toDate);
            if (to < from) {
                this.dateError = true;
                this.notifications.error(this.intl.t('common.to_date_before_from_date_error'));
            }
        }
    }

    updateOptionsDate() {
        const dateValue = (this.fromDate || this.toDate) ? [this.fromDate, this.toDate] : null;

        this.args.options.filterBy = this.filterBy?.value || null;

        if (this.filterBy?.value === 'startDate') {
            this.args.options.startDate = dateValue;
            this.args.options.createdAt = null;
        } else if (this.filterBy?.value === 'createdAt') {
            this.args.options.createdAt = dateValue;
            this.args.options.startDate = null;
        }
    }

    constructor() {
        super(...arguments);
        // Set default format to first option if not set
        const opts = this.args.options?.formatOptions || [];
        this.format = opts.length > 0 ? opts[0] : null;
        if (this.args.options) {
            this.args.options.format = this.format;
            const originalConfirm = this.args.options.confirm;
            this.args.options.confirm = (...args) => {
                if (this.dateError) {
                    // Check which specific error occurred and show appropriate message
                    if (this.toDate && !this.fromDate) {
                        this.notifications.error(this.intl.t('common.please-select-from-date'));
                    } else {
                        this.notifications.error(this.intl.t('common.to_date_before_from_date_error'));
                    }
                    return;
                }
                if (typeof originalConfirm === 'function') {
                    return originalConfirm(...args);
                }
            };
        }
    }
}

