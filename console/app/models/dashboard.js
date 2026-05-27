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

        // The registry slug (e.g. 'fleet-ops-kpi-earnings-widget') is shared across every
        // dashboard that consumes the widget; if it lands in the Ember Data record id we
        // collide on the second add. Strip it, let Ember Data assign a UUID, and stash
        // the slug under options.widget_key so persisted records can be resolved back to
        // their registry definition on reload.
        // eslint-disable-next-line no-unused-vars
        const { id: widgetKey, default: _isDefault, ...rest } = widget;
        const widgetRecord = store.createRecord('dashboard-widget', {
            ...rest,
            options: { ...(rest.options ?? {}), widget_key: widgetKey },
            dashboard: this,
        });

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
        const universe = owner.lookup('service:universe');
        if (universe) {
            return universe.getDashboardRegistry(this.id);
        }

        return undefined;
    }
}
