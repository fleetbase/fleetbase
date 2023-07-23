import Engine from '@ember/engine';
import loadInitializers from 'ember-load-initializers';
import Resolver from 'ember-resolver';
import config from './config/environment';
import services from '@fleetbase/ember-core/exports/services';

const { modulePrefix } = config;
const externalRoutes = ['console', 'extensions'];

export default class FleetbaseEngine extends Engine {
    modulePrefix = modulePrefix;
    Resolver = Resolver;
    dependencies = {
        services,
        externalRoutes,
    };
    setupExtension(app, engine, universe) {
        // do some setup stuff here
        // you can register your extensions menu item using the universe service like so
        // universe.registerHeaderMenuItem('My Extension');
    }
}

loadInitializers(FleetbaseEngine, modulePrefix);
