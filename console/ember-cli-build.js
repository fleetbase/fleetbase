'use strict';

/** eslint-disable node/no-unpublished-require */
const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const FleetbaseExtensionsIndexer = require('fleetbase-extensions-indexer');
const postcssImport = require('postcss-import');
const postcssPresetEnv = require('postcss-preset-env');
const postcssEach = require('postcss-each');
const postcssMixins = require('postcss-mixins');
const postcssConditionals = require('postcss-conditionals-renewed');
const postcssAtRulesVariables = require('postcss-at-rules-variables');
const autoprefixer = require('autoprefixer');
const tailwind = require('tailwindcss');

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
                plugins: [postcssAtRulesVariables, postcssMixins, postcssEach, postcssConditionals, tailwind('./tailwind.js')],
            },
        },

        babel: {
            plugins: [require.resolve('ember-auto-import/babel-plugin')],
        },
    });

    let extensions = new FleetbaseExtensionsIndexer();

    // Use `app.import` to add additional libraries to the generated
    // output files.
    //
    // If you need to use different assets in different
    // environments, specify an object as the first parameter. That
    // object's keys should be the environment name and the values
    // should be the asset to use in that environment.
    //
    // If the library that you are including contains AMD or ES6
    // modules that you would like to import into your application
    // please specify an object with the list of modules as keys
    // along with the exports of each module as its value.

    return app.toTree([extensions]);
};
