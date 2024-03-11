import Model, { attr } from '@ember-data/model';
import { computed } from '@ember/object';
import { getOwner } from '@ember/application';
import { format, formatDistanceToNow } from 'date-fns';

function isValidFileObjectJson(str) {
    return typeof str === 'string' && str.startsWith('{') && str.endsWith('}');
}

export default class CustomFieldValueModel extends Model {
    /** @ids */
    @attr('string') company_uuid;
    @attr('string') custom_field_uuid;
    @attr('string') subject_uuid;
    @attr('string') subject_type;

    /** @attributes */
    @attr('string') value;
    @attr('string') value_type;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;
    @attr('date') deleted_at;

    /** @computed */
    @computed('value') get asFile() {
        const owner = getOwner(this);
        const fetch = owner.lookup(`service:fetch`);
        const value = this.value;
        if (!isValidFileObjectJson(value)) {
            return null;
        }

        const fileModel = fetch.jsonToModel(value, 'file');
        return fileModel;
    }

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
