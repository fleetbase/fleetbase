import Model, { attr } from '@ember-data/model';

export default class ActivityModel extends Model {
    @attr('string') uuid;
    @attr('string') log_name;
    @attr('string') description;
    @attr('string') company_id;
    @attr('string') subject_id;
    @attr('string') subject_type;
    @attr('string') humanized_subject_type;
    @attr('string') event;
    @attr('string') causer_id;
    @attr('string') causer_type;
    @attr('string') humanized_causer_type;
    @attr('object') properties;
    @attr('object') causer;
    @attr('object') subject;
    @attr('date') created_at;
    @attr('date') updated_at;
}
