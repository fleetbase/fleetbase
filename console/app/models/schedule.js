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

    /** @materialization tracking */
    @attr('date') last_materialized_at;
    @attr('number', { defaultValue: 60 }) materialization_horizon_days;

    /** @relationships */
    @hasMany('schedule-item', { async: true }) items;
    @hasMany('schedule-exception', { async: true }) exceptions;
    @belongsTo('company', { async: true }) company;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') deleted_at;
}
