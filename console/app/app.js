import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import config from '@fleetbase/console/config/environment';
import loadExtensions from '@fleetbase/ember-core/utils/load-extensions';
import mapEngines from '@fleetbase/ember-core/utils/map-engines';
import { set } from '@ember/object';
import { debug } from '@ember/debug';

async function loadRuntimeConfig() {
    try {
        const response = await fetch(`/fleetbase.config.json?_t=${Date.now()}`, { cache: 'no-cache' });
        if (!response.ok) {
            debug('No fleetbase.config.json found, using built-in config defaults');
            return;
        }

        const runtimeConfig = await response.json();
        for (const [path, value] of Object.entries(runtimeConfig)) {
            set(config, path, value);
        }
    } catch (e) {
        debug(`Failed to load runtime config : ${e.message}`);
    }
}

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

document.addEventListener('DOMContentLoaded', async () => {
    await loadRuntimeConfig();
    loadInitializers(App, config.modulePrefix);

    let fleetbase = App.create();
    fleetbase.deferReadiness();
    fleetbase.boot();
});