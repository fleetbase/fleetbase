import Engine from '@ember/engine';
import loadInitializers from 'ember-load-initializers';
import Resolver from 'ember-resolver';
import config from './config/environment';
import services from '@fleetbase/ember-core/exports/services';
import WidgetIamMetricsComponent from './components/widget/iam-metrics';

const { modulePrefix } = config;
const externalRoutes = ['console', 'extensions'];

export default class IAMEngine extends Engine {
    modulePrefix = modulePrefix;
    Resolver = Resolver;
    dependencies = {
        services,
        externalRoutes,
    };
    setupExtension = function (app, engine, universe) {
        // register menu item in header
        universe.registerHeaderMenuItem('IAM', 'console.iam', { icon: 'users', priority: 3 });
        // register metrics widget
        const IamMetricsWidgetDefinition = {
            widgetId: 'iam-metrics-widget',
            name: 'IAM Metrics',
            description: 'IAM usage metrics.',
            icon: 'user-shield',
            component: WidgetIamMetricsComponent,
            grid_options: { w: 6, h: 8, minW: 6, minH: 8 },
            options: {
                title: 'IAM Metrics',
            },
        };
        universe.registerDashboardWidgets([IamMetricsWidgetDefinition]);
    };
}

loadInitializers(IAMEngine, modulePrefix);
