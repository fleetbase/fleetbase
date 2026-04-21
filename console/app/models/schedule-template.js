import Model, { attr, belongsTo } from '@ember-data/model';

/**
 * ScheduleTemplate
 *
 * A reusable recurring shift pattern that a manager can apply to one or many
 * drivers. Stores the RRULE (e.g. FREQ=WEEKLY;BYDAY=MO,TU,TH) plus the
 * daily start/end times. When applied to a driver's Schedule, the
 * ScheduleService materialises ScheduleItem records for the rolling horizon.
 */
export default class ScheduleTemplateModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;

    /** @attributes */
    @attr('string') name;
    @attr('string') description;
    @attr('string') start_time; // HH:mm — e.g. "08:00"
    @attr('string') end_time; // HH:mm — e.g. "16:00"
    @attr('string') break_start_time; // HH:mm — e.g. "12:00" (optional)
    @attr('string') break_end_time; // HH:mm — e.g. "13:00" (optional)
    @attr('number') duration; // computed minutes (end - start)
    @attr('number') break_duration; // minutes
    @attr('string') rrule; // RFC 5545 RRULE string
    @attr('string') color; // hex color for calendar display
    @attr('object') meta;

    /** @relationships */
    @belongsTo('company', { async: true }) company;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') deleted_at;

    /**
     * Parse the RRULE string and return a human-readable summary.
     * e.g. "Weekly on Mon, Tue, Thu · 08:00–16:00"
     */
    get recurrenceSummary() {
        if (!this.rrule) return null;
        const dayMap = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
        const byday = this.rrule.match(/BYDAY=([^;]+)/);
        const days = byday
            ? byday[1]
                  .split(',')
                  .map((d) => dayMap[d] || d)
                  .join(', ')
            : '';
        const freq = this.rrule.match(/FREQ=(\w+)/);
        const freqLabel = freq ? freq[1].charAt(0) + freq[1].slice(1).toLowerCase() : '';
        const times = this.start_time && this.end_time ? ` · ${this.start_time}–${this.end_time}` : '';
        return `${freqLabel} on ${days}${times}`;
    }
}
