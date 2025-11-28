import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import config from '@fleetbase/console/config/environment';

export default class App extends Application {
    modulePrefix = config.modulePrefix;
    podModulePrefix = config.podModulePrefix;
    Resolver = Resolver;
    extensions = [];
    engines = {};
}

// Load all initializers (including our new load-runtime-config initializer)
loadInitializers(App, config.modulePrefix);
