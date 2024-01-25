import Model, { attr, hasMany } from '@ember-data/model';
import { getOwner } from '@ember/application';

export default class DashboardModel extends Model {
    @attr('string') name;
    @hasMany('dashboard-widget') widgets;

    addWidget(widget) {
        const owner = getOwner(this);
        const store = owner.lookup('service:store');

        // create widget model instance
        const widgetRecord = store.createRecord('dashboard-widget', widget);

        widgetRecord.save().then((widgetRecord) => {
            this.widgets.pushObject(widgetRecord);
        });
    }
}
