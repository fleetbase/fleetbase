import Model, { attr } from '@ember-data/model';

export default class ScheduleAvailabilityModel extends Model {
    @attr('string') subject_uuid;
    @attr('string') subject_type;
    @attr('date') start_at;
    @attr('date') end_at;
    @attr('boolean', { defaultValue: true }) is_available;
    @attr('number') preference_level;
    @attr('string') rrule;
    @attr('string') reason;
    @attr('string') notes;
    @attr('object') meta;
    
    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') deleted_at;
}
