import Model, { attr, belongsTo } from '@ember-data/model';

export default class ScheduleTemplateModel extends Model {
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') subject_uuid;
    @attr('string') subject_type;
    @attr('string') name;
    @attr('string') description;
    @attr('string') start_time;
    @attr('string') end_time;
    @attr('number') duration;
    @attr('number') break_duration;
    @attr('string') rrule;
    @attr('object') meta;

    @belongsTo('company') company;

    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') deleted_at;
}
