import Model, { attr, hasMany } from '@ember-data/model';
import { getOwner } from '@ember/application';

export default class DashboardModel extends Model {
    @attr('string') name;
    @hasMany('dashboard-widget') widgets;

    addWidget(widget) {
        const owner = getOwner(this);
        const store = owner.lookup('service:store');

        const widgetRecord = store.createRecord('dashboard-widget', widget);

        widgetRecord.dashboard = this;

        widgetRecord.save().then((widgetRecord) => {
            this.widgets.pushObject(widgetRecord);
        });
    }

    removeWidget(widget) {
        const owner = getOwner(this);
        const store = owner.lookup('service:store');

        const widgetRecord = store.peekRecord('dashboard-widget', widget);

        if (widgetRecord) {
            widgetRecord
                .destroyRecord()
                .then(() => {
                    this.widgets.removeObject(widgetRecord);
                })
                .catch((error) => {
                    console.error('Error removing widget:', error);
                });
        }
    }
}
