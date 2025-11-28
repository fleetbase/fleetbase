'use strict';

/** eslint-disable node/no-unpublished-require */
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
// const ExtensionDiscoveryPlugin = require('./lib/build-plugins/extension-discovery');
// const ExtensionShimGeneratorPlugin = require('./lib/build-plugins/extension-shim-generator');
// const ExtensionLoadersGeneratorPlugin = require('./lib/build-plugins/extension-loaders-generator');
// const RouterGeneratorPlugin = require('./lib/build-plugins/router-generator');
const Funnel = require('broccoli-funnel');
const writeFile = require('broccoli-file-creator');
const mergeTrees = require('broccoli-merge-trees');
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
            exclude: [
                'leaflet/', 
                'leaflet-images/', 
                'socketcluster-client.min.js',
                'fleetbase.config.json',
                'extensions.json'
            ],
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
        }
    });

    // const extensionDiscovery = new ExtensionDiscoveryPlugin([], {
    //     projectRoot: __dirname,
    //     annotation: 'Discover Fleetbase Extensions',
    // });

    // const extensionShims = new ExtensionShimGeneratorPlugin([extensionDiscovery], {
    //     projectRoot: __dirname,
    //     annotation: 'Generate Extension Shims',
    // });

    // const extensionLoaders = new ExtensionLoadersGeneratorPlugin([extensionDiscovery], {
    //     projectRoot: __dirname,
    //     annotation: 'Generate Extension Loaders',
    // });

    // const router = new RouterGeneratorPlugin([extensionDiscovery], {
    //     projectRoot: __dirname,
    //     annotation: 'Generate Router with Extension Mounts',
    // });

    // const generatedAppTree = mergeTrees(
    //     [
    //         new Funnel(extensionShims, {
    //             srcDir: 'extensions',
    //             destDir: 'extensions',
    //         }),
    //         new Funnel(extensionLoaders, {
    //             srcDir: 'utils',
    //             destDir: 'utils',
    //         }),
    //         new Funnel(router, {
    //             srcDir: '/',
    //             destDir: '/',
    //         }),
    //     ],
    //     {
    //         overwrite: true,
    //         annotation: 'Merge Extension Generated Files into app tree',
    //     }
    // );

    // app.trees.app = mergeTrees([app.trees.app, generatedAppTree], { overwrite: true });

    // const extensionManifestTree = new Funnel(extensionDiscovery, {
    //     srcDir: '/',
    //     files: ['extensions.json'],
    //     destDir: '/',
    // });

    let runtimeConfigTree;
    if (toBoolean(process.env.DISABLE_RUNTIME_CONFIG)) {
        runtimeConfigTree = writeFile('fleetbase.config.json', '{}');
    } else {
        runtimeConfigTree = new Funnel('.', {
            files: ['fleetbase.config.json'],
            destDir: '/',
        });
    }

    return app.toTree([runtimeConfigTree].filter(Boolean));
};
