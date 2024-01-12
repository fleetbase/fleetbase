import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import config from '@fleetbase/console/config/environment';
import loadExtensions from '@fleetbase/ember-core/utils/load-extensions';
import mapEngines from '@fleetbase/ember-core/utils/map-engines';

export default class App extends Application {
    modulePrefix = config.modulePrefix;
    podModulePrefix = config.podModulePrefix;
    Resolver = Resolver;
    extensions = [];
    engines = {};

    async ready() {
        const extensions = await loadExtensions();

        this.extensions = extensions;
        this.engines = mapEngines(extensions);
    }
}

loadInitializers(App, config.modulePrefix);
