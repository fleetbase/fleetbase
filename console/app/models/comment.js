import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { format, formatDistanceToNow } from 'date-fns';

export default class CommentModel extends Model {
    /** @ids */
    @attr('string') company_uuid;
    @attr('string') parent_comment_uuid;
    @attr('string') subject_uuid;
    @attr('string') subject_type;

    /** @relationships */
    @belongsTo('user') author;
    @belongsTo('comment', { inverse: 'replies' }) parent;
    @hasMany('comment', { inverse: 'parent' }) replies;

    /** @attributes */
    @attr('string') content;
    @attr('boolean') editable;
    @attr('raw') tags;
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
