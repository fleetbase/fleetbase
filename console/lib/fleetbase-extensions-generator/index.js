'use strict';

const ExtensionDiscoveryPlugin = require('./plugins/extension-discovery');
const ExtensionShimGeneratorPlugin = require('./plugins/extension-shim-generator');
const ExtensionLoadersGeneratorPlugin = require('./plugins/extension-loaders-generator');
const RouterGeneratorPlugin = require('./plugins/router-generator');
const Funnel = require('broccoli-funnel');
const mergeTrees = require('broccoli-merge-trees');

console.log('[fleetbase-extensions-generator] Addon loaded at startup');

module.exports = {
    name: 'fleetbase-extensions-generator',

    isDevelopingAddon() {
        return true; // useful for live reload when developing
    },

    treeForApp(appTree) {
        console.log('[fleetbase-extensions-generator] treeForApp() called');
        console.log('[fleetbase-extensions-generator] Project root:', this.project.root);
        
        // Step 1: Create Broccoli plugin instances
        console.log('[fleetbase-extensions-generator] Creating ExtensionDiscoveryPlugin...');
        let extensionDiscovery = new ExtensionDiscoveryPlugin([], {
            projectRoot: this.project.root,
            annotation: 'Discover Fleetbase Extensions',
        });

        console.log('[fleetbase-extensions-generator] Creating ExtensionShimGeneratorPlugin...');
        let extensionShims = new ExtensionShimGeneratorPlugin([extensionDiscovery], {
            projectRoot: this.project.root,
            annotation: 'Generate extension shims',
        });

        console.log('[fleetbase-extensions-generator] Creating ExtensionLoadersGeneratorPlugin...');
        let extensionLoaders = new ExtensionLoadersGeneratorPlugin([extensionDiscovery], {
            projectRoot: this.project.root,
            annotation: 'Generate extension loaders module',
        });

        console.log('[fleetbase-extensions-generator] Creating RouterGeneratorPlugin...');
        let routerGen = new RouterGeneratorPlugin([extensionDiscovery], {
            projectRoot: this.project.root,
            annotation: 'Generate router with extension mounts',
        });

        // Step 2: Funnel plugin outputs into proper app/ structure
        // 
        // Plugin outputs:
        //   - extensionShims:   outputPath/extensions/*.js
        //   - extensionLoaders: outputPath/utils/extension-loaders.generated.js
        //   - routerGen:        outputPath/router.js
        //
        // We want these in the app tree as:
        //   - app/extensions/*.js
        //   - app/utils/extension-loaders.generated.js
        //   - app/router.js
        
        console.log('[fleetbase-extensions-generator] Funneling extension shims from extensions/ to app/extensions/');
        let shimsFunneled = new Funnel(extensionShims, {
            srcDir: 'extensions',  // Files are in outputPath/extensions/
            destDir: 'extensions',  // Place at app/extensions/ in final tree
            annotation: 'Funnel extension shims'
        });

        console.log('[fleetbase-extensions-generator] Funneling extension loaders from utils/ to app/utils/');
        let loadersFunneled = new Funnel(extensionLoaders, {
            srcDir: 'utils',  // Files are in outputPath/utils/
            destDir: 'utils',  // Place at app/utils/ in final tree
            annotation: 'Funnel extension loaders'
        });

        console.log('[fleetbase-extensions-generator] Funneling router.js to app/router.js');
        let routerFunneled = new Funnel(routerGen, {
            srcDir: '/',  // Files are at outputPath root
            destDir: '',  // Place at app/ root in final tree
            annotation: 'Funnel router.js'
        });

        // Step 3: Merge all generated files into a single tree
        console.log('[fleetbase-extensions-generator] Merging generated files into single tree');
        let generated = mergeTrees(
            [shimsFunneled, loadersFunneled, routerFunneled],
            {
                overwrite: true,
                annotation: 'Merge generated extension files',
            }
        );

        // Step 4: Merge with existing appTree
        console.log('[fleetbase-extensions-generator] Merging generated tree with existing app tree');
        if (!appTree) {
            console.log('[fleetbase-extensions-generator] No existing appTree, returning generated tree only');
            return generated;
        }
        
        return mergeTrees([appTree, generated], {
            overwrite: true,
            annotation: 'Merge app tree with generated extensions'
        });
    },

    treeForPublic(publicTree) {
        console.log('[fleetbase-extensions-generator] treeForPublic() called');
        
        // Expose the extensions manifest to dist/extensions.json
        console.log('[fleetbase-extensions-generator] Creating ExtensionDiscoveryPlugin for public tree...');
        let extensionDiscovery = new ExtensionDiscoveryPlugin([], {
            projectRoot: this.project.root,
            annotation: 'Discover Fleetbase Extensions (public)',
        });

        // Funnel just extensions.json to dist root
        console.log('[fleetbase-extensions-generator] Funneling extensions.json to dist/');
        let manifest = new Funnel(extensionDiscovery, {
            srcDir: '/',
            files: ['extensions.json'],
            destDir: '/',
            annotation: 'Funnel extensions.json manifest'
        });

        if (!publicTree) {
            console.log('[fleetbase-extensions-generator] No existing publicTree, returning manifest only');
            return manifest;
        }

        console.log('[fleetbase-extensions-generator] Merging manifest with existing public tree');
        return mergeTrees([publicTree, manifest], {
            overwrite: true,
            annotation: 'Merge public tree with extensions manifest'
        });
    },
};
