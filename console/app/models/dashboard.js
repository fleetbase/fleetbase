import Model, { attr, hasMany } from '@ember-data/model';
import { computed } from '@ember/object';
import { format, formatDistanceToNow } from 'date-fns';
import { getOwner } from '@ember/application';

export default class DashboardModel extends Model {
    /** @ids */
    @attr('string') company_uuid;
    @attr('string') user_uuid;

    /** @relationships */
    @hasMany('dashboard-widget', { async: false }) widgets;

    /** @attributes */
    @attr('string') name;
    @attr('string') extension;
    @attr('boolean') is_default;
    @attr('array') tags;
    @attr('object') options;
    @attr('object') meta;

    /** @dates */
    @attr('date') created_at;
    @attr('date') updated_at;

    /** @computed */
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

    /** @methods */
    addWidget(widget) {
        const owner = getOwner(this);
        const store = owner.lookup('service:store');
        const widgetRecord = store.createRecord('dashboard-widget', { ...widget, dashboard: this });

        return new Promise((resolve, reject) => {
            widgetRecord
                .save()
                .then((widgetRecord) => {
                    this.widgets.pushObject(widgetRecord);
                    resolve(widgetRecord);
                })
                .catch((error) => {
                    store.unloadRecord(widgetRecord);
                    reject(error);
                });
        });
    }

    removeWidget(widget) {
        const owner = getOwner(this);
        const store = owner.lookup('service:store');
        const widgetRecord = store.peekRecord('dashboard-widget', widget);

        if (widgetRecord) {
            return new Promise((resolve, reject) => {
                widgetRecord
                    .destroyRecord()
                    .then(() => {
                        this.widgets.removeObject(widgetRecord);
                        resolve();
                    })
                    .catch((error) => {
                        reject(error);
                    });
            });
        }
    }

    getRegistry() {
        const owner = getOwner(this);
        const widgetService = owner.lookup('service:universe/widget-service');
        if (widgetService) {
            return widgetService.getRegistry(this.id);
        }

        return undefined;
    }
}
