import Model, { attr, hasMany } from '@ember-data/model';
import { getOwner } from '@ember/application';

export default class DashboardModel extends Model {
    @attr('string') uuid;
    @attr('boolean') is_default;
    @attr('string') name;
    @attr('string') owner_uuid;
    @hasMany('dashboard-widget') widgets;

    addWidget(widget) {
        const owner = getOwner(this);
        const store = owner.lookup('service:store');

        const widgetRecord = store.createRecord('dashboard-widget', widget);

        widgetRecord.dashboard = this;
        console.log(widgetRecord);
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
}
