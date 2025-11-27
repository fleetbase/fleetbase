'use strict';

const ExtensionDiscoveryPlugin = require('./plugins/extension-discovery');
const ExtensionShimGeneratorPlugin = require('./plugins/extension-shim-generator');
const ExtensionLoadersGeneratorPlugin = require('./plugins/extension-loaders-generator');
const RouterGeneratorPlugin = require('./plugins/router-generator');
const Funnel = require('broccoli-funnel');
const mergeTrees = require('broccoli-merge-trees');

console.log('[fleetbase-extensions-generator] loaded at startup');
module.exports = {
    name: 'fleetbase-extensions-generator',

    isDevelopingAddon() {
        return true; // useful for live reload when developing
    },

    treeForApp(appTree) {
        console.log(`[fleetbase-extensions-generator] treeForApp called`);
        // 1. run extension discovery + generation
        let extensionDiscovery = new ExtensionDiscoveryPlugin([], {
            projectRoot: this.project.root,
            annotation: 'Discover Fleetbase Extensions',
        });
        console.log(`[fleetbase-extensions-generator] extensionDiscovery`, extensionDiscovery);

        let extensionShims = new ExtensionShimGeneratorPlugin([extensionDiscovery], {
            projectRoot: this.project.root,
            annotation: 'Generate extension shims',
        });
        console.log(`[fleetbase-extensions-generator] extensionShims`, extensionShims);

        let extensionLoaders = new ExtensionLoadersGeneratorPlugin([extensionDiscovery], {
            projectRoot: this.project.root,
            annotation: 'Generate extension loaders module',
        });

        let routerGen = new RouterGeneratorPlugin([extensionDiscovery], {
            projectRoot: this.project.root,
            annotation: 'Generate router with extension mounts',
        });

        // 2. funnel outputs into proper subpaths mimicking app/
        let generated = mergeTrees([new Funnel(extensionShims, { destDir: 'extensions' }), new Funnel(extensionLoaders, { destDir: 'utils' }), new Funnel(routerGen, { destDir: '' })], {
            overwrite: true,
            annotation: 'Merge generated extension files into app tree',
        });

        // 3. merge with existing appTree
        return mergeTrees([appTree, generated], { overwrite: true });
    },

    treeForPublic(publicTree) {
        console.log(`[fleetbase-extensions-generator] treeForPublic called`);
        // expose the extensions manifest to dist/
        let extensionDiscovery = new ExtensionDiscoveryPlugin([], {
            projectRoot: this.project.root,
            annotation: 'Discover Fleetbase Extensions (public)',
        });

        // funnel just extensions.json to root
        let manifest = new Funnel(extensionDiscovery, {
            srcDir: '/',
            files: ['extensions.json'],
            destDir: '/',
        });

        return publicTree ? mergeTrees([publicTree, manifest], { overwrite: true }) : manifest;
    },
};
