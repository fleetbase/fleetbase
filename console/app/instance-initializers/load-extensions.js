import loadExtensions from '@fleetbase/ember-core/utils/load-extensions';
import { later } from '@ember/runloop';

export function initialize(owner) {
    later(
        this,
        () => {
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
        },
        600
    );
}

export default {
    initialize,
};
