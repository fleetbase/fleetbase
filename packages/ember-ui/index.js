'use strict';
const { name } = require('./package');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const resolve = require('resolve');
const path = require('path');
const postcssImport = require('postcss-import');
const postcssPresetEnv = require('postcss-preset-env');
const postcssEach = require('postcss-each');
const postcssMixins = require('postcss-mixins');
const postcssConditionals = require('postcss-conditionals-renewed');
const postcssAtRulesVariables = require('postcss-at-rules-variables');
const autoprefixer = require('autoprefixer');
const tailwind = require('tailwindcss');

const tailwindConfigPath = path.resolve(__dirname, 'tailwind.js');
const postcssOptions = {
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
            tailwind(tailwindConfigPath),
            autoprefixer,
        ],
    },
    filter: {
        enabled: true,
        plugins: [postcssAtRulesVariables, postcssMixins, postcssEach, postcssConditionals, tailwind(tailwindConfigPath)],
    },
};

module.exports = {
    name,

    options: {
        autoImport: {
            publicAssetsURL: '/assets',
            alias: {
                libphonenumber: 'intl-tel-input/build/js/utils.js',
            },
        },
        'ember-leaflet': {
            excludeCSS: true,
            excludeJS: true,
            excludeImages: true,
        },
        postcssOptions,
    },

    included: function (app) {
        this._super.included.apply(this, arguments);

        // Get Application Host
        app = this.findApplicationHost(app);

        // PostCSS Options
        app.options = app.options || {};
        app.options.postcssOptions = postcssOptions;

        // Import leaflet-src
        this.import('node_modules/leaflet/dist/leaflet-src.js');
        this.import('node_modules/leaflet/dist/leaflet.css');

        // Import the `intlTelInput.min.css` file and append it to the parent application's `vendor.css`
        this.import('node_modules/intl-tel-input/build/css/intlTelInput.min.css');
    },

    treeForLeaflet: function () {
        const leafletImagesPath = path.join(this.pathBase('leaflet'), 'dist', 'images');
        const trees = [
            new Funnel(leafletImagesPath, {
                srcDir: '/',
                destDir: '/assets/images',
                allowEmpty: true,
            }),
        ];

        return trees;
    },

    treeForIntlTelInput: function () {
        const intlTelInputPath = path.dirname(require.resolve('intl-tel-input')).replace(/build\/js$/, '');
        const trees = [
            new Funnel(`${intlTelInputPath}/build/js`, {
                include: ['utils.js'],
                destDir: 'assets/libphonenumber',
                allowEmpty: true,
            }),
            new Funnel(`${intlTelInputPath}/build/img`, {
                destDir: 'img',
                overwrite: false,
                allowEmpty: true,
            }),
            new Funnel(path.join(__dirname, 'assets'), {
                destDir: '/',
                allowEmpty: true,
            }),
        ];

        return trees;
    },

    mergeWithPublicTree: function (publicTree) {
        const intlTelInputTree = this.treeForIntlTelInput();
        const leafletTree = this.treeForLeaflet();
        const addonTree = [...intlTelInputTree, ...leafletTree];

        return publicTree ? new MergeTrees([publicTree, ...addonTree], { overwrite: true }) : new MergeTrees([...addonTree], { overwrite: true });
    },

    treeForPublic: function () {
        const publicTree = this._super.treeForPublic.apply(this, arguments);

        return this.mergeWithPublicTree(publicTree);
    },

    pathBase(packageName) {
        return path.dirname(resolve.sync(packageName + '/package.json', { basedir: __dirname }));
    },

    findApplicationHost(app) {
        let current = this;
        do {
            if (current.lazyLoading === true || (current.lazyLoading && current.lazyLoading.enabled === true)) {
                app = current;
                break;
            }
            app = current.app || app;
        } while (current.parent.parent && (current = current.parent));

        return app;
    },

    isDevelopingAddon: function () {
        return true;
    },
};
