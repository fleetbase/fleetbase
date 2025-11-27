/**
 * Load extensions from the API using ExtensionManager
 * This must run before other initializers that depend on extensions
 */
export async function initialize(appInstance) {
    const application = appInstance.application;
    const extensionManager = appInstance.lookup('service:universe/extension-manager');

    if (!application.extensions || application.extensions.length === 0) {
        try {
            await extensionManager.loadExtensions(application);
        } catch (error) {
            console.error('[load-extensions] Error:', error);
        }
    }
}

export default {
    name: 'load-extensions',
    initialize
};

