import Model, { attr, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { format, formatDistanceToNow } from 'date-fns';

export default class TemplateModel extends Model {
    /** @ids */
    @attr('string') public_id;
    @attr('string') uuid;
    @attr('string') company_uuid;
    @attr('string') created_by_uuid;

    /** @relationships */
    @hasMany('template-query', { async: false, inverse: 'template' }) queries;

    /** @attributes */
    @attr('string') name;
    @attr('string') description;
    @attr('string') context_type;
    @attr('string', { defaultValue: 'A4' }) paper_size;
    @attr('string', { defaultValue: 'portrait' }) orientation;
    @attr('number') width;
    @attr('number') height;
    @attr('string', { defaultValue: 'mm' }) unit;
    @attr('string', { defaultValue: '#ffffff' }) background_color;
    @attr('array') content;
    @attr('boolean', { defaultValue: false }) is_default;
    @attr('string', { defaultValue: 'draft' }) status;
    @attr('object') meta;

    /** @dates */
    @attr('date') deleted_at;
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('status') get isDraft() {
        return this.status === 'draft';
    }

    @computed('status') get isPublished() {
        return this.status === 'published';
    }

    @computed('paper_size', 'orientation') get dimensionLabel() {
        if (this.paper_size === 'custom') {
            return `${this.width} × ${this.height} ${this.unit}`;
        }
        return `${this.paper_size} (${this.orientation})`;
    }

    @computed('updated_at') get updatedAgo() {
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        return format(this.updated_at, 'yyyy-MM-dd HH:mm');
    }

    @computed('updated_at') get updatedAtShort() {
        return format(this.updated_at, 'PP');
    }

    @computed('created_at') get createdAgo() {
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        return format(this.created_at, 'yyyy-MM-dd HH:mm');
    }

    @computed('created_at') get createdAtShort() {
        return format(this.created_at, 'PP');
    }
}
