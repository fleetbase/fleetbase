import Model, { attr } from '@ember-data/model';
import { computed } from '@ember/object';
import { format, formatDistanceToNow } from 'date-fns';

export default class NotificationModel extends Model {
    @attr('string') notifiable_id;
    @attr('string') notifiable_type;

    /** @attributes */
    @attr('string') type;
    @attr('raw') data;
    @attr('raw') meta;

    /** @dates */
    @attr('date') read_at;
    @attr('date') created_at;

    /** @computed */
    @computed('created_at') get createdAgo() {
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        return format(this.created_at, 'PPP p');
    }

    @computed('read_at') get readAt() {
        return format(this.read_at, 'PPP p');
    }

    @computed('read_at') get isRead() {
        return this.read_at instanceof Date;
    }

    @computed('read_at') get read() {
        return this.read_at instanceof Date;
    }

    @computed('isRead') get unread() {
        return !this.get('isRead');
    }

    /** @actions */
    markAsRead() {
        if (this.isRead) {
            return;
        }

        this.set('read_at', new Date());
        return this.save();
    }
}
