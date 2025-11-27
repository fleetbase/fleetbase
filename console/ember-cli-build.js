'use strict';

/** eslint-disable node/no-unpublished-require */
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const ExtensionDiscoveryPlugin = require('./lib/build-plugins/extension-discovery');
const ExtensionShimGeneratorPlugin = require('./lib/build-plugins/extension-shim-generator');
const ExtensionLoadersGeneratorPlugin = require('./lib/build-plugins/extension-loaders-generator');
const RouterGeneratorPlugin = require('./lib/build-plugins/router-generator');
const Funnel = require('broccoli-funnel');
const mergeTrees = require('broccoli-merge-trees');
const writeFile = require('broccoli-file-creator');
const postcssImport = require('postcss-import');
const postcssPresetEnv = require('postcss-preset-env');
const postcssEach = require('postcss-each');
const postcssMixins = require('postcss-mixins');
const postcssConditionals = require('postcss-conditionals-renewed');
const postcssAtRulesVariables = require('postcss-at-rules-variables');
const autoprefixer = require('autoprefixer');
const tailwind = require('tailwindcss');
const toBoolean = require('./config/utils/to-boolean');
const environment = process.env.EMBER_ENV;

module.exports = function (defaults) {
    const app = new EmberApp(defaults, {
        storeConfigInMeta: false,

        fingerprint: {
            exclude: ['leaflet/', 'leaflet-images/', 'socketcluster-client.min.js'],
        },

        liveReload: {
            options: {
                ignore: ['app/router.js'],
            },
        },

        'ember-simple-auth': {
            useSessionSetupMethod: true,
        },

        postcssOptions: {
            compile: {
                enabled: true,
                cacheInclude: [/.*\.(css|scss|hbs)$/, /.*\/tailwind\/config\.js$/, /.*tailwind\.js$/],
                plugins: [
                    postcssAtRulesVariables,
                    postcssImport({
                        path: ['node_modules'],
                        plugins: [postcssAtRulesVariables, postcssImport],
                    }),
                    postcssMixins,
                    postcssPresetEnv({ stage: 1 }),
                    postcssEach,
                    tailwind('./tailwind.config.js'),
                    autoprefixer,
                ],
            },
            filter: {
                enabled: true,
                plugins: [postcssAtRulesVariables, postcssMixins, postcssEach, postcssConditionals, tailwind('./tailwind.config.js')],
            },
        },

        babel: {
            plugins: [require.resolve('ember-auto-import/babel-plugin')],
        },

        autoImport: {
            // Allow dynamic imports of app/extensions/* files
            // This is required for the extension setup code to be bundled
            // by ember-auto-import and loaded via dynamic import()
            allowAppImports: ['extensions/*'],

            // Optional: Configure webpack for better code splitting
            webpack: {
                optimization: {
                    splitChunks: {
                        chunks: 'all',
                        cacheGroups: {
                            // Group all extension files into a single chunk
                            extensions: {
                                test: /[\\/]app[\\/]extensions[\\/]/,
                                name: 'extensions',
                                priority: 10,
                            },
                        },
                    },
                },
            },
        },
    });

    // ============================================================================
    // FLEETBASE EXTENSION BUILD PLUGINS
    // ============================================================================
    // Discover all Fleetbase extensions
    const extensionDiscovery = new ExtensionDiscoveryPlugin([], {
        projectRoot: __dirname,
        annotation: 'Discover Fleetbase Extensions',
    });

    // Generate extension shim files
    const extensionShims = new ExtensionShimGeneratorPlugin([extensionDiscovery], {
        projectRoot: __dirname,
        annotation: 'Generate Extension Shims',
    });

    // Generate extension loaders map
    const extensionLoaders = new ExtensionLoadersGeneratorPlugin([extensionDiscovery], {
        projectRoot: __dirname,
        annotation: 'Generate Extension Loaders',
    });

    // Generate router with engine mounts
    const router = new RouterGeneratorPlugin([extensionDiscovery], {
        projectRoot: __dirname,
        routerMapFile: __dirname + '/router.map.js',
        annotation: 'Generate Router with Engine Mounts',
    });

    // ============================================================================
    // FUNNEL GENERATED FILES INTO APP TREE
    // ============================================================================
    // Funnel extension shims to app/extensions/
    const extensionShimsTree = new Funnel(extensionShims, {
        destDir: 'app',
    });

    // Funnel extension loaders to app/utils/
    const extensionLoadersTree = new Funnel(extensionLoaders, {
        destDir: 'app',
    });

    // Funnel router to app
    const routerTree = new Funnel(router, {
        destDir: 'app',
    });

    // Generated extension files
    const extensions = mergeTrees([extensionShimsTree, extensionLoadersTree, routerTree], {
        overwrite: true,
        annotation: 'Merge Extension Generated Files',
    });

    // let extensions = new FleetbaseExtensionsIndexer();
    let runtimeConfigTree;
    if (toBoolean(process.env.DISABLE_RUNTIME_CONFIG)) {
        runtimeConfigTree = writeFile('fleetbase.config.json', '{}');
    } else {
        runtimeConfigTree = new Funnel('.', {
            files: ['fleetbase.config.json'],
            destDir: '/',
        });
    }

    return app.toTree([extensions, runtimeConfigTree].filter(Boolean));
};
