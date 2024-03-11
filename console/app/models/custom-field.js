import Model, { attr } from '@ember-data/model';
import { computed } from '@ember/object';
import { format, formatDistanceToNow } from 'date-fns';

export default class CustomFieldModel extends Model {
    /** @ids */
    @attr('string') company_uuid;
    @attr('string') category_uuid;
    @attr('string') subject_uuid;
    @attr('string') subject_type;

    /** @attributes */
    @attr('string') name;
    @attr('string') description;
    @attr('string') help_text;
    @attr('string') label;
    @attr('string') type;
    @attr('string') component;
    @attr('string') default_value;
    @attr('number') order;
    @attr('boolean') required;
    @attr('boolean', { defaultValue: true }) editable;
    @attr('raw') options;
    @attr('raw') validation_rules;
    @attr('raw') meta;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') deleted_at;

    /** @computed */
    @computed('created_at') get createdAgo() {
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        return format(this.created_at, 'PPP p');
    }

    @computed('updated_at') get updatedAgo() {
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        return format(this.updated_at, 'PPP p');
    }
}
