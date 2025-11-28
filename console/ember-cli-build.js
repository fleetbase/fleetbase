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

        intl: {
            silent: true,
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
    });
    
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
