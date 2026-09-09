'use strict';
const fs = require('fs');
const path = require('path');

/**
 * Reads one of the flat silhouettes in `config/placeholders` and returns it as an inline
 * SVG data URI, so the console's default resource images ship with the build instead of
 * depending on a hosted asset. Each `DEFAULT_*_IMAGE` env var still overrides the result.
 */
module.exports = function inlinePlaceholder(name) {
    const file = path.join(__dirname, '..', 'placeholders', `${name}.svg`);
    const svg = fs.readFileSync(file, 'utf8').trim();

    return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
};
