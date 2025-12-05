import Model, { attr, belongsTo } from '@ember-data/model';

export default class ScheduleItemModel extends Model {
    @attr('string') public_id;
    @attr('string') schedule_uuid;
    @attr('string') assignee_uuid;
    @attr('string') assignee_type;
    @attr('string') resource_uuid;
    @attr('string') resource_type;
    @attr('date') start_at;
    @attr('date') end_at;
    @attr('number') duration;
    @attr('date') break_start_at;
    @attr('date') break_end_at;
    @attr('string', { defaultValue: 'pending' }) status;
    @attr('object') meta;

    @belongsTo('schedule') schedule;

    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') deleted_at;
}
