'use strict';

/** eslint-disable node/no-unpublished-require */
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
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

// Import Broccoli plugins
const ExtensionDiscoveryPlugin = require('./lib/build-plugins/extension-discovery');
const ExtensionShimGeneratorPlugin = require('./lib/build-plugins/extension-shim-generator');
const ExtensionLoadersGeneratorPlugin = require('./lib/build-plugins/extension-loaders-generator');
const RouterGeneratorPlugin = require('./lib/build-plugins/router-generator');

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
            allowAppImports: [
                'extensions/**',
                'utils/extension-loaders'
            ]
        },
    });

    // Step 1: Create extension discovery and generator instances
    const extensionDiscovery = new ExtensionDiscoveryPlugin([], {
        projectRoot: __dirname,
        annotation: "Discover Fleetbase Extensions",
    });

    const extensionShims = new ExtensionShimGeneratorPlugin([extensionDiscovery], {
        projectRoot: __dirname,
        annotation: "Generate Extension Shims",
    });

    const extensionLoaders = new ExtensionLoadersGeneratorPlugin([extensionDiscovery], {
        projectRoot: __dirname,
        annotation: "Generate Extension Loaders",
    });

    const router = new RouterGeneratorPlugin([extensionDiscovery], {
        projectRoot: __dirname,
        annotation: "Generate Router with Extension Mounts",
    });

    // Step 2: Build a "generated app" tree
    // The plugin outputs currently contain files relative to their own outputPath:
    // - extensionShims output: extensions/*.js
    // - extensionLoaders output: utils/extension-loaders.generated.js
    // - router output: router.js
    //
    // We want these to appear in the app source tree as:
    // - app/extensions/*.js
    // - app/utils/extension-loaders.generated.js
    // - app/router.js
    //
    // To achieve this, we build a merged tree whose paths mirror app/ structure:
    const generatedAppTree = mergeTrees(
        [
            // app/extensions/*.js
            // extensionShims writes to outputPath/extensions/*.js
            // We want these files at app/extensions/*.js in the final tree
            new Funnel(extensionShims, {
                srcDir: "extensions",
                destDir: "extensions",
            }),

            // app/utils/extension-loaders.generated.js
            // extensionLoaders writes to outputPath/utils/*.js
            new Funnel(extensionLoaders, {
                srcDir: "utils",
                destDir: "utils",
            }),

            // app/router.js
            // router writes to outputPath/router.js
            new Funnel(router, {
                srcDir: "/",
                destDir: "/",
            }),
        ],
        {
            overwrite: true,
            annotation: "Merge Extension Generated Files into app tree",
        }
    );

    // Step 3: Merge generatedAppTree into app.trees.app
    // Before calling app.toTree(), we must ensure that app.trees.app includes the generated files.
    app.trees.app = mergeTrees(
        [app.trees.app, generatedAppTree],
        { overwrite: true }
    );

    // This makes Ember treat the generated files as if they had been in the app/ directory from the beginning.

    // Step 4: Expose extensions.json as dist/extensions.json
    // We also want the discovery manifest to be accessible at dist/extensions.json. To do this, we
    // funnel the discovery plugin output:
    const extensionManifestTree = new Funnel(extensionDiscovery, {
        srcDir: "/",
        files: ["extensions.json"],
        destDir: "/",
    });

    // Now, extensionManifestTree will place extensions.json at the root of the final dist output.

    // Step 5: Final app.toTree() call
    // Instead of passing the "extensions" tree into app.toTree(), we now pass only the trees that
    // represent additional *top-level* output (such as the manifest and runtimeConfigTree).

    // Runtime config
    let runtimeConfigTree;
    if (toBoolean(process.env.DISABLE_RUNTIME_CONFIG)) {
        runtimeConfigTree = writeFile('fleetbase.config.json', '{}');
    } else {
        runtimeConfigTree = new Funnel('.', {
            files: ['fleetbase.config.json'],
            destDir: '/',
        });
    }

    return app.toTree(
        [extensionManifestTree, runtimeConfigTree].filter(Boolean)
    );
};
