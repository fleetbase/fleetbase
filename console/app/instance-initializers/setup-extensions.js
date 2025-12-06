/**
 * Setup extensions by loading and executing their extension.js files
 * Runs after extensions are loaded from API
 */
export async function initialize(appInstance) {
    const universe = appInstance.lookup('service:universe');
    const extensionManager = appInstance.lookup('service:universe/extension-manager');

    await extensionManager.setupExtensions(appInstance, universe);
}

export default {
    name: 'setup-extensions',
    after: ['load-extensions', 'initialize-registries', 'initialize-widgets'],
    initialize,
};
