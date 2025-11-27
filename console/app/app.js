import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import config from '@fleetbase/console/config/environment';
import loadExtensions from '@fleetbase/ember-core/utils/load-extensions';
import mapEngines from '@fleetbase/ember-core/utils/map-engines';
import loadRuntimeConfig from '@fleetbase/console/utils/runtime-config';
import applyRouterFix from './utils/router-refresh-patch';

export default class App extends Application {
    modulePrefix = config.modulePrefix;
    podModulePrefix = config.podModulePrefix;
    Resolver = Resolver;
    extensions = [];
    engines = {};

    async ready() {
        console.log('[app.ready] Has been called!');
        applyRouterFix(this);

        // Extensions are now loaded in the initialize-universe initializer
        // This hook can be used for other ready-time setup if needed
        console.log('[app.ready] Application ready with extensions:', this.extensions);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadRuntimeConfig();
    loadInitializers(App, config.modulePrefix);

    const Fleetbase = App.create();
    Fleetbase.deferReadiness();
    Fleetbase.boot();
});
