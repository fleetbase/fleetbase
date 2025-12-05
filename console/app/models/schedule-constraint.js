import Model, { attr, belongsTo } from '@ember-data/model';

export default class ScheduleConstraintModel extends Model {
    @attr('string') company_uuid;
    @attr('string') subject_uuid;
    @attr('string') subject_type;
    @attr('string') name;
    @attr('string') description;
    @attr('string') type;
    @attr('string') category;
    @attr('string') constraint_key;
    @attr('string') constraint_value;
    @attr('string') jurisdiction;
    @attr('number', { defaultValue: 0 }) priority;
    @attr('boolean', { defaultValue: true }) is_active;
    @attr('object') meta;

    @belongsTo('company') company;

    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') deleted_at;
}
