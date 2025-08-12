import Component            from '@glimmer/component';
import { tracked }          from '@glimmer/tracking';
import { action }           from '@ember/object';

export default class ExportFormComponent extends Component {
    filterOptions = [
        { label: 'fleet-ops.common.start-date', value: 'startDate' },
        { label: 'fleet-ops.common.created-at', value: 'createdAt' }
    ];

    @tracked filterBy = null;
    @tracked fromDate = null;
    @tracked toDate = null;
    @tracked dateError = null;

    @action setFilterBy(option) {
        this.filterBy = option; // store the whole object
        this.fromDate = null;
        this.toDate = null;
        this.args.options.startDate = null;
        this.args.options.createdAt = null;
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

    validateDates() {
        this.dateError = false;
        if (this.fromDate && this.toDate) {
            const from = new Date(this.fromDate);
            const to = new Date(this.toDate);
            if (to < from) {
                this.dateError = true;
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
}
