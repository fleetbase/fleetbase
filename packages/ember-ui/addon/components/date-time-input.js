import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { parse, format } from 'date-fns';

export default class DateTimeInputComponent extends Component {
    @tracked timeFormat = 'HH:mm';
    @tracked dateFormat = 'yyyy-MM-dd';
    @tracked dateTimeFormat = 'yyyy-MM-dd HH:mm';
    @tracked date;
    @tracked time;

    constructor() {
        super(...arguments);
        this.initializeFromValue();
    }

    initializeFromValue() {
        if (this.args.value instanceof Date && !isNaN(this.args.value.getTime())) {
            // this.date = format(this.args.value, this.dateFormat);
            // this.time = format(this.args.value, this.timeFormat);
            
            // Format date normally
            this.date = format(this.args.value, this.dateFormat);
            
            // Extract time from UTC string to avoid timezone conversion
            const utcString = this.args.value.toISOString();
            const timeMatch = utcString.match(/T(\d{2}:\d{2})/);
            this.time = timeMatch ? timeMatch[1] : format(this.args.value, this.timeFormat);
        } else {
            this.date = null;
            this.time = null;
        }
    }

    @action
    update(prop, { target }) {
        const { value } = target;

        this[prop] = value;

        // If date is missing, it's invalid input
        if (!this.date) {
            this.args.onUpdate?.(null, null);
            return;
        }

        // Use "00:00" (12 AM) as default if time is not set
        let timeToUse = this.time || '00:00';
        let dateTimeString = `${this.date} ${timeToUse}`;
        let dateTimeInstance = parse(dateTimeString, this.dateTimeFormat, new Date());

        if (isNaN(dateTimeInstance.getTime())) {
            this.args.onUpdate?.(null, null);
        } else {
            this.args.onUpdate?.(dateTimeInstance, format(dateTimeInstance, this.dateTimeFormat));
        }
    }

    @action
    didReceiveArguments() {
        if (!(this.args.value instanceof Date) || isNaN(this.args.value.getTime())) {
            this.date = null;
            this.time = null;
        }
    }
}
