import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { parseISO, format } from 'date-fns';

export default class MaintenanceScheduleModel extends Model {
    // Primary Key
    // @attr('string') id;
    @attr('string') public_id;

    // Vehicle
    @belongsTo('vehicle', { async: true, inverse: null }) vehicle;
    @attr('string') vehicle_name;

    // Details
    @attr('string') reason;
    @attr('string') start_date; // ISO string
    @attr('string') end_date;   // ISO string

    // Timestamps
    @attr('string') created_at; // ISO string

    @computed('start_date')
    get formattedStartDate() {
        if (!this.start_date) return '';
        return format(parseISO(this.start_date), 'MMMM do, yyyy h:mm a');
    }

    @computed('end_date')
    get formattedEndDate() {
        if (!this.end_date) return '';
        return format(parseISO(this.end_date), 'MMMM do, yyyy h:mm a');
    }
}
