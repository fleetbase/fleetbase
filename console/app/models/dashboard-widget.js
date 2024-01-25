import Model, { attr, belongsTo } from '@ember-data/model';

export default class DashboardWidgetModel extends Model {
    @attr('string') name;
    @attr('string') component;
    @attr('object') grid_options;
    @attr('object') options;
    @belongsTo('dashboard') dashboard;
    @attr('string') dashboard_uuid;
}
