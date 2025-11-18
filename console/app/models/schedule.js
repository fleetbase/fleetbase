import Model, { attr, hasMany, belongsTo } from '@ember-data/model';

export default class ScheduleModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') company_uuid;
    @attr('string') subject_uuid;
    @attr('string') subject_type;

    /** @attributes */
    @attr('string') name;
    @attr('string') description;
    @attr('date') start_date;
    @attr('date') end_date;
    @attr('string') timezone;
    @attr('string', { defaultValue: 'draft' }) status;
    @attr('object') meta;

    /** @relationships */
    @hasMany('schedule-item') items;
    @belongsTo('company') company;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') deleted_at;
}
