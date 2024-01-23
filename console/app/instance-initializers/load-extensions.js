import loadExtensions from '@fleetbase/ember-core/utils/load-extensions';

export function initialize(owner) {
    const universe = owner.lookup('service:universe');

    loadExtensions().then((extensions) => {
        extensions.forEach((extension) => {
            universe.loadEngine(extension.name).then((engineInstance) => {
                if (engineInstance.base && engineInstance.base.setupExtension) {
                    engineInstance.base.setupExtension(owner, engineInstance, universe);
                }
            });
        });
    });
}

export default {
    initialize,
};
