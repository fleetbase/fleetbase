/* eslint-env node */
'use strict';

const fs = require('fs');
const path = require('path');

function entries(directory) {
    try {
        return fs.readdirSync(directory);
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
            return [];
        }
        throw error;
    }
}

// Resolve only the consumer's direct packages. Recursive node_modules globs follow
// pnpm links into dependency graphs and linked packages' development worktrees.
// Keep this helper local: published ember-ui versions may not provide it yet.
module.exports = function addonContent(root = process.cwd()) {
    const modules = path.resolve(root, 'node_modules');
    const packages = entries(modules).flatMap((name) => (name.startsWith('@') ? entries(path.join(modules, name)).map((child) => `${name}/${child}`) : [name]));
    const roots = new Set();

    for (const name of packages) {
        if (!name.startsWith('@fleetbase/') && !name.endsWith('-engine')) {
            continue;
        }
        const addon = path.join(modules, name, 'addon');
        if (fs.existsSync(addon)) {
            roots.add(fs.realpathSync(addon));
        }
    }

    // Keep globs within each source tree so newly created templates are watched.
    return [...roots].sort().map(
        (directory) =>
            `${directory
                .split(path.sep)
                .join('/')
                .replace(/[\\!*?{}()[\]]/g, '\\$&')}/**/*.{hbs,js}`
    );
};
