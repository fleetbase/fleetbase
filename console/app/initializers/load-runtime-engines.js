import { prepareRuntimeEngines } from '@fleetbase/ember-core/utils/runtime-engines';
import { debug } from '@ember/debug';

/**
 * Load Runtime Engines Initializer
 *
 * Prepares the prebuilt engine releases installed on this instance (the
 * runtime manifest from `~registry/v1/engines/runtime`) before the app boots:
 * their route maps and host modules must be defined, and their mounts added
 * to the router map, before the router is set up. Waits for the runtime
 * config, which carries the API host. See @fleetbase/ember-core's
 * docs/runtime-engines.md.
 *
 * @export
 * @param {Application} application
 * @return {Promise<void>}
 */
export function initialize(application) {
    application.deferReadiness();

    return Promise.resolve(application.runtimeConfigLoaded)
        .then(() => prepareRuntimeEngines(application))
        .then((engines) => debug(`[Runtime Engines] ${engines.length} runtime engine(s) ready`))
        .catch((error) => console.error('[Runtime Engines] Failed to load runtime engines:', error))
        .finally(() => application.advanceReadiness());
}

export default {
    name: 'load-runtime-engines',
    after: 'load-runtime-config',
    initialize,
};
