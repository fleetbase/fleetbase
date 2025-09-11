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
            const dateMatch = utcString.match(/^(\d{4}-\d{2}-\d{2})/);
            const timeMatch = utcString.match(/T(\d{2}:\d{2})/);
            
            // Use UTC date and time directly to avoid timezone conversion
            this.date = dateMatch ? dateMatch[1] : format(this.args.value, this.dateFormat);
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

        // Handle time preservation better
        let timeToUse;
        if (this.time) {
            // Time is explicitly set in the component
            timeToUse = this.time;
        } else if (this.args.value instanceof Date && !isNaN(this.args.value.getTime())) {
            // Preserve existing time from the original value when time is not set
            const utcString = this.args.value.toISOString();
            const timeMatch = utcString.match(/T(\d{2}:\d{2})/);
            timeToUse = timeMatch ? timeMatch[1] : '00:00';
        } else {
            // Default to midnight
            timeToUse = '00:00';
        }
        
        // Create date components from the input
        const [year, month, day] = this.date.split('-').map(Number);
        const [hours, minutes] = timeToUse.split(':').map(Number);
        
        // Create a date object in UTC to avoid timezone conversion issues
        let dateTimeInstance = new Date(Date.UTC(year, month - 1, day, hours, minutes));
        
        // If the date is invalid, try parsing with date-fns as fallback
        if (isNaN(dateTimeInstance.getTime())) {
            let dateTimeString = `${this.date} ${timeToUse}`;
            dateTimeInstance = parse(dateTimeString, this.dateTimeFormat, new Date());
        }

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
