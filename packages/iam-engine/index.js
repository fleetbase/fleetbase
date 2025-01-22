'use strict';
const { buildEngine } = require('ember-engines/lib/engine-addon');
const { name } = require('./package');
const Funnel = require('broccoli-funnel');

module.exports = buildEngine({
    name,

    postprocessTree(type, tree) {
        if (type === 'css') {
            tree = new Funnel(tree, {
                exclude: ['**/@fleetbase/ember-ui/**/*.css'],
                allowEmpty: true,
            });
        }

        return tree;
    },

    lazyLoading: {
        enabled: true,
    },

    isDevelopingAddon() {
        return true;
    },
});
