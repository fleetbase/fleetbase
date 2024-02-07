import Model, { attr, belongsTo } from '@ember-data/model';
import { computed } from '@ember/object';
import { format, formatDistanceToNow } from 'date-fns';

export default class DashboardWidgetModel extends Model {
    /** @ids */
    @attr('string') dashboard_uuid;

    /** @relationships */
    @belongsTo('dashboard') dashboard;

    /** @attributes */
    @attr('string') name;
    @attr('string') component;
    @attr('object') grid_options;
    @attr('object') options;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
    @computed('updated_at') get updatedAgo() {
        return formatDistanceToNow(this.updated_at);
    }

    @computed('updated_at') get updatedAt() {
        return format(this.updated_at, 'PPP p');
    }

    @computed('updated_at') get updatedAtShort() {
        return format(this.updated_at, 'PP');
    }

    @computed('created_at') get createdAgo() {
        return formatDistanceToNow(this.created_at);
    }

    @computed('created_at') get createdAt() {
        return format(this.created_at, 'PPP p');
    }

    @computed('created_at') get createdAtShort() {
        return format(this.created_at, 'PP');
    }

    /**
     * Update the dashboard widget properties on the server
     *
     * @param {Object} [properties={}]
     * @return {Promise<DashboardWidgetModel>}
     * @memberof DashboardWidgetModel
     */
    updateProperties(properties = {}) {
        this.setProperties(properties);
        return this.save();
    }
}
