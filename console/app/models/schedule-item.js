import Model, { attr, belongsTo } from '@ember-data/model';

export default class ScheduleItemModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') schedule_uuid;
    @attr('string') schedule_template_uuid;
    @attr('string') assignee_uuid;
    @attr('string') assignee_type;
    @attr('string') resource_uuid;
    @attr('string') resource_type;
    @attr('date') start_at;
    @attr('date') end_at;
    @attr('number') duration;
    @attr('date') break_start_at;
    @attr('date') break_end_at;
    @attr('string') title;
    @attr('string', { defaultValue: 'scheduled' }) status;
    @attr('string') notes;

    /** @exception fields */
    @attr('boolean', { defaultValue: false }) is_exception;
    @attr('date') exception_for_date;

    /** @meta */
    @attr('object') meta;

    /** @relationships */
    @belongsTo('schedule', { async: true }) schedule;
    @belongsTo('schedule-template', { async: true }) scheduleTemplate;

    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') deleted_at;
}
