'use strict';

const { ContextReplacementPlugin } = require('webpack');

module.exports = function intlPolyfillContext() {
    // load-intl-polyfills normalizes every translation locale to its two- or
    // three-letter base language before importing data. Keep all base languages
    // available for extensions without bundling unreachable regional variants.
    return new ContextReplacementPlugin(/@formatjs[/\\]intl-(?:numberformat|pluralrules|datetimeformat|relativetimeformat)[/\\]locale-data$/, false, /^\.\/[a-z]{2,3}\.js$/i);
};
