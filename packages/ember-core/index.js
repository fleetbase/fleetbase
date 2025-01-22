'use strict';
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const path = require('path');

module.exports = {
    name: require('./package').name,

    isDevelopingAddon: function () {
        return true;
    },

    included: function (app) {
        this._super.included.apply(this, arguments);
        app.options = app.options || {};

        if (app.options['ember-simple-auth'] !== undefined) {
            app.options['ember-simple-auth'].useSessionSetupMethod = true;
        } else {
            app.options['ember-simple-auth'] = {
                useSessionSetupMethod: true,
            };
        }

        if (app.options['ember-cli-notifications'] !== undefined) {
            app.options['ember-cli-notifications'].autoClear = true;
            app.options['ember-cli-notifications'].clearDuration = 1000 * 3.5;
        } else {
            app.options['ember-cli-notifications'] = {
                autoClear: true,
                clearDuration: 1000 * 3.5,
            };
        }
    },

    treeForPublic: function () {
        const publicTree = this._super.treeForPublic.apply(this, arguments);
        const trees = [];

        trees.push(
            new Funnel(path.dirname(require.resolve('socketcluster-client')), {
                files: ['socketcluster-client.min.js'],
                destDir: '/assets',
                allowEmpty: true,
            })
        );

        // Merge the addon tree with the existing tree
        return publicTree ? new MergeTrees([publicTree, ...trees], { overwrite: true }) : new MergeTrees([...trees], { overwrite: true });
    },
};
