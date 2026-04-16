import Model, { attr, belongsTo } from '@ember-data/model';

/**
 * ScheduleException
 *
 * Represents a deviation from a driver's recurring schedule — time off requests,
 * sick leave, holidays, shift swaps, training days, or other exceptions.
 *
 * An exception is submitted by a driver or dispatcher, then approved or rejected
 * by a manager. When approved, all ScheduleItem records that fall within the
 * exception's date range are automatically cancelled.
 *
 * @see core-api ScheduleException model
 */
export default class ScheduleExceptionModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') schedule_uuid;
    @attr('string') subject_uuid;
    @attr('string') subject_type;
    @attr('string') requested_by_uuid;

    /** @attributes */
    @attr('string', { defaultValue: 'time_off' }) type;
    @attr('string', { defaultValue: 'pending' }) status;
    @attr('date') start_at;
    @attr('date') end_at;
    @attr('string') reason;
    @attr('string') notes;
    @attr('string') rejection_reason;
    @attr('date') reviewed_at;
    @attr('string') reviewed_by_uuid;

    /** @meta */
    @attr('object') meta;

    /** @relationships */
    @belongsTo('schedule', { async: true }) schedule;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') deleted_at;

    /** @computed */
    get isPending() {
        return this.status === 'pending';
    }

    get isApproved() {
        return this.status === 'approved';
    }

    get isRejected() {
        return this.status === 'rejected';
    }

    get typeLabel() {
        const labels = {
            time_off: 'Time Off',
            sick_leave: 'Sick Leave',
            holiday: 'Holiday',
            swap: 'Shift Swap',
            training: 'Training',
            other: 'Other',
        };
        return labels[this.type] || this.type;
    }
}
