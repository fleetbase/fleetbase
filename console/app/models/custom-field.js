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
    @attr('string') for;
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
    @computed('type') get valueType() {
        if (this.type === 'file-upload') return 'file';
        if (this.type === 'date-time-input') return 'date';
        if (this.type === 'model-select') return 'model';

        return 'text';
    }

    @computed('created_at') get createdAgo() {
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        return format(this.created_at, 'yyyy-MM-dd HH:mm');
    }

    @computed('updated_at') get updatedAgo() {
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        return format(this.updated_at, 'yyyy-MM-dd HH:mm');
    }
}
