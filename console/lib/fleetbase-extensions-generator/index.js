/* eslint-env node */
'use strict';

const discoverExtensions = require('./utils/discover-extensions');
const generateExtensionShims = require('./utils/generate-extension-shims');
const generateExtensionLoaders = require('./utils/generate-extension-loaders');
const generateRouter = require('./utils/generate-router');
const generateExtensionsManifest = require('./utils/generate-manifest');
const watchExtensions = require('./utils/watch-extensions');

module.exports = {
    name: require('./package').name,

    /**
     * Hook that runs when the addon is included in the build
     */
    included(app) {
        this._super.included.apply(this, arguments);

        console.log('[fleetbase-extensions-generator] ========================================');
        console.log('[fleetbase-extensions-generator] Generating Fleetbase extension files...');
        console.log('[fleetbase-extensions-generator] ========================================');

        // Discover extensions
        console.log('[fleetbase-extensions-generator] Discovering extensions...');
        const extensions = discoverExtensions(this.project.root);
        console.log('[fleetbase-extensions-generator] Found', extensions.length, 'extension(s)');

        if (extensions.length === 0) {
            console.log('[fleetbase-extensions-generator] No extensions found, skipping generation');
            console.log('[fleetbase-extensions-generator] ========================================');
            return;
        }

        // Generate all files
        this.generateAllFiles(extensions);

        // Watch for changes in development
        watchExtensions(this.project.root, extensions, () => {
            this.generateAllFiles(extensions);
        });

        console.log('[fleetbase-extensions-generator] ========================================');
    },

    /**
     * Generate all extension files
     */
    generateAllFiles(extensions) {
        generateExtensionShims(this.project.root, extensions);
        generateExtensionLoaders(this.project.root, extensions);
        generateRouter(this.project.root, extensions);
        generateExtensionsManifest(this.project.root, extensions);
    },
};
